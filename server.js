// backend/server.js — Servidor principal da Central da Turma

console.log("🔥 SERVER EXECUTANDO AGORA");

const path = require('path');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();


// ── CONEXÃO COM BANCO (NEON) ───────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use((req, res, next) => {
  req.db = pool;
  next();
});


// ── MIDDLEWARE ─────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ── FRONTEND ───────────────────────────────────────────
const frontendDir = path.resolve(__dirname, '../frontend');

console.log("📁 Frontend dir:", frontendDir);

app.use(express.static(frontendDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});


// ── UPLOADS ────────────────────────────────────────────
const uploadsDir = path.resolve(
  __dirname,
  '../',
  process.env.UPLOADS_DIR || './backend/uploads/materiais'
);

app.use('/uploads', express.static(uploadsDir));


// ── ROTAS DA API (COM DEBUG FORÇADO) ───────────────────
try {
  console.log("🔗 Carregando rotas...");

  app.use('/auth', require('./routes/auth'));
  app.use('/avisos', require('./routes/avisos'));
  app.use('/materiais', require('./routes/materiais'));
  app.use('/resumos', require('./routes/resumos'));
  app.use('/provas', require('./routes/provas'));
  app.use('/eventos', require('./routes/eventos'));
  app.use('/membros', require('./routes/membros'));

  console.log("✅ Rotas carregadas com sucesso");
} catch (err) {
  console.error("❌ ERRO AO CARREGAR ROTAS:", err);
}


// ── TESTE DB ───────────────────────────────────────────
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ ok: true, time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});


// ── HEALTH ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date() });
});


// ── 404 ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.' });
});


// ── ERROR HANDLER ──────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Erro:', err);
  res.status(500).json({
    message: err.message || 'Erro interno do servidor.'
  });
});


// ── START ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  const dbUrl =
    process.env.DATABASE_URL?.replace(/:\/\/.*@/, '://***@') ||
    'não configurado';

  console.log(`\n🚀 Central da Turma API rodando em http://localhost:${PORT}`);
  console.log(`🗄️ Banco: ${dbUrl}`);
  console.log(`🌍 Env: ${process.env.NODE_ENV || 'development'}\n`);
});
