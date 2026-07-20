import { redirect } from "next/navigation";

export default function LotesRedirect() {
  redirect("/dashboard?section=catalog.lotes");
}
