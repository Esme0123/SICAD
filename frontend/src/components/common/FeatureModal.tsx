import React, { useState, useEffect } from "react";
import { Player, PlayerEvent } from "@lottiefiles/react-lottie-player";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1b253b] border border-gray-700/50 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl relative flex flex-col items-center">
        <div className="w-40 h-40 mb-2">
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

        <h3 className="text-xl font-bold text-white mb-2">
          ¡Nuevas Funciones Disponibles! 🚀
        </h3>

        <p className="text-sm text-gray-300 mb-6 leading-relaxed">
          Hemos actualizado la app. Ahora ya puedes gestionar tus{" "}
          <strong className="text-blue-400">Horas Extras</strong> y solicitar o
          atender <strong className="text-blue-400">Reemplazos</strong>{" "}
          directamente desde el menú inferior.
        </p>

        <button
          onClick={handleClose}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition duration-200 shadow-lg active:scale-95"
        >
          ¡Entendido, ir a revisar!
        </button>
      </div>
    </div>
  );
};