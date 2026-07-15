"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  KeySquare,
  Shield,
  Check,
  Save,
  RotateCcw,
  Loader2,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { createModule, updateModule, deleteModule } from "@/app/admin/permisos/actions";
import { SectionHeader } from "@/components/admin/section-header";

type ModuleNode = ReturnType<typeof useRolePermissions>["modules"][number];

// ============================================================
// Formulario de módulo (crear / editar)
// ============================================================
const moduleSchema = z.object({
  code: z
    .string()
    .min(1, "El código es requerido")
    .regex(/^[a-z0-9_.]+$/, "Solo minúsculas, números, punto y guión bajo"),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  icon: z.string().optional(),
  route: z.string().optional(),
  parentId: z.string().optional(),
  displayOrder: z.coerce.number().int().optional(),
});
type ModuleFormValues = z.infer<typeof moduleSchema>;

function ModuleForm({
  formId,
  defaultValues,
  parentOptions,
}: {
  formId: string;
  defaultValues?: Partial<ModuleFormValues>;
  parentOptions: { id: string; label: string }[];
}) {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: defaultValues ?? { code: "", name: "", displayOrder: 0 },
  });

  const parentId = watch("parentId");

  return (
    <form id={formId} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="m-code">Código</Label>
          <Input id="m-code" placeholder="catalog.products" aria-invalid={!!errors.code} {...register("code")} />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-name">Nombre</Label>
          <Input id="m-name" placeholder="Productos" aria-invalid={!!errors.name} {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="m-desc">
          Descripción <span className="text-muted-foreground text-xs">(opcional)</span>
        </Label>
        <Textarea id="m-desc" rows={2} {...register("description")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="m-icon">
            Ícono <span className="text-muted-foreground text-xs">(lucide-react)</span>
          </Label>
          <Input id="m-icon" placeholder="Package" {...register("icon")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-route">
            Ruta <span className="text-muted-foreground text-xs">(opcional)</span>
          </Label>
          <Input id="m-route" placeholder="/admin/products" {...register("route")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Módulo padre</Label>
          <Select value={parentId || "__root__"} onValueChange={(v) => setValue("parentId", v === "__root__" ? "" : v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Ninguno (raíz)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__root__">Ninguno (raíz)</SelectItem>
              {parentOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* input oculto para que FormData capture el valor del Select */}
          <input type="hidden" {...register("parentId")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-order">Orden</Label>
          <Input id="m-order" type="number" {...register("displayOrder")} />
        </div>
      </div>
    </form>
  );
}

// ============================================================
// Fila recursiva de módulo (con hijos indentados + acciones)
// ============================================================
function ModuleRow({
  mod,
  depth,
  permCount,
  onToggle,
  onToggleAll,
  onEdit,
  onDelete,
}: {
  mod: ModuleNode;
  depth: number;
  permCount: number;
  onToggle: (moduleId: string, permissionId: string) => void;
  onToggleAll: (moduleId: string, grant: boolean) => void;
  onEdit: (mod: ModuleNode) => void;
  onDelete: (mod: ModuleNode) => void;
}) {
  const allAssigned = mod.permissions.every((p) => p.isAssigned);
  const someAssigned = mod.permissions.some((p) => p.isAssigned);

  return (
    <>
      <div
        className={cn(
          "grid items-center gap-2 px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-accent/40 transition-colors",
          depth === 0 && "bg-secondary/40"
        )}
        style={{ gridTemplateColumns: `1fr repeat(${permCount}, 56px) 64px` }}
      >
        <div className="flex items-center gap-2 min-w-0" style={{ paddingLeft: depth * 18 }}>
          <Checkbox
            checked={allAssigned ? true : someAssigned ? "indeterminate" : false}
            onCheckedChange={(v) => onToggleAll(mod.id, !!v)}
            className="shrink-0"
          />
          <span className={cn("text-sm truncate", depth === 0 ? "font-semibold" : "text-muted-foreground")}>
            {mod.name}
          </span>
          <span
            className="text-[10px] text-muted-foreground/60 tabular-nums shrink-0"
            title="Orden de visualización"
          >
            #{mod.displayOrder}
          </span>
        </div>
        {mod.permissions.map((p) => (
          <div key={p.permissionId} className="flex justify-center">
            <Checkbox checked={p.isAssigned} onCheckedChange={() => onToggle(mod.id, p.permissionId)} />
          </div>
        ))}
        <div className="flex items-center justify-end gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(mod)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-destructive"
            onClick={() => onDelete(mod)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      {mod.children.map((child) => (
        <ModuleRow
          key={child.id}
          mod={child}
          depth={depth + 1}
          permCount={permCount}
          onToggle={onToggle}
          onToggleAll={onToggleAll}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

// ============================================================
// VISTA PRINCIPAL
// ============================================================
export function PermisosView() {
  const {
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
    hasChanges,
    getAssignedCount,
    getTotalCount,
  } = useRolePermissions();

  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ModuleNode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ModuleNode | null>(null);

  // Lista plana de módulos para el selector de "padre" (excluye el propio módulo al editar)
  const flatModules = useMemo(() => {
    const out: { id: string; label: string }[] = [];
    const walk = (mods: ModuleNode[], prefix = "") => {
      for (const m of mods) {
        if (editTarget && m.id === editTarget.id) continue; // evita ciclos
        out.push({ id: m.id, label: `${prefix}${m.name}` });
        walk(m.children, `${prefix}${m.name} / `);
      }
    };
    walk(modules);
    return out;
  }, [modules, editTarget]);

  function refetchCurrentRole() {
    if (selectedRole) selectRole(selectedRole);
  }

  function submitModuleForm(
    action: (fd: FormData) => Promise<{ error?: string } | undefined>,
    onSuccess: () => void
  ) {
    const form = document.getElementById("module-form") as HTMLFormElement;
    if (!form) return;
    startTransition(async () => {
      const result = await action(new FormData(form));
      if (result?.error) toast.error(result.error);
      else {
        onSuccess();
        refetchCurrentRole();
      }
    });
  }

  function handleDeleteModule() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteModule(deleteTarget.id);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Módulo eliminado");
        setDeleteTarget(null);
        refetchCurrentRole();
      }
    });
  }

  const permCodes = permissions.map((p) => p.code);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <SectionHeader
        title="Permisos"
        subtitle="Configura los módulos del panel y qué puede hacer cada rol en cada uno"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nuevo módulo</span>
          </Button>
        }
      />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-[240px_1fr] gap-4 lg:gap-6">
        {/* Selector de roles */}
        <div className="rounded-xl border border-border overflow-hidden h-fit">
          <div className="px-4 py-3 border-b border-border bg-secondary/40">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Roles</span>
          </div>
          <div className="flex flex-col">
            {roles.length === 0 && (
              <p className="text-sm text-muted-foreground px-4 py-4">Sin roles registrados</p>
            )}
            {roles.map((r) => (
              <button
                key={r.role_id}
                onClick={() => selectRole(r)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm text-left border-b border-border last:border-b-0 transition-colors",
                  selectedRole?.role_id === r.role_id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-foreground"
                )}
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate font-medium">{r.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Matriz de permisos */}
        <div className="rounded-xl border border-border overflow-hidden">
          {!selectedRole ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <KeySquare className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Selecciona un rol para configurar sus permisos</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-secondary/40">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">{selectedRole.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {getAssignedCount()}/{getTotalCount()} permisos
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleAllPermissions(true)} disabled={loading}>
                    <Check className="w-3.5 h-3.5" /> Marcar todo
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleAllPermissions(false)} disabled={loading}>
                    <RotateCcw className="w-3.5 h-3.5" /> Limpiar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => savePermissions()}
                    disabled={!hasChanges || saving}
                    className="gap-1.5"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Guardar
                  </Button>
                </div>
              </div>

              <ScrollArea className="w-full">
                <div className="min-w-[620px]">
                  {/* Encabezado de columnas de permisos */}
                  <div
                    className="grid items-center gap-2 px-3 py-2 border-b border-border bg-muted/30"
                    style={{ gridTemplateColumns: `1fr repeat(${permCodes.length}, 56px) 64px` }}
                  >
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Módulo</span>
                    {permissions.map((p) => (
                      <span
                        key={p.id}
                        className="text-[10px] font-medium text-muted-foreground uppercase text-center leading-tight"
                        title={p.name}
                      >
                        {p.name}
                      </span>
                    ))}
                    <span className="text-[10px] font-medium text-muted-foreground uppercase text-right">Acciones</span>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando módulos...
                    </div>
                  ) : (
                    modules.map((mod) => (
                      <Fragment key={mod.id}>
                        <ModuleRow
                          mod={mod}
                          depth={0}
                          permCount={permCodes.length}
                          onToggle={togglePermission}
                          onToggleAll={toggleAllModulePermissions}
                          onEdit={(m) => setEditTarget(m)}
                          onDelete={(m) => setDeleteTarget(m)}
                        />
                      </Fragment>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </div>

      {/* Crear módulo */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo módulo</DialogTitle>
          </DialogHeader>
          <ModuleForm formId="module-form" parentOptions={flatModules} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={isPending}
              onClick={() =>
                submitModuleForm(createModule, () => {
                  toast.success("Módulo creado");
                  setCreateOpen(false);
                })
              }
            >
              {isPending ? "Guardando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar módulo */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar módulo</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <ModuleForm
              formId="module-form"
              parentOptions={flatModules}
              defaultValues={{
                code: editTarget.code,
                name: editTarget.name,
                description: editTarget.description ?? "",
                icon: editTarget.icon ?? "",
                route: editTarget.route ?? "",
                parentId: editTarget.parentId ?? "",
                displayOrder: editTarget.displayOrder,
              }}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancelar
            </Button>
            <Button
              disabled={isPending}
              onClick={() =>
                submitModuleForm((fd) => updateModule(editTarget!.id, fd), () => {
                  toast.success("Módulo actualizado");
                  setEditTarget(null);
                })
              }
            >
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eliminar módulo */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar módulo?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <strong className="text-foreground">{deleteTarget?.name}</strong>. Esto también borra
              todos los permisos que cualquier rol tenga asignados sobre este módulo. Si tiene submódulos, eliminalos
              primero.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModule}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
