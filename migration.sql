-- ═══════════════════════════════════════════════════════════
--  MIGRATION — Perfis + Logs + Sessões Online
--  Execute no console SQL do Neon
-- ═══════════════════════════════════════════════════════════

-- 1. Novas colunas na tabela usuarios
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS bio          TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT,
  ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS online_at    TIMESTAMPTZ;

-- 2. Tabela de logs de atividade
CREATE TABLE IF NOT EXISTS logs (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  turma_id    INTEGER,
  acao        TEXT NOT NULL,          -- ex: 'resumo:criar', 'aviso:deletar'
  descricao   TEXT,                   -- ex: 'Criou resumo "Biologia cap 3"'
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS logs_turma_idx   ON logs(turma_id);
CREATE INDEX IF NOT EXISTS logs_usuario_idx ON logs(usuario_id);
-- 3. Tabela de atualizações do sistema
CREATE TABLE IF NOT EXISTS atualizacoes (
  id         SERIAL PRIMARY KEY,
  titulo     TEXT NOT NULL,
  corpo      TEXT NOT NULL,
  tipo       TEXT NOT NULL DEFAULT 'novidade', -- novidade | melhoria | correcao | aviso
  versao     TEXT,
  autor_id   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);


-- 4. Tabela de bugs reportados
CREATE TABLE IF NOT EXISTS bugs (
  id          SERIAL PRIMARY KEY,
  titulo      TEXT NOT NULL,
  descricao   TEXT NOT NULL,
  pagina      TEXT,
  prioridade  TEXT NOT NULL DEFAULT 'medio',  -- baixo | medio | alto | critico
  status      TEXT NOT NULL DEFAULT 'aberto', -- aberto | em_analise | resolvido | ignorado
  autor_id    INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  turma_id    INTEGER,
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bugs_turma_idx ON bugs(turma_id);

-- 5. Tabela de horários (grade semanal por turma)
CREATE TABLE IF NOT EXISTS horarios (
  turma_id      INTEGER PRIMARY KEY,
  grade         JSONB NOT NULL,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Comentários em resumos
ALTER TABLE resumos ADD COLUMN IF NOT EXISTS total_comentarios INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS comentarios (
  id         SERIAL PRIMARY KEY,
  resumo_id  INTEGER NOT NULL REFERENCES resumos(id) ON DELETE CASCADE,
  autor_id   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  corpo      TEXT NOT NULL,
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS coment_resumo_idx ON comentarios(resumo_id);

-- 7. Notificações
CREATE TABLE IF NOT EXISTS notificacoes (
  id        SERIAL PRIMARY KEY,
  turma_id  INTEGER NOT NULL,
  tipo      TEXT NOT NULL DEFAULT 'geral',
  titulo    TEXT NOT NULL,
  corpo     TEXT,
  lida      BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notif_turma_idx ON notificacoes(turma_id, lida);

-- 8. Contador de downloads em materiais
ALTER TABLE materiais ADD COLUMN IF NOT EXISTS downloads INTEGER DEFAULT 0;

-- 9. Entregas em provas/eventos
CREATE TABLE IF NOT EXISTS entregas (
  id          SERIAL PRIMARY KEY,
  prova_id    INTEGER REFERENCES provas(id) ON DELETE CASCADE,
  usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  entregue_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prova_id, usuario_id)
);
