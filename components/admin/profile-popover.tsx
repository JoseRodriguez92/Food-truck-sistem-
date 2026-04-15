"use client";

import { useRef, useTransition } from "react";
import Image from "next/image";
import { LogOut, Mail, ChevronUp, Camera, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { logout } from "@/app/login/actions";
import { updateAvatar, removeAvatar } from "@/app/actions/update-avatar";
import { toast } from "sonner";

interface Profile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url?: string | null;
}

export function ProfilePopover({ profile }: { profile: Profile | null }) {
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
    : (profile?.email ?? "Usuario");

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("avatar", file);
    startTransition(async () => {
      const res = await updateAvatar(fd);
      if (res?.error) toast.error(res.error);
      else toast.success("Foto actualizada");
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const res = await removeAvatar();
      if (res?.error) toast.error(res.error);
      else toast.success("Foto eliminada");
    });
  }

  const Avatar = ({ size = "sm" }: { size?: "sm" | "lg" }) => {
    const cls =
      size === "lg"
        ? "w-16 h-16 text-lg rounded-full"
        : "w-8 h-8 text-xs rounded-full";

    return profile?.avatar_url ? (
      <div
        className={`${cls} overflow-hidden shrink-0 border border-primary/20`}
      >
        <Image
          src={profile.avatar_url}
          alt={displayName}
          width={size === "lg" ? 64 : 32}
          height={size === "lg" ? 64 : 32}
          className="w-full h-full object-cover"
          unoptimized
        />
      </div>
    ) : (
      <div
        className={`${cls} flex items-center justify-center bg-primary/10 text-primary font-bold border border-primary/20 shrink-0`}
      >
        {initials}
      </div>
    );
  };

  return (
    <div className="p-3 border-t border-border">
      <Popover>
        <PopoverTrigger asChild>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors group">
            <Avatar size="sm" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.email}
              </p>
            </div>
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="start"
          className="w-68 p-0"
          sideOffset={8}
        >
          {/* Foto + info */}
          <div className="flex items-center gap-3 p-4">
            {/* Avatar con botón de cambio */}
            <div className="relative shrink-0 group/avatar">
              <Avatar size="lg" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={isPending}
                className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity disabled:cursor-not-allowed"
                title="Cambiar foto"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Mail className="w-3 h-3 shrink-0" />
                {profile?.email ?? "—"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Acciones de foto */}
          <div className="p-2 space-y-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2.5 text-muted-foreground"
              onClick={() => fileRef.current?.click()}
              disabled={isPending}
            >
              <Camera className="w-3.5 h-3.5" />
              {isPending ? "Subiendo..." : "Cambiar foto de perfil"}
            </Button>
            {profile?.avatar_url && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={handleRemove}
                disabled={isPending}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar foto
              </Button>
            )}
          </div>

          <Separator />

          {/* Logout */}
          <div className="p-2">
            <form action={logout}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar sesión
              </Button>
            </form>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
