"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";

const loginSchema = z.object({
  email: z.string().email("Ingresa un correo válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef     = useRef<HTMLDivElement>(null);
  const cardRef     = useRef<HTMLDivElement>(null);
  const footerRef   = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(logoRef.current, { y: -40, opacity: 0, duration: 0.7 })
        .from(cardRef.current, { y: 50, opacity: 0, duration: 0.7, ease: "back.out(1.4)" }, "-=0.3")
        .from(".login-field", { y: 18, opacity: 0, duration: 0.45, stagger: 0.1 }, "-=0.35")
        .from(footerRef.current, { opacity: 0, duration: 0.5 }, "-=0.2");
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setServerError(null);
    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);
    const result = await login(formData);
    if (result?.error) {
      setServerError(
        result.error === "Invalid login credentials"
          ? "Correo o contraseña incorrectos"
          : result.error
      );
    }
  }

  return (
    <div ref={containerRef} className="relative min-h-screen bg-background flex items-center justify-center overflow-hidden px-4">
      {/* Blur orbs */}
      <div className="absolute top-0 right-0 w-72 sm:w-96 h-72 sm:h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-56 sm:w-80 h-56 sm:h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo + subtitle */}
        <div ref={logoRef} className="flex flex-col items-center mb-8">
          <Image
            src="/LogoTipo-3StreetFood.svg"
            alt="3 Street Food"
            width={180}
            height={48}
            priority
            className="mb-4"
          />
          <p className="text-sm text-muted-foreground">
            Para hacer tu pedido, inicia sesión
          </p>
        </div>

        {/* Card */}
        <div ref={cardRef} className="bg-card/80 backdrop-blur-md border border-border rounded-2xl p-6 sm:p-8 shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div className="login-field space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="login-field space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-10"
                  aria-invalid={!!errors.password}
                  {...register("password")}
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
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            {serverError && (
              <div className="login-field rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
                <p className="text-sm text-destructive">{serverError}</p>
              </div>
            )}

            <div className="login-field">
              <Button
                type="submit"
                className="w-full mt-2"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Entrando..." : "Iniciar sesión"}
              </Button>
            </div>
          </form>
        </div>

        <p ref={footerRef} className="text-center text-xs text-muted-foreground mt-6">
          ¿Problemas para acceder? Contacta al administrador.
        </p>
      </div>
    </div>
  );
}
