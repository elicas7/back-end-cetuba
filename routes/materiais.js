// src/routes/materiais.js
const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const pool   = require('../db');
const { auth, podeEditar } = require('../middleware/auth');

// ── Configuração do Multer ─────────────────────────────
const uploadsDir = process.env.UPLOADS_DIR || './uploads';
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf','.doc','.docx','.ppt','.pptx','.xls','.xlsx','.zip','.jpg','.png','.mp4'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Tipo de arquivo não permitido.'));
  },
});

function guessType(ext) {
  if (['.pdf'].includes(ext))              return 'pdf';
  if (['.jpg','.jpeg','.png','.gif'].includes(ext)) return 'imagem';
  if (['.mp4','.mov','.webm'].includes(ext))        return 'video';
  return 'outro';
}

// GET /materiais
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id, m.nome, m.disciplina, m.tipo,
              m.tamanho, m.url_arquivo AS url,
              u.nome AS "enviadoPor", m.criado_em AS "criadoEm"
         FROM materiais m
         LEFT JOIN usuarios u ON u.id = m.enviado_por
        WHERE m.turma_id = $1
        ORDER BY m.criado_em DESC`,
      [req.user.turma_id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao buscar materiais.' });
  }
});

// POST /materiais (multipart/form-data)
router.post('/', auth, podeEditar, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Arquivo obrigatório.' });

  const { disciplina = 'Geral', nome } = req.body;
  const ext  = path.extname(req.file.originalname).toLowerCase();
  const tipo = guessType(ext);
  const nomeArquivo = nome?.trim() || path.basename(req.file.originalname, ext);
  const urlArquivo  = `/uploads/${req.file.filename}`;

  try {
    const { rows } = await pool.query(
      `INSERT INTO materiais (nome, disciplina, tipo, tamanho, url_arquivo, enviado_por, turma_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nome, disciplina, tipo, tamanho, url_arquivo AS url, criado_em AS "criadoEm"`,
      [nomeArquivo, disciplina, tipo, req.file.size, urlArquivo, req.user.id, req.user.turma_id]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao salvar material.' });
  }
});

// DELETE /materiais/:id
router.delete('/:id', auth, podeEditar, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM materiais WHERE id = $1 AND turma_id = $2 RETURNING url_arquivo`,
      [req.params.id, req.user.turma_id]
    );
    if (rows[0]?.url_arquivo) {
      const filePath = path.join(uploadsDir, path.basename(rows[0].url_arquivo));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao deletar material.' });
  }
});

module.exports = router;
