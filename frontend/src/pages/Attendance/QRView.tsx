import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { RefreshCw, Server } from "lucide-react";
import { QRCodeDisplay } from "./components/QRCodeDisplay";
import { CircularTimer } from "./components/CircularTimer";
import { Avatar } from "@/components/common/Avatar";
import { card } from "@/utils/card";
import { generateQRToken, getQrDashboard, getEstadoHoy, QrDashboardPeriod, EstadoHoyPeriodo } from "@/services/qr.service";

interface QRViewProps {
  dark: boolean;
}

type MarkType = "entrada" | "atraso" | "permiso" | "salida" | "ausente";

const markColors: Record<MarkType, string> = {
  entrada:  "bg-green-400",
  atraso:   "bg-yellow-400",
  permiso:  "bg-primary",
  salida:   "bg-green-400",
  ausente:  "bg-destructive",
};

export const QRView: React.FC<QRViewProps> = ({ dark }) => {
  const navigate = useNavigate();

  const [token, setToken]               = useState<string>("CARGANDO...");
  const [countdown, setCountdown]       = useState<number>(30);
  const [totalDuration, setTotalDuration] = useState<number>(30);
  const [flash, setFlash]               = useState(false);
  const [now, setNow]                   = useState(new Date());
  const [loadError, setLoadError]       = useState(false);
  const [periodos, setPeriodos]         = useState<QrDashboardPeriod[]>([]);
  const [totalAsistencias, setTotalAsistencias] = useState<number>(0);
  const [atrasos, setAtrasos]           = useState<number>(0);
  const [ultimoRegistro, setUltimoRegistro] = useState<{ nombre: string; codigo: string; hora: string; estado: string } | null>(null);
  const [estadoHoy, setEstadoHoy]       = useState<EstadoHoyPeriodo[]>([]);

  const activePeriod = periodos.find(p => p.activo);
  const pendientes = periodos.filter(p => !p.activo).length;
  const ausentes = estadoHoy.filter(e => e.estado === "ausente").length;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashboard, estado] = await Promise.all([
        getQrDashboard(),
        getEstadoHoy(),
      ]);
      setPeriodos(dashboard.periodos);
      setTotalAsistencias(dashboard.totalAsistencias);
      setAtrasos(dashboard.atrasos);
      setUltimoRegistro(dashboard.ultimoRegistro);
      setEstadoHoy(estado);
    } catch (err) {
      console.error("Error al obtener dashboard QR:", err);
    }
  }, []);

  const fetchToken = useCallback(async () => {
    try {
      setLoadError(false);
      const res = await generateQRToken();
      setToken(res.token);
      const remaining = Math.floor(res.expiresAt - Date.now() / 1000);
      const duration  = remaining > 0 ? remaining : 30;
      setTotalDuration(duration);
      setCountdown(duration);
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
      await fetchDashboard();
    } catch {
      setLoadError(true);
      setToken("ERROR");
      setCountdown(10);
    }
  }, [fetchDashboard]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Polling de estado cada 30 segundos
  useEffect(() => {
    const id = setInterval(() => {
      getEstadoHoy().then(setEstadoHoy).catch(console.error);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      fetchToken();
      return;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown, fetchToken]);

  const sideCard = card(dark, "p-5");
  const qrColor = dark ? "var(--primary)" : "var(--primary)";

  return (
    <div
      className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-5"
      style={{ background: dark ? "var(--background)" : "var(--background)" }}
    >
      {/* ── Panel principal ──────────────────────────────── */}
      <div className={card(dark, "flex-1 flex flex-col items-center justify-center p-10 relative")}>
        {/* Top bar */}
        <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" style={{ animation: "pulse 2s infinite" }} />
            <span className={`text-xs font-medium ${dark ? "text-white/40" : "text-slate-500"}`}>
              Sistema activo
            </span>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              flash
                ? "bg-green-500/15 text-green-600"
                : "bg-primary/10 text-primary"
            }`}
          >
            <RefreshCw size={11} className={flash ? "animate-spin" : ""} />
            {flash ? "QR actualizado" : "Actualización automática"}
          </div>
        </div>

        {/* Periodo y hora actual */}
        <div className="text-center mb-7 mt-4">
          <p className={`text-xs font-semibold tracking-widest uppercase mb-2 ${dark ? "text-white/30" : "text-slate-400"}`}>
            Periodo actual
          </p>
          <h3 className={`text-3xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>
            {activePeriod
              ? `${activePeriod.horaInicio} – ${activePeriod.horaFin}`
              : periodos.length > 0
              ? "Sin periodo activo"
              : "Cargando..."}
          </h3>
          <p className={`text-sm mt-1.5 ${dark ? "text-white/35" : "text-slate-400"}`}>
            {now.toLocaleTimeString("es-BO")} &nbsp;·&nbsp;
            {now.toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* QR Code */}
        <motion.div
          key={token}
          initial={{ scale: 0.93, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35 }}
          onClick={() => navigate("/attendance/success")}
          className="cursor-pointer relative p-5 rounded-3xl"
          style={{
            background: dark ? "var(--card)" : "var(--background)",
            boxShadow: "0 24px 64px rgba(15,76,151,0.18)",
          }}
        >
          {loadError ? (
            <div className="w-[230px] h-[230px] flex flex-col items-center justify-center gap-3 text-destructive">
              <Server size={40} />
              <span className="text-xs font-medium text-center">Sin conexión al servidor</span>
            </div>
          ) : (
            <QRCodeDisplay
              value={`${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ""}/marcar?token=${encodeURIComponent(token)}`}
              size={230}
              color={qrColor}
            />
          )}

          {(["tl", "tr", "bl", "br"] as const).map((k) => (
            <div
              key={k}
              className={`absolute w-6 h-6 ${
                k === "tl" ? "top-0 left-0" :
                k === "tr" ? "top-0 right-0" :
                k === "bl" ? "bottom-0 left-0" : "bottom-0 right-0"
              }`}
              style={{
                borderTop:    k[0] === "t" ? "3px solid var(--primary)" : "none",
                borderBottom: k[0] === "b" ? "3px solid var(--primary)" : "none",
                borderLeft:   k[1] === "l" ? "3px solid var(--primary)" : "none",
                borderRight:  k[1] === "r" ? "3px solid var(--primary)" : "none",
                borderRadius:
                  k === "tl" ? "8px 0 0 0" :
                  k === "tr" ? "0 8px 0 0" :
                  k === "bl" ? "0 0 0 8px" : "0 0 8px 0",
              }}
            />
          ))}
        </motion.div>

        <p className={`text-xs mt-4 ${dark ? "text-white/25" : "text-slate-400"}`}>
          Toca el QR para simular un escaneo exitoso
        </p>

        <div className="mt-6">
          <CircularTimer seconds={countdown} total={totalDuration} dark={dark} />
        </div>
      </div>

      {/* ── Panel lateral ────────────────────────────────── */}
      <div className="w-full md:w-72 flex flex-col gap-4">
        {/* Estado del sistema */}
        <div className={sideCard}>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-4 ${dark ? "text-white/30" : "text-slate-400"}`}>
            Estado del sistema
          </p>
          <div className="space-y-2.5">
            {[
              { label: "Servidor API",   ok: !loadError },
              { label: "Base de datos",  ok: true       },
              { label: "Motor QR",       ok: !loadError },
              { label: "Red local",      ok: true       },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server size={12} className={dark ? "text-white/30" : "text-slate-400"} />
                  <span className={`text-xs ${dark ? "text-white/50" : "text-slate-600"}`}>{s.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${s.ok ? "bg-green-400" : "bg-destructive"}`} />
                  <span className={`text-xs font-medium ${s.ok ? "text-green-500" : "text-destructive"}`}>
                    {s.ok ? "En línea" : "Error"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Última asistencia */}
        <div className={sideCard}>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-4 ${dark ? "text-white/30" : "text-slate-400"}`}>
            Última asistencia
          </p>
          {ultimoRegistro ? (
            <div className={`p-3.5 rounded-xl flex items-center gap-3 ${
              dark ? "bg-green-900/20 border border-green-800/25" : "bg-green-50 border border-green-100"
            }`}>
              <Avatar name={ultimoRegistro.nombre} size={36} bg="var(--primary)" />
              <div className="min-w-0">
                <p className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-slate-800"}`}>
                  {ultimoRegistro.nombre}
                </p>
                <p className="text-xs text-green-600 font-medium">✓ {ultimoRegistro.hora}</p>
              </div>
            </div>
          ) : (
            <p className={`text-xs ${dark ? "text-white/30" : "text-slate-400"}`}>
              Sin registros hoy
            </p>
          )}
        </div>

        {/* Resumen del día */}
        <div className={sideCard}>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-4 ${dark ? "text-white/30" : "text-slate-400"}`}>
            Resumen del día
          </p>
          <div className="space-y-3">
            {[
              { label: "Total registradas", value: String(totalAsistencias), cls: "text-primary" },
              { label: "Atrasos",           value: String(atrasos),          cls: "text-yellow-500" },
              { label: "Ausentes",           value: String(ausentes),         cls: "text-destructive" },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className={`text-xs ${dark ? "text-white/40" : "text-slate-500"}`}>{s.label}</span>
                <span className={`text-sm font-bold ${s.cls}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Periodos del día — con estado real */}
        <div className={sideCard}>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-white/30" : "text-slate-400"}`}>
            Periodos de hoy
          </p>
          <div className="space-y-1">
            {estadoHoy.length === 0 ? (
              <p className={`text-xs ${dark ? "text-white/20" : "text-slate-300"}`}>Cargando...</p>
            ) : (
              estadoHoy.map((p, i) => {
                const dotCls =
                  p.activo ? "bg-yellow-400"
                  : p.estado === "entrada" ? "bg-green-400"
                  : p.estado === "ausente" ? "bg-red-400"
                  : dark ? "bg-white/15" : "bg-slate-200";

                const labelCls =
                  p.activo ? "text-primary font-semibold"
                  : p.estado === "ausente" ? "text-red-500"
                  : dark ? "text-white/40" : "text-slate-500";

                return (
                  <React.Fragment key={p.id}>
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCls}`} />
                      <span className={`text-xs font-mono ${labelCls}`}>
                        {p.horaInicio} – {p.horaFin}
                      </span>
                      <span className="ml-auto text-[10px] font-semibold uppercase"
                        style={{
                          color:
                            p.estado === "entrada" ? "#22c55e"
                            : p.estado === "ausente" ? "#ef4444"
                            : p.estado === "pendiente" ? "#eab308"
                            : undefined,
                        }}
                      >
                        {p.activo ? "Activo" : p.estado}
                      </span>
                    </div>
                    <div className={`ml-[16px] pb-1 flex gap-3 text-[10px] ${dark ? "text-white/25" : "text-slate-400"}`}>
                      <span>{p.marcaron}/{p.totalEmpleados} marcaron</span>
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
