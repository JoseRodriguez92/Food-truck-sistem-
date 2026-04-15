"use server";

import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { welcomeEmail } from "@/HTML/emails";

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

export async function sendWelcomeEmail(
  email: string,
  firstName: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Generar link de recuperación — el usuario lo usa para poner SU propia contraseña
    const { data: linkData, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${baseUrl}/auth/callback` },
      });

    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error("[sendWelcomeEmail] generateLink error:", linkErr);
      return { success: false, error: "No se pudo generar el enlace de activación." };
    }

    const setPasswordUrl = `${baseUrl}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=recovery&next=/reset-password`;

    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Bienvenido a ${APP_NAME} — Activa tu cuenta`,
      html: welcomeEmail(firstName, setPasswordUrl),
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[sendWelcomeEmail]", message);
    return { success: false, error: message };
  }
}
