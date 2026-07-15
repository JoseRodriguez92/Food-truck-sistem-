import { redirect } from "next/navigation";

export default function FoodTrucksRedirect() {
  redirect("/dashboard?section=trucks.food_trucks");
}
