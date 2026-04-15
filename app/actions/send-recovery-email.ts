"use server";

import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { resetPasswordEmail } from "@/HTML/emails";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const APP_NAME = "3 Street Food";
const baseUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : process.env.NEXT_PUBLIC_SITE_URL!;

export async function sendRecoveryEmail(
  email: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // 1. Cliente admin con service role (solo servidor)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 2. Verificar que el correo existe en profiles
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (profileErr || !profile) {
      return {
        success: false,
        error:
          "No encontramos una cuenta asociada a este correo. Verifica que sea correcto.",
      };
    }

    // 3. Generar el link de recuperación con la API admin
    //    redirectTo solo es el origen registrado en Supabase; el link real lo construimos nosotros
    const { data: linkData, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${baseUrl}/auth/callback` },
      });

    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error("[sendRecoveryEmail] generateLink error:", linkErr);
      return {
        success: false,
        error: "No se pudo generar el enlace de recuperación.",
      };
    }

    // Apuntamos al callback propio para que el token NO sea consumido
    // por escáneres de correo antes de que el usuario haga clic
    const recoveryLink = `${baseUrl}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=recovery&next=/reset-password`;

    // 4. Enviar con Nodemailer usando nuestro template
    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Recuperación de contraseña — ${APP_NAME}`,
      html: resetPasswordEmail(recoveryLink),
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[sendRecoveryEmail]", message);
    return { success: false, error: message };
  }
}
