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

// ── AUTH ROUTES (INLINE FIXADO) ───────
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authRouter = express.Router();

// LOGIN
authRouter.post('/login', async (req, res) => {
  const { usuario, senha } = req.body;

  if (!usuario || !senha) {
    return res.status(400).json({ message: 'Preencha usuário e senha.' });
  }

  try {
    const result = await req.db.query(
      `SELECT * FROM usuarios WHERE usuario = $1 LIMIT 1`,
      [usuario.toLowerCase().trim()]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Usuário ou senha incorretos.' });
    }

    const ok = await bcrypt.compare(senha, user.senha_hash);

    if (!ok) {
      return res.status(401).json({ message: 'Usuário ou senha incorretos.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        usuario: user.usuario,
        role: user.role,
        turma_id: user.turma_id
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        usuario: user.usuario,
        role: user.role,
        iniciais: user.iniciais,
        turma_id: user.turma_id
      }
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: 'Erro interno.' });
  }
});

// ME
authRouter.get('/me', async (req, res) => {
  res.json({ message: "implementar depois com token" });
});

app.use('/auth', authRouter);

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
