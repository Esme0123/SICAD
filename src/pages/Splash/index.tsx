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
        background: "linear-gradient(145deg, #2A0835 0%, #4A148C 45%, #6A1B9A 100%)",
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] right-[-15%] w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #64B5F6 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-25%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-[0.05]"
          style={{ background: "radial-gradient(circle, #64B5F6 0%, transparent 70%)" }}
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
            border: "1px solid rgba(100,181,246,0.2)",
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
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-purple-200/80">
            Universidad Católica Boliviana "San Pablo"
          </p>
          <p className="text-xs tracking-widest text-white/40">Centro de Cómputo</p>
        </motion.div>

        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="w-px h-10"
          style={{
            background: "linear-gradient(to bottom, transparent, #64B5F6, transparent)",
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
          <p className="text-sm text-white/55 mt-2 tracking-wide">
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
          <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #64B5F6, #90CAF9)",
                transition: "width 0.08s linear",
              }}
            />
          </div>
          <p className="text-xs text-white/25 text-center mt-3 tracking-wide">Inicializando sistema...</p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="text-xs text-white/25 text-center mt-2"
        >
          Desarrollado por{" "}
          <span className="text-white/45 font-medium">Esmeralda Paula Medina Paredes</span>
        </motion.p>
      </motion.div>
    </motion.div>
  );
};
