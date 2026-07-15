import { redirect } from "next/navigation";

export default function UsersRedirect() {
  redirect("/dashboard?section=users.list");
}
