import { redirect } from "next/navigation";

export default function TareasRedirect() {
  redirect("/dashboard?section=tareas");
}
