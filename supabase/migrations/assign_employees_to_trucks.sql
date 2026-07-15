-- ============================================================
-- Asignar empleados a food trucks + restricción dura por RLS
-- ============================================================
-- Un empleado (o cualquier rol que no sea Client) puede quedar
-- asignado a uno o varios food trucks. A partir de ahí, sus pedidos
-- (lectura/escritura) quedan restringidos a esos trucks a nivel de
-- base de datos (RLS), no solo en la UI.
--
-- El rol Admin (roles.code = 'admin') sigue viendo/gestionando todo,
-- sin importar la tabla de asignaciones.
--
-- ⚠️ Antes de correr esto en producción: revisá en el dashboard de
-- Supabase si `profile_has_order` ya tiene políticas RLS propias.
-- El código actual filtra manualmente por profile_id en las queries
-- (no depende de RLS), lo que sugiere que hoy no hay RLS activo ahí
-- — pero conviene confirmarlo antes de habilitarlo, para no chocar
-- con una política existente que no sabemos que existe.

-- ============================================================
-- 1. TABLA: profile_has_food_truck (N:N empleado ↔ truck)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profile_has_food_truck (
    profile_food_truck_id SERIAL PRIMARY KEY,
    profile_id     UUID   NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    food_truck_id  BIGINT NOT NULL REFERENCES public.food_truck(food_truck_id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_profile_food_truck UNIQUE (profile_id, food_truck_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_has_food_truck_profile ON public.profile_has_food_truck(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_has_food_truck_truck   ON public.profile_has_food_truck(food_truck_id);

COMMENT ON TABLE public.profile_has_food_truck IS
  'Asignación de empleados a food trucks. Un empleado puede tener varios.';


-- ============================================================
-- 2. FUNCIONES DE ACCESO
-- ============================================================

-- ¿Es admin? (ve/gestiona todo sin importar asignaciones)
CREATE OR REPLACE FUNCTION public.is_admin(p_profile_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profile_has_role phr
    JOIN public.roles r ON r.role_id = phr.role_id
    WHERE phr.profile_id = p_profile_id
      AND r.code = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ¿Tiene acceso a este truck? (admin siempre, o asignación directa)
-- BIGINT porque food_truck_id/location_id son bigint en este proyecto
-- (identity columns creadas desde Supabase Studio) — no INT.
-- Si un intento anterior creó la versión con INT, la eliminamos primero:
-- CREATE OR REPLACE no reemplaza una función si cambia el tipo de los
-- argumentos, crea un overload nuevo y deja la vieja huérfana.
DROP FUNCTION IF EXISTS public.has_truck_access(INT, UUID);
DROP FUNCTION IF EXISTS public.can_access_order_location(INT, UUID);

CREATE OR REPLACE FUNCTION public.has_truck_access(p_food_truck_id BIGINT, p_profile_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT public.is_admin(p_profile_id) OR EXISTS (
    SELECT 1
    FROM public.profile_has_food_truck pft
    WHERE pft.profile_id = p_profile_id
      AND pft.food_truck_id = p_food_truck_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ¿Tiene acceso a esta ubicación? (vía el truck dueño de la ubicación)
CREATE OR REPLACE FUNCTION public.can_access_order_location(p_location_id BIGINT, p_profile_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT p_location_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.location l
    WHERE l.location_id = p_location_id
      AND public.has_truck_access(l.food_truck_id, p_profile_id)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ¿Puede ver/tocar este pedido? (dueño del pedido, admin, o staff con acceso al truck)
CREATE OR REPLACE FUNCTION public.can_access_order(p_profile_order_id UUID, p_profile_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profile_has_order o
    WHERE o.profile_order_id = p_profile_order_id
      AND (
        o.profile_id = p_profile_id
        OR public.is_admin(p_profile_id)
        OR public.can_access_order_location(o.location_id, p_profile_id)
      )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ============================================================
-- 3. RLS: profile_has_order
-- ============================================================

ALTER TABLE public.profile_has_order ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_scoped" ON public.profile_has_order;
CREATE POLICY "orders_select_scoped" ON public.profile_has_order
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_admin()
    OR public.can_access_order_location(location_id)
  );

DROP POLICY IF EXISTS "orders_insert_scoped" ON public.profile_has_order;
CREATE POLICY "orders_insert_scoped" ON public.profile_has_order
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    OR public.is_admin()
    OR public.can_access_order_location(location_id)
  );

DROP POLICY IF EXISTS "orders_update_scoped" ON public.profile_has_order;
CREATE POLICY "orders_update_scoped" ON public.profile_has_order
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR public.can_access_order_location(location_id)
  )
  WITH CHECK (
    public.is_admin()
    OR public.can_access_order_location(location_id)
  );


-- ============================================================
-- 4. RLS: order_detail (vía el pedido dueño)
-- ============================================================

ALTER TABLE public.order_detail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_detail_select_scoped" ON public.order_detail;
CREATE POLICY "order_detail_select_scoped" ON public.order_detail
  FOR SELECT TO authenticated
  USING (public.can_access_order(profile_order_id));

DROP POLICY IF EXISTS "order_detail_insert_scoped" ON public.order_detail;
CREATE POLICY "order_detail_insert_scoped" ON public.order_detail
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_order(profile_order_id));


-- ============================================================
-- 5. RLS: order_has_status (historial, vía el pedido dueño)
-- ============================================================

ALTER TABLE public.order_has_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_has_status_select_scoped" ON public.order_has_status;
CREATE POLICY "order_has_status_select_scoped" ON public.order_has_status
  FOR SELECT TO authenticated
  USING (public.can_access_order(profile_order_id));

DROP POLICY IF EXISTS "order_has_status_insert_scoped" ON public.order_has_status;
CREATE POLICY "order_has_status_insert_scoped" ON public.order_has_status
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_order(profile_order_id));


-- ============================================================
-- NOTAS
-- ============================================================
-- • Pedidos online sin location_id (el cliente entró sin ?location=X)
--   quedan visibles solo para admin y para el propio cliente — un
--   empleado asignado a un truck específico no los verá hasta que
--   tengan ubicación. Si esto molesta en la práctica, se puede hacer
--   location_id obligatorio en el checkout más adelante.
-- • Esto NO toca RLS de `location` ni `food_truck` — el catálogo de
--   ubicaciones/trucks sigue siendo de lectura abierta. Si más
--   adelante también querés ocultarle a un empleado los trucks que
--   no son suyos (no solo los pedidos), es un paso aparte.
