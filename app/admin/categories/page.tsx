import { redirect } from "next/navigation";

export default function CategoriesRedirect() {
  redirect("/dashboard?section=catalog.categories");
}
