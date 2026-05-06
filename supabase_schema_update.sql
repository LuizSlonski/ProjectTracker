-- Add new columns to issues table if they don't exist
ALTER TABLE issues ADD COLUMN IF NOT EXISTS people_involved NUMERIC DEFAULT 1;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';
ALTER TABLE issues ADD COLUMN IF NOT EXISTS material_cost NUMERIC DEFAULT 0;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 0;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS time_spent NUMERIC DEFAULT 0;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0;

-- Atualizar a tabela de usuários para aceitar o novo cargo 'GESTOR_QUALIDADE'
-- IMPORTANTE: Execute estes comandos no Editor SQL do Supabase

-- 1. Se você usa uma CHECK constraint (mais comum):
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('GESTOR', 'PROJETISTA', 'CEO', 'QUALIDADE', 'PROCESSOS', 'GESTOR_QUALIDADE'));

-- 2. Se a coluna 'role' for um tipo ENUM (menos comum, mas possível):
-- Descomente a linha abaixo se o comando acima falhar
-- ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'GESTOR_QUALIDADE';

-- Ensure RLS policies allow updates (if RLS is enabled)
-- This is a generic policy, adjust based on your specific RLS setup
-- CREATE POLICY "Enable update for users based on email" ON "public"."issues"
-- AS PERMISSIVE FOR UPDATE
-- TO public
-- USING (true)
-- WITH CHECK (true);
