# Implementar Soft Delete para Combos

## Problema resuelto

Error al eliminar combos que están en pedidos:

```
update or delete on table "combo" violates foreign key constraint "order_detail_combo_id_fkey" on table "order_detail"
```

## Solución: Soft Delete

En lugar de **eliminar físicamente** el combo (DELETE), se **desactiva lógicamente** (UPDATE active = false).

### Ventajas

✅ No pierde histórico de pedidos  
✅ Los pedidos antiguos siguen mostrando qué combo ordenaron  
✅ Es reversible (se puede reactivar)  
✅ Mantiene integridad referencial

---

## Pasos para implementar

### 1. Ejecutar la migración SQL

Opción A — **Supabase Dashboard**:

1. Ir a **SQL Editor** en Supabase
2. Copiar contenido de `add_soft_delete_to_combo.sql`
3. Ejecutar

Opción B — **CLI local**:

```bash
# Si tienes Supabase CLI configurado
supabase migration up
```

Opción C — **Ejecutar directamente** (si tienes acceso a postgres):

```bash
psql -U postgres -d tu_database -f supabase/migrations/add_soft_delete_to_combo.sql
```

---

### 2. Verificar cambios aplicados

En Supabase SQL Editor ejecuta:

```sql
-- Ver estructura de la tabla
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'combo';

-- Ver combos activos
SELECT combo_id, name, active FROM combo;
```

Deberías ver la columna `active` (boolean, default true).

---

### 3. Código ya actualizado ✅

El código ya está modificado para:

- ✅ `deleteCombo()` hace UPDATE active=false (no DELETE)
- ✅ `page.tsx` filtra solo combos activos (.eq("active", true))
- ✅ Tipo `Combo` incluye campo `active`

---

## Prueba

1. **Ejecuta la migración** (paso 1)
2. **Recarga la página** de combos en admin
3. **Intenta eliminar** un combo que esté en pedidos → ahora funcionará
4. El combo **desaparece de la lista** (porque solo muestra activos)
5. En la DB sigue existiendo con `active = false`

---

## Reactivar un combo eliminado

Si necesitas reactivar un combo "eliminado":

```sql
UPDATE combo
SET active = true
WHERE combo_id = <ID>;
```

O crea una función de admin para reactivar combos.

---

## Rollback (si algo sale mal)

```sql
-- Eliminar columna active
ALTER TABLE combo DROP COLUMN IF EXISTS active;
DROP INDEX IF EXISTS idx_combo_active;
```

Y revertir cambios en código (git checkout).
