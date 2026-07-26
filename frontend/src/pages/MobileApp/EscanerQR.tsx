import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, CameraOff, Loader2, Image } from "lucide-react";

const ESCANER_ID = "qr-scanner-element";

export const MobileEscanerQR: React.FC = () => {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState("");
  const [camOn, setCamOn] = useState(false);
  const [init, setInit] = useState(true);
  const [photoMode, setPhotoMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onScanSuccess = useCallback((decodedText: string) => {
    let token = "";
    try {
      const url = new URL(decodedText);
      token = url.searchParams.get("qrToken") || url.searchParams.get("token") || "";
    } catch {
      token = decodedText;
    }
    if (token) {
      scannerRef.current?.stop().catch(() => {});
      navigate(`/app/marcar?qrToken=${encodeURIComponent(token)}`);
    } else {
      setError("QR inválido: no contiene token de marcación");
    }
  }, [navigate]);

  const onScanError = useCallback(() => {}, []);

  const handlePhotoCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setPhotoMode(true);

    // Redimensionar imagen a max 800px de ancho para facilitar detección QR
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      const scale = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setError('No se pudo procesar la imagen');
          setPhotoMode(false);
          return;
        }

        const resizedFile = new File([blob], 'qr_resized.jpg', { type: 'image/jpeg' });

        try {
          const scanner = new Html5Qrcode(ESCANER_ID);
          scannerRef.current = scanner;

          const result = await scanner.scanFileV2(resizedFile);
          onScanSuccess(result.decodedText);
        } catch (err) {
          setError('No se detectó un código QR claro en la foto. Intenta enfocar más cerca.');
          setPhotoMode(false);
        }
      }, 'image/jpeg', 0.85);
    };

    img.onerror = () => {
      setError('Error al cargar la imagen seleccionada');
      setPhotoMode(false);
    };

    img.src = URL.createObjectURL(rawFile);
  }, [onScanSuccess]);

  const startCamera = useCallback(async () => {
    try {
      // 1. Detener cualquier scanner previo antes de iniciar uno nuevo
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch { /* ignore */ }
        scannerRef.current = null;
      }

      // 2. Obtener lista de cámaras reales del teléfono
      const devices = await Html5Qrcode.getCameras();

      if (!devices || devices.length === 0) {
        setError("No se detectó ninguna cámara en el dispositivo");
        setInit(false);
        return;
      }

      // 3. Seleccionar cámara trasera por label o la última de la lista
      const backCamera = devices.find(d =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('trasera') ||
        d.label.toLowerCase().includes('environment')
      ) || devices[devices.length - 1];

      const cameraId = backCamera.id;

      // 4. Inicializar escáner con el ID exacto de la cámara
      const scanner = new Html5Qrcode(ESCANER_ID);
      scannerRef.current = scanner;

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      await scanner.start(
        cameraId,
        config,
        onScanSuccess,
        onScanError,
      );

      // 5. Forzar atributos obligatorios para móviles en el <video> montado por Html5Qrcode
      const videoEl = document.querySelector(`#${ESCANER_ID} video`);
      if (videoEl) {
        videoEl.setAttribute("playsinline", "true");
        videoEl.setAttribute("muted", "true");
        videoEl.setAttribute("autoplay", "true");
      }

      setCamOn(true);
      setInit(false);
    } catch (err) {
      setError(`Error al iniciar cámara: ${err}`);
      setInit(false);
    }
  }, [onScanSuccess, onScanError]);

  useEffect(() => {
    startCamera();
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, [startCamera]);

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
              onClick={() => { fileInputRef.current?.click(); }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/15 text-white text-sm font-semibold hover:bg-white/25 transition-colors cursor-pointer"
            >
              <Image size={16} />
              Tomar foto al QR
            </button>
            <button
              onClick={() => navigate("/app/inicio")}
              className="px-6 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
            >
              Volver
            </button>
          </div>
        )}

        <div id={ESCANER_ID} className={`w-full max-w-sm ${init || error || photoMode ? "hidden" : ""}`} style={{ width: '100%', minHeight: '320px', backgroundColor: '#000' }} />

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
            <div className="absolute bottom-16 left-0 right-0 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/70 text-xs">
                <Camera size={14} />
                Apunta el QR al centro de la pantalla
              </div>
            </div>
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <button
                onClick={() => { fileInputRef.current?.click(); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-[10px] hover:bg-white/10 hover:text-white/70 transition-colors cursor-pointer"
              >
                <Image size={11} />
                ¿No funciona la cámara? Usar foto
              </button>
            </div>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoCapture}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default MobileEscanerQR;
