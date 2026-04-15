"use server";

import nodemailer from "nodemailer";
import { emailTemplate } from "@/HTML/emails";

export type EmailAttachment = {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
  encoding?: string;
};

export type SendEmailParams = {
  to?: string | string[];
  bcc?: string | string[];
  subject: string;
  /** Título principal que aparece en el header de la tarjeta */
  title: string;
  /** Subtítulo opcional (etiqueta dorada debajo del título del header) */
  subtitle?: string;
  /** HTML del cuerpo del mensaje — se inyecta dentro del template */
  html: string;
  fromName?: string;
  attachments?: EmailAttachment[];
};

export type SendEmailResult =
  | { success: true }
  | { success: false; error: string };

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({
  to,
  bcc,
  subject,
  title,
  subtitle,
  html,
  fromName,
  attachments,
}: SendEmailParams): Promise<SendEmailResult> {
  try {
    const senderName = fromName ?? process.env.SMTP_FROM_NAME ?? "3 Street Food";
    const from       = `"${senderName}" <${process.env.SMTP_USER}>`;
    const resolvedTo = to ?? `"${senderName}" <${process.env.SMTP_USER}>`;

    const wrappedHtml = emailTemplate({ title, subtitle, content: html });

    await transporter.sendMail({
      from,
      to: resolvedTo,
      bcc,
      subject,
      html: wrappedHtml,
      attachments,
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[sendEmail]", message);
    return { success: false, error: message };
  }
}
