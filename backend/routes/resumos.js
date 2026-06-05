// src/routes/resumos.js
const router = require('express').Router();
const pool   = require('../db');
const { auth, podeEditar } = require('../middleware/auth');

// GET /resumos
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.titulo, r.disciplina, r.corpo, r.curtidas,
              r.autor_id AS "autorId", u.nome AS "autorNome",
              r.criado_em AS "criadoEm",
              EXISTS (
                SELECT 1 FROM curtidas_resumo c
                WHERE c.resumo_id = r.id AND c.usuario_id = $2
              ) AS "curtido"
         FROM resumos r
         LEFT JOIN usuarios u ON u.id = r.autor_id
        WHERE r.turma_id = $1
        ORDER BY r.criado_em DESC`,
      [req.user.turma_id, req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao buscar resumos.' });
  }
});

// POST /resumos
router.post('/', auth, podeEditar, async (req, res) => {
  const { titulo, disciplina, corpo } = req.body;
  if (!titulo || !disciplina || !corpo) {
    return res.status(400).json({ message: 'Título, disciplina e corpo são obrigatórios.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO resumos (titulo, disciplina, corpo, autor_id, turma_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, titulo, disciplina, corpo, curtidas, criado_em AS "criadoEm"`,
      [titulo, disciplina, corpo, req.user.id, req.user.turma_id]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao criar resumo.' });
  }
});

// POST /resumos/:id/curtir — toggle curtida
router.post('/:id/curtir', auth, async (req, res) => {
  const resumoId  = parseInt(req.params.id);
  const usuarioId = req.user.id;

  try {
    // Verifica se já curtiu
    const { rows: exist } = await pool.query(
      `SELECT 1 FROM curtidas_resumo WHERE usuario_id = $1 AND resumo_id = $2`,
      [usuarioId, resumoId]
    );

    if (exist.length > 0) {
      // Descurtir
      await pool.query(
        `DELETE FROM curtidas_resumo WHERE usuario_id = $1 AND resumo_id = $2`,
        [usuarioId, resumoId]
      );
      await pool.query(
        `UPDATE resumos SET curtidas = GREATEST(0, curtidas - 1) WHERE id = $1`,
        [resumoId]
      );
      return res.json({ curtido: false });
    } else {
      // Curtir
      await pool.query(
        `INSERT INTO curtidas_resumo (usuario_id, resumo_id) VALUES ($1, $2)`,
        [usuarioId, resumoId]
      );
      await pool.query(
        `UPDATE resumos SET curtidas = curtidas + 1 WHERE id = $1`,
        [resumoId]
      );
      return res.json({ curtido: true });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao curtir resumo.' });
  }
});

// DELETE /resumos/:id
router.delete('/:id', auth, podeEditar, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM resumos WHERE id = $1 AND turma_id = $2`,
      [req.params.id, req.user.turma_id]
    );
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao deletar resumo.' });
  }
});

module.exports = router;
