"use server";

import { sendRecoveryEmail } from "@/app/actions/send-recovery-email";

export async function sendResetEmail(formData: FormData) {
  const email = formData.get("email") as string;
  return sendRecoveryEmail(email);
}
