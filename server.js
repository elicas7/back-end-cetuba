// backend/server.js — Servidor principal da Central da Turma
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors    = require('cors');

const app = express();

// ── Middleware global ──────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Frontend ───────────────────────────────────────────
const frontendDir = path.resolve(__dirname, '../frontend');

app.use(express.static(frontendDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// ── Arquivos estáticos (uploads) ───────────────────────
const uploadsDir = path.resolve(__dirname, '../', process.env.UPLOADS_DIR || './backend/uploads/materiais');
app.use('/uploads', express.static(uploadsDir));

// ── Rotas da API ───────────────────────────────────────
app.use('/auth',      require('./routes/auth'));
app.use('/avisos',    require('./routes/avisos'));
app.use('/materiais', require('./routes/materiais'));
app.use('/resumos',   require('./routes/resumos'));
app.use('/provas',    require('./routes/provas'));
app.use('/eventos',   require('./routes/eventos'));
app.use('/membros',   require('./routes/membros'));

// ── Health check ───────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date() }));

// ── 404 ────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));

// ── Error handler ──────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Erro:', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Erro interno do servidor.' });
});

// ── Inicialização ──────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const dbUrl = process.env.DATABASE_URL?.replace(/:\/\/.*@/, '://***@') || 'não configurado';
  console.log(`\n🚀  Central da Turma API rodando em http://localhost:${PORT}`);
  console.log(`    Banco: ${dbUrl}`);
  console.log(`    Env:   ${process.env.NODE_ENV || 'development'}\n`);
});
