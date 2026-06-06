// routes/admin.js — painel de administração (somente dev)
const router = require('express').Router();
const pool   = require('../db');
const { auth, soDev } = require('../middleware/auth');

// Considera "online" quem fez heartbeat nos últimos 3 minutos
const ONLINE_THRESHOLD_MIN = 3;

// ── GET /admin/online — quem está online agora ─────────────
router.get('/online', auth, soDev, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nome, usuario, role, iniciais, avatar_url, online_at AS "onlineAt"
         FROM usuarios
        WHERE turma_id = $1
          AND online_at > NOW() - INTERVAL '${ONLINE_THRESHOLD_MIN} minutes'
        ORDER BY online_at DESC`,
      [req.user.turma_id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
});

// ── GET /admin/membros — todos com último login ────────────
router.get('/membros', auth, soDev, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nome, usuario, role, iniciais, avatar_url,
              criado_em AS "criadoEm",
              ultimo_login AS "ultimoLogin",
              CASE WHEN online_at > NOW() - INTERVAL '${ONLINE_THRESHOLD_MIN} minutes'
                   THEN true ELSE false END AS online
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
    return res.status(500).json({ message: 'Erro interno.' });
  }
});

// ── GET /admin/logs — histórico de ações ──────────────────
router.get('/logs', auth, soDev, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const filtroAcao = req.query.acao || null; // ex: 'resumo', 'aviso'

  try {
    const params = [req.user.turma_id, limit, offset];
    let whereAcao = '';
    if (filtroAcao) {
      whereAcao = `AND l.acao ILIKE $4`;
      params.push(`${filtroAcao}%`);
    }

    const { rows } = await pool.query(
      `SELECT l.id, l.acao, l.descricao, l.criado_em AS "criadoEm",
              u.id AS "usuarioId", u.nome AS "usuarioNome",
              u.usuario, u.iniciais, u.avatar_url
         FROM logs l
         LEFT JOIN usuarios u ON u.id = l.usuario_id
        WHERE l.turma_id = $1 ${whereAcao}
        ORDER BY l.criado_em DESC
        LIMIT $2 OFFSET $3`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
});

// ── POST /admin/heartbeat — atualiza online_at do usuário ──
// Qualquer usuário logado pode chamar (não só dev)
router.post('/heartbeat', auth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE usuarios SET online_at = NOW() WHERE id = $1`,
      [req.user.id]
    );
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.' });
  }
});

module.exports = router;
