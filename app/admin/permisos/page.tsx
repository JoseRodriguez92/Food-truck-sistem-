import { redirect } from "next/navigation";

export default function PermisosRedirect() {
  redirect("/dashboard?section=users.permissions");
}
