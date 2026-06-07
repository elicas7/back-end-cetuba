// routes/notificacoes.js — notificações por SSE (Server-Sent Events)
const router = require('express').Router();
const pool   = require('../db');
const { auth } = require('../middleware/auth');

// Clientes SSE conectados: Map<turma_id, Set<res>>
const clientes = new Map();

function broadcast(turmaId, evento) {
  const turma = clientes.get(turmaId);
  if (!turma) return;
  const msg = `data: ${JSON.stringify(evento)}\n\n`;
  turma.forEach(res => { try { res.write(msg); } catch(_) {} });
}

// Expõe broadcast para outras rotas usarem
router.broadcast = broadcast;

// GET /notificacoes/stream — SSE
router.get('/stream', (req, res) => {
  // EventSource não suporta headers customizados — aceita token via query
  const jwt = require('jsonwebtoken');
  const tokenParam = req.query.token;
  let user;
  try {
    user = jwt.verify(tokenParam, process.env.JWT_SECRET);
  } catch(e) {
    return res.status(401).end();
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const tid = user.turma_id;
  if (!clientes.has(tid)) clientes.set(tid, new Set());
  clientes.get(tid).add(res);

  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch(_) {} }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    clientes.get(tid)?.delete(res);
  });
});

// GET /notificacoes — lista as últimas 30 notificações do usuário
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, tipo, titulo, corpo, lida, criado_em AS "criadoEm"
         FROM notificacoes
        WHERE turma_id = $1
        ORDER BY criado_em DESC LIMIT 30`,
      [req.user.turma_id]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao buscar notificações.' });
  }
});

// PATCH /notificacoes/ler-todas — marca todas como lidas
router.patch('/ler-todas', auth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notificacoes SET lida = true WHERE turma_id = $1`,
      [req.user.turma_id]
    );
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: 'Erro.' });
  }
});

// Helper para criar e transmitir notificação (usado por outras rotas)
async function criarNotificacao(pool, { turmaId, tipo, titulo, corpo }) {
  try {
    await pool.query(
      `INSERT INTO notificacoes (turma_id, tipo, titulo, corpo) VALUES ($1,$2,$3,$4)`,
      [turmaId, tipo, titulo, corpo]
    );
    broadcast(turmaId, { tipo, titulo, corpo, criadoEm: new Date().toISOString() });
  } catch(err) {
    console.error('Notificação:', err.message);
  }
}

router.criarNotificacao = criarNotificacao;
module.exports = router;
