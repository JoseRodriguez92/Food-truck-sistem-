import type { Metadata } from "next"
import { LinksContent } from "@/components/links/links-content"

export const metadata: Metadata = {
  title: "3 Street Food | Enlaces",
  description: "Nuestras redes sociales y sitio web.",
}

export default function LinksPage() {
  return <LinksContent />
}
