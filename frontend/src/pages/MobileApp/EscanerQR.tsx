import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import jsQR from "jsqr";
import { X, Camera, CameraOff, Loader2, CheckCircle, Clock, XCircle } from "lucide-react";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";
import { marcarAsistenciaConAuth } from "@/services/qr.service";
import { anunciarAsistencia } from "@/utils/tts.utils";

export const MobileEscanerQR: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useEmployeeAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const [camOn, setCamOn] = useState(false);
  const [init, setInit] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [resultado, setResultado] = useState<{ tipo: "success" | "error"; accion?: string; estado?: string; mensaje: string; hora?: string; periodo?: string; empleadoNombre?: string } | null>(null);

  // Evita ejecuciones concurrentes en el bucle del escáner mientras se procesa
  // la marcación (petición de red + tarjeta de respuesta de 3s).
  const isProcessingRef = useRef<boolean>(false);

  const onScanSuccess = useCallback(async (decodedText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    let token = "";
    try {
      const url = new URL(decodedText);
      token = url.searchParams.get("qrToken") || url.searchParams.get("token") || "";
    } catch {
      token = decodedText;
    }
    if (!token) {
      setError("QR inválido: no contiene token de marcación");
      isProcessingRef.current = false;
      return;
    }
    if (isAuthenticated && user) {
      try {
        const jwt = localStorage.getItem("sicad_emp_token") || "";
        const res = await marcarAsistenciaConAuth(token, jwt);
        setResultado({
          tipo: "success",
          accion: res.accion,
          estado: res.estado,
          mensaje: res.accion === "ENTRADA" ? "Entrada registrada con éxito" : "Salida registrada con éxito",
          hora: res.horaEntrada || undefined,
          periodo: res.periodo || undefined,
          empleadoNombre: res.empleado?.nombre,
        });
        anunciarAsistencia(res.empleado?.nombre || "Empleado");
        setTimeout(() => {
          setResultado(null);
          isProcessingRef.current = false;
        }, 3000);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? "Error al registrar";
        setResultado({ tipo: "error", mensaje: msg });
        setTimeout(() => {
          setResultado(null);
          isProcessingRef.current = false;
        }, 3000);
      }
    } else {
      isProcessingRef.current = false;
      navigate(`/app/marcar?qrToken=${encodeURIComponent(token)}`);
    }
  }, [isAuthenticated, user, navigate]);

  const scanFrame = useCallback(() => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          onScanSuccess(code.data);
        }
      }
    }
    if (videoRef.current && videoRef.current.srcObject) {
      requestAnimationFrame(scanFrame);
    }
  }, [onScanSuccess]);

  const solicitarPermisoCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" } }
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        fallbackStream.getTracks().forEach(track => track.stop());
        return true;
      } catch {
        return false;
      }
    }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationId: number;

    const startCamera = async () => {
      const tienePermiso = await solicitarPermisoCamara();
      if (!tienePermiso) {
        setError("No se pudo acceder a la cámara. Revisa los permisos de tu navegador o dispositivo.");
        setInit(false);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error("Error al reproducir video:", e));
            setCamOn(true);
            setInit(false);
            animationId = requestAnimationFrame(scanFrame);
          };
        }
      } catch (err) {
        console.error("Error al acceder a la cámara:", err);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch(e => console.error("Error al reproducir video:", e));
              setCamOn(true);
              setInit(false);
              animationId = requestAnimationFrame(scanFrame);
            };
          }
        } catch (err2) {
          setError("No se pudo acceder a la cámara. Revisa los permisos de tu navegador o dispositivo.");
          setInit(false);
        }
      }
    };

    startCamera();

    return () => {
      cancelAnimationFrame(animationId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [scanFrame]);

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

        {isLoading && (
          <div className="flex flex-col items-center gap-3 text-white/60">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-sm">Procesando imagen...</p>
          </div>
        )}

        {error && !init && !isLoading && (
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

        <div className="relative w-full h-80 bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {resultado && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10 rounded-lg">
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              {resultado.tipo === "success" ? (
                <>
                  {resultado.estado === "TARDANZA" ? (
                    <Clock size={48} className="text-amber-400" />
                  ) : (
                    <CheckCircle size={48} className="text-emerald-400" />
                  )}
                  <p className="text-white font-bold text-base">{resultado.mensaje}</p>
                  {resultado.hora && <p className="text-white/70 font-mono text-sm">{resultado.hora}</p>}
                  {resultado.periodo && <p className="text-white/50 text-[10px] font-mono">{resultado.periodo}</p>}
                </>
              ) : (
                <>
                  <XCircle size={48} className="text-red-400" />
                  <p className="text-white font-bold text-sm">{resultado.mensaje}</p>
                </>
              )}
            </div>
          </div>
        )}

        {camOn && !error && !isLoading && (
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

          </>
        )}

      </div>
    </div>
  );
};

export default MobileEscanerQR;
