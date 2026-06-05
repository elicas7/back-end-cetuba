// backend/server.js — Central da Turma API
console.log("🔥 SERVER EXECUTANDO AGORA");
const path = require('path');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();

// ── BANCO ─────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// deixa pool acessível nas rotas
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// ── MIDDLEWARE ────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── FRONTEND ──────────────────────────
const frontendDir = path.resolve(__dirname, 'frontend');
app.use(express.static(frontendDir));
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// ── UPLOADS ───────────────────────────
const uploadsDir = path.resolve(__dirname, 'uploads/materiais');
app.use('/uploads', express.static(uploadsDir));

// ── ROTAS ─────────────────────────────
app.use('/auth', require('./routes/auth'));

// ── TEST DB ───────────────────────────
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ ok: true, time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── HEALTH ────────────────────────────
app.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date() });
});

// ── 404 ───────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.' });
});

// ── START ─────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API rodando em http://localhost:${PORT}`);
});
