// backend/config/database.js
// Este arquivo re-exporta o pool para compatibilidade.
// As rotas importam diretamente de '../db'
module.exports = require('../db');
