import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, CameraOff, Loader2 } from "lucide-react";

const ESCANER_ID = "qr-scanner-element";

export const MobileEscanerQR: React.FC = () => {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState("");
  const [camOn, setCamOn] = useState(false);
  const [init, setInit] = useState(true);

  useEffect(() => {
    const scanner = new Html5Qrcode(ESCANER_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 280 } },
        (decodedText) => {
          // Extraer qrToken de la URL escaneada
          let token = "";
          try {
            const url = new URL(decodedText);
            token = url.searchParams.get("qrToken") || url.searchParams.get("token") || "";
          } catch {
            // Si no es URL válida, usar el texto directamente
            token = decodedText;
          }
          if (token) {
            scanner.stop().catch(() => {});
            navigate(`/app/marcar?qrToken=${encodeURIComponent(token)}`);
          } else {
            setError("QR inválido: no contiene token de marcación");
          }
        },
        () => {},
      )
      .then(() => {
        setCamOn(true);
        setInit(false);
      })
      .catch((err) => {
        setError(`No se pudo iniciar la cámara: ${err}`);
        setInit(false);
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={() => navigate("/app/inicio")}
          className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
        >
          <X size={20} />
          <span className="text-sm font-medium">Cerrar</span>
        </button>
        <span className="text-sm font-semibold text-white/60">Escáner QR</span>
        <div className="w-16" />
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        {init && (
          <div className="flex flex-col items-center gap-3 text-white/60">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-sm">Iniciando cámara...</p>
          </div>
        )}

        {error && !init && (
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <CameraOff size={40} className="text-red-400" />
            <p className="text-sm text-white/80">{error}</p>
            <button
              onClick={() => navigate("/app/inicio")}
              className="px-6 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
            >
              Volver
            </button>
          </div>
        )}

        <div id={ESCANER_ID} className={`w-full max-w-sm ${init || error ? "hidden" : ""}`} />

        {camOn && !error && (
          <>
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-64 h-64 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br" />
              </div>
            </div>
            <div className="absolute bottom-8 left-0 right-0 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/70 text-xs">
                <Camera size={14} />
                Apunta el QR al centro de la pantalla
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MobileEscanerQR;
