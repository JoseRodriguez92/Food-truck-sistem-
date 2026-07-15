"use client";

/**
 * useRolePermissions
 *
 * Hook para gestionar la matriz de permisos de un rol (panel admin).
 * Adaptado del hook homónimo de CENDA App al schema de 3 Street Food
 * (roles.role_id es uuid, tablas modules/permissions/role_permission).
 *
 * @module hooks/useRolePermissions
 */

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

// ============================================================
// TYPES
// ============================================================
interface RoleBasic {
  role_id: string;
  name: string;
  code: string;
  description: string | null;
}

interface ModuleWithPermissions {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  parentId: string | null;
  displayOrder: number;
  description: string | null;
  route: string | null;
  children: ModuleWithPermissions[];
  permissions: {
    permissionId: string;
    permissionCode: string;
    permissionName: string;
    isAssigned: boolean;
  }[];
}

interface PermissionBasic {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
}

interface UseRolePermissionsReturn {
  loading: boolean;
  saving: boolean;
  error: string | null;

  roles: RoleBasic[];
  selectedRole: RoleBasic | null;
  modules: ModuleWithPermissions[];
  permissions: PermissionBasic[];

  selectRole: (role: RoleBasic) => Promise<void>;
  togglePermission: (moduleId: string, permissionId: string) => void;
  toggleAllModulePermissions: (moduleId: string, grant: boolean) => void;
  toggleAllPermissions: (grant: boolean) => void;
  savePermissions: () => Promise<boolean>;
  refreshData: () => Promise<void>;

  hasChanges: boolean;
  getAssignedCount: () => number;
  getTotalCount: () => number;
}

