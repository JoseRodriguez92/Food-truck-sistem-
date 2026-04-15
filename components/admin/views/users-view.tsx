"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Users, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createUser, updateUser, changeUserRole, deleteUser } from "@/app/admin/users/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RoleOption = { role_id: string; name: string };

export type UserProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: string | null;
  created_at: string;
  profile_has_role: {
    profile_role_id: string;
    role_id: string;
    roles: { role_id: string; name: string } | { role_id: string; name: string }[] | null;
  }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSingleRole(
  roles: { role_id: string; name: string } | { role_id: string; name: string }[] | null
) {
  if (!roles) return null;
  return Array.isArray(roles) ? roles[0] ?? null : roles;
}

function getUserRole(user: UserProfile) {
  const phr = user.profile_has_role?.[0];
  if (!phr) return null;
  return toSingleRole(phr.roles);
}

function statusLabel(status: string | null) {
  switch (status) {
    case "active":     return { label: "Activo",     variant: "default" as const };
    case "inactive":   return { label: "Inactivo",   variant: "secondary" as const };
    case "suspended":  return { label: "Suspendido", variant: "destructive" as const };
    case "pending":    return { label: "Pendiente",  variant: "outline" as const };
    default:           return { label: status ?? "—", variant: "outline" as const };
  }
}

function initials(user: UserProfile) {
  const parts = [user.first_name, user.last_name].filter(Boolean);
  if (parts.length) return parts.map((p) => p![0]).join("").toUpperCase().slice(0, 2);
  return (user.email?.[0] ?? "?").toUpperCase();
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  email:      z.string().email("Correo inválido"),
  password:   z.string().min(6, "Mínimo 6 caracteres"),
  first_name: z.string().min(1, "El nombre es requerido"),
  last_name:  z.string().optional(),
  role_id:    z.string().min(1, "Selecciona un rol"),
});

