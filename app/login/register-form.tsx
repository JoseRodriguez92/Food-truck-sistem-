"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleAuthButton } from "@/components/auth/google-button";
import { register } from "./actions";

const registerSchema = z.object({
  first_name: z.string().min(1, "Ingresa tu nombre"),
  email: z.string().email("Ingresa un correo válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterFormValues) {
    setServerError(null);
    const formData = new FormData();
    formData.set("first_name", data.first_name);
    formData.set("email", data.email);
    formData.set("password", data.password);
    if (redirectTo) formData.set("redirect", redirectTo);
    const result = await register(formData);
    if (!result) return;
    if ("error" in result) {
      setServerError(result.error);
    } else if ("redirect" in result) {
      router.push(result.redirect);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="first_name" className="text-sm font-medium">
          Nombre
        </Label>
        <Input
          id="first_name"
          type="text"
          placeholder="Tu nombre"
          autoComplete="given-name"
          aria-invalid={!!errors.first_name}
          {...registerField("first_name")}
        />
        {errors.first_name && (
          <p className="text-xs text-destructive">{errors.first_name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-email" className="text-sm font-medium">
          Correo electrónico
        </Label>
        <Input
          id="reg-email"
          type="email"
          placeholder="tu@correo.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...registerField("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-password" className="text-sm font-medium">
          Contraseña
        </Label>
        <div className="relative">
          <Input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            className="pr-10"
            aria-invalid={!!errors.password}
            {...registerField("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
          <p className="text-sm text-destructive">{serverError}</p>
        </div>
      )}

      <Button type="submit" className="w-full mt-2" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
      </form>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">o continúa con</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <GoogleAuthButton redirectTo={redirectTo} label="Regístrate con Google" />
    </div>
  );
}
