// src/components/common/LogoutConfirmModal.tsx
// Modal de doble confirmación para cerrar sesión.

import React from "react";
import { motion } from "motion/react";
import { LogOut } from "lucide-react";

interface LogoutConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({ open, onCancel, onConfirm }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-6"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl border space-y-4"
        style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--destructive) 12%, transparent)", color: "var(--destructive)" }}
          >
            <LogOut size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold">Cerrar sesión</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              ¿Seguro que quieres cerrar sesión?
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            style={{
              background: "color-mix(in srgb, var(--muted-foreground) 12%, transparent)",
              color: "var(--foreground)",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
            style={{ background: "var(--destructive)" }}
          >
            Salir
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default LogoutConfirmModal;
