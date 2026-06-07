// routes/comentarios.js — comentários em resumos
const router = require('express').Router();
const pool   = require('../db');
const { auth } = require('../middleware/auth');

// GET /comentarios/:resumoId
router.get('/:resumoId', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.corpo, c.criado_em AS "criadoEm",
              u.id AS "autorId", u.nome AS "autorNome",
              u.usuario, u.iniciais, u.avatar_url
         FROM comentarios c
         JOIN usuarios u ON u.id = c.autor_id
        WHERE c.resumo_id = $1
        ORDER BY c.criado_em ASC`,
      [req.params.resumoId]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao buscar comentários.' });
  }
});

// POST /comentarios/:resumoId
router.post('/:resumoId', auth, async (req, res) => {
  const { corpo } = req.body;
  if (!corpo?.trim()) return res.status(400).json({ message: 'Comentário não pode ser vazio.' });
  if (corpo.length > 500) return res.status(400).json({ message: 'Máximo 500 caracteres.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO comentarios (resumo_id, autor_id, corpo)
       VALUES ($1, $2, $3)
       RETURNING id, corpo, criado_em AS "criadoEm"`,
      [req.params.resumoId, req.user.id, corpo.trim()]
    );
    // incrementa contador
    await pool.query(`UPDATE resumos SET total_comentarios = COALESCE(total_comentarios,0) + 1 WHERE id = $1`, [req.params.resumoId]);
    return res.status(201).json({ ...rows[0], autorNome: req.user.nome, usuario: req.user.usuario, iniciais: req.user.iniciais });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao comentar.' });
  }
});

// DELETE /comentarios/:id — autor ou quem pode editar
router.delete('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT autor_id, resumo_id FROM comentarios WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Comentário não encontrado.' });
    const podeApagar = rows[0].autor_id === req.user.id || ['lider','ajudante_dev','dev'].includes(req.user.role);
    if (!podeApagar) return res.status(403).json({ message: 'Sem permissão.' });
    await pool.query(`DELETE FROM comentarios WHERE id = $1`, [req.params.id]);
    await pool.query(`UPDATE resumos SET total_comentarios = GREATEST(0, COALESCE(total_comentarios,0) - 1) WHERE id = $1`, [rows[0].resumo_id]);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao deletar comentário.' });
  }
});

module.exports = router;
