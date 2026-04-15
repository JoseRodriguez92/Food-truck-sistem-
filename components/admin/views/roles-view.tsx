"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { createRole, updateRole, deleteRole } from "@/app/admin/roles/actions";

export type Role = {
  role_id: string;
  name: string;
  description: string | null;
  created_at: string;
  profile_has_role: { count: number }[];
};

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function RoleForm({ defaultValues }: { defaultValues?: Partial<FormValues> }) {
  const { register, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: "", description: "" },
  });
  return (
    <form id="role-form" className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="r-name">Nombre del rol</Label>
        <Input id="r-name" placeholder="Ej. Admin, Cajero, Cocinero..." aria-invalid={!!errors.name} {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="r-desc">Descripción <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Textarea id="r-desc" placeholder="¿Qué puede hacer este rol?" rows={2} {...register("description")} />
      </div>
    </form>
  );
}

export function RolesView({ roles }: { roles: Role[] }) {
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [deleteRole_, setDeleteRole] = useState<Role | null>(null);

  function submit(
    action: (fd: FormData) => Promise<{ error: string } | undefined>,
    onSuccess: () => void
  ) {
    const form = document.getElementById("role-form") as HTMLFormElement;
    if (!form) return;
    startTransition(async () => {
      const result = await action(new FormData(form));
      if (result?.error) toast.error(result.error);
      else onSuccess();
    });
  }

  function handleDelete() {
    if (!deleteRole_) return;
    startTransition(async () => {
      const result = await deleteRole(deleteRole_.role_id);
      if (result?.error) toast.error(result.error);
      else { toast.success("Rol eliminado"); setDeleteRole(null); }
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>Roles</h1>
          <p className="text-sm text-muted-foreground mt-1">{roles.length} roles registrados</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Nuevo rol</span>
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        {roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Shield className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Sin roles registrados</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden md:table-cell">Descripción</TableHead>
                <TableHead>Usuarios</TableHead>
                <TableHead className="hidden sm:table-cell">Creado</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((r) => {
                const userCount = Array.isArray(r.profile_has_role)
                  ? r.profile_has_role.reduce((acc, x) => acc + (x.count ?? 0), 0)
                  : 0;
                return (
                  <TableRow key={r.role_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <Shield className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="font-medium text-sm">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-48 truncate">
                      {r.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={userCount > 0 ? "secondary" : "outline"} className="text-xs">
                        {userCount} usuario{userCount !== 1 ? "s" : ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("es-CO")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditRole(r)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 hover:text-destructive"
                          onClick={() => setDeleteRole(r)}
                          disabled={userCount > 0}
                          title={userCount > 0 ? "Tiene usuarios asignados" : "Eliminar"}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo rol</DialogTitle></DialogHeader>
          <RoleForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button disabled={isPending} onClick={() => submit(createRole, () => { toast.success("Rol creado"); setCreateOpen(false); })}>
              {isPending ? "Guardando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRole} onOpenChange={(o) => !o && setEditRole(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar rol</DialogTitle></DialogHeader>
          {editRole && <RoleForm defaultValues={{ name: editRole.name, description: editRole.description ?? "" }} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRole(null)}>Cancelar</Button>
            <Button disabled={isPending} onClick={() => submit((fd) => updateRole(editRole!.role_id, fd), () => { toast.success("Rol actualizado"); setEditRole(null); })}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRole_} onOpenChange={(o) => !o && setDeleteRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar rol?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar el rol <strong className="text-foreground">{deleteRole_?.name}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-white hover:bg-destructive/90">
              {isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
