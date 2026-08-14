import React, { useState, useEffect } from "react";
import { Player, PlayerEvent } from "@lottiefiles/react-lottie-player";
import { Sparkles } from "lucide-react";

const STORAGE_KEY = "sicad_seen_v1_features";
const LOTTIE_URL = "https://assets2.lottiefiles.com/packages/lf20_C9wVG1ULSw.json";

export const FeatureModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [animState, setAnimState] = useState<"pending" | "ok" | "error">("pending");

  useEffect(() => {
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!isOpen || animState !== "pending") return;
    const t = setTimeout(() => setAnimState("error"), 4000);
    return () => clearTimeout(t);
  }, [isOpen, animState]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      {/* Modal Container with refined gradients, borders, and shadows */}
      <div className="isolate bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-gray-700/60 rounded-3xl p-8 max-w-md w-full text-center shadow-[0_20px_50px_rgba(0,0,0,0.7)] relative flex flex-col items-center">

        {/* Glow effect background */}
        <div className="absolute inset-0 bg-blue-500/5 rounded-3xl blur-3xl -z-10" />

        {/* Lottie Animation: Running Cat - Centered */}
        <div className="w-44 h-44 mb-3">
          {animState === "error" ? (
            <div className="w-full h-full flex items-center justify-center text-6xl">🐱</div>
          ) : (
            <Player
              src={LOTTIE_URL}
              autoplay
              loop
              style={{ width: "100%", height: "100%" }}
              onEvent={(e) => {
                if (e === PlayerEvent.Error) setAnimState("error");
                if (e === PlayerEvent.Load) setAnimState("ok");
              }}
            />
          )}
        </div>

        {/* Feature Icon + Title with Sparkles */}
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="text-blue-400" size={24} />
          <h3 className="text-2xl font-extrabold text-white tracking-tight">
            Nuevas Actualizaciones
          </h3>
          <Sparkles className="text-blue-400" size={24} />
        </div>

        {/* Redesigned body text with better spacing and contrast */}
        <p className="text-sm text-gray-300 mb-8 leading-relaxed px-2">
          ¡Tenemos noticias emocionantes! Ahora puedes gestionar tus <strong className="text-blue-400">Horas Extras</strong> y solicitar <strong className="text-blue-400">Reemplazos</strong> directamente desde el menú inferior de tu app móvil.
        </p>

        {/* Sophisticated Action Button */}
        <button
          onClick={handleClose}
          className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-2xl transition duration-200 shadow-lg active:scale-95 shadow-blue-500/20"
        >
          ¡Entendido, ir a revisar!
        </button>
      </div>
    </div>
  );
};