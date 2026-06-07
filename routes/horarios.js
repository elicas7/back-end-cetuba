// routes/horarios.js
const router = require('express').Router();
const pool   = require('../db');
const { auth } = require('../middleware/auth');

// Middleware: líder, ajudante_dev ou dev
function podeEditarHorario(req, res, next) {
  const permitidos = ['lider', 'ajudante_dev', 'dev'];
  if (!permitidos.includes(req.user.role))
    return res.status(403).json({ message: 'Sem permissão.' });
  next();
}

// Grade padrão usada quando não há nada salvo no banco
const GRADE_PADRAO = {
  periodos: [
    '7h00–7h50', '7h50–8h40', '8h40–9h30',
    'INTERVALO',
    '9h50–10h40', '10h40–11h30'
  ],
  aulas: [
    // [seg, ter, qua, qui, sex]
    ['Matemática',  'Português',  'Ciências',   'História',   'Geografia'],
    ['Português',   'Inglês',     'Matemática',  'Ciências',   'Ed. Física'],
    ['História',    'Matemática', 'Geografia',   'Português',  'Artes'],
    null, // intervalo
    ['Geografia',   'Ciências',   'Português',   'Matemática', 'História'],
    ['Ed. Física',  'Artes',      'Inglês',      'Geografia',  'Matemática'],
  ]
};

// GET /horarios — qualquer logado
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT grade FROM horarios WHERE turma_id = $1 LIMIT 1`,
      [req.user.turma_id]
    );
    const grade = rows[0]?.grade || GRADE_PADRAO;
    return res.json(grade);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao buscar horários.' });
  }
});

// PUT /horarios — líder, ajudante_dev, dev
router.put('/', auth, podeEditarHorario, async (req, res) => {
  const { periodos, aulas } = req.body;
  if (!periodos || !aulas)
    return res.status(400).json({ message: 'Dados inválidos.' });
  try {
    await pool.query(
      `INSERT INTO horarios (turma_id, grade)
       VALUES ($1, $2)
       ON CONFLICT (turma_id) DO UPDATE SET grade = $2, atualizado_em = NOW()`,
      [req.user.turma_id, JSON.stringify({ periodos, aulas })]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao salvar horários.' });
  }
});

module.exports = router;
