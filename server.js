// server.js — Central da Turma API
console.log("🔥 SERVER EXECUTANDO AGORA");

const path    = require('path');
require('dotenv').config();          // carrega .env ANTES de tudo
const express = require('express');
const cors    = require('cors');
const app     = express();

// ── CORS ──────────────────────────────────────────────────
app.use(cors({
  origin:         process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── BODY PARSERS ──────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── FRONTEND ESTÁTICO ─────────────────────────────────────
const frontendDir = path.resolve(__dirname, 'frontend');
app.use(express.static(frontendDir));
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// ── UPLOADS ESTÁTICOS ─────────────────────────────────────
const uploadsDir = path.resolve(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// ── ROTAS DA API (com e sem prefixo /api) ─────────────────
const authRouter      = require('./routes/auth');
const avisosRouter    = require('./routes/avisos');
const eventosRouter   = require('./routes/eventos');
const materiaisRouter = require('./routes/materiais');
const membrosRouter   = require('./routes/membros');
const provasRouter    = require('./routes/provas');
const resumosRouter   = require('./routes/resumos');

// sem prefixo  → /auth/login
app.use('/auth',      authRouter);
app.use('/avisos',    avisosRouter);
app.use('/eventos',   eventosRouter);
app.use('/materiais', materiaisRouter);
app.use('/membros',   membrosRouter);
app.use('/provas',    provasRouter);
app.use('/resumos',   resumosRouter);

// com prefixo  → /api/auth/login
app.use('/api/auth',      authRouter);
app.use('/api/avisos',    avisosRouter);
app.use('/api/eventos',   eventosRouter);
app.use('/api/materiais', materiaisRouter);
app.use('/api/membros',   membrosRouter);
app.use('/api/provas',    provasRouter);
app.use('/api/resumos',   resumosRouter);

// ── HEALTH / TEST ─────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date() }));

app.get('/test-db', async (req, res) => {
  try {
    const pool = require('./db');
    const result = await pool.query('SELECT NOW()');
    res.json({ ok: true, time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.' });
});

// ── START ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
});
