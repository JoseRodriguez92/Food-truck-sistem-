-- ============================================================
-- RBAC SYSTEM — 3 Street Food
-- Módulos + Permisos + Roles granulares
-- ============================================================
--
-- Adaptado del sistema RBAC de CENDA App (lib/database/migrations/rbac_system.sql)
-- a las tablas ya existentes en este proyecto:
--   - public.roles            (role_id uuid, name, description)
--   - public.profiles         (id uuid → auth.users)
--   - public.profile_has_role (profile_id uuid, role_id uuid)  ← relación N:N ya usada
--
-- ARQUITECTURA:
--
--   profiles 1───N profile_has_role N───1 roles
--                                          │
--                                          │ 1
--                                          ▼ N
--                                   role_permission
--                                     │         │
--                          ┌──────────┘         └──────────┐
--                          ▼ 1                              ▼ 1
--                      modules ◄── parent_id (self)   permissions
--
-- ============================================================


-- ============================================================
-- 0. ROLES: agregar columna `code` (falta hoy, solo hay `name`)
-- ============================================================
-- `code` identifica el rol de forma estable en código (ej: 'admin', 'staff'),
-- independiente de si alguien renombra el `name` visible.

ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS code varchar(50);

UPDATE public.roles
SET code = lower(regexp_replace(trim(name), '\s+', '_', 'g'))
WHERE code IS NULL;

ALTER TABLE public.roles ALTER COLUMN code SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_roles_code'
    ) THEN
        ALTER TABLE public.roles ADD CONSTRAINT uk_roles_code UNIQUE (code);
    END IF;
END $$;


-- ============================================================
-- 1. TABLA: modules (secciones/módulos de la app admin)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(100) NOT NULL UNIQUE,          -- 'catalog', 'catalog.products'
    name VARCHAR(150) NOT NULL,                  -- 'Catálogo', 'Productos'
    description TEXT,

    parent_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,

    icon VARCHAR(100),                           -- nombre ícono lucide-react
    route VARCHAR(255),                          -- '/admin/products'
    display_order INT DEFAULT 0,

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modules_code ON public.modules(code);
CREATE INDEX IF NOT EXISTS idx_modules_parent ON public.modules(parent_id);
CREATE INDEX IF NOT EXISTS idx_modules_active ON public.modules(is_active) WHERE is_active = true;

COMMENT ON TABLE public.modules IS 'Módulos/secciones del panel admin para control de acceso';
COMMENT ON COLUMN public.modules.code IS 'Código jerárquico único (ej: catalog.products)';


-- ============================================================
-- 2. TABLA: permissions (catálogo de acciones)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(50) NOT NULL UNIQUE,            -- 'create', 'read', 'update', 'delete', 'manage'
    name VARCHAR(100) NOT NULL,
    description TEXT,

    category VARCHAR(50) DEFAULT 'crud',         -- 'crud', 'workflow', 'report', 'admin'

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_code ON public.permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON public.permissions(category);

COMMENT ON TABLE public.permissions IS 'Catálogo de acciones disponibles por módulo';


