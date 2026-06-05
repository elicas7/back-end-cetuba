// backend/middleware/soAdmin.js
// Alias de compatibilidade — use podeEditar de auth.js diretamente nas novas rotas
const { podeEditar } = require('./auth');
module.exports = podeEditar;
