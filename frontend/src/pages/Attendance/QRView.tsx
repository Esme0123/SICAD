import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { RefreshCw, Server, Wifi } from "lucide-react";
import { QRCodeDisplay } from "./components/QRCodeDisplay";
import { CircularTimer } from "./components/CircularTimer";
import { Avatar } from "@/components/common/Avatar";
import { card } from "@/utils/card";

interface QRViewProps {
  dark: boolean;
}

export const QRView: React.FC<QRViewProps> = ({ dark }) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);
  const [rev, setRev] = useState(0);
  const [flash, setFlash] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      setRev((r) => r + 1);
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
      setCountdown(10);
      return;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const sideCard = card(dark, "p-5");

  return (
    <div
      className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-5"
      style={{ background: dark ? "#0B0F19" : "#F8FAFC" }}
    >
      {/* Main panel */}
      <div className={card(dark, "flex-1 flex flex-col items-center justify-center p-10 relative")}>
        {/* Top bar */}
        <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full bg-green-400"
              style={{ animation: "pulse 2s infinite" }}
            />
            <span className={`text-xs font-medium ${dark ? "text-white/40" : "text-slate-500"}`}>
              Sistema activo
            </span>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: flash ? "rgba(46,125,50,0.18)" : "rgba(106,27,154,0.08)",
              color: flash ? "#2E7D32" : "#6A1B9A",
            }}
          >
            <RefreshCw size={11} className={flash ? "animate-spin" : ""} />
            {flash ? "QR actualizado" : "Actualización automática"}
          </div>
        </div>

        {/* Period/time */}
        <div className="text-center mb-7 mt-4">
          <p
            className={`text-xs font-semibold tracking-widest uppercase mb-2 ${
              dark ? "text-white/30" : "text-slate-400"
            }`}
          >
            Periodo actual
          </p>
          <h3 className={`text-3xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>
            10:15 – 11:15
          </h3>
          <p className={`text-sm mt-1.5 ${dark ? "text-white/35" : "text-slate-400"}`}>
            {now.toLocaleTimeString("es-BO")} &nbsp;·&nbsp;
            {now.toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* QR Code */}
        <motion.div
          key={rev}
          initial={{ scale: 0.93, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35 }}
          onClick={() => navigate("/attendance/success")}
          className="cursor-pointer relative p-5 rounded-3xl"
          style={{
            background: dark ? "#0B0F19" : "#F8FAFC",
            boxShadow: "0 24px 64px rgba(106,27,154,0.18)",
          }}
        >
          <QRCodeDisplay size={230} color={dark ? "#64B5F6" : "#6A1B9A"} />
          {/* Corner accents */}
          {[
            ["top-0 left-0", "tl"],
            ["top-0 right-0", "tr"],
            ["bottom-0 left-0", "bl"],
            ["bottom-0 right-0", "br"],
          ].map(([pos, k]) => (
            <div
              key={k}
              className={`absolute ${pos} w-6 h-6`}
              style={{
                borderTop: k[0] === "t" ? "3px solid #64B5F6" : "none",
                borderBottom: k[0] === "b" ? "3px solid #64B5F6" : "none",
                borderLeft: k[1] === "l" ? "3px solid #64B5F6" : "none",
                borderRight: k[1] === "r" ? "3px solid #64B5F6" : "none",
                borderRadius:
                  k === "tl"
                    ? "8px 0 0 0"
                    : k === "tr"
                    ? "0 8px 0 0"
                    : k === "bl"
                    ? "0 0 0 8px"
                    : "0 0 8px 0",
              }}
            />
          ))}
        </motion.div>

        <p className={`text-xs mt-4 ${dark ? "text-white/25" : "text-slate-400"}`}>
          Toca el QR para simular un escaneo exitoso
        </p>

        {/* Timer */}
        <div className="mt-6">
          <CircularTimer seconds={countdown} dark={dark} />
        </div>
      </div>

      {/* Side panel */}
      <div className="w-full md:w-72 flex flex-col gap-4">
        {/* Server status */}
        <div className={sideCard}>
          <p
            className={`text-xs font-semibold uppercase tracking-widest mb-4 ${
              dark ? "text-white/30" : "text-slate-400"
            }`}
          >
            Estado del sistema
          </p>
          <div className="space-y-2.5">
            {[
              { label: "Servidor API", ok: true },
              { label: "Base de datos", ok: true },
              { label: "Motor QR", ok: true },
              { label: "Red local", ok: true },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server size={12} className={dark ? "text-white/30" : "text-slate-400"} />
                  <span className={`text-xs ${dark ? "text-white/50" : "text-slate-600"}`}>
                    {s.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-xs font-medium text-green-500">
                    {s.ok ? "En línea" : "Error"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Last record */}
        <div className={sideCard}>
          <p
            className={`text-xs font-semibold uppercase tracking-widest mb-4 ${
              dark ? "text-white/30" : "text-slate-400"
            }`}
          >
            Última asistencia
          </p>
          <div
            className={`p-3.5 rounded-xl flex items-center gap-3 ${
              dark
                ? "bg-green-900/20 border border-green-800/25"
                : "bg-green-50 border border-green-100"
            }`}
          >
            <Avatar name="Ana Flores" size={36} bg="#6A1B9A" />
            <div>
              <p className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-800"}`}>
                Ana Flores Mendoza
              </p>
              <p className="text-xs text-green-600 font-medium">✓ Hace 2 min — 10:15–11:15</p>
            </div>
          </div>
        </div>

        {/* Day stats */}
        <div className={sideCard}>
          <p
            className={`text-xs font-semibold uppercase tracking-widest mb-4 ${
              dark ? "text-white/30" : "text-slate-400"
            }`}
          >
            Resumen del día
          </p>
          <div className="space-y-3">
            {[
              { label: "Total registradas", value: "47", col: "#6A1B9A" },
              { label: "Pendientes", value: "5", col: "#F9A825" },
              { label: "Ausencias", value: "2", col: "#C62828" },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className={`text-xs ${dark ? "text-white/40" : "text-slate-500"}`}>
                  {s.label}
                </span>
                <span className="text-sm font-bold" style={{ color: s.col }}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Period info */}
        <div className={sideCard}>
          <p
            className={`text-xs font-semibold uppercase tracking-widest mb-3 ${
              dark ? "text-white/30" : "text-slate-400"
            }`}
          >
            Periodos de hoy
          </p>
          <div className="space-y-1.5">
            {[
              { label: "07:15–08:15", done: true },
              { label: "08:15–09:15", done: true },
              { label: "09:15–10:15", done: true },
              { label: "10:15–11:15", done: false, active: true },
              { label: "11:15–12:15", done: false },
            ].map((p, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${
                  p.active ? (dark ? "bg-purple-900/30" : "bg-purple-50") : ""
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    p.done
                      ? "bg-green-400"
                      : p.active
                      ? "bg-yellow-400"
                      : dark
                      ? "bg-white/15"
                      : "bg-slate-200"
                  }`}
                />
                <span
                  className={`text-xs font-mono ${
                    p.active
                      ? dark
                        ? "text-purple-300"
                        : "text-purple-700"
                      : dark
                      ? "text-white/40"
                      : "text-slate-500"
                  }`}
                >
                  {p.label}
                </span>
                {p.active && <span className="ml-auto text-xs font-semibold text-yellow-500">Activo</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
