-- Agregar soft delete a la tabla combo
-- Esto permite "eliminar" combos sin perder el histórico de pedidos

-- 1. Agregar columna active (default true para combos existentes)
ALTER TABLE combo
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 2. Crear índice para consultas filtradas por active
CREATE INDEX IF NOT EXISTS idx_combo_active ON combo(active);

-- 3. Actualizar combos existentes (asegurar que estén activos)
UPDATE combo SET active = true WHERE active IS NULL;

COMMENT ON COLUMN combo.active IS 'Soft delete: false = eliminado lógicamente, true = activo';
