import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRedirectByRole } from "@/lib/auth/get-redirect-by-role";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const searchParams = requestUrl.searchParams;
  // Detrás de un reverse proxy, el origin de request.url puede resolver a la
  // dirección interna donde escucha el proceso (ej. http://0.0.0.0:3000) en vez
  // del dominio público — se usa NEXT_PUBLIC_SITE_URL como fuente de verdad.
  const origin = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "recovery" | "signup" | null;
  const code = searchParams.get("code");
  const explicitNext = searchParams.get("next");
  const next = explicitNext ?? "/";

  const supabase = await createClient();

  // Flujo OTP (magic link de recuperación / confirmación de signup por email)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // Flujo OAuth (Google, etc.)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // OAuth no pasa role_id por metadata (a diferencia del registro con email/password) —
      // si es la primera vez que este usuario entra, asignarle el rol "client" por default.
      const { data: existingRole } = await supabase
        .from("profile_has_role")
        .select("profile_role_id")
        .eq("profile_id", data.user.id)
        .limit(1)
        .maybeSingle();

      if (!existingRole) {
        const { data: clientRole } = await supabase
          .from("roles")
          .select("role_id")
          .eq("code", "client")
          .single();
        if (clientRole) {
          await supabase
            .from("profile_has_role")
            .insert({ profile_id: data.user.id, role_id: clientRole.role_id });
        }
      }

      // Si venía de un flujo con retorno explícito (ej. guest checkout), respetarlo.
      // Si no, decidir destino según el rol real del usuario (admin/employ → /dashboard).
      if (explicitNext && explicitNext.startsWith("/")) {
        return NextResponse.redirect(`${origin}${explicitNext}`);
      }

      const { data: roleData } = await supabase
        .from("profile_has_role")
        .select("roles(name)")
        .eq("profile_id", data.user.id)
        .limit(1)
        .single();
      const rolesRaw = roleData?.roles as unknown as { name: string } | { name: string }[] | null;
      const roleName = (Array.isArray(rolesRaw) ? rolesRaw[0] : rolesRaw)?.name ?? "client";

      return NextResponse.redirect(`${origin}${getRedirectByRole(roleName)}`);
    }
  }

  // Token/código inválido o expirado
  return NextResponse.redirect(`${origin}/login?error=link_invalido`);
}
