"use client";

/**
 * PermissionsContext
 *
 * Carga los permisos efectivos del usuario (vía sus roles) UNA sola vez
 * y expone helpers de verificación en O(1). Adaptado del sistema RBAC
 * de CENDA App a las tablas de 3 Street Food (profiles / roles / profile_has_role).
 *
 * Requiere la migración: supabase/migrations/create_rbac_system.sql
 *
 * @module contexts/PermissionsContext
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { createClient } from "@/lib/supabase/client";

// ============================================================
// TYPES
// ============================================================
export interface EffectivePermission {
  profileId: string;
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  permissionId: string;
  permissionCode: string;
  permissionName: string;
  source: string;
  sourceName: string;
}

export type PermissionMap = {
  [moduleCode: string]: { [permissionCode: string]: boolean };
};

interface PermissionCheckResult {
  hasPermission: boolean;
  source?: "role" | "inherited";
  modulePath?: string;
}

interface PermissionsContextValue {
  loading: boolean;
  error: string | null;
  permissions: EffectivePermission[];
  permissionMap: PermissionMap;

  hasPermission: (moduleCode: string, permissionCode: string) => boolean;
  hasAnyPermission: (moduleCode: string, permissionCodes: string[]) => boolean;
  hasAllPermissions: (moduleCode: string, permissionCodes: string[]) => boolean;

  canCreate: (moduleCode: string) => boolean;
  canRead: (moduleCode: string) => boolean;
  canUpdate: (moduleCode: string) => boolean;
  canDelete: (moduleCode: string) => boolean;
  canManage: (moduleCode: string) => boolean;

  getModulePermissions: (moduleCode: string) => string[];
  checkPermissionWithInheritance: (
    moduleCode: string,
    permissionCode: string
  ) => PermissionCheckResult;

  refreshPermissions: () => Promise<void>;
}

// ============================================================
// CONTEXT
// ============================================================
const PermissionsContext = createContext<PermissionsContextValue | null>(null);

// ============================================================
// PROVIDER
// ============================================================
export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<EffectivePermission[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const supabase = createClient();

  const fetchPermissions = useCallback(async () => {
    if (fetchedRef.current && permissions.length > 0) return;

    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setPermissions([]);
        setUserId(null);
        setLoading(false);
        return;
      }

      if (userId === user.id && permissions.length > 0) {
        setLoading(false);
        return;
      }

      setUserId(user.id);
      fetchedRef.current = true;

      const { data, error: fetchError } = await supabase
        .from("v_user_effective_permissions")
        .select("*")
        .eq("profile_id", user.id);

      if (fetchError) throw fetchError;

      const mapped: EffectivePermission[] = (data || []).map(
        (row: Record<string, unknown>) => ({
          profileId: row.profile_id as string,
          moduleId: row.module_id as string,
          moduleCode: row.module_code as string,
          moduleName: row.module_name as string,
          permissionId: row.permission_id as string,
          permissionCode: row.permission_code as string,
          permissionName: row.permission_name as string,
          source: row.source as string,
          sourceName: row.source_name as string,
        })
      );

      setPermissions(mapped);
    } catch (err) {
      console.error("Error fetching permissions:", err);
      setError(err instanceof Error ? err.message : "Error al cargar permisos");
      fetchedRef.current = false;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, userId, permissions.length]);

  useEffect(() => {
    if (!fetchedRef.current) fetchPermissions();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchedRef.current = false;
        fetchPermissions();
      } else if (event === "SIGNED_OUT") {
        setPermissions([]);
        setUserId(null);
        fetchedRef.current = false;
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const permissionMap = useMemo<PermissionMap>(() => {
    const map: PermissionMap = {};
    for (const perm of permissions) {
      if (!map[perm.moduleCode]) map[perm.moduleCode] = {};
      map[perm.moduleCode][perm.permissionCode] = true;
    }
    return map;
  }, [permissions]);

  const hasPermission = useCallback(
    (moduleCode: string, permissionCode: string): boolean =>
      permissionMap[moduleCode]?.[permissionCode] === true,
    [permissionMap]
  );

  const hasAnyPermission = useCallback(
    (moduleCode: string, permissionCodes: string[]): boolean =>
      permissionCodes.some((code) => permissionMap[moduleCode]?.[code] === true),
    [permissionMap]
  );

  const hasAllPermissions = useCallback(
    (moduleCode: string, permissionCodes: string[]): boolean =>
      permissionCodes.every((code) => permissionMap[moduleCode]?.[code] === true),
    [permissionMap]
  );

  // Verifica permiso directo y, si no lo hay, en módulos padre (ej: "catalog" → "catalog.products")
  const checkPermissionWithInheritance = useCallback(
    (moduleCode: string, permissionCode: string): PermissionCheckResult => {
      if (hasPermission(moduleCode, permissionCode)) {
        return { hasPermission: true, source: "role", modulePath: moduleCode };
      }

      const parts = moduleCode.split(".");
      for (let i = parts.length - 1; i > 0; i--) {
        const parentCode = parts.slice(0, i).join(".");
        if (hasPermission(parentCode, permissionCode)) {
          return { hasPermission: true, source: "inherited", modulePath: parentCode };
        }
      }

      return { hasPermission: false };
    },
    [hasPermission]
  );

  const canCreate = useCallback(
    (moduleCode: string) => checkPermissionWithInheritance(moduleCode, "create").hasPermission,
    [checkPermissionWithInheritance]
  );
  const canRead = useCallback(
    (moduleCode: string) => checkPermissionWithInheritance(moduleCode, "read").hasPermission,
    [checkPermissionWithInheritance]
  );
  const canUpdate = useCallback(
    (moduleCode: string) => checkPermissionWithInheritance(moduleCode, "update").hasPermission,
    [checkPermissionWithInheritance]
  );
  const canDelete = useCallback(
    (moduleCode: string) => checkPermissionWithInheritance(moduleCode, "delete").hasPermission,
    [checkPermissionWithInheritance]
  );
  const canManage = useCallback(
    (moduleCode: string) => checkPermissionWithInheritance(moduleCode, "manage").hasPermission,
    [checkPermissionWithInheritance]
  );

  const getModulePermissions = useCallback(
    (moduleCode: string): string[] => Object.keys(permissionMap[moduleCode] || {}),
    [permissionMap]
  );

  const refreshPermissions = useCallback(async () => {
    fetchedRef.current = false;
    await fetchPermissions();
  }, [fetchPermissions]);

  const value: PermissionsContextValue = {
    loading,
    error,
    permissions,
    permissionMap,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canManage,
    getModulePermissions,
    checkPermissionWithInheritance,
    refreshPermissions,
  };

  return (
    <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================
export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
}

// ============================================================
// COMPONENTES HELPER
// ============================================================
interface PermissionGateProps {
  moduleCode: string;
  permissionCode: string | string[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/** Muestra contenido solo si el usuario tiene el permiso — usa el Context, sin fetch extra */
export function PermissionGate({
  moduleCode,
  permissionCode,
  requireAll = false,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasAnyPermission, hasAllPermissions, loading } = usePermissions();

  if (loading) return null;

  const codes = Array.isArray(permissionCode) ? permissionCode : [permissionCode];
  const hasAccess = requireAll
    ? hasAllPermissions(moduleCode, codes)
    : hasAnyPermission(moduleCode, codes);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
