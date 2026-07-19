import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Scene3D } from "@/components/arma-tu-truck/scene-3d"

export const metadata = {
  title: "Arma Tu Truck | 3 Street Food",
}

export default function ArmaTuTruckPage() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <Scene3D />

      <div className="absolute top-4 left-4 z-10 sm:top-6 sm:left-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-background/80 backdrop-blur-md border border-border px-4 py-2 text-sm font-medium text-foreground shadow-lg transition-colors hover:bg-accent"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>
      </div>
    </div>
  )
}
