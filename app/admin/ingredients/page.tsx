import { redirect } from "next/navigation";

export default function IngredientsRedirect() {
  redirect("/dashboard?section=catalog.ingredients");
}
