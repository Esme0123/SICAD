import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { UCBLogo } from "@/components/common/UCBLogo";

interface SplashScreenProps {
  onDone: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(id);
          setTimeout(onDone, 400);
          return 100;
        }
        return p + 1.8;
      });
    }, 55);
    return () => clearInterval(id);
  }, [onDone]);

  return (
    <motion.div
      className="flex flex-col items-center justify-center w-full h-screen relative overflow-hidden"
      style={{
        // Fondo Azul Institucional
        background: "linear-gradient(145deg, var(--color-primary-hover) 0%, var(--color-primary) 100%)",
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] right-[-15%] w-[500px] h-[500px] rounded-full opacity-[0.1]"
          style={{ background: "radial-gradient(circle, var(--color-primary-light) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-25%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-[0.1]"
          style={{ background: "radial-gradient(circle, var(--color-primary-light) 0%, transparent 70%)" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center gap-6 px-8"
      >
        {/* Logo container */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="flex items-center justify-center w-32 h-32 rounded-full"
          style={{
            background: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(244, 180, 0, 0.3)", // Borde dorado tenue
          }}
        >
          <UCBLogo size={88} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center space-y-1"
        >
          {/* Se eliminó text-purple-200 */}
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-white/80">
            Universidad Católica Boliviana "San Pablo"
          </p>
          <p className="text-xs tracking-widest text-white/50">Centro de Cómputo</p>
        </motion.div>

        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="w-px h-10"
          style={{
            // Línea separadora en Dorado
            background: "linear-gradient(to bottom, transparent, var(--color-secondary), transparent)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.7 }}
          className="text-center"
        >
          <h1
            className="text-7xl font-black tracking-tighter text-white"
            style={{ letterSpacing: "-0.02em" }}
          >
            SICAD
          </h1>
          <p className="text-sm text-white/70 mt-2 tracking-wide">
            Sistema Inteligente de Control de Asistencia Digital
          </p>
        </motion.div>

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
          className="w-72 mt-2"
        >
          <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                // Barra de progreso en Dorado UCB
                background: "var(--color-secondary)",
                transition: "width 0.08s linear",
              }}
            />
          </div>
          <p className="text-xs text-white/40 text-center mt-3 tracking-wide">Inicializando sistema...</p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="text-xs text-white/40 text-center mt-2"
        >
          Desarrollado por{" "}
          <span className="text-white/70 font-medium">Esmeralda Paula Medina Paredes</span>
        </motion.p>
      </motion.div>
    </motion.div>
  );
};