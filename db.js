// backend/db.js — pool de conexão com o PostgreSQL
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = require('pg');

// Bancos locais (localhost/127.0.0.1) não precisam de SSL; qualquer banco
// remoto (Supabase, Railway Postgres, Neon etc.) exige. Detectar direto pela
// própria DATABASE_URL evita depender de lembrar de setar NODE_ENV=production.
const dbUrl = process.env.DATABASE_URL || '';
const ehLocal = /localhost|127\.0\.0\.1/.test(dbUrl);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: ehLocal ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool PostgreSQL:', err.message);
});

module.exports = pool;
