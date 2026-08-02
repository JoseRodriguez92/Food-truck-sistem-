-- ============================================================
-- MÓDULO "COCINA" — rol cocina
-- ============================================================
-- Entrada de menú "Cocina" en /dashboard, visible solo para roles
-- con permiso "read" sobre el módulo `cocina`. Contenido real de la
-- vista pendiente (CocinaView es placeholder por ahora).
--
-- Nota: rol.code = 'cocina' y modulo.code = 'cocina' son tablas
-- distintas (public.roles vs public.modules), no hay conflicto.

-- Rol 'cocina' (idempotente — puede ya existir si se creó desde /admin/roles)
INSERT INTO public.roles (name, code, description)
SELECT 'Cocina', 'cocina', 'Acceso solo a la sección de Cocina'
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE code = 'cocina');

-- Módulo raíz 'cocina' (sigue el mismo display_order que el link en el sidebar)
INSERT INTO public.modules (code, name, description, icon, route, display_order) VALUES
    ('cocina', 'Cocina', 'Vista de cocina', 'ChefHat', '/dashboard?section=cocina', 3)
ON CONFLICT (code) DO NOTHING;

-- Permiso de lectura para rol 'cocina' sobre módulo 'cocina'
INSERT INTO public.role_permission (role_id, module_id, permission_id)
SELECT r.role_id, m.id, p.id
FROM public.roles r
CROSS JOIN public.modules m
CROSS JOIN public.permissions p
WHERE r.code = 'cocina' AND m.code = 'cocina' AND p.code = 'read'
ON CONFLICT ON CONSTRAINT uk_role_module_permission DO NOTHING;

-- Acceso total de 'admin' al nuevo módulo (create_rbac_system.sql solo cubrió
-- los módulos que existían en ese momento)
INSERT INTO public.role_permission (role_id, module_id, permission_id)
SELECT r.role_id, m.id, p.id
FROM public.roles r
CROSS JOIN public.modules m
CROSS JOIN public.permissions p
WHERE r.code = 'admin' AND m.code = 'cocina'
ON CONFLICT ON CONSTRAINT uk_role_module_permission DO NOTHING;
