// src/routes/provas.js
const router = require('express').Router();
const pool   = require('../db');
const { auth, podeEditar } = require('../middleware/auth');

// GET /provas
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, disciplina,
              TO_CHAR(data, 'YYYY-MM-DD') AS data,
              TO_CHAR(horario, 'HH24:MI') AS horario,
              conteudo, criado_em AS "criadoEm"
         FROM provas
        WHERE turma_id = $1
        ORDER BY data ASC`,
      [req.user.turma_id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao buscar provas.' });
  }
});

// POST /provas
router.post('/', auth, podeEditar, async (req, res) => {
  const { disciplina, data, horario, conteudo } = req.body;
  if (!disciplina || !data) {
    return res.status(400).json({ message: 'Disciplina e data são obrigatórios.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO provas (disciplina, data, horario, conteudo, turma_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, disciplina,
                 TO_CHAR(data, 'YYYY-MM-DD') AS data,
                 TO_CHAR(horario, 'HH24:MI') AS horario,
                 conteudo`,
      [disciplina, data, horario || null, conteudo || null, req.user.turma_id]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao criar prova.' });
  }
});

// DELETE /provas/:id
router.delete('/:id', auth, podeEditar, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM provas WHERE id = $1 AND turma_id = $2`,
      [req.params.id, req.user.turma_id]
    );
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao deletar prova.' });
  }
});

module.exports = router;
