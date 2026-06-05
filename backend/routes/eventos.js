// src/routes/eventos.js
const router = require('express').Router();
const pool   = require('../db');
const { auth, podeEditar } = require('../middleware/auth');

// GET /eventos — retorna eventos futuros (padrão: próximos 60 dias)
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, titulo,
              TO_CHAR(data, 'YYYY-MM-DD') AS data,
              tipo, descricao, criado_em AS "criadoEm"
         FROM eventos
        WHERE turma_id = $1
          AND data >= CURRENT_DATE
        ORDER BY data ASC
        LIMIT 30`,
      [req.user.turma_id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao buscar eventos.' });
  }
});

// POST /eventos
router.post('/', auth, podeEditar, async (req, res) => {
  const { titulo, data, tipo = 'outro', descricao } = req.body;
  if (!titulo || !data) {
    return res.status(400).json({ message: 'Título e data são obrigatórios.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO eventos (titulo, data, tipo, descricao, turma_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, titulo, TO_CHAR(data, 'YYYY-MM-DD') AS data, tipo, descricao`,
      [titulo, data, tipo, descricao || null, req.user.turma_id]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao criar evento.' });
  }
});

// DELETE /eventos/:id
router.delete('/:id', auth, podeEditar, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM eventos WHERE id = $1 AND turma_id = $2`,
      [req.params.id, req.user.turma_id]
    );
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao deletar evento.' });
  }
});

module.exports = router;