// ============================================================
// HOOK
// ============================================================
export function useRolePermissions(): UseRolePermissionsReturn {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [roles, setRoles] = useState<RoleBasic[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleBasic | null>(null);
  const [modules, setModules] = useState<ModuleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<PermissionBasic[]>([]);

  const [originalAssignments, setOriginalAssignments] = useState<Set<string>>(new Set());
  const [currentAssignments, setCurrentAssignments] = useState<Set<string>>(new Set());

  const supabase = createClient();

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("role_id, name, code, description")
        .order("name");

      if (rolesError) throw rolesError;

      const { data: permsData, error: permsError } = await supabase
        .from("permissions")
        .select("*")
        .eq("is_active", true)
        .order("category")
        .order("code");

      if (permsError) throw permsError;

      setRoles((rolesData || []) as RoleBasic[]);
      setPermissions(
        (permsData || []).map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          description: p.description,
          category: p.category || "crud",
        }))
      );
    } catch (err) {
      console.error("Error loading initial data:", err);
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const loadRolePermissions = useCallback(
    async (roleId: string) => {
      try {
        setLoading(true);

        const { data: modulesData, error: modulesError } = await supabase
          .from("modules")
          .select("*")
          .eq("is_active", true)
          .order("display_order");

        if (modulesError) throw modulesError;

        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from("role_permission")
          .select("module_id, permission_id")
          .eq("role_id", roleId)
          .eq("is_active", true);

        if (assignmentsError) throw assignmentsError;

        const assignmentSet = new Set(
          (assignmentsData || []).map((a) => `${a.module_id}:${a.permission_id}`)
        );

        const moduleMap = new Map<string | null, ModuleWithPermissions[]>();

        for (const mod of modulesData || []) {
          const parentId = mod.parent_id;
          if (!moduleMap.has(parentId)) moduleMap.set(parentId, []);

          moduleMap.get(parentId)!.push({
            id: mod.id,
            code: mod.code,
            name: mod.name,
            icon: mod.icon,
            parentId: mod.parent_id,
            displayOrder: mod.display_order ?? Number.MAX_SAFE_INTEGER,
            description: mod.description,
            route: mod.route,
            children: [],
            permissions: permissions.map((p) => ({
              permissionId: p.id,
              permissionCode: p.code,
              permissionName: p.name,
              isAssigned: assignmentSet.has(`${mod.id}:${p.id}`),
            })),
          });
        }

        const buildTree = (parentId: string | null): ModuleWithPermissions[] => {
          const children = moduleMap.get(parentId) || [];
          for (const child of children) child.children = buildTree(child.id);
          return children.sort((a, b) => a.displayOrder - b.displayOrder);
        };

        setModules(buildTree(null));
        setOriginalAssignments(new Set(assignmentSet));
        setCurrentAssignments(new Set(assignmentSet));
      } catch (err) {
        console.error("Error loading role permissions:", err);
        setError(err instanceof Error ? err.message : "Error al cargar permisos del rol");
      } finally {
        setLoading(false);
      }
    },
    [supabase, permissions]
  );

  const selectRole = useCallback(
    async (role: RoleBasic) => {
      setSelectedRole(role);
      await loadRolePermissions(role.role_id);
    },
    [loadRolePermissions]
  );

  const updateModulePermission = useCallback(
    (
      mods: ModuleWithPermissions[],
      moduleId: string,
      permissionId: string
    ): ModuleWithPermissions[] =>
      mods.map((mod) => {
        if (mod.id === moduleId) {
          return {
            ...mod,
            permissions: mod.permissions.map((p) =>
              p.permissionId === permissionId ? { ...p, isAssigned: !p.isAssigned } : p
            ),
          };
        }
        if (mod.children.length > 0) {
          return { ...mod, children: updateModulePermission(mod.children, moduleId, permissionId) };
        }
        return mod;
      }),
    []
  );

  const togglePermission = useCallback(
    (moduleId: string, permissionId: string) => {
      const key = `${moduleId}:${permissionId}`;
      setCurrentAssignments((prev) => {
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
      });
      setModules((prev) => updateModulePermission(prev, moduleId, permissionId));
    },
    [updateModulePermission]
  );

  const toggleAllModulePermissions = useCallback((moduleId: string, grant: boolean) => {
    setModules((prev) => {
      const updateModule = (mods: ModuleWithPermissions[]): ModuleWithPermissions[] =>
        mods.map((mod) => {
          if (mod.id === moduleId) {
            mod.permissions.forEach((p) => {
              const key = `${moduleId}:${p.permissionId}`;
              setCurrentAssignments((prevSet) => {
                const next = new Set(prevSet);
                grant ? next.add(key) : next.delete(key);
                return next;
              });
            });
            return { ...mod, permissions: mod.permissions.map((p) => ({ ...p, isAssigned: grant })) };
          }
          if (mod.children.length > 0) return { ...mod, children: updateModule(mod.children) };
          return mod;
        });
      return updateModule(prev);
    });
  }, []);

  const toggleAllPermissions = useCallback(
    (grant: boolean) => {
      const allKeys = new Set<string>();
      const collectKeys = (mods: ModuleWithPermissions[]) => {
        for (const mod of mods) {
          for (const p of mod.permissions) allKeys.add(`${mod.id}:${p.permissionId}`);
          collectKeys(mod.children);
        }
      };
      collectKeys(modules);
      setCurrentAssignments(grant ? allKeys : new Set());

      setModules((prev) => {
        const updateAll = (mods: ModuleWithPermissions[]): ModuleWithPermissions[] =>
          mods.map((mod) => ({
            ...mod,
            permissions: mod.permissions.map((p) => ({ ...p, isAssigned: grant })),
            children: updateAll(mod.children),
          }));
        return updateAll(prev);
      });
    },
    [modules]
  );

  const savePermissions = useCallback(async (): Promise<boolean> => {
    if (!selectedRole) return false;

    try {
      setSaving(true);

      const toAdd: { role_id: string; module_id: string; permission_id: string }[] = [];
      const toRemove: string[] = [];

      currentAssignments.forEach((key) => {
        if (!originalAssignments.has(key)) {
          const [moduleId, permissionId] = key.split(":");
          toAdd.push({ role_id: selectedRole.role_id, module_id: moduleId, permission_id: permissionId });
        }
      });

      originalAssignments.forEach((key) => {
        if (!currentAssignments.has(key)) toRemove.push(key);
      });

      if (toRemove.length > 0) {
        for (const key of toRemove) {
          const [moduleId, permissionId] = key.split(":");
          const { error } = await supabase
            .from("role_permission")
            .delete()
            .eq("role_id", selectedRole.role_id)
            .eq("module_id", moduleId)
            .eq("permission_id", permissionId);
          if (error) throw error;
        }
      }

      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("role_permission")
          .upsert(
            toAdd.map((a) => ({ ...a, is_active: true })),
            { onConflict: "role_id,module_id,permission_id" }
          );
        if (error) throw error;
      }

      setOriginalAssignments(new Set(currentAssignments));
      toast.success("Permisos guardados");
      return true;
    } catch (err) {
      console.error("Error saving permissions:", err);
      toast.error(err instanceof Error ? err.message : "Error al guardar permisos");
      return false;
    } finally {
      setSaving(false);
    }
  }, [selectedRole, currentAssignments, originalAssignments, supabase]);

  const hasChanges =
    originalAssignments.size !== currentAssignments.size ||
    [...originalAssignments].some((key) => !currentAssignments.has(key));

  const getAssignedCount = useCallback(() => currentAssignments.size, [currentAssignments]);

  const getTotalCount = useCallback(() => {
    let count = 0;
    const countModules = (mods: ModuleWithPermissions[]) => {
      for (const mod of mods) {
        count += mod.permissions.length;
        countModules(mod.children);
      }
    };
    countModules(modules);
    return count;
  }, [modules]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  return {
    loading,
    saving,
    error,
    roles,
    selectedRole,
    modules,
    permissions,
    selectRole,
    togglePermission,
    toggleAllModulePermissions,
    toggleAllPermissions,
    savePermissions,
    refreshData: loadInitialData,
    hasChanges,
    getAssignedCount,
    getTotalCount,
  };
}
