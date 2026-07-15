"use client";

/**
 * usePermissions
 *
 * Re-export del Context para uso consistente con el resto del proyecto.
 *
 * @example
 * const { hasPermission, canCreate, canRead, canUpdate, canDelete } = usePermissions();
 * if (canCreate("catalog.products")) { ... }
 *
 * @module hooks/usePermissions
 */
export {
  usePermissions,
  PermissionGate,
  PermissionsProvider,
} from "@/contexts/PermissionsContext";
