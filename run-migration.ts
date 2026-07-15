/**
 * Script para ejecutar migración de soft delete en tabla combo
 * Ejecutar con: npx tsx run-migration.ts
 */

import { createClient } from "@supabase/supabase-js";

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Faltan variables de entorno:");
    console.error("  - NEXT_PUBLIC_SUPABASE_URL");
    console.error(
      "  - SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  console.log("🚀 Ejecutando migración: add_soft_delete_to_combo.sql\n");

  try {
    // 1. Verificar si la columna ya existe
    console.log("📋 Verificando estado actual de la tabla combo...");
    const { data: testData } = await supabase
      .from("combo")
      .select("*")
      .limit(1);

    // @ts-ignore - verificar si active ya existe
    if (testData && testData[0] && "active" in testData[0]) {
      console.log("⚠️  La columna 'active' ya existe en la tabla combo");
      console.log("✅ Migración ya aplicada anteriormente");
      process.exit(0);
    }

    console.log(
      "📝 La columna 'active' no existe, procediendo con migración...\n",
    );

    // 2. Usar SQL directo si está disponible
    // Nota: esto requiere permisos de SERVICE_ROLE
    console.log("⚠️  IMPORTANTE:");
    console.log(
      "   Esta migración requiere ejecutarse desde Supabase Dashboard",
    );
    console.log("   o con SERVICE_ROLE_KEY (no con ANON_KEY)\n");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("SQL a ejecutar en Supabase Dashboard > SQL Editor:\n");
    console.log(`
-- 1. Agregar columna active
ALTER TABLE combo
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 2. Crear índice
CREATE INDEX IF NOT EXISTS idx_combo_active ON combo(active);

-- 3. Actualizar registros existentes
UPDATE combo SET active = true WHERE active IS NULL;

-- 4. Comentario
COMMENT ON COLUMN combo.active IS 'Soft delete: false = eliminado lógicamente, true = activo';
`);
    console.log(
      "═══════════════════════════════════════════════════════════\n",
    );

    console.log("💡 Pasos:");
    console.log("   1. Copia el SQL de arriba");
    console.log("   2. Ve a Supabase Dashboard > SQL Editor");
    console.log("   3. Pega y ejecuta");
    console.log("   4. Verifica que aparezca 'Success' sin errores\n");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

runMigration();
