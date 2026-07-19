export function getRedirectByRole(roleName: string): string {
  const normalized = roleName.toLowerCase().trim();
  if (normalized === "admin" || normalized === "employ") return "/dashboard";
  return "/client";
}
