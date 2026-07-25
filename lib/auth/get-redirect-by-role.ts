// admin/employ/socio entran al panel — el resto (o sin rol) va al menú del cliente.
export function getRedirectByRole(roleName: string): string {
  const normalized = roleName.toLowerCase().trim();
  if (normalized === "admin" || normalized === "employ" || normalized === "socio") return "/dashboard";
  return "/client";
}

export function hasDashboardAccess(roleNames: string[]): boolean {
  return roleNames.some((r) => getRedirectByRole(r) === "/dashboard");
}
