// routes/atualizacoes.js — Últimas atualizações do sistema
const router = require('express').Router();
const pool   = require('../db');
const { auth, soDev } = require('../middleware/auth');

// GET /atualizacoes — todos os logados podem ver
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.titulo, a.corpo, a.tipo, a.versao,
              a.criado_em AS "criadoEm",
              u.nome AS "autorNome"
         FROM atualizacoes a
         LEFT JOIN usuarios u ON u.id = a.autor_id
        ORDER BY a.criado_em DESC
        LIMIT 50`
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao buscar atualizações.' });
  }
});

// POST /atualizacoes — somente dev
router.post('/', auth, soDev, async (req, res) => {
  const { titulo, corpo, tipo = 'novidade', versao = null } = req.body;
  if (!titulo || !corpo)
    return res.status(400).json({ message: 'Título e descrição são obrigatórios.' });
  const tiposValidos = ['novidade', 'melhoria', 'correcao', 'aviso'];
  if (!tiposValidos.includes(tipo))
    return res.status(400).json({ message: 'Tipo inválido.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO atualizacoes (titulo, corpo, tipo, versao, autor_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, titulo, corpo, tipo, versao, criado_em AS "criadoEm"`,
      [titulo, corpo, tipo, versao || null, req.user.id]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao publicar atualização.' });
  }
});

// DELETE /atualizacoes/:id — somente dev
router.delete('/:id', auth, soDev, async (req, res) => {
  try {
    await pool.query(`DELETE FROM atualizacoes WHERE id = $1`, [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao deletar.' });
  }
});

module.exports = router;
