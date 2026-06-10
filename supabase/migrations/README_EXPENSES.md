# Sistema de Control de Gastos - Instrucciones de Migración

## 📋 Resumen del Sistema

Sistema de control de gastos compartidos entre administradores del food truck, con división equitativa de costos y seguimiento de pagos individuales.

### Características:

- ✅ Registro de gastos con comprobante obligatorio
- ✅ División automática entre administradores activos
- ✅ Seguimiento de pagos individuales con comprobantes opcionales
- ✅ Estados: Pending → Normalized → Paid
- ✅ Triggers automáticos para actualizar estados
- ✅ RLS habilitado para seguridad

---

## 🔧 Pasos para Ejecutar la Migración

### 1. Crear tablas y funciones

Ejecuta en **SQL Editor** de Supabase:

```bash
supabase/migrations/create_expense_system.sql
```

Esto crea:

- ✅ Tabla `expense`
- ✅ Tabla `expense_payment`
- ✅ Función `normalize_pending_expenses()`
- ✅ Trigger `update_expense_status()`
- ✅ Vistas útiles
- ✅ Políticas RLS

### 2. Crear bucket de Storage

En **Dashboard de Supabase** → Storage:

1. Click "New bucket"
2. Name: `expense-receipts`
3. Public: `false` ❌
4. File size limit: `5 MB`
5. Allowed MIME types:
   - `image/jpeg`
   - `image/png`
   - `image/webp`
   - `application/pdf`
6. Click "Create bucket"

### 3. Aplicar políticas de Storage

Ejecuta en **SQL Editor**:

```bash
supabase/migrations/storage_expense_receipts_policies.sql
```

### 4. Verificar instalación

Ejecuta este query para verificar:

```sql
-- Verificar tablas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('expense', 'expense_payment');

-- Verificar función
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'normalize_pending_expenses';

-- Verificar bucket
SELECT name
FROM storage.buckets
WHERE name = 'expense-receipts';
```

---

## 📊 Estructura de Datos

### Tabla: `expense`

| Campo         | Tipo          | Descripción                                |
| ------------- | ------------- | ------------------------------------------ |
| expense_id    | BIGSERIAL     | ID único                                   |
| amount        | DECIMAL(12,2) | Monto total                                |
| description   | TEXT          | Descripción                                |
| category      | VARCHAR(50)   | Categoría del gasto                        |
| receipt_url   | TEXT          | URL del comprobante (obligatorio)          |
| status        | VARCHAR(20)   | pending \| normalized \| paid \| cancelled |
| created_by    | UUID          | Admin que registró                         |
| created_at    | TIMESTAMPTZ   | Fecha de creación                          |
| normalized_at | TIMESTAMPTZ   | Fecha de división                          |
| paid_at       | TIMESTAMPTZ   | Fecha de pago completo                     |

### Tabla: `expense_payment`

| Campo               | Tipo          | Descripción                    |
| ------------------- | ------------- | ------------------------------ |
| payment_id          | BIGSERIAL     | ID único                       |
| expense_id          | BIGINT        | FK a expense                   |
| admin_id            | UUID          | FK a profiles                  |
| amount              | DECIMAL(12,2) | Parte individual               |
| status              | VARCHAR(20)   | pending \| paid                |
| payment_receipt_url | TEXT          | Comprobante de pago (opcional) |
| paid_at             | TIMESTAMPTZ   | Fecha de pago                  |

---

## 🔄 Flujo de Trabajo

### Paso 1: Registrar Gasto

```sql
-- Admin crea gasto
INSERT INTO expense (amount, description, category, receipt_url, created_by)
VALUES (150000, 'Compra ingredientes', 'ingredientes', 'url...', 'user-uuid');
-- Estado: pending
```

### Paso 2: Normalizar Gastos

```sql
-- Ejecutar normalización (divide entre admins)
SELECT * FROM normalize_pending_expenses();
-- Retorna: total_normalized, expenses_normalized, payments_created
-- Estado: normalized
```

Esto crea automáticamente:

- N registros en `expense_payment` (uno por admin)
- Monto dividido equitativamente
- Estado inicial: pending

### Paso 3: Marcar Pagos Individuales

```sql
-- Admin marca su parte como pagada
UPDATE expense_payment
SET
  status = 'paid',
  paid_at = NOW(),
  payment_receipt_url = 'url...' -- opcional
WHERE payment_id = 123;
```

### Paso 4: Actualización Automática

- Trigger detecta cuando todos los admins pagaron
- Actualiza `expense.status = 'paid'`
- Registra `expense.paid_at`

---

## 📁 Estructura de Storage

```
expense-receipts/
├── originals/
│   └── {expense_id}/
│       └── receipt.pdf          # Comprobante del gasto
│
└── payments/
    └── {payment_id}/
        └── proof.jpg            # Comprobante de pago individual
```

---

## 🔍 Queries Útiles

### Ver gastos con creador

```sql
SELECT * FROM v_expenses_with_creator
ORDER BY created_at DESC;
```

### Ver pagos con información de admin

```sql
SELECT * FROM v_expense_payments_with_admin
WHERE admin_id = 'user-uuid';
```

### Resumen por admin

```sql
SELECT * FROM v_admin_expense_summary;
```

### Total pendiente de pagar por admin

```sql
SELECT
  admin_name,
  pending_amount AS "Mi Deuda"
FROM v_admin_expense_summary
WHERE admin_id = 'user-uuid';
```

---

## ✅ Checklist de Validación

- [ ] Tablas `expense` y `expense_payment` creadas
- [ ] Función `normalize_pending_expenses()` existe
- [ ] Trigger `update_expense_status()` funciona
- [ ] Vistas `v_*` disponibles
- [ ] Bucket `expense-receipts` creado y privado
- [ ] Políticas RLS activas en tablas
- [ ] Políticas Storage configuradas
- [ ] Rol "Administrador" existe en tabla `roles`

---

## 🚀 Siguiente Paso

Regenerar tipos TypeScript:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
```

Luego actualizar UI con las nuevas acciones.
