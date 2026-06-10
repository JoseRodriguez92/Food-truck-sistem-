-- ══════════════════════════════════════════════════════════════════════════════
-- Sistema de Control de Gastos Compartidos entre Administradores
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Crear tabla de gastos ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expense (
  expense_id BIGSERIAL PRIMARY KEY,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'ingredientes',
    'salarios',
    'servicios',
    'mantenimiento',
    'transporte',
    'otro'
  )),
  receipt_url TEXT NOT NULL, -- Comprobante obligatorio
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',     -- Pendiente de normalizar
    'normalized',  -- Dividido entre admins
    'paid',        -- Todos pagaron
    'cancelled'    -- Cancelado
  )),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  normalized_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- Índices para mejor performance
CREATE INDEX idx_expense_status ON expense(status);
CREATE INDEX idx_expense_created_by ON expense(created_by);
CREATE INDEX idx_expense_created_at ON expense(created_at DESC);
CREATE INDEX idx_expense_category ON expense(category);

-- ─── 2. Crear tabla de pagos individuales ────────────────────────────────────

CREATE TABLE IF NOT EXISTS expense_payment (
  payment_id BIGSERIAL PRIMARY KEY,
  expense_id BIGINT NOT NULL REFERENCES expense(expense_id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',  -- Pendiente de pago
    'paid'      -- Pagado
  )),
  payment_receipt_url TEXT, -- Comprobante de pago individual (opcional)
  paid_at TIMESTAMPTZ,
  
  -- Un admin solo puede tener un pago por gasto
  UNIQUE(expense_id, admin_id)
);

-- Índices
CREATE INDEX idx_expense_payment_expense ON expense_payment(expense_id);
CREATE INDEX idx_expense_payment_admin ON expense_payment(admin_id);
CREATE INDEX idx_expense_payment_status ON expense_payment(status);

-- ─── 3. Trigger para actualizar estado del gasto ─────────────────────────────

-- Función que actualiza el estado del gasto cuando todos pagan
CREATE OR REPLACE FUNCTION update_expense_status()
RETURNS TRIGGER AS $$
DECLARE
  total_payments INT;
  paid_payments INT;
BEGIN
  -- Contar pagos totales y pagados para este gasto
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'paid')
  INTO total_payments, paid_payments
  FROM expense_payment
  WHERE expense_id = NEW.expense_id;
  
  -- Si todos pagaron, marcar gasto como paid
  IF total_payments > 0 AND total_payments = paid_payments THEN
    UPDATE expense
    SET 
      status = 'paid',
      paid_at = NOW()
    WHERE expense_id = NEW.expense_id
      AND status = 'normalized';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que se ejecuta después de INSERT o UPDATE en expense_payment
DROP TRIGGER IF EXISTS trg_update_expense_status ON expense_payment;
CREATE TRIGGER trg_update_expense_status
  AFTER INSERT OR UPDATE OF status
  ON expense_payment
  FOR EACH ROW
  EXECUTE FUNCTION update_expense_status();

-- ─── 4. Función para normalizar gastos pendientes ────────────────────────────

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
  
  -- Contar administradores activos
  SELECT COUNT(DISTINCT p.id)
  INTO admin_count
  FROM profiles p
  INNER JOIN profile_has_role phr ON p.id = phr.profile_id
  INNER JOIN roles r ON phr.role_id = r.role_id
  WHERE r.name = 'Administrador'
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
      WHERE r.name = 'Administrador'
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
$$ LANGUAGE plpgsql;

-- ─── 5. Vistas útiles ─────────────────────────────────────────────────────────

-- Vista de gastos con información del creador
CREATE OR REPLACE VIEW v_expenses_with_creator AS
SELECT 
  e.*,
  p.first_name || ' ' || COALESCE(p.last_name, '') AS created_by_name,
  p.email AS created_by_email
FROM expense e
INNER JOIN profiles p ON e.created_by = p.id;

-- Vista de pagos con información del admin
CREATE OR REPLACE VIEW v_expense_payments_with_admin AS
SELECT 
  ep.*,
  p.first_name || ' ' || COALESCE(p.last_name, '') AS admin_name,
  p.email AS admin_email
FROM expense_payment ep
INNER JOIN profiles p ON ep.admin_id = p.id;

-- Vista de resumen de gastos por admin
CREATE OR REPLACE VIEW v_admin_expense_summary AS
SELECT 
  ep.admin_id,
  p.first_name || ' ' || COALESCE(p.last_name, '') AS admin_name,
  COUNT(*) FILTER (WHERE ep.status = 'pending') AS pending_count,
  SUM(ep.amount) FILTER (WHERE ep.status = 'pending') AS pending_amount,
  COUNT(*) FILTER (WHERE ep.status = 'paid') AS paid_count,
  SUM(ep.amount) FILTER (WHERE ep.status = 'paid') AS paid_amount
FROM expense_payment ep
INNER JOIN profiles p ON ep.admin_id = p.id
GROUP BY ep.admin_id, admin_name;

-- ─── 6. RLS (Row Level Security) ─────────────────────────────────────────────

-- Habilitar RLS
ALTER TABLE expense ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_payment ENABLE ROW LEVEL SECURITY;

-- Políticas para expense: solo admins pueden ver/crear/editar
CREATE POLICY "Admins pueden ver todos los gastos"
  ON expense FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profile_has_role phr
      INNER JOIN roles r ON phr.role_id = r.role_id
      WHERE phr.profile_id = auth.uid()
        AND r.name = 'Administrador'
    )
  );

CREATE POLICY "Admins pueden crear gastos"
  ON expense FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profile_has_role phr
      INNER JOIN roles r ON phr.role_id = r.role_id
      WHERE phr.profile_id = auth.uid()
        AND r.name = 'Administrador'
    )
  );

CREATE POLICY "Solo creador puede editar gasto pendiente"
  ON expense FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND status = 'pending'
  );

CREATE POLICY "Solo creador puede eliminar gasto pendiente"
  ON expense FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND status = 'pending'
  );

-- Políticas para expense_payment: admins pueden ver sus pagos
CREATE POLICY "Admins pueden ver sus pagos"
  ON expense_payment FOR SELECT
  TO authenticated
  USING (
    admin_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profile_has_role phr
      INNER JOIN roles r ON phr.role_id = r.role_id
      WHERE phr.profile_id = auth.uid()
        AND r.name = 'Administrador'
    )
  );

CREATE POLICY "Admins pueden actualizar estado de sus pagos"
  ON expense_payment FOR UPDATE
  TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- ─── 7. Comentarios para documentación ───────────────────────────────────────

COMMENT ON TABLE expense IS 'Registro de gastos del negocio';
COMMENT ON TABLE expense_payment IS 'Pagos individuales de cada administrador';
COMMENT ON FUNCTION normalize_pending_expenses IS 'Divide gastos pendientes entre administradores activos';
COMMENT ON FUNCTION update_expense_status IS 'Actualiza estado del gasto cuando todos los admins pagan';

-- ═══════════════════════════════════════════════════════════════════════════════
-- Fin de migración
-- ═══════════════════════════════════════════════════════════════════════════════

-- Para crear el bucket de Storage, ejecutar en Dashboard de Supabase:
/*
  1. Storage > New bucket
  2. Name: expense-receipts
  3. Public: false
  4. File size limit: 5 MB
  5. Allowed MIME types: image/jpeg, image/png, image/webp, application/pdf
*/
