-- ══════════════════════════════════════════════════════════════════════════════
-- RLS Policies para Storage Bucket: expense-receipts
-- ══════════════════════════════════════════════════════════════════════════════
-- Ejecutar después de crear el bucket en Dashboard de Supabase

-- ─── Política SELECT (ver archivos) ──────────────────────────────────────────

CREATE POLICY "Admins pueden ver comprobantes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND EXISTS (
      SELECT 1 FROM profile_has_role phr
      INNER JOIN roles r ON phr.role_id = r.role_id
      WHERE phr.profile_id = auth.uid()
        AND r.name = 'Administrador'
    )
  );

-- ─── Política INSERT (subir archivos) ────────────────────────────────────────

CREATE POLICY "Admins pueden subir comprobantes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'expense-receipts'
    AND EXISTS (
      SELECT 1 FROM profile_has_role phr
      INNER JOIN roles r ON phr.role_id = r.role_id
      WHERE phr.profile_id = auth.uid()
        AND r.name = 'Administrador'
    )
  );

-- ─── Política UPDATE (reemplazar archivos) ───────────────────────────────────

CREATE POLICY "Admins pueden actualizar sus comprobantes"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND owner = auth.uid()
  );

-- ─── Política DELETE (eliminar archivos) ─────────────────────────────────────

CREATE POLICY "Admins pueden eliminar sus comprobantes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND owner = auth.uid()
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- Notas de implementación
-- ═══════════════════════════════════════════════════════════════════════════════

/*
ESTRUCTURA DE CARPETAS:

expense-receipts/
├── originals/
│   └── {expense_id}/
│       └── receipt.{ext}          (Comprobante del gasto original)
│
└── payments/
    └── {payment_id}/
        └── proof.{ext}            (Comprobante de pago individual)


FLUJO DE SUBIDA:

1. Crear gasto:
   - Usuario sube archivo
   - Se guarda en: originals/{expense_id}/receipt.{ext}
   - URL se guarda en expense.receipt_url

2. Marcar como pagado:
   - Admin puede subir comprobante (opcional)
   - Se guarda en: payments/{payment_id}/proof.{ext}
   - URL se guarda en expense_payment.payment_receipt_url


EJEMPLO DE USO EN CÓDIGO:

const { data, error } = await supabase.storage
  .from('expense-receipts')
  .upload(`originals/${expenseId}/receipt.pdf`, file, {
    cacheControl: '3600',
    upsert: false
  });

const { data: { publicUrl } } = supabase.storage
  .from('expense-receipts')
  .getPublicUrl(`originals/${expenseId}/receipt.pdf`);
*/
