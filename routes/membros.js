// backend/routes/membros.js
const router = require('express').Router();
const pool   = require('../db');
const { auth, podeLiderar } = require('../middleware/auth');

// GET /membros
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nome, usuario, role, iniciais, criado_em AS "criadoEm"
         FROM usuarios
        WHERE turma_id = $1
        ORDER BY CASE role
          WHEN 'dev'          THEN 1
          WHEN 'ajudante_dev' THEN 2
          WHEN 'lider'        THEN 3
          WHEN 'sub_lider'    THEN 4
          ELSE 5 END, nome`,
      [req.user.turma_id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao buscar membros.' });
  }
});

// PUT /membros/:id — altera cargo (líder pra cima)
router.put('/:id', auth, podeLiderar, async (req, res) => {
  const { role } = req.body;
  const validas = ['aluno', 'sub_lider', 'lider', 'ajudante_dev', 'dev'];
  if (!validas.includes(role)) return res.status(400).json({ message: 'Cargo inválido.' });
  try {
    const { rows } = await pool.query(
      `UPDATE usuarios SET role = $1 WHERE id = $2 AND turma_id = $3 RETURNING id, nome, usuario, role`,
      [role, req.params.id, req.user.turma_id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Membro não encontrado.' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao atualizar membro.' });
  }
});

// DELETE /membros/:id
router.delete('/:id', auth, podeLiderar, async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ message: 'Você não pode se remover da turma.' });
  }
  try {
    await pool.query(
      `UPDATE usuarios SET turma_id = NULL WHERE id = $1 AND turma_id = $2`,
      [req.params.id, req.user.turma_id]
    );
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao remover membro.' });
  }
});

module.exports = router;
