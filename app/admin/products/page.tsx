import { redirect } from "next/navigation";

export default function ProductsRedirect() {
  redirect("/dashboard?section=catalog.products");
}
