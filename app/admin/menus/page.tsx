import { redirect } from "next/navigation";

export default function MenusRedirect() {
  redirect("/dashboard?section=catalog.menus");
}
