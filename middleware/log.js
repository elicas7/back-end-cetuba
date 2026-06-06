// middleware/log.js — registra ações no banco
const pool = require('../db');

/**
 * registrarLog(pool, { usuarioId, turmaId, acao, descricao })
 * Ação no formato 'recurso:verbo', ex: 'resumo:criar', 'aviso:deletar'
 * Não lança exceção — falha silenciosamente para não quebrar a rota.
 */
async function registrarLog({ usuarioId, turmaId, acao, descricao }) {
  try {
    await pool.query(
      `INSERT INTO logs (usuario_id, turma_id, acao, descricao) VALUES ($1, $2, $3, $4)`,
      [usuarioId, turmaId, acao, descricao]
    );
  } catch (err) {
    console.error('⚠️  Falha ao registrar log:', err.message);
  }
}

module.exports = { registrarLog };
