// routes/bugs.js
const router = require('express').Router();
const pool   = require('../db');
const { auth, soDev } = require('../middleware/auth');

// Middleware: dev ou ajudante_dev
function podeVerBugs(req, res, next) {
  if (!['dev', 'ajudante_dev'].includes(req.user.role))
    return res.status(403).json({ message: 'Sem permissão.' });
  next();
}

// GET /bugs — somente dev/ajudante_dev
router.get('/', auth, podeVerBugs, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.id, b.titulo, b.descricao, b.pagina, b.prioridade, b.status,
              b.criado_em AS "criadoEm",
              u.nome AS "autorNome", u.usuario AS "autorUsuario", u.iniciais
         FROM bugs b
         LEFT JOIN usuarios u ON u.id = b.autor_id
        WHERE b.turma_id = $1
        ORDER BY
          CASE b.prioridade WHEN 'critico' THEN 1 WHEN 'alto' THEN 2 WHEN 'medio' THEN 3 ELSE 4 END,
          b.criado_em DESC`,
      [req.user.turma_id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao buscar bugs.' });
  }
});

// POST /bugs — qualquer usuário logado
router.post('/', auth, async (req, res) => {
  const { titulo, descricao, pagina = null, prioridade = 'medio' } = req.body;
  if (!titulo || !descricao)
    return res.status(400).json({ message: 'Título e descrição são obrigatórios.' });
  const prioridades = ['baixo', 'medio', 'alto', 'critico'];
  if (!prioridades.includes(prioridade))
    return res.status(400).json({ message: 'Prioridade inválida.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO bugs (titulo, descricao, pagina, prioridade, autor_id, turma_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, titulo, descricao, pagina, prioridade, status, criado_em AS "criadoEm"`,
      [titulo, descricao, pagina, prioridade, req.user.id, req.user.turma_id]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao reportar bug.' });
  }
});

// PATCH /bugs/:id/status — dev/ajudante_dev atualizam status
router.patch('/:id/status', auth, podeVerBugs, async (req, res) => {
  const { status } = req.body;
  const validos = ['aberto', 'em_analise', 'resolvido', 'ignorado'];
  if (!validos.includes(status))
    return res.status(400).json({ message: 'Status inválido.' });
  try {
    const { rows } = await pool.query(
      `UPDATE bugs SET status = $1 WHERE id = $2 AND turma_id = $3 RETURNING id, status`,
      [status, req.params.id, req.user.turma_id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Bug não encontrado.' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao atualizar status.' });
  }
});

// DELETE /bugs/:id — somente dev
router.delete('/:id', auth, soDev, async (req, res) => {
  try {
    await pool.query(`DELETE FROM bugs WHERE id = $1 AND turma_id = $2`, [req.params.id, req.user.turma_id]);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao deletar bug.' });
  }
});

module.exports = router;
