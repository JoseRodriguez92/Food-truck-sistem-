import { redirect } from "next/navigation";

export default function LocationsRedirect() {
  redirect("/dashboard?section=trucks.locations");
}
