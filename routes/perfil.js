// routes/perfil.js — perfil de usuário (bio, avatar, visualizar)
const router = require('express').Router();
const pool   = require('../db');
const { auth } = require('../middleware/auth');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// ── Multer — avatares ──────────────────────────────────────
const avatarDir = path.resolve(__dirname, '../uploads/avatares');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `avatar_${req.user.id}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Apenas imagens são aceitas.'));
    }
    cb(null, true);
  },
});

// GET /perfil/:id — perfil público de qualquer membro da turma
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.nome, u.usuario, u.role, u.iniciais,
              u.bio, u.avatar_url, u.criado_em AS "criadoEm",
              u.ultimo_login AS "ultimoLogin"
         FROM usuarios u
        WHERE u.id = $1 AND u.turma_id = $2`,
      [req.params.id, req.user.turma_id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Usuário não encontrado.' });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
});

// PUT /perfil/me — atualiza bio do próprio perfil
router.put('/me', auth, async (req, res) => {
  const { bio } = req.body;
  if (typeof bio !== 'string') return res.status(400).json({ message: 'Bio inválida.' });
  const bioLimpa = bio.trim().slice(0, 300);
  try {
    const { rows } = await pool.query(
      `UPDATE usuarios SET bio = $1 WHERE id = $2
       RETURNING id, nome, usuario, role, iniciais, bio, avatar_url`,
      [bioLimpa, req.user.id]
    );
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao salvar bio.' });
  }
});

// POST /perfil/me/avatar — faz upload de foto de perfil
router.post('/me/avatar', auth, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Nenhuma imagem enviada.' });
  const avatarUrl = `/uploads/avatares/${req.file.filename}`;
  try {
    await pool.query(
      `UPDATE usuarios SET avatar_url = $1 WHERE id = $2`,
      [avatarUrl, req.user.id]
    );
    return res.json({ avatar_url: avatarUrl });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao salvar avatar.' });
  }
});

module.exports = router;
