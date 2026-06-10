-- ══════════════════════════════════════════════════════════════════════════════
-- Fix: Normalización de gastos (RLS + rol correcto)
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Agregar política INSERT faltante en expense_payment ──────────────────

CREATE POLICY "Sistema puede crear pagos al normalizar"
  ON expense_payment FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Solo admins pueden disparar la normalización que crea pagos
    EXISTS (
      SELECT 1 FROM profile_has_role phr
      INNER JOIN roles r ON phr.role_id = r.role_id
      WHERE phr.profile_id = auth.uid()
        AND r.name = 'Admin'
    )
  );

-- ─── 2. Actualizar políticas RLS de expense (Administrador → Admin) ──────────

DROP POLICY IF EXISTS "Admins pueden ver todos los gastos" ON expense;
CREATE POLICY "Admins pueden ver todos los gastos"
  ON expense FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profile_has_role phr
      INNER JOIN roles r ON phr.role_id = r.role_id
      WHERE phr.profile_id = auth.uid()
        AND r.name = 'Admin'
    )
  );

DROP POLICY IF EXISTS "Admins pueden crear gastos" ON expense;
CREATE POLICY "Admins pueden crear gastos"
  ON expense FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profile_has_role phr
      INNER JOIN roles r ON phr.role_id = r.role_id
      WHERE phr.profile_id = auth.uid()
        AND r.name = 'Admin'
    )
  );

-- ─── 3. Actualizar políticas RLS de expense_payment (Administrador → Admin) ──

DROP POLICY IF EXISTS "Admins pueden ver sus pagos" ON expense_payment;
CREATE POLICY "Admins pueden ver sus pagos"
  ON expense_payment FOR SELECT
  TO authenticated
  USING (
    admin_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profile_has_role phr
      INNER JOIN roles r ON phr.role_id = r.role_id
      WHERE phr.profile_id = auth.uid()
        AND r.name = 'Admin'
    )
  );

-- ─── 4. Recrear función normalize con rol correcto + selección de gastos ─────

CREATE OR REPLACE FUNCTION normalize_selected_expenses(
  expense_ids BIGINT[],  -- Array de IDs de gastos a normalizar
  OUT total_normalized DECIMAL(12, 2),
  OUT expenses_normalized INT,
  OUT payments_created INT
)
AS $$
DECLARE
  admin_count INT;
  expense_record RECORD;
  admin_record RECORD;
  amount_per_admin DECIMAL(12, 2);
BEGIN
  -- Inicializar contadores
  total_normalized := 0;
  expenses_normalized := 0;
  payments_created := 0;
  
  -- Contar administradores activos con rol 'Admin'
  SELECT COUNT(DISTINCT p.id)
  INTO admin_count
  FROM profiles p
  INNER JOIN profile_has_role phr ON p.id = phr.profile_id
  INNER JOIN roles r ON phr.role_id = r.role_id
  WHERE r.name = 'Admin'
    AND p.status = 'active';
  
  -- Si no hay admins, salir
  IF admin_count = 0 THEN
    RAISE EXCEPTION 'No hay administradores activos para normalizar gastos';
  END IF;
  
  -- Procesar cada gasto seleccionado
  FOR expense_record IN
    SELECT expense_id, amount
    FROM expense
    WHERE expense_id = ANY(expense_ids)
      AND status = 'pending'
    ORDER BY created_at
  LOOP
    -- Calcular monto por admin
    amount_per_admin := expense_record.amount / admin_count;
    
    -- Crear registro de pago para cada admin
    FOR admin_record IN
      SELECT DISTINCT p.id
      FROM profiles p
      INNER JOIN profile_has_role phr ON p.id = phr.profile_id
      INNER JOIN roles r ON phr.role_id = r.role_id
      WHERE r.name = 'Admin'
        AND p.status = 'active'
    LOOP
      INSERT INTO expense_payment (expense_id, admin_id, amount, status)
      VALUES (
        expense_record.expense_id,
        admin_record.id,
        amount_per_admin,
        'pending'
      );
      
      payments_created := payments_created + 1;
    END LOOP;
    
    -- Actualizar estado del gasto
    UPDATE expense
    SET 
      status = 'normalized',
      normalized_at = NOW()
    WHERE expense_id = expense_record.expense_id;
    
    total_normalized := total_normalized + expense_record.amount;
    expenses_normalized := expenses_normalized + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mantener la función legacy pero actualizar rol
CREATE OR REPLACE FUNCTION normalize_pending_expenses(
  OUT total_normalized DECIMAL(12, 2),
  OUT expenses_normalized INT,
  OUT payments_created INT
)
AS $$
DECLARE
  admin_count INT;
  expense_record RECORD;
  admin_record RECORD;
  amount_per_admin DECIMAL(12, 2);
BEGIN
  -- Inicializar contadores
  total_normalized := 0;
  expenses_normalized := 0;
  payments_created := 0;
  
  -- Contar administradores activos con rol 'Admin'
  SELECT COUNT(DISTINCT p.id)
  INTO admin_count
  FROM profiles p
  INNER JOIN profile_has_role phr ON p.id = phr.profile_id
  INNER JOIN roles r ON phr.role_id = r.role_id
  WHERE r.name = 'Admin'
    AND p.status = 'active';
  
  -- Si no hay admins, salir
  IF admin_count = 0 THEN
    RAISE EXCEPTION 'No hay administradores activos para normalizar gastos';
  END IF;
  
  -- Procesar cada gasto pendiente
  FOR expense_record IN
    SELECT expense_id, amount
    FROM expense
    WHERE status = 'pending'
    ORDER BY created_at
  LOOP
    -- Calcular monto por admin
    amount_per_admin := expense_record.amount / admin_count;
    
    -- Crear registro de pago para cada admin
    FOR admin_record IN
      SELECT DISTINCT p.id
      FROM profiles p
      INNER JOIN profile_has_role phr ON p.id = phr.profile_id
      INNER JOIN roles r ON phr.role_id = r.role_id
      WHERE r.name = 'Admin'
        AND p.status = 'active'
    LOOP
      INSERT INTO expense_payment (expense_id, admin_id, amount, status)
      VALUES (
        expense_record.expense_id,
        admin_record.id,
        amount_per_admin,
        'pending'
      );
      
      payments_created := payments_created + 1;
    END LOOP;
    
    -- Actualizar estado del gasto
    UPDATE expense
    SET 
      status = 'normalized',
      normalized_at = NOW()
    WHERE expense_id = expense_record.expense_id;
    
    total_normalized := total_normalized + expense_record.amount;
    expenses_normalized := expenses_normalized + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION normalize_selected_expenses IS 'Normaliza gastos seleccionados (por ID) entre admins activos';

-- ═══════════════════════════════════════════════════════════════════════════════
-- Fin de migración
-- ═══════════════════════════════════════════════════════════════════════════════
