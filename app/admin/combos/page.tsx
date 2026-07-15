import { redirect } from "next/navigation";

export default function CombosRedirect() {
  redirect("/dashboard?section=catalog.combos");
}
