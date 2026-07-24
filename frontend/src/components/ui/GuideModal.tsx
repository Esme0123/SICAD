import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export interface GuideStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  action?: { label: string; onClick: () => void };
}

interface GuideModalProps {
  steps: GuideStep[];
  onClose: () => void;
  variant?: "mobile" | "admin";
}

export const GuideModal: React.FC<GuideModalProps> = ({ steps, onClose, variant = "mobile" }) => {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (!isLast) setStep(step + 1);
    else onClose();
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -20 }}
          transition={{ type: "spring", damping: 22, stiffness: 280 }}
          className={`
            relative overflow-hidden rounded-2xl border shadow-2xl
            ${variant === "admin" ? "w-full max-w-xl" : "w-full max-w-sm mx-4"}
          `}
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: "var(--muted-foreground)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--muted-foreground) 10%, transparent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <X size={variant === "admin" ? 18 : 16} />
          </button>

          {/* Progress Bar */}
          <div className="flex gap-1.5 px-6 pt-5 pb-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-400"
                style={{
                  flex: i === step ? 2 : 1,
                  background: i <= step ? current.color : "var(--border)",
                  opacity: i <= step ? 1 : 0.4,
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="px-6 pt-5 pb-4 flex flex-col items-center text-center">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 250, delay: 0.1 }}
              className={`
                rounded-2xl flex items-center justify-center
                ${variant === "admin" ? "w-20 h-20" : "w-18 h-18"}
              `}
              style={{ background: `${current.color}14`, color: current.color }}
            >
              {current.icon}
            </motion.div>

            {/* Text */}
            <div className={`mt-4 space-y-2 ${variant === "admin" ? "max-w-lg" : ""}`}>
              <h3
                className="font-bold"
                style={{ color: "var(--foreground)", fontSize: variant === "admin" ? "1.1rem" : "1rem" }}
              >
                {current.title}
              </h3>
              <p
                className="leading-relaxed"
                style={{ color: "var(--muted-foreground)", fontSize: variant === "admin" ? "0.875rem" : "0.8125rem" }}
              >
                {current.description}
              </p>
            </div>

            {/* Action Button */}
            {current.action && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { current.action?.onClick(); onClose(); }}
                className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer"
                style={{ background: current.color }}
              >
                {current.action.label}
              </motion.button>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3 px-6 pb-5 pt-1">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: "color-mix(in srgb, var(--muted-foreground) 8%, transparent)",
                color: "var(--muted-foreground)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--muted-foreground) 14%, transparent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--muted-foreground) 8%, transparent)"; }}
            >
              Saltar
            </button>

            <div className="flex-1" />

            {step > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                style={{
                  background: "color-mix(in srgb, var(--muted-foreground) 8%, transparent)",
                  color: "var(--foreground)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--muted-foreground) 14%, transparent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--muted-foreground) 8%, transparent)"; }}
              >
                <ChevronLeft size={variant === "admin" ? 16 : 14} /> Anterior
              </motion.button>
            )}

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer"
              style={{ background: current.color }}
            >
              {isLast ? (
                "Finalizar"
              ) : (
                <>Siguiente <ChevronRight size={variant === "admin" ? 16 : 14} /></>
              )}
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
