-- Adicionar coluna de gradiente no perfil
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accent_gradient TEXT;

-- Valor padrão: gradiente cyan-blue (tema atual)
UPDATE profiles 
SET accent_gradient = 'linear-gradient(135deg, #06B6D4, #3B82F6)' 
WHERE accent_gradient IS NULL;