-- ============================================================
-- 3. TABLA: role_permission (rol × módulo × permiso)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.role_permission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    role_id UUID NOT NULL REFERENCES public.roles(role_id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,

    conditions JSONB DEFAULT '{}',               -- condiciones opcionales (filtros, límites)
    is_active BOOLEAN DEFAULT true,

    granted_by UUID REFERENCES public.profiles(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uk_role_module_permission UNIQUE (role_id, module_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permission_role ON public.role_permission(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_module ON public.role_permission(module_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_permission ON public.role_permission(permission_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_active ON public.role_permission(is_active) WHERE is_active = true;

COMMENT ON TABLE public.role_permission IS 'Asignación de permisos a roles por módulo';


-- ============================================================
-- 4. TRIGGERS: updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION public.rbac_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_modules_updated_at ON public.modules;
CREATE TRIGGER trg_modules_updated_at
    BEFORE UPDATE ON public.modules
    FOR EACH ROW EXECUTE FUNCTION public.rbac_set_updated_at();

DROP TRIGGER IF EXISTS trg_permissions_updated_at ON public.permissions;
CREATE TRIGGER trg_permissions_updated_at
    BEFORE UPDATE ON public.permissions
    FOR EACH ROW EXECUTE FUNCTION public.rbac_set_updated_at();

DROP TRIGGER IF EXISTS trg_role_permission_updated_at ON public.role_permission;
CREATE TRIGGER trg_role_permission_updated_at
    BEFORE UPDATE ON public.role_permission
    FOR EACH ROW EXECUTE FUNCTION public.rbac_set_updated_at();


-- ============================================================
-- 5. VISTAS
-- ============================================================

-- Jerarquía de módulos con path completo
CREATE OR REPLACE VIEW public.v_module_hierarchy AS
WITH RECURSIVE module_tree AS (
    SELECT
        id, code, name, parent_id, icon, route, display_order, is_active,
        1 AS level,
        code::TEXT AS full_path,
        name::TEXT AS full_name_path,
        ARRAY[id] AS path_ids
    FROM public.modules
    WHERE parent_id IS NULL

    UNION ALL

    SELECT
        m.id, m.code, m.name, m.parent_id, m.icon, m.route, m.display_order, m.is_active,
        mt.level + 1,
        (mt.full_path || '.' || m.code)::TEXT,
        (mt.full_name_path || ' > ' || m.name)::TEXT,
        mt.path_ids || m.id
    FROM public.modules m
    JOIN module_tree mt ON m.parent_id = mt.id
)
SELECT * FROM module_tree ORDER BY full_path;

COMMENT ON VIEW public.v_module_hierarchy IS 'Módulos con jerarquía y path completo';


-- Permisos efectivos de cada usuario (vía sus roles en profile_has_role)
CREATE OR REPLACE VIEW public.v_user_effective_permissions AS
SELECT DISTINCT
    phr.profile_id,
    m.id   AS module_id,
    m.code AS module_code,
    m.name AS module_name,
    p.id   AS permission_id,
    p.code AS permission_code,
    p.name AS permission_name,
    'role' AS source,
    r.name AS source_name
FROM public.profile_has_role phr
JOIN public.roles r ON r.role_id = phr.role_id
JOIN public.role_permission rp ON rp.role_id = r.role_id AND rp.is_active = true
JOIN public.modules m ON m.id = rp.module_id AND m.is_active = true
JOIN public.permissions p ON p.id = rp.permission_id AND p.is_active = true;

COMMENT ON VIEW public.v_user_effective_permissions IS 'Permisos efectivos por usuario, derivados de sus roles';


-- ============================================================
-- 6. FUNCIONES
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_permission(
    p_profile_id UUID,
    p_module_code VARCHAR,
    p_permission_code VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.v_user_effective_permissions
        WHERE profile_id = p_profile_id
          AND module_code = p_module_code
          AND permission_code = p_permission_code
    );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.has_permission_inherited(
    p_profile_id UUID,
    p_module_code VARCHAR,
    p_permission_code VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    v_module_parts TEXT[];
    v_check_code TEXT;
    i INT;
BEGIN
    IF public.has_permission(p_profile_id, p_module_code, p_permission_code) THEN
        RETURN TRUE;
    END IF;

    v_module_parts := string_to_array(p_module_code, '.');

    FOR i IN 1..array_length(v_module_parts, 1) - 1 LOOP
        v_check_code := array_to_string(v_module_parts[1:i], '.');
        IF public.has_permission(p_profile_id, v_check_code, p_permission_code) THEN
            RETURN TRUE;
        END IF;
    END LOOP;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profile_has_role phr
        JOIN public.roles r ON r.role_id = phr.role_id
        WHERE phr.profile_id = auth.uid() AND r.code = 'admin'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ============================================================
-- 7. RLS
-- ============================================================

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permission ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read modules" ON public.modules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read permissions" ON public.permissions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read role_permission" ON public.role_permission
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admin can modify modules" ON public.modules
    FOR ALL TO authenticated USING (public.is_admin_user());

CREATE POLICY "Only admin can modify permissions" ON public.permissions
    FOR ALL TO authenticated USING (public.is_admin_user());

CREATE POLICY "Only admin can modify role_permission" ON public.role_permission
    FOR ALL TO authenticated USING (public.is_admin_user());


-- ============================================================
-- 8. SEED: permisos estándar
-- ============================================================

INSERT INTO public.permissions (code, name, description, category) VALUES
    ('create', 'Crear', 'Permite crear nuevos registros', 'crud'),
    ('read', 'Leer', 'Permite ver/consultar registros', 'crud'),
    ('update', 'Actualizar', 'Permite modificar registros existentes', 'crud'),
    ('delete', 'Eliminar', 'Permite eliminar registros', 'crud'),
    ('export', 'Exportar', 'Permite exportar datos', 'report'),
    ('manage', 'Gestionar', 'Acceso completo de gestión al módulo', 'admin')
ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- 9. SEED: módulos (mapeados al sidebar admin actual)
-- ============================================================

-- Raíz
INSERT INTO public.modules (code, name, description, icon, route, display_order) VALUES
    ('dashboard', 'Dashboard', 'Panel principal', 'LayoutDashboard', '/admin', 1),
    ('orders', 'Pedidos', 'Gestión de pedidos', 'ShoppingBag', '/admin/orders', 2),
    ('tareas', 'Tareas', 'Gestión de tareas internas', 'ClipboardList', '/admin/tareas', 3),
    ('expenses', 'Gastos', 'Control de gastos', 'Receipt', '/admin/expenses', 4),
    ('trucks', 'Food Trucks', 'Gestión de food trucks y ubicaciones', 'Truck', NULL, 5),
    ('catalog', 'Catálogo', 'Gestión del menú y productos', 'BookOpen', NULL, 6),
    ('users', 'Usuarios', 'Gestión de usuarios, roles y permisos', 'UserCog', NULL, 7)
ON CONFLICT (code) DO NOTHING;

-- Submódulos: Food Trucks
INSERT INTO public.modules (code, name, description, icon, route, parent_id, display_order)
SELECT sub.code, sub.name, sub.description, sub.icon, sub.route,
    (SELECT id FROM public.modules WHERE code = 'trucks'), sub.display_order
FROM (VALUES
    ('trucks.food_trucks', 'Food Trucks', 'Flota de food trucks', 'Truck', '/admin/food-trucks', 1),
    ('trucks.locations', 'Ubicaciones', 'Ubicaciones y horarios', 'MapPin', '/admin/locations', 2)
) AS sub(code, name, description, icon, route, display_order)
ON CONFLICT (code) DO NOTHING;

-- Submódulos: Catálogo
INSERT INTO public.modules (code, name, description, icon, route, parent_id, display_order)
SELECT sub.code, sub.name, sub.description, sub.icon, sub.route,
    (SELECT id FROM public.modules WHERE code = 'catalog'), sub.display_order
FROM (VALUES
    ('catalog.ingredients', 'Ingredientes', 'Insumos y control de stock', 'Leaf', '/admin/ingredients', 1),
    ('catalog.categories', 'Categorías', 'Categorías del menú', 'Tag', '/admin/categories', 2),
    ('catalog.products', 'Productos', 'Productos del menú', 'Package', '/admin/products', 3),
    ('catalog.combos', 'Combos', 'Combos y promociones', 'Layers', '/admin/combos', 4),
    ('catalog.menus', 'Menús', 'Menús publicados', 'BookOpen', '/admin/menus', 5)
) AS sub(code, name, description, icon, route, display_order)
ON CONFLICT (code) DO NOTHING;

-- Submódulos: Usuarios
INSERT INTO public.modules (code, name, description, icon, route, parent_id, display_order)
SELECT sub.code, sub.name, sub.description, sub.icon, sub.route,
    (SELECT id FROM public.modules WHERE code = 'users'), sub.display_order
FROM (VALUES
    ('users.list', 'Usuarios', 'Listado de usuarios', 'Users', '/admin/users', 1),
    ('users.roles', 'Roles', 'Gestión de roles', 'Shield', '/admin/roles', 2),
    ('users.permissions', 'Permisos', 'Gestión de permisos por rol', 'KeySquare', '/admin/permisos', 3)
) AS sub(code, name, description, icon, route, display_order)
ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- 10. SEED: acceso total para el rol 'admin'
-- ============================================================
-- El rol 'staff' queda sin permisos asignados — se configura
-- manualmente desde /admin/permisos según lo que necesite el equipo.

INSERT INTO public.role_permission (role_id, module_id, permission_id)
SELECT r.role_id, m.id, p.id
FROM public.roles r
CROSS JOIN public.modules m
CROSS JOIN public.permissions p
WHERE r.code = 'admin'
ON CONFLICT ON CONSTRAINT uk_role_module_permission DO NOTHING;


-- ============================================================
-- FIN
-- ============================================================
