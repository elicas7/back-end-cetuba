// backend/routes/auth.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../db');
const { auth, soDev } = require('../middleware/auth');

// POST /auth/login
router.post('/login', async (req, res) => {
  const { usuario, senha } = req.body;
  if (!usuario || !senha) return res.status(400).json({ message: 'Preencha usuário e senha.' });
  try {
    const { rows } = await pool.query(
      `SELECT u.*, t.nome AS turma_nome
         FROM usuarios u LEFT JOIN turmas t ON t.id = u.turma_id
        WHERE u.usuario = $1 LIMIT 1`,
      [usuario.toLowerCase().trim()]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(senha, user.senha_hash))) {
      return res.status(401).json({ message: 'Usuário ou senha incorretos.' });
    }
    const payload = { id: user.id, usuario: user.usuario, role: user.role, turma_id: user.turma_id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    return res.json({
      token,
      user: { id: user.id, nome: user.nome, usuario: user.usuario, role: user.role, iniciais: user.iniciais, turma_id: user.turma_id, turma_nome: user.turma_nome },
    });
  } catch (err) {
    console.error('Login:', err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
});

// GET /auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.nome, u.usuario, u.role, u.iniciais, u.turma_id, t.nome AS turma_nome
         FROM usuarios u LEFT JOIN turmas t ON t.id = u.turma_id WHERE u.id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Usuário não encontrado.' });
    return res.json(rows[0]);
  } catch { return res.status(500).json({ message: 'Erro interno.' }); }
});

// POST /auth/criar-conta — somente desenvolvedor
router.post('/criar-conta', auth, soDev, async (req, res) => {
  const { nome, usuario, senha, role = 'aluno' } = req.body;
  if (!nome || !usuario || !senha) return res.status(400).json({ message: 'Nome, usuário e senha são obrigatórios.' });
  if (senha.length < 6) return res.status(400).json({ message: 'Senha deve ter ao menos 6 caracteres.' });

  const rolesValidas = ['aluno', 'sub_lider', 'lider', 'ajudante_dev', 'dev'];
  if (!rolesValidas.includes(role)) return res.status(400).json({ message: 'Cargo inválido.' });

  try {
    const senha_hash = await bcrypt.hash(senha, 10);
    const ini = nome.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase();
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nome, usuario, senha_hash, role, iniciais, turma_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nome, usuario, role, iniciais`,
      [nome, usuario.toLowerCase().trim(), senha_hash, role, ini, req.user.turma_id]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Usuário já existe.' });
    console.error('Criar conta:', err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
});

module.exports = router;
