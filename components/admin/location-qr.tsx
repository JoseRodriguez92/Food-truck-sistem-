"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function LocationQR({
  locationId,
  locationName,
}: {
  locationId: number;
  locationName: string;
}) {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = `${BASE_URL}/client/menu?location=${locationId}`;

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      if (!canvasRef.current) return;
      QRCode.toCanvas(canvasRef.current, url, {
        width: 280,
        margin: 2,
        color: { dark: "#1a1a1a", light: "#ffffff" },
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [open, url]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${locationName.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-primary transition-colors p-1"
        title="Ver código QR"
      >
        <QrCode className="w-4 h-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" />
              {locationName}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            {/* QR canvas */}
            <div className="rounded-xl overflow-hidden border border-border p-3 bg-white">
              <canvas ref={canvasRef} />
            </div>

            {/* URL */}
            <p className="text-xs text-muted-foreground text-center break-all px-2">
              {url}
            </p>

            {/* Descargar */}
            <Button onClick={handleDownload} className="w-full gap-2">
              <Download className="w-4 h-4" />
              Descargar PNG
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
