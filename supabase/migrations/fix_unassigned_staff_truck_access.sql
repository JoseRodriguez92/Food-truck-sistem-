-- ══════════════════════════════════════════════════════════════════════
-- FIX — staff sin truck asignado veía 0 pedidos
-- ══════════════════════════════════════════════════════════════════════
-- assign_employees_to_trucks.sql define has_truck_access() como: admin,
-- o fila explícita en profile_has_food_truck. Un empleado (ej. rol
-- Cocina) sin ninguna fila ahí queda SIN acceso a ningún truck — pero
-- la UI de Usuarios le muestra "Todos (sin restringir)"
-- (components/admin/views/users-view.tsx), prometiendo justo lo
-- contrario. Resultado: RLS le filtra todos los pedidos, la vista
-- Cocina/Pedidos le queda vacía.
--
-- Fix: "staff sin ninguna asignación" = unrestricted de verdad. Staff
-- CON al menos una asignación sigue restringido a esos trucks nomás
-- (comportamiento sin cambios). Clientes (sin fila en profile_has_role)
-- nunca entran por acá — siguen viendo solo lo suyo vía profile_id.
--
-- Ejecutar en Supabase SQL Editor. Idempotente.
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_staff(p_profile_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profile_has_role WHERE profile_id = p_profile_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_truck_access(p_food_truck_id BIGINT, p_profile_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT public.is_admin(p_profile_id)
    OR EXISTS (
      SELECT 1
      FROM public.profile_has_food_truck pft
      WHERE pft.profile_id = p_profile_id
        AND pft.food_truck_id = p_food_truck_id
    )
    OR (
      public.is_staff(p_profile_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.profile_has_food_truck WHERE profile_id = p_profile_id
      )
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
