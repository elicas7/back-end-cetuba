// server.js — Central da Turma API
console.log("🔥 SERVER EXECUTANDO AGORA");

const path    = require('path');
require('dotenv').config();
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
app.get('/', (req, res) => res.sendFile(path.join(frontendDir, 'index.html')));

// ── UPLOADS ESTÁTICOS ─────────────────────────────────────
const uploadsDir = path.resolve(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// ── ROTAS ─────────────────────────────────────────────────
const authRouter      = require('./routes/auth');
const avisosRouter    = require('./routes/avisos');
const eventosRouter   = require('./routes/eventos');
const materiaisRouter = require('./routes/materiais');
const membrosRouter   = require('./routes/membros');
const provasRouter    = require('./routes/provas');
const resumosRouter   = require('./routes/resumos');
const perfilRouter    = require('./routes/perfil');
const adminRouter     = require('./routes/admin');

const register = (prefix, router) => {
  app.use(prefix, router);
  app.use(`/api${prefix}`, router);
};

register('/auth',      authRouter);
register('/avisos',    avisosRouter);
register('/eventos',   eventosRouter);
register('/materiais', materiaisRouter);
register('/membros',   membrosRouter);
register('/provas',    provasRouter);
register('/resumos',   resumosRouter);
register('/perfil',    perfilRouter);
register('/admin',     adminRouter);

// ── HEALTH ────────────────────────────────────────────────
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
app.use((req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));

// ── START ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));