const editSchema = z.object({
  first_name: z.string().min(1, "El nombre es requerido"),
  last_name:  z.string().optional(),
  status:     z.enum(["pending", "active", "inactive", "suspended"]),
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues   = z.infer<typeof editSchema>;

// ─── Create Form ──────────────────────────────────────────────────────────────

function CreateUserForm({ roles }: { roles: RoleOption[] }) {
  const { register, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { email: "", password: "", first_name: "", last_name: "", role_id: "" },
  });

  return (
    <form id="user-form" className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="u-first">Nombre</Label>
          <Input id="u-first" placeholder="Juan" aria-invalid={!!errors.first_name} {...register("first_name")} />
          {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="u-last">Apellido <span className="text-muted-foreground text-xs">(opcional)</span></Label>
          <Input id="u-last" placeholder="García" {...register("last_name")} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="u-email">Correo</Label>
        <Input id="u-email" type="email" placeholder="juan@ejemplo.com" aria-invalid={!!errors.email} {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="u-pwd">Contraseña</Label>
        <Input id="u-pwd" type="password" placeholder="Mínimo 6 caracteres" aria-invalid={!!errors.password} {...register("password")} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="u-role">Rol</Label>
        <select
          id="u-role"
          {...register("role_id")}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Selecciona un rol...</option>
          {roles.map((r) => (
            <option key={r.role_id} value={r.role_id}>{r.name}</option>
          ))}
        </select>
        {errors.role_id && <p className="text-xs text-destructive">{errors.role_id.message}</p>}
      </div>
    </form>
  );
}

// ─── Edit Form ────────────────────────────────────────────────────────────────

function EditUserForm({ defaultValues }: { defaultValues: EditValues }) {
  const { register, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues,
  });

  return (
    <form id="user-form" className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="u-first">Nombre</Label>
          <Input id="u-first" placeholder="Juan" aria-invalid={!!errors.first_name} {...register("first_name")} />
          {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="u-last">Apellido <span className="text-muted-foreground text-xs">(opcional)</span></Label>
          <Input id="u-last" placeholder="García" {...register("last_name")} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="u-status">Estado</Label>
        <select
          id="u-status"
          {...register("status")}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
          <option value="pending">Pendiente</option>
          <option value="suspended">Suspendido</option>
        </select>
        {errors.status && <p className="text-xs text-destructive">{errors.status.message}</p>}
      </div>
    </form>
  );
}

// ─── Role Select (inline) ─────────────────────────────────────────────────────

function InlineRoleSelect({
  userId,
  currentRoleId,
  roles,
}: {
  userId: string;
  currentRoleId: string | undefined;
  roles: RoleOption[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(roleId: string) {
    startTransition(async () => {
      const result = await changeUserRole(userId, roleId);
      if (result?.error) toast.error(result.error);
      else toast.success("Rol actualizado");
    });
  }

  return (
    <Select value={currentRoleId ?? ""} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="h-7 text-xs w-36 gap-1">
        <SelectValue placeholder="Sin rol" />
      </SelectTrigger>
      <SelectContent>
        {roles.map((r) => (
          <SelectItem key={r.role_id} value={r.role_id} className="text-xs">
            {r.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function UsersView({ users, roles }: { users: UserProfile[]; roles: RoleOption[] }) {
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser]     = useState<UserProfile | null>(null);
  const [deleteUser_, setDeleteUser] = useState<UserProfile | null>(null);

  function submit(
    action: (fd: FormData) => Promise<{ error: string } | undefined>,
    onSuccess: () => void
  ) {
    const form = document.getElementById("user-form") as HTMLFormElement;
    if (!form) return;
    startTransition(async () => {
      const result = await action(new FormData(form));
      if (result?.error) toast.error(result.error);
      else onSuccess();
    });
  }

  function handleDelete() {
    if (!deleteUser_) return;
    startTransition(async () => {
      const result = await deleteUser(deleteUser_.id);
      if (result?.error) toast.error(result.error);
      else { toast.success("Usuario eliminado"); setDeleteUser(null); }
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>
            Usuarios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{users.length} usuarios registrados</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Nuevo usuario</span>
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Sin usuarios registrados</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead className="hidden md:table-cell">Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="hidden sm:table-cell">Estado</TableHead>
                <TableHead className="hidden lg:table-cell">Creado</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const role = getUserRole(u);
                const { label: statusText, variant: statusVariant } = statusLabel(u.status);
                const displayName = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "—";

                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                          {initials(u)}
                        </div>
                        <span className="font-medium text-sm">{displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {u.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      <InlineRoleSelect
                        userId={u.id}
                        currentRoleId={role?.role_id}
                        roles={roles}
                      />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={statusVariant} className="text-xs">
                        {statusText}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("es-CO")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => setEditUser(u)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 hover:text-destructive"
                          onClick={() => setDeleteUser(u)}
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo usuario</DialogTitle></DialogHeader>
          <CreateUserForm roles={roles} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              disabled={isPending}
              onClick={() => submit(createUser, () => { toast.success("Usuario creado"); setCreateOpen(false); })}
            >
              {isPending ? "Creando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar usuario</DialogTitle></DialogHeader>
          {editUser && (
            <EditUserForm
              defaultValues={{
                first_name: editUser.first_name ?? "",
                last_name:  editUser.last_name  ?? "",
                status:     (editUser.status as EditValues["status"]) ?? "active",
              }}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button
              disabled={isPending}
              onClick={() =>
                submit(
                  (fd) => updateUser(editUser!.id, fd),
                  () => { toast.success("Usuario actualizado"); setEditUser(null); }
                )
              }
            >
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser_} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar a{" "}
              <strong className="text-foreground">
                {[deleteUser_?.first_name, deleteUser_?.last_name].filter(Boolean).join(" ") || deleteUser_?.email}
              </strong>
              . Esta acción eliminará su cuenta permanentemente y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
