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

// ── ROTAS DA API ──────────────────────────────────────────
app.use('/auth',      require('./routes/auth'));
app.use('/avisos',    require('./routes/avisos'));
app.use('/eventos',   require('./routes/eventos'));
app.use('/materiais', require('./routes/materiais'));
app.use('/membros',   require('./routes/membros'));
app.use('/provas',    require('./routes/provas'));
app.use('/resumos',   require('./routes/resumos'));

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
