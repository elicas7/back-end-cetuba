// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Hierarquia: dev(5) > ajudante_dev(4) > lider(3) > sub_lider(2) > aluno(1)
const NIVEL = { dev: 5, ajudante_dev: 4, lider: 3, sub_lider: 2, aluno: 1 };

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Token não fornecido.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
}

// Vice-líder (sub_lider) pra cima pode editar conteúdo
function podeEditar(req, res, next) {
  if ((NIVEL[req.user.role] || 0) < 2) {
    return res.status(403).json({ message: 'Permissão insuficiente.' });
  }
  next();
}

// Líder pra cima pode gerenciar membros
function podeLiderar(req, res, next) {
  if ((NIVEL[req.user.role] || 0) < 3) {
    return res.status(403).json({ message: 'Apenas líder ou superior pode fazer isso.' });
  }
  next();
}

// Somente desenvolvedor
function soDev(req, res, next) {
  if (req.user.role !== 'dev') {
    return res.status(403).json({ message: 'Apenas o Desenvolvedor pode fazer isso.' });
  }
  next();
}

// Alias legado usado nas rotas antigas
const soAdmin = podeEditar;

module.exports = { auth, podeEditar, podeLiderar, soDev, soAdmin };
