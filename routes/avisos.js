// src/routes/avisos.js
const router = require('express').Router();
const pool   = require('../db');
const { auth, podeEditar } = require('../middleware/auth');

// GET /avisos — lista avisos da turma do usuário
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.titulo, a.corpo, a.tipo,
              u.nome AS autor, a.criado_em AS "criadoEm"
         FROM avisos a
         LEFT JOIN usuarios u ON u.id = a.autor_id
        WHERE a.turma_id = $1
        ORDER BY a.criado_em DESC
        LIMIT 50`,
      [req.user.turma_id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao buscar avisos.' });
  }
});

// POST /avisos — cria aviso (somente líder/sub)
router.post('/', auth, podeEditar, async (req, res) => {
  const { titulo, corpo, tipo = 'geral' } = req.body;
  if (!titulo || !corpo) {
    return res.status(400).json({ message: 'Título e corpo são obrigatórios.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO avisos (titulo, corpo, tipo, autor_id, turma_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, titulo, corpo, tipo, criado_em AS "criadoEm"`,
      [titulo, corpo, tipo, req.user.id, req.user.turma_id]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao criar aviso.' });
  }
});

// DELETE /avisos/:id
router.delete('/:id', auth, podeEditar, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM avisos WHERE id = $1 AND turma_id = $2`,
      [req.params.id, req.user.turma_id]
    );
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao deletar aviso.' });
  }
});

module.exports = router;
