// src/routes/provas.js
const router = require('express').Router();
const pool   = require('../db');
const { auth, podeEditar } = require('../middleware/auth');

// GET /provas
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, disciplina, data::text AS data, horario::text AS horario,
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
  if (!disciplina || !data)
    return res.status(400).json({ message: 'Disciplina e data são obrigatórios.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO provas (disciplina, data, horario, conteudo, turma_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, disciplina, data::text AS data, horario::text AS horario, conteudo`,
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

// POST /provas/:id/entrega — toggle entrega
router.post('/:id/entrega', auth, async (req, res) => {
  const provaId   = parseInt(req.params.id);
  const usuarioId = req.user.id;
  try {
    const { rows: exist } = await pool.query(
      `SELECT 1 FROM entregas WHERE prova_id = $1 AND usuario_id = $2`,
      [provaId, usuarioId]
    );
    if (exist.length > 0) {
      await pool.query(`DELETE FROM entregas WHERE prova_id = $1 AND usuario_id = $2`, [provaId, usuarioId]);
      return res.json({ entregue: false });
    } else {
      await pool.query(`INSERT INTO entregas (prova_id, usuario_id) VALUES ($1, $2)`, [provaId, usuarioId]);
      return res.json({ entregue: true });
    }
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao marcar entrega.' });
  }
});

// GET /provas/:id/entregas — lista quem entregou (podeEditar)
router.get('/:id/entregas', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.nome, u.usuario, u.iniciais, e.entregue_em AS "entregueEm"
         FROM entregas e JOIN usuarios u ON u.id = e.usuario_id
        WHERE e.prova_id = $1 ORDER BY e.entregue_em`,
      [req.params.id]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: 'Erro.' });
  }
});
