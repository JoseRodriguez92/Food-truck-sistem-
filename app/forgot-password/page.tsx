"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Truck, ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendResetEmail } from "./actions";

const schema = z.object({
  email: z.string().email("Ingresa un correo válido"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError(null);
    const formData = new FormData();
    formData.set("email", data.email);
    const result = await sendResetEmail(formData);
    if (!result.success) {
      setServerError(result.error);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center overflow-hidden px-4">
      <div className="absolute top-0 right-0 w-72 sm:w-96 h-72 sm:h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-56 sm:w-80 h-56 sm:h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Truck className="w-7 h-7 text-primary" />
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            3 Street Food
          </h1>
        </div>

        <div className="bg-card/80 backdrop-blur-md border border-border rounded-2xl p-6 sm:p-8 shadow-lg">
          {sent ? (
            /* Estado: correo enviado */
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20">
                <MailCheck className="w-7 h-7 text-green-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Revisa tu correo</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enviamos un enlace de recuperación a{" "}
                  <span className="font-medium text-foreground">
                    {getValues("email")}
                  </span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Si no lo ves, revisa tu carpeta de spam.
              </p>
              <Link
                href="/login"
                className="text-sm text-primary hover:underline underline-offset-4"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            /* Formulario */
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold">¿Olvidaste tu contraseña?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Te enviamos un enlace para restablecerla.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Correo electrónico</Label>
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

                {serverError && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
                    <p className="text-sm text-destructive">{serverError}</p>
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? "Enviando..." : "Enviar enlace"}
                </Button>
              </form>
            </>
          )}
        </div>

        {!sent && (
          <div className="flex justify-center mt-6">
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al inicio de sesión
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
