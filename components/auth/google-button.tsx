"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.48a5.54 5.54 0 0 1-2.4 3.63v3.02h3.89c2.28-2.1 3.59-5.2 3.59-8.84z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.89-3.02c-1.08.72-2.46 1.15-4.05 1.15-3.12 0-5.76-2.1-6.7-4.93H1.28v3.11A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.59H1.28a12 12 0 0 0 0 10.82z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.59l4.02 3.11C6.24 6.87 8.88 4.77 12 4.77z"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  redirectTo,
  label = "Continuar con Google",
}: {
  redirectTo?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    // Solo mandamos "next" si viene un retorno explícito (ej. guest checkout).
    // Sin eso, el callback decide el destino según el rol real del usuario.
    const explicitNext = redirectTo && redirectTo.startsWith("/") ? redirectTo : null;
    const callbackUrl = explicitNext
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(explicitNext)}`
      : `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full font-semibold gap-2 hover:text-white cursor-pointer"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
      {label}
    </Button>
  );
}
