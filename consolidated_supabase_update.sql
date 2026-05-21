-- ==============================================================
-- QualityTracker - Consolidated Schema Migration Script
-- INSTRUÇÕES:
-- 1. Abra o painel do Supabase (https://supabase.com).
-- 2. Vá para a seção "SQL Editor" no menu lateral esquerdo.
-- 3. Clique em "New query" (Nova consulta).
-- 4. Cole TODO o conteúdo deste arquivo no editor.
-- 5. Clique em "Run" (Executar) no canto inferior direito.
-- ==============================================================

-- 1. ADICIONAR COLUNAS DE CUSTO E CONTROLE DE QUALIDADE NA TABELA 'ISSUES' (SE NÃO EXISTIREM)
ALTER TABLE issues ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ABERTA' CHECK (status IN ('ABERTA', 'FINALIZADA'));
ALTER TABLE issues ADD COLUMN IF NOT EXISTS people_involved NUMERIC DEFAULT 1;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';
ALTER TABLE issues ADD COLUMN IF NOT EXISTS material_cost NUMERIC DEFAULT 0;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 0;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS time_spent NUMERIC DEFAULT 0;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0;

-- 2. ADICIONAR NOVAS COLUNAS DE CONFIRMAÇÃO DE RESOLUÇÃO (OPCIONAL PHOTO + DATA DE RESOLUÇÃO)
ALTER TABLE issues ADD COLUMN IF NOT EXISTS resolved_photo TEXT;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- 3. ADICIONAR COLUNAS DE CAUSA RAIZ E AÇÃO CORRETIVA (ISHIKAWA 6M & 5 PORQUÊS)
ALTER TABLE issues ADD COLUMN IF NOT EXISTS root_cause TEXT;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS corrective_action TEXT;

-- 4. ATUALIZAR A TABELA DE USUÁRIOS PARA ACEITAR O NOVO CARGO 'GESTOR_QUALIDADE' (SE REQUERIDO)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('GESTOR', 'PROJETISTA', 'CEO', 'QUALIDADE', 'PROCESSOS', 'GESTOR_QUALIDADE'));

-- Se a sua coluna 'role' for um tipo ENUM customizado no Postgres (menos comum, mas possível):
-- ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'GESTOR_QUALIDADE';
