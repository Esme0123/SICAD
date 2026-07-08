import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users, Clock, QrCode, BarChart2, Settings, LogOut, Moon, Sun,
  Bell, Search, Plus, Edit2, Trash2, Calendar, Download, Filter,
  RefreshCw, Shield, Database, Activity, Check, UserCheck, Wifi,
  Eye, EyeOff, Lock, Mail, Home, Server, ArrowUpRight, ClipboardList,
  TrendingUp, Menu, ChevronRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────
type AppScreen = "splash" | "login" | "app";
type NavId = "dashboard" | "employees" | "periods" | "qr" | "success" | "history" | "reports" | "settings";

// ─── UCB Institutional Logo ───────────────────────────────────────────────────
const UCBLogo = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 92" fill="none">
    <path d="M40 3 L75 17 L75 54 Q75 76 40 89 Q5 76 5 54 L5 17 Z" fill="#003B7A" />
    <path d="M40 3 L75 17 L75 54 Q75 76 40 89 Q5 76 5 54 L5 17 Z" fill="none" stroke="#F2B632" strokeWidth="2.5" />
    <rect x="36.5" y="23" width="7" height="44" fill="#F2B632" rx="1.5" />
    <rect x="19" y="39" width="42" height="7" fill="#F2B632" rx="1.5" />
    <circle cx="27" cy="29" r="4.5" fill="none" stroke="rgba(242,182,50,0.7)" strokeWidth="1.5" />
    <circle cx="53" cy="29" r="4.5" fill="none" stroke="rgba(242,182,50,0.7)" strokeWidth="1.5" />
  </svg>
);

// ─── QR Code Display (SVG grid) ───────────────────────────────────────────────
const QRCodeDisplay = ({ size = 220, color = "#003B7A" }: { size?: number; color?: string }) => {
  const grid = [
    [1,1,1,1,1,1,1,0,1,0,1,1,0,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,1,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,0,0],
    [1,1,0,1,1,0,1,1,0,1,0,0,1,1,1,0,1,1,0,1,1],
    [0,1,0,1,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0],
    [1,0,1,0,1,0,1,0,1,0,1,1,0,0,1,0,1,0,1,0,1],
    [0,1,0,1,0,1,0,1,1,0,0,1,1,0,0,1,0,1,0,1,0],
    [1,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,0,0,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,0,1,0,0,0,1,0,0,1],
    [1,1,1,1,1,1,1,0,0,0,1,0,1,0,1,0,1,0,1,1,0],
    [1,0,0,0,0,0,1,0,1,0,0,1,0,1,0,1,0,1,0,0,1],
    [1,0,1,1,1,0,1,0,1,1,0,0,1,0,1,0,1,1,0,1,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,1,0,0,1,0,1,0,0,0],
    [1,0,1,1,1,0,1,0,1,0,1,0,0,1,1,0,1,0,1,1,0],
    [1,0,0,0,0,0,1,0,0,1,0,1,0,0,0,1,0,0,0,1,0],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,1,0,0,1],
  ];
  const pad = 8;
  const ms = (size - pad * 2) / grid.length;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="white" rx="10" />
      {grid.map((row, y) =>
        row.map((cell, x) =>
          cell ? (
            <rect
              key={`${x}-${y}`}
              x={pad + x * ms + 0.3}
              y={pad + y * ms + 0.3}
              width={ms - 0.6}
              height={ms - 0.6}
              fill={color}
              rx="0.6"
            />
          ) : null
        )
      )}
    </svg>
  );
};

// ─── Circular Countdown Timer ─────────────────────────────────────────────────
const CircularTimer = ({ seconds, total = 10, dark }: { seconds: number; total?: number; dark: boolean }) => {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const progress = (seconds / total) * circ;
  const col = seconds <= 3 ? "#DC2626" : seconds <= 6 ? "#F59E0B" : "#16A34A";
  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="64" cy="64" r={r} fill="none" stroke={dark ? "#1E3054" : "#E2E8F0"} strokeWidth="8" />
        <circle
          cx="64" cy="64" r={r} fill="none"
          stroke={col} strokeWidth="8"
          strokeDasharray={`${progress} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.9s linear, stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color: col }}>{seconds}</span>
        <span className={`text-[10px] font-medium ${dark ? "text-slate-500" : "text-slate-400"}`}>seg</span>
      </div>
    </div>
  );
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 32, bg = "#003B7A" }: { name: string; size?: number; bg?: string }) => (
  <div
    className="flex items-center justify-center text-white font-semibold flex-shrink-0"
    style={{ width: size, height: size, borderRadius: size / 2, background: bg, fontSize: size * 0.38 }}
  >
    {name.charAt(0).toUpperCase()}
  </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { bg: string; color: string }> = {
    "Activo":    { bg: "rgba(22,163,74,0.12)",   color: "#16A34A" },
    "Puntual":   { bg: "rgba(22,163,74,0.12)",   color: "#16A34A" },
    "Inactivo":  { bg: "rgba(220,38,38,0.12)",   color: "#DC2626" },
    "Ausente":   { bg: "rgba(220,38,38,0.12)",   color: "#DC2626" },
    "Licencia":  { bg: "rgba(245,158,11,0.12)",  color: "#F59E0B" },
    "Tardanza":  { bg: "rgba(245,158,11,0.12)",  color: "#F59E0B" },
  };
  const s = map[status] ?? { bg: "rgba(100,116,139,0.12)", color: "#64748B" };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {status}
    </span>
  );
};

// ─── Card utility ─────────────────────────────────────────────────────────────
const card = (dark: boolean, extra = "") =>
  `rounded-2xl border ${dark ? "bg-[#1A2744] border-white/8" : "bg-white border-slate-100 shadow-sm"} ${extra}`;

// ═══════════════════════════════════════════════════════════════════════════════
// SPLASH SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const SplashScreen = ({ onDone }: { onDone: () => void }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(id); setTimeout(onDone, 400); return 100; }
        return p + 1.8;
      });
    }, 55);
    return () => clearInterval(id);
  }, [onDone]);

  return (
    <motion.div
      className="flex flex-col items-center justify-center w-full h-full relative overflow-hidden"
      style={{ background: "linear-gradient(145deg, #001229 0%, #002a5c 45%, #003B7A 100%)" }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-15%] w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #F2B632 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-25%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-[0.05]"
          style={{ background: "radial-gradient(circle, #F2B632 0%, transparent 70%)" }} />
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
          style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)", border: "1px solid rgba(242,182,50,0.2)" }}
        >
          <UCBLogo size={88} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center space-y-1"
        >
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-yellow-400/80">
            Universidad Católica Boliviana "San Pablo"
          </p>
          <p className="text-xs tracking-widest text-white/40">Centro de Cómputo</p>
        </motion.div>

        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="w-px h-10"
          style={{ background: "linear-gradient(to bottom, transparent, #F2B632, transparent)" }}
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.7 }}
          className="text-center"
        >
          <h1 className="text-7xl font-black tracking-tighter text-white" style={{ letterSpacing: "-0.02em" }}>SICAD</h1>
          <p className="text-sm text-white/55 mt-2 tracking-wide">Sistema Inteligente de Control de Asistencia Digital</p>
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
              style={{ width: `${progress}%`, background: "linear-gradient(90deg, #F2B632, #FFD97D)", transition: "width 0.08s linear" }}
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

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const LoginScreen = ({ onLogin, dark }: { onLogin: () => void; dark: boolean }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 1400);
  };

  const inputCls = `w-full py-3 rounded-xl border text-sm outline-none transition-all ${
    dark
      ? "bg-white/5 border-white/10 text-white placeholder-white/25 focus:border-blue-500/60"
      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600/50"
  }`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex w-full h-full">
      {/* Left panel */}
      <div className="hidden lg:flex w-[44%] flex-col items-center justify-center relative overflow-hidden"
        style={{ background: "linear-gradient(150deg, #001229 0%, #002a5c 50%, #003B7A 100%)" }}>
        <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #F2B632, transparent)" }} />
        <div className="absolute bottom-[-20%] left-[-15%] w-[380px] h-[380px] rounded-full opacity-[0.05]"
          style={{ background: "radial-gradient(circle, #F2B632, transparent)" }} />

        <div className="relative z-10 flex flex-col items-center gap-8 px-14">
          <UCBLogo size={96} />
          <div className="text-center">
            <h1 className="text-5xl font-black text-white tracking-tight">SICAD</h1>
            <p className="text-white/50 text-sm mt-2 leading-relaxed max-w-[280px]">
              Sistema de Control de Asistencia para el Centro de Cómputo UCB
            </p>
          </div>
          <div className="flex flex-col gap-2.5 w-full max-w-[280px]">
            {[
              { icon: <UserCheck size={15} />, text: "Registro de asistencia digital" },
              { icon: <QrCode size={15} />, text: "Verificación QR en tiempo real" },
              { icon: <BarChart2 size={15} />, text: "Reportes y estadísticas avanzadas" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span style={{ color: "#F2B632" }}>{item.icon}</span>
                <span className="text-white/60 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
          <div className="h-px w-full max-w-[280px] opacity-20" style={{ background: "#F2B632" }} />
          <p className="text-white/25 text-xs text-center">
            Desarrollado por<br />
            <span className="text-white/40">Esmeralda Paula Medina Paredes</span>
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className={`flex-1 flex items-center justify-center p-8 ${dark ? "bg-[#0D1B2E]" : "bg-slate-50"}`}>
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className={`w-full max-w-md ${dark ? "bg-[#1A2744] border-white/8" : "bg-white border-slate-200"} rounded-2xl shadow-2xl border p-10`}
        >
          <div className="flex flex-col items-center mb-2 lg:hidden">
            <UCBLogo size={52} />
          </div>
          <div className="mb-8">
            <h2 className={`text-2xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>Iniciar sesión</h2>
            <p className={`text-sm mt-1 ${dark ? "text-white/40" : "text-slate-500"}`}>Ingresa tus credenciales para continuar</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${dark ? "text-white/50" : "text-slate-500"}`}>
                Correo electrónico
              </label>
              <div className="relative">
                <Mail size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? "text-white/30" : "text-slate-400"}`} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@ucb.edu.bo" className={inputCls + " pl-10 pr-4"} />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${dark ? "text-white/50" : "text-slate-500"}`}>
                Contraseña
              </label>
              <div className="relative">
                <Lock size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? "text-white/30" : "text-slate-400"}`} />
                <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" className={inputCls + " pl-10 pr-12"} />
                <button onClick={() => setShowPass(s => !s)}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${dark ? "text-white/30 hover:text-white/60" : "text-slate-400 hover:text-slate-600"}`}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer" onClick={() => setRemember(r => !r)}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  remember ? "border-blue-700 bg-blue-700" : dark ? "border-white/20" : "border-slate-300"
                }`}>
                  {remember && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                <span className={`text-sm ${dark ? "text-white/50" : "text-slate-600"}`}>Recordarme</span>
              </label>
              <button className="text-sm font-medium hover:underline" style={{ color: "#003B7A" }}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              style={{ background: loading ? "#64748B" : "linear-gradient(135deg, #003B7A 0%, #0055b3 100%)" }}
            >
              {loading ? <><RefreshCw size={15} className="animate-spin" /> Verificando...</> : "Ingresar al sistema"}
            </motion.button>
          </div>

          <p className={`text-xs text-center mt-7 ${dark ? "text-white/20" : "text-slate-400"}`}>
            SICAD v1.0 • Centro de Cómputo UCB "San Pablo"
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════
const navItems: { id: NavId; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard",  label: "Dashboard",      icon: <Home size={18} /> },
  { id: "employees",  label: "Empleados",       icon: <Users size={18} /> },
  { id: "periods",    label: "Periodos",        icon: <Calendar size={18} /> },
  { id: "qr",         label: "Pantalla QR",     icon: <QrCode size={18} /> },
  { id: "history",    label: "Historial",       icon: <ClipboardList size={18} /> },
  { id: "reports",    label: "Reportes",        icon: <BarChart2 size={18} /> },
  { id: "settings",   label: "Configuración",   icon: <Settings size={18} /> },
];

const Sidebar = ({
  active, onNav, collapsed, onToggle, onLogout,
}: {
  active: NavId;
  onNav: (id: NavId) => void;
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
}) => (
  <motion.aside
    animate={{ width: collapsed ? 66 : 236 }}
    transition={{ duration: 0.22, ease: "easeInOut" }}
    className="flex flex-col h-full flex-shrink-0 overflow-hidden"
    style={{ background: "#003B7A" }}
  >
    {/* Logo / toggle */}
    <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 flex-shrink-0">
      <button onClick={onToggle} className="text-white/50 hover:text-white transition-colors flex-shrink-0">
        <Menu size={18} />
      </button>
      <AnimatePresence>
        {!collapsed && (
          <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }} className="flex items-center gap-2.5 overflow-hidden">
            <UCBLogo size={30} />
            <div className="leading-none">
              <p className="text-white font-bold text-sm">SICAD</p>
              <p className="text-white/35 text-[10px] mt-0.5">Centro de Cómputo</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* Navigation */}
    <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
      {navItems.map(item => {
        const isActive = active === item.id || (active === "success" && item.id === "qr");
        return (
          <button key={item.id} onClick={() => onNav(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm text-left ${
              isActive ? "text-white" : "text-white/50 hover:text-white/80 hover:bg-white/5"
            }`}
            style={isActive ? { background: "rgba(255,255,255,0.14)" } : {}}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }} className="whitespace-nowrap font-medium">
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            {isActive && !collapsed && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#F2B632" }} />
            )}
          </button>
        );
      })}
    </nav>

    {/* User + Logout */}
    <div className="border-t border-white/10 p-2 flex-shrink-0">
      {!collapsed && (
        <div className="px-3 py-2.5 mb-1 rounded-xl" style={{ background: "rgba(242,182,50,0.10)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-[#003B7A]"
              style={{ background: "#F2B632" }}>A</div>
            <div className="leading-none">
              <p className="text-white text-xs font-semibold">Admin UCB</p>
              <p className="text-white/35 text-[10px] mt-0.5">Administrador</p>
            </div>
          </div>
        </div>
      )}
      <button onClick={onLogout}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all text-sm">
        <LogOut size={17} className="flex-shrink-0" />
        {!collapsed && <span className="font-medium">Cerrar sesión</span>}
      </button>
    </div>

    {/* Gold stripe */}
    <div className="h-1 flex-shrink-0" style={{ background: "linear-gradient(90deg, #F2B632 0%, #FFD97D 50%, #F2B632 100%)" }} />
  </motion.aside>
);

// ═══════════════════════════════════════════════════════════════════════════════
// TOPBAR
// ═══════════════════════════════════════════════════════════════════════════════
const Topbar = ({ title, subtitle, dark, onToggleDark }: {
  title: string; subtitle: string; dark: boolean; onToggleDark: () => void;
}) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className={`flex items-center justify-between px-6 h-16 border-b flex-shrink-0 ${
      dark ? "bg-[#1A2744] border-white/8" : "bg-white border-slate-100"
    }`}>
      <div className="flex flex-col justify-center">
        <h2 className={`text-base font-semibold leading-tight ${dark ? "text-white" : "text-slate-900"}`}>{title}</h2>
        <p className={`text-xs mt-0.5 ${dark ? "text-white/30" : "text-slate-400"}`}>{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-mono tabular-nums ${dark ? "text-white/35" : "text-slate-400"}`}>
          {now.toLocaleTimeString("es-BO")} &nbsp;·&nbsp; {now.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
        <div className={`w-px h-5 mx-1 ${dark ? "bg-white/10" : "bg-slate-200"}`} />
        <button className={`relative p-2 rounded-xl transition-colors ${dark ? "hover:bg-white/6 text-white/40" : "hover:bg-slate-100 text-slate-500"}`}>
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: "#F2B632" }} />
        </button>
        <button onClick={onToggleDark}
          className={`p-2 rounded-xl transition-colors ${dark ? "hover:bg-white/6 text-yellow-400" : "hover:bg-slate-100 text-slate-500"}`}>
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <div className="flex items-center gap-2 pl-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: "#003B7A" }}>A</div>
        </div>
      </div>
    </header>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const DashboardScreen = ({ dark }: { dark: boolean }) => {
  const areaData = [
    { h: "07:15", n: 2 }, { h: "08:15", n: 5 }, { h: "09:15", n: 4 },
    { h: "10:15", n: 8 }, { h: "11:15", n: 6 }, { h: "12:15", n: 3 },
    { h: "13:15", n: 5 }, { h: "14:15", n: 7 }, { h: "15:15", n: 4 },
    { h: "16:15", n: 3 },
  ];
  const weekData = [
    { d: "Lun", p: 10, a: 2 }, { d: "Mar", p: 9, a: 3 }, { d: "Mié", p: 11, a: 1 },
    { d: "Jue", p: 8, a: 4 }, { d: "Vie", p: 12, a: 0 },
  ];
  const activity = [
    { name: "Ana Flores Mendoza",   action: "Asistencia registrada", period: "10:15–11:15", t: "hace 2 min",  col: "#16A34A" },
    { name: "Carlos Mamani Quispe", action: "Asistencia registrada", period: "10:15–11:15", t: "hace 6 min",  col: "#16A34A" },
    { name: "Luis Quispe Torrez",   action: "Llegada tardía",        period: "09:15–10:15", t: "hace 14 min", col: "#F59E0B" },
    { name: "Sofía Vargas Choque",  action: "Asistencia registrada", period: "09:15–10:15", t: "hace 20 min", col: "#16A34A" },
    { name: "Jorge Condori López",  action: "Ausencia detectada",    period: "08:15–09:15", t: "hace 1h",     col: "#DC2626" },
  ];
  const stats = [
    { label: "Empleados registrados", value: "12", trend: "+2 este mes",     icon: <Users size={19} />,     col: "#003B7A" },
    { label: "Periodo actual",        value: "10:15–11:15", trend: "En curso", icon: <Clock size={19} />,    col: "#F59E0B" },
    { label: "Próximo periodo",       value: "11:15–12:15", trend: "42 min",   icon: <Activity size={19} />, col: "#6366F1" },
    { label: "Asistencias hoy",       value: "47", trend: "87% cumplimiento", icon: <UserCheck size={19} />, col: "#16A34A" },
  ];

  const ttStyle = { background: dark ? "#0D1B2E" : "#fff", border: "none", borderRadius: 8, fontSize: 11, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" };
  const grid = dark ? "#1E3054" : "#F1F5F9";

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ background: dark ? "#0D1B2E" : "#F8FAFC" }}>
      {/* QR active banner */}
      <div className="rounded-2xl px-6 py-4 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #002a5c 0%, #003B7A 100%)" }}>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/12">
            <QrCode size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">QR Activo — Periodo 10:15–11:15</p>
            <p className="text-white/50 text-xs mt-0.5">Código rotando cada 10 segundos · Servidor en línea</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(22,163,74,0.2)" }}>
          <Wifi size={12} className="text-green-400" />
          <span className="text-green-400 text-xs font-semibold">En línea</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={card(dark, "p-5")}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.col}14` }}>
                <span style={{ color: s.col }}>{s.icon}</span>
              </div>
              <ArrowUpRight size={14} className={dark ? "text-white/15" : "text-slate-300"} />
            </div>
            <p className={`text-2xl font-bold leading-none mb-1.5 ${dark ? "text-white" : "text-slate-900"}`}>{s.value}</p>
            <p className={`text-xs mb-1 ${dark ? "text-white/40" : "text-slate-500"}`}>{s.label}</p>
            <span className="text-xs font-semibold" style={{ color: s.col }}>{s.trend}</span>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-5 gap-4">
        <div className={card(dark, "col-span-3 p-5")}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>Asistencias del día</h3>
              <p className={`text-xs mt-0.5 ${dark ? "text-white/35" : "text-slate-400"}`}>Por periodo horario — Hoy</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#003B7A" stopOpacity={dark ? 0.25 : 0.12} />
                  <stop offset="95%" stopColor="#003B7A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="h" tick={{ fontSize: 10, fill: dark ? "#475569" : "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: dark ? "#475569" : "#94A3B8" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip contentStyle={ttStyle} />
              <Area type="monotone" dataKey="n" stroke="#003B7A" strokeWidth={2.5} fill="url(#g1)" name="Asistencias" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className={card(dark, "col-span-2 p-5")}>
          <h3 className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>Semana actual</h3>
          <p className={`text-xs mt-0.5 mb-4 ${dark ? "text-white/35" : "text-slate-400"}`}>Presentes vs ausentes</p>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={weekData} barSize={13} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="d" tick={{ fontSize: 10, fill: dark ? "#475569" : "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: dark ? "#475569" : "#94A3B8" }} axisLine={false} tickLine={false} width={22} />
              <Tooltip contentStyle={ttStyle} />
              <Bar dataKey="p" fill="#003B7A" radius={[4,4,0,0]} name="Presentes" />
              <Bar dataKey="a" fill="#F2B632" radius={[4,4,0,0]} name="Ausentes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity */}
      <div className={card(dark, "p-5")}>
        <h3 className={`font-semibold text-sm mb-4 ${dark ? "text-white" : "text-slate-800"}`}>Actividad reciente</h3>
        <div className="space-y-2.5">
          {activity.map((a, i) => (
            <div key={i} className={`flex items-center gap-4 p-3 rounded-xl ${dark ? "bg-white/4" : "bg-slate-50"}`}>
              <Avatar name={a.name} size={34} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${dark ? "text-white" : "text-slate-800"}`}>{a.name}</p>
                <p className={`text-xs ${dark ? "text-white/30" : "text-slate-400"}`}>{a.period}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: `${a.col}15`, color: a.col }}>{a.action}</span>
                <p className={`text-xs mt-1 ${dark ? "text-white/25" : "text-slate-400"}`}>{a.t}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EMPLOYEES
// ═══════════════════════════════════════════════════════════════════════════════
const EmployeesScreen = ({ dark }: { dark: boolean }) => {
  const [search, setSearch] = useState("");
  const all = [
    { code: "CC-001", ci: "12345678", name: "Carlos Mamani Quispe",  role: "Auxiliar",     status: "Activo",   periods: 4 },
    { code: "CC-002", ci: "87654321", name: "Ana Flores Mendoza",    role: "Auxiliar",     status: "Activo",   periods: 3 },
    { code: "CC-003", ci: "11223344", name: "Luis Quispe Torrez",    role: "Técnico",      status: "Activo",   periods: 5 },
    { code: "CC-004", ci: "44332211", name: "María Torres García",   role: "Auxiliar",     status: "Inactivo", periods: 0 },
    { code: "CC-005", ci: "55667788", name: "Jorge Condori López",   role: "Técnico",      status: "Activo",   periods: 6 },
    { code: "CC-006", ci: "99887766", name: "Sofía Vargas Choque",   role: "Auxiliar",     status: "Activo",   periods: 4 },
    { code: "CC-007", ci: "33445566", name: "Diego Mamani Cruz",     role: "Auxiliar",     status: "Activo",   periods: 3 },
    { code: "CC-008", ci: "77889900", name: "Patricia Rojas Lima",   role: "Coordinador",  status: "Licencia", periods: 2 },
  ];
  const rows = all.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.code.toLowerCase().includes(search.toLowerCase()) ||
    e.ci.includes(search)
  );

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: dark ? "#0D1B2E" : "#F8FAFC" }}>
      <div className={card(dark, "overflow-hidden")}>
        {/* Toolbar */}
        <div className={`flex items-center justify-between p-5 border-b ${dark ? "border-white/8" : "border-slate-100"}`}>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/30" : "text-slate-400"}`} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre, código o CI..."
                className={`pl-9 pr-4 py-2 rounded-xl border text-sm outline-none w-72 ${
                  dark ? "bg-white/5 border-white/10 text-white placeholder-white/25" : "bg-slate-50 border-slate-200 text-slate-800"
                }`} />
            </div>
            <button className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${
              dark ? "border-white/10 text-white/50 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}>
              <Filter size={13} /> Filtrar
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "#003B7A" }}>
            <Plus size={14} /> Nuevo empleado
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={dark ? "bg-white/3" : "bg-slate-50/80"}>
                {["Código", "CI", "Nombre completo", "Cargo", "Estado", "Periodos asignados", "Acciones"].map(col => (
                  <th key={col} className={`px-5 py-3 text-left text-xs font-semibold tracking-wide ${dark ? "text-white/35" : "text-slate-400"}`}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((emp, i) => (
                <tr key={i} className={`border-t transition-colors ${
                  dark ? "border-white/6 hover:bg-white/3" : "border-slate-100 hover:bg-blue-50/30"
                }`}>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-mono font-bold ${dark ? "text-blue-400" : "text-blue-700"}`}>{emp.code}</span>
                  </td>
                  <td className={`px-5 py-3.5 text-sm font-mono ${dark ? "text-white/50" : "text-slate-500"}`}>{emp.ci}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.name} size={32} />
                      <span className={`text-sm font-medium ${dark ? "text-white" : "text-slate-800"}`}>{emp.name}</span>
                    </div>
                  </td>
                  <td className={`px-5 py-3.5 text-sm ${dark ? "text-white/40" : "text-slate-500"}`}>{emp.role}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={emp.status} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        {Array.from({ length: Math.min(emp.periods, 6) }).map((_, j) => (
                          <div key={j} className="w-4 h-1.5 rounded-full" style={{ background: "#003B7A" }} />
                        ))}
                      </div>
                      <span className={`text-xs ml-1 ${dark ? "text-white/40" : "text-slate-400"}`}>{emp.periods}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-0.5">
                      <button className={`p-1.5 rounded-lg transition-colors ${dark ? "hover:bg-white/8 text-white/40" : "hover:bg-slate-100 text-slate-400"}`}><Edit2 size={13} /></button>
                      <button className={`p-1.5 rounded-lg transition-colors ${dark ? "hover:bg-white/8 text-white/40" : "hover:bg-slate-100 text-slate-400"}`}><Calendar size={13} /></button>
                      <button className="p-1.5 rounded-lg transition-colors hover:bg-red-50 text-red-400"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-5 py-3 border-t ${dark ? "border-white/8" : "border-slate-100"}`}>
          <p className={`text-xs ${dark ? "text-white/30" : "text-slate-400"}`}>
            Mostrando {rows.length} de {all.length} empleados
          </p>
          <div className="flex gap-1">
            {[1,2,3].map(n => (
              <button key={n} className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                n === 1 ? "text-white" : dark ? "text-white/35 hover:bg-white/6" : "text-slate-500 hover:bg-slate-100"
              }`} style={n === 1 ? { background: "#003B7A" } : {}}>{n}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PERIODS
// ═══════════════════════════════════════════════════════════════════════════════
const PeriodsScreen = ({ dark }: { dark: boolean }) => {
  const slots = Array.from({ length: 14 }, (_, i) => {
    const sh = 7 + i, sm = 15, eh = sh + 1;
    const f = (h: number, m: number) => `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
    return { id: i, label: `${f(sh, sm)} – ${f(eh, sm)}` };
  });
  const [sel, setSel] = useState<number[]>([0, 1, 2, 4, 5, 8]);
  const toggle = (id: number) => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const assigned: Record<string, number[]> = { Lun:[0,1,4], Mar:[1,2,5], Mié:[0,3,4], Jue:[2,4,5], Vie:[1,3], Sáb:[6] };

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: dark ? "#0D1B2E" : "#F8FAFC" }}>
      <div className="grid grid-cols-5 gap-5">
        {/* Periods list */}
        <div className={card(dark, "col-span-2 flex flex-col")}>
          <div className={`p-5 border-b ${dark ? "border-white/8" : "border-slate-100"}`}>
            <h3 className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>Periodos disponibles</h3>
            <p className={`text-xs mt-1 ${dark ? "text-white/35" : "text-slate-400"}`}>Selecciona los periodos a asignar</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
            {slots.map(p => {
              const on = sel.includes(p.id);
              return (
                <button key={p.id} onClick={() => toggle(p.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all ${
                    on
                      ? dark ? "border-blue-600/50 bg-blue-900/25" : "border-blue-600/50 bg-blue-50"
                      : dark ? "border-white/8 hover:border-white/15" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    on ? "border-blue-600 bg-blue-600" : dark ? "border-white/20" : "border-slate-300"
                  }`}>
                    {on && <Check size={11} className="text-white" strokeWidth={3} />}
                  </div>
                  <Clock size={13} style={{ color: on ? "#003B7A" : dark ? "#475569" : "#94A3B8" }} />
                  <span className={`text-sm font-mono ${on ? dark ? "text-blue-300" : "text-blue-700" : dark ? "text-white/60" : "text-slate-600"}`}>
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className={`p-4 border-t ${dark ? "border-white/8" : "border-slate-100"}`}>
            <div className="flex gap-2">
              <button className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: "#003B7A" }}>
                Guardar asignación
              </button>
              <button onClick={() => setSel([])}
                className={`px-4 py-2.5 rounded-xl border text-sm ${dark ? "border-white/10 text-white/50" : "border-slate-200 text-slate-500"}`}>
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Weekly calendar */}
        <div className={card(dark, "col-span-3 flex flex-col")}>
          <div className={`p-5 border-b ${dark ? "border-white/8" : "border-slate-100"}`}>
            <h3 className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>Vista semanal de asignaciones</h3>
            <p className={`text-xs mt-1 ${dark ? "text-white/35" : "text-slate-400"}`}>
              Semana del {new Date().toLocaleDateString("es-BO", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex-1 p-5">
            <div className="grid grid-cols-6 gap-2">
              {days.map((day, di) => (
                <div key={day} className="flex flex-col gap-1.5">
                  <div className={`text-xs font-semibold text-center py-1.5 rounded-lg ${
                    di === 0 ? "text-white" : dark ? "text-white/40 bg-white/5" : "text-slate-500 bg-slate-100"
                  }`} style={di === 0 ? { background: "#003B7A" } : {}}>
                    {day}
                  </div>
                  {(assigned[day] || []).map(sid => (
                    <div key={sid} className="px-1.5 py-1.5 rounded-lg text-center"
                      style={{ background: "rgba(0,59,122,0.09)", border: "1px solid rgba(0,59,122,0.18)" }}>
                      <span className="text-[10px] font-mono" style={{ color: dark ? "#93C5FD" : "#1E40AF" }}>
                        {slots[sid]?.label.split(" – ")[0]}
                      </span>
                    </div>
                  ))}
                  {!(assigned[day]?.length) && (
                    <div className={`py-3 rounded-lg flex items-center justify-center ${dark ? "bg-white/3" : "bg-slate-50"}`}>
                      <span className={`text-xs ${dark ? "text-white/15" : "text-slate-300"}`}>—</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className={`mt-5 p-4 rounded-xl ${dark ? "bg-white/4" : "bg-slate-50"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${dark ? "text-white/40" : "text-slate-500"}`}>Seleccionados</p>
                  <p className={`text-3xl font-bold mt-0.5 ${dark ? "text-white" : "text-slate-900"}`} style={{ color: "#003B7A" }}>
                    {sel.length}
                    <span className={`text-sm font-normal ml-1 ${dark ? "text-white/30" : "text-slate-400"}`}>/ {slots.length}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 max-w-xs justify-end">
                  {sel.slice(0,8).map(id => (
                    <span key={id} className="px-2 py-0.5 rounded-full text-xs font-mono"
                      style={{ background: "rgba(0,59,122,0.1)", color: "#003B7A" }}>
                      {slots[id]?.label.split(" – ")[0]}
                    </span>
                  ))}
                  {sel.length > 8 && <span className="text-xs text-slate-400">+{sel.length-8}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// QR SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const QRScreen = ({ dark, onSuccess }: { dark: boolean; onSuccess: () => void }) => {
  const [countdown, setCountdown] = useState(10);
  const [rev, setRev] = useState(0);
  const [flash, setFlash] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => {
    if (countdown === 0) {
      setRev(r => r + 1);
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
      setCountdown(10);
      return;
    }
    const id = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const sideCard = card(dark, "p-5");

  return (
    <div className="flex-1 overflow-y-auto p-6 flex gap-5" style={{ background: dark ? "#0D1B2E" : "#F8FAFC" }}>
      {/* Main panel */}
      <div className={card(dark, "flex-1 flex flex-col items-center justify-center p-10 relative")}>
        {/* Top bar */}
        <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" style={{ animation: "pulse 2s infinite" }} />
            <span className={`text-xs font-medium ${dark ? "text-white/40" : "text-slate-500"}`}>Sistema activo</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{ background: flash ? "rgba(22,163,74,0.18)" : "rgba(0,59,122,0.08)",
                     color: flash ? "#16A34A" : "#003B7A" }}>
            <RefreshCw size={11} className={flash ? "animate-spin" : ""} />
            {flash ? "QR actualizado" : "Actualización automática"}
          </div>
        </div>

        {/* Period/time */}
        <div className="text-center mb-7 mt-4">
          <p className={`text-xs font-semibold tracking-widest uppercase mb-2 ${dark ? "text-white/30" : "text-slate-400"}`}>
            Periodo actual
          </p>
          <h3 className={`text-3xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>10:15 – 11:15</h3>
          <p className={`text-sm mt-1.5 ${dark ? "text-white/35" : "text-slate-400"}`}>
            {now.toLocaleTimeString("es-BO")} &nbsp;·&nbsp;
            {now.toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* QR Code */}
        <motion.div key={rev} initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35 }}
          onClick={onSuccess} className="cursor-pointer relative p-5 rounded-3xl"
          style={{ background: dark ? "#0D1B2E" : "#F8FAFC", boxShadow: "0 24px 64px rgba(0,59,122,0.18)" }}>
          <QRCodeDisplay size={230} color={dark ? "#93C5FD" : "#003B7A"} />
          {/* Corner accents */}
          {[["top-0 left-0","tl"],["top-0 right-0","tr"],["bottom-0 left-0","bl"],["bottom-0 right-0","br"]].map(([pos, k]) => (
            <div key={k} className={`absolute ${pos} w-6 h-6`} style={{
              borderTop:    k[0]==="t" ? "3px solid #F2B632" : "none",
              borderBottom: k[0]==="b" ? "3px solid #F2B632" : "none",
              borderLeft:   k[1]==="l" ? "3px solid #F2B632" : "none",
              borderRight:  k[1]==="r" ? "3px solid #F2B632" : "none",
              borderRadius: k==="tl"?"8px 0 0 0": k==="tr"?"0 8px 0 0": k==="bl"?"0 0 0 8px":"0 0 8px 0"
            }} />
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
      <div className="w-72 flex flex-col gap-4">
        {/* Server status */}
        <div className={sideCard}>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-4 ${dark ? "text-white/30" : "text-slate-400"}`}>Estado del sistema</p>
          <div className="space-y-2.5">
            {[
              { label: "Servidor API",   ok: true },
              { label: "Base de datos",  ok: true },
              { label: "Motor QR",       ok: true },
              { label: "Red local",      ok: true },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server size={12} className={dark ? "text-white/30" : "text-slate-400"} />
                  <span className={`text-xs ${dark ? "text-white/50" : "text-slate-600"}`}>{s.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-xs font-medium text-green-500">{s.ok ? "En línea" : "Error"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Last record */}
        <div className={sideCard}>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-4 ${dark ? "text-white/30" : "text-slate-400"}`}>Última asistencia</p>
          <div className={`p-3.5 rounded-xl flex items-center gap-3 ${dark ? "bg-green-900/20 border border-green-800/25" : "bg-green-50 border border-green-100"}`}>
            <Avatar name="Ana Flores" size={36} />
            <div>
              <p className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-800"}`}>Ana Flores Mendoza</p>
              <p className="text-xs text-green-600 font-medium">✓ Hace 2 min — 10:15–11:15</p>
            </div>
          </div>
        </div>

        {/* Day stats */}
        <div className={sideCard}>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-4 ${dark ? "text-white/30" : "text-slate-400"}`}>Resumen del día</p>
          <div className="space-y-3">
            {[
              { label: "Total registradas", value: "47", col: "#003B7A" },
              { label: "Pendientes",        value: "5",  col: "#F59E0B" },
              { label: "Ausencias",         value: "2",  col: "#DC2626" },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className={`text-xs ${dark ? "text-white/40" : "text-slate-500"}`}>{s.label}</span>
                <span className="text-sm font-bold" style={{ color: s.col }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Period info */}
        <div className={sideCard}>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-white/30" : "text-slate-400"}`}>Periodos de hoy</p>
          <div className="space-y-1.5">
            {[
              { label: "07:15–08:15", done: true },
              { label: "08:15–09:15", done: true },
              { label: "09:15–10:15", done: true },
              { label: "10:15–11:15", done: false, active: true },
              { label: "11:15–12:15", done: false },
            ].map((p, i) => (
              <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${
                p.active ? dark ? "bg-blue-900/30" : "bg-blue-50" : ""
              }`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.done ? "bg-green-400" : p.active ? "bg-yellow-400" : dark ? "bg-white/15" : "bg-slate-200"}`} />
                <span className={`text-xs font-mono ${p.active ? dark ? "text-blue-300" : "text-blue-700" : dark ? "text-white/40" : "text-slate-500"}`}>
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

// ═══════════════════════════════════════════════════════════════════════════════
// SUCCESS SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const SuccessScreen = ({ dark, onBack }: { dark: boolean; onBack: () => void }) => {
  const [countdown, setCountdown] = useState(5);
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(id); onBack(); return 0; } return c - 1; });
    }, 1000);
    return () => clearInterval(id);
  }, [onBack]);

  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: dark ? "#0D1B2E" : "#F8FAFC" }}>
      <motion.div
        initial={{ scale: 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className={`${card(dark)} p-12 flex flex-col items-center gap-7 shadow-2xl`}
        style={{ maxWidth: 440 }}
      >
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 350 }}
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #16A34A, #22C55E)", boxShadow: "0 12px 40px rgba(22,163,74,0.3)" }}>
          <Check size={48} className="text-white" strokeWidth={2.5} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="text-center">
          <h2 className={`text-2xl font-bold mb-2 ${dark ? "text-white" : "text-slate-900"}`}>¡Asistencia registrada!</h2>
          <p className={`text-sm ${dark ? "text-white/40" : "text-slate-500"}`}>El registro fue procesado correctamente</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className={`w-full rounded-2xl p-5 ${dark ? "bg-white/5" : "bg-slate-50"}`}>
          <div className="space-y-3.5">
            {[
              { label: "Empleado",       value: "Ana Flores Mendoza",              icon: <Users size={14} /> },
              { label: "Periodo",        value: "10:15 – 11:15",                  icon: <Clock size={14} /> },
              { label: "Hora",           value: new Date().toLocaleTimeString("es-BO"), icon: <Activity size={14} /> },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span style={{ color: "#003B7A" }}>{item.icon}</span>
                <span className={`text-xs flex-1 ${dark ? "text-white/40" : "text-slate-500"}`}>{item.label}</span>
                <span className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-800"}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex flex-col items-center gap-2">
          <button onClick={onBack} className="px-8 py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all"
            style={{ background: "#003B7A" }}>
            Volver al QR
          </button>
          <p className={`text-xs ${dark ? "text-white/25" : "text-slate-400"}`}>
            Redirigiendo automáticamente en {countdown}s...
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════════════════════════
const HistoryScreen = ({ dark }: { dark: boolean }) => {
  const rows = [
    { name: "Carlos Mamani Quispe",  code: "CC-001", date: "07/07/2026", period: "08:15–09:15", time: "08:18", status: "Puntual" },
    { name: "Ana Flores Mendoza",    code: "CC-002", date: "07/07/2026", period: "09:15–10:15", time: "09:24", status: "Tardanza" },
    { name: "Luis Quispe Torrez",    code: "CC-003", date: "07/07/2026", period: "10:15–11:15", time: "10:15", status: "Puntual" },
    { name: "Jorge Condori López",   code: "CC-005", date: "07/07/2026", period: "08:15–09:15", time: "—",     status: "Ausente" },
    { name: "Sofía Vargas Choque",   code: "CC-006", date: "07/07/2026", period: "11:15–12:15", time: "11:17", status: "Puntual" },
    { name: "Diego Mamani Cruz",     code: "CC-007", date: "07/07/2026", period: "10:15–11:15", time: "10:15", status: "Puntual" },
    { name: "Carlos Mamani Quispe",  code: "CC-001", date: "06/07/2026", period: "09:15–10:15", time: "09:18", status: "Puntual" },
    { name: "María Torres García",   code: "CC-004", date: "06/07/2026", period: "08:15–09:15", time: "08:36", status: "Tardanza" },
    { name: "Patricia Rojas Lima",   code: "CC-008", date: "06/07/2026", period: "07:15–08:15", time: "07:15", status: "Puntual" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: dark ? "#0D1B2E" : "#F8FAFC" }}>
      <div className={card(dark, "overflow-hidden")}>
        {/* Filters toolbar */}
        <div className={`flex flex-wrap items-center gap-3 p-5 border-b ${dark ? "border-white/8" : "border-slate-100"}`}>
          <div className="flex flex-wrap gap-2 flex-1">
            {[
              { ph: "Fecha",     ic: <Calendar size={12} /> },
              { ph: "Empleado",  ic: <Users size={12} /> },
              { ph: "Periodo",   ic: <Clock size={12} /> },
              { ph: "Estado",    ic: <Filter size={12} /> },
            ].map((f, i) => (
              <div key={i} className="relative">
                <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${dark ? "text-white/30" : "text-slate-400"}`}>{f.ic}</span>
                <select className={`pl-7 pr-5 py-2 rounded-xl border text-xs outline-none appearance-none cursor-pointer ${
                  dark ? "bg-white/5 border-white/10 text-white/60" : "bg-slate-50 border-slate-200 text-slate-600"
                }`}>
                  <option>{f.ph}</option>
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {[{ label: "Exportar PDF", icon: <Download size={13} /> }, { label: "Exportar Excel", icon: <Download size={13} /> }].map((b, i) => (
              <button key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                dark ? "border-white/10 text-white/50 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}>
                {b.icon} {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className={dark ? "bg-white/3" : "bg-slate-50/80"}>
              {["Empleado", "Código", "Fecha", "Periodo", "Hora", "Estado"].map(c => (
                <th key={c} className={`px-5 py-3 text-left text-xs font-semibold tracking-wide ${dark ? "text-white/30" : "text-slate-400"}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-t transition-colors ${dark ? "border-white/6 hover:bg-white/3" : "border-slate-100 hover:bg-blue-50/20"}`}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.name} size={30} />
                    <span className={`text-sm font-medium ${dark ? "text-white" : "text-slate-800"}`}>{r.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5"><span className={`text-xs font-mono font-bold ${dark ? "text-blue-400" : "text-blue-700"}`}>{r.code}</span></td>
                <td className={`px-5 py-3.5 text-sm ${dark ? "text-white/50" : "text-slate-500"}`}>{r.date}</td>
                <td className={`px-5 py-3.5 text-sm font-mono ${dark ? "text-white/50" : "text-slate-500"}`}>{r.period}</td>
                <td className={`px-5 py-3.5 text-sm font-mono font-semibold ${dark ? "text-white/70" : "text-slate-700"}`}>{r.time}</td>
                <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={`flex items-center justify-between px-5 py-3 border-t ${dark ? "border-white/8" : "border-slate-100"}`}>
          <p className={`text-xs ${dark ? "text-white/25" : "text-slate-400"}`}>Mostrando {rows.length} registros</p>
          <div className="flex gap-1">
            {[1,2,3].map(n => (
              <button key={n} className={`w-7 h-7 rounded-lg text-xs font-medium ${
                n === 1 ? "text-white" : dark ? "text-white/30 hover:bg-white/6" : "text-slate-500 hover:bg-slate-100"
              }`} style={n === 1 ? { background: "#003B7A" } : {}}>{n}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════════
const ReportsScreen = ({ dark }: { dark: boolean }) => {
  const daily = ["Lun 30","Mar 1","Mié 2","Jue 3","Vie 4","Lun 7"].map((d, i) => ({
    d, p: [10,9,11,8,12,6][i], a: [2,3,1,4,0,2][i],
  }));
  const pie = [
    { name: "Puntual",  value: 68, col: "#16A34A" },
    { name: "Tardanza", value: 22, col: "#F59E0B" },
    { name: "Ausente",  value: 10, col: "#DC2626" },
  ];
  const byPeriod = [
    { p: "07:15", pct: 92 }, { p: "08:15", pct: 85 }, { p: "09:15", pct: 96 },
    { p: "10:15", pct: 78 }, { p: "11:15", pct: 88 }, { p: "12:15", pct: 72 },
    { p: "13:15", pct: 65 }, { p: "14:15", pct: 80 }, { p: "15:15", pct: 91 },
  ];
  const ttStyle = { background: dark ? "#0D1B2E" : "#fff", border: "none", borderRadius: 8, fontSize: 11 };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ background: dark ? "#0D1B2E" : "#F8FAFC" }}>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Cumplimiento general", value: "87%",  sub: "Este mes",          col: "#16A34A" },
          { label: "Total asistencias",    value: "342",  sub: "Julio 2026",         col: "#003B7A" },
          { label: "Promedio diario",      value: "11.4", sub: "Registros por día",  col: "#F59E0B" },
        ].map((s, i) => (
          <div key={i} className={card(dark, "p-5 flex items-center gap-4")}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${s.col}14` }}>
              <TrendingUp size={22} style={{ color: s.col }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: s.col }}>{s.value}</p>
              <p className={`text-xs ${dark ? "text-white/50" : "text-slate-600"}`}>{s.label}</p>
              <p className={`text-[11px] ${dark ? "text-white/25" : "text-slate-400"}`}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4">
        <div className={card(dark, "col-span-2 p-5")}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>Asistencia diaria</h3>
              <p className={`text-xs mt-0.5 ${dark ? "text-white/30" : "text-slate-400"}`}>Presentes vs ausentes — Julio 2026</p>
            </div>
            <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${
              dark ? "border-white/10 text-white/40" : "border-slate-200 text-slate-500"
            }`}>
              <Download size={12} /> Exportar
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={daily} barSize={16} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#1E3054" : "#F1F5F9"} vertical={false} />
              <XAxis dataKey="d" tick={{ fontSize: 10, fill: dark ? "#475569" : "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: dark ? "#475569" : "#94A3B8" }} axisLine={false} tickLine={false} width={22} />
              <Tooltip contentStyle={ttStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="p" fill="#003B7A" radius={[4,4,0,0]} name="Presentes" />
              <Bar dataKey="a" fill="#F2B632" radius={[4,4,0,0]} name="Ausentes" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={card(dark, "p-5")}>
          <h3 className={`font-semibold text-sm mb-1 ${dark ? "text-white" : "text-slate-800"}`}>Cumplimiento</h3>
          <p className={`text-xs mb-4 ${dark ? "text-white/30" : "text-slate-400"}`}>Distribución de estados</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pie} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                {pie.map((e, i) => <Cell key={i} fill={e.col} />)}
              </Pie>
              <Tooltip contentStyle={ttStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pie.map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c.col }} />
                  <span className={`text-xs ${dark ? "text-white/50" : "text-slate-600"}`}>{c.name}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: c.col }}>{c.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* By period bars */}
      <div className={card(dark, "p-5")}>
        <div className="flex items-center justify-between mb-5">
          <h3 className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>Asistencia por periodo</h3>
          <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${
            dark ? "border-white/10 text-white/40" : "border-slate-200 text-slate-500"
          }`}>
            <Download size={12} /> Exportar
          </button>
        </div>
        <div className="space-y-3">
          {byPeriod.map((p, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className={`text-xs font-mono w-12 flex-shrink-0 text-right ${dark ? "text-white/40" : "text-slate-500"}`}>{p.p}</span>
              <div className={`flex-1 h-2 rounded-full overflow-hidden ${dark ? "bg-white/8" : "bg-slate-100"}`}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ delay: i * 0.05, duration: 0.7 }}
                  className="h-full rounded-full"
                  style={{ background: p.pct >= 85 ? "#16A34A" : p.pct >= 75 ? "#003B7A" : "#F59E0B" }} />
              </div>
              <span className={`text-xs font-bold w-10 flex-shrink-0 ${dark ? "text-white/70" : "text-slate-700"}`}>{p.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════
const SettingsScreen = ({ dark }: { dark: boolean }) => {
  const [tab, setTab] = useState("usuarios");
  const tabs = [
    { id: "usuarios",   label: "Usuarios",     icon: <Users size={14} /> },
    { id: "roles",      label: "Roles",         icon: <Shield size={14} /> },
    { id: "respaldos",  label: "Respaldos",    icon: <Database size={14} /> },
    { id: "auditoria",  label: "Auditoría",    icon: <Activity size={14} /> },
  ];
  const users = [
    { name: "Admin UCB",       email: "admin@ucb.edu.bo",  role: "Administrador", active: true },
    { name: "Aux. Sistemas",   email: "aux@ucb.edu.bo",    role: "Auxiliar",      active: true },
    { name: "Coord. Cómputo",  email: "coord@ucb.edu.bo",  role: "Coordinador",   active: false },
  ];
  const roles = [
    { name: "Administrador", perms: ["Ver todo", "Crear usuarios", "Editar configuración", "Exportar informes"], col: "#003B7A" },
    { name: "Coordinador",   perms: ["Ver reportes", "Gestionar empleados", "Exportar"],                         col: "#6366F1" },
    { name: "Auxiliar",      perms: ["Ver historial", "Registrar asistencia"],                                   col: "#16A34A" },
  ];
  const audits = [
    { action: "Login exitoso",      user: "admin@ucb.edu.bo",  time: "07/07/2026 10:32", ip: "192.168.1.5" },
    { action: "Empleado creado",    user: "admin@ucb.edu.bo",  time: "07/07/2026 09:15", ip: "192.168.1.5" },
    { action: "QR generado",        user: "Sistema",            time: "07/07/2026 10:15", ip: "localhost" },
    { action: "Reporte exportado",  user: "coord@ucb.edu.bo",  time: "06/07/2026 16:45", ip: "192.168.1.8" },
    { action: "Configuración",      user: "admin@ucb.edu.bo",  time: "06/07/2026 09:00", ip: "192.168.1.5" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: dark ? "#0D1B2E" : "#F8FAFC" }}>
      <div className={card(dark, "overflow-hidden")}>
        {/* Tabs */}
        <div className={`flex border-b ${dark ? "border-white/8" : "border-slate-100"}`}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all border-b-2 ${
                tab === t.id
                  ? "border-[#003B7A] text-[#003B7A]"
                  : dark ? "border-transparent text-white/35 hover:text-white/60" : "border-transparent text-slate-400 hover:text-slate-600"
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Users */}
          {tab === "usuarios" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className={`font-semibold ${dark ? "text-white" : "text-slate-800"}`}>Gestión de usuarios</h3>
                  <p className={`text-xs mt-0.5 ${dark ? "text-white/35" : "text-slate-400"}`}>{users.length} usuarios registrados</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold" style={{ background: "#003B7A" }}>
                  <Plus size={14} /> Nuevo usuario
                </button>
              </div>
              <div className="space-y-3">
                {users.map((u, i) => (
                  <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl border ${dark ? "border-white/8 bg-white/3" : "border-slate-100 bg-slate-50"}`}>
                    <Avatar name={u.name} size={40} />
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-800"}`}>{u.name}</p>
                      <p className={`text-xs ${dark ? "text-white/35" : "text-slate-400"}`}>{u.email}</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: "rgba(0,59,122,0.1)", color: "#003B7A" }}>{u.role}</span>
                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${u.active ? "text-green-500" : "text-red-400"}`}>
                      <span className={`w-2 h-2 rounded-full ${u.active ? "bg-green-400" : "bg-red-400"}`} />
                      {u.active ? "Activo" : "Inactivo"}
                    </div>
                    <div className="flex gap-1">
                      <button className={`p-1.5 rounded-lg ${dark ? "hover:bg-white/8 text-white/35" : "hover:bg-white text-slate-400"}`}><Edit2 size={13} /></button>
                      <button className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Roles */}
          {tab === "roles" && (
            <div>
              <h3 className={`font-semibold mb-5 ${dark ? "text-white" : "text-slate-800"}`}>Roles y permisos del sistema</h3>
              <div className="grid grid-cols-3 gap-4">
                {roles.map((r, i) => (
                  <div key={i} className={`p-5 rounded-2xl border ${dark ? "border-white/8 bg-white/3" : "border-slate-100 bg-slate-50"}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${r.col}15` }}>
                        <Shield size={15} style={{ color: r.col }} />
                      </div>
                      <span className="font-bold text-sm" style={{ color: r.col }}>{r.name}</span>
                    </div>
                    <div className="space-y-2">
                      {r.perms.map((p, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <Check size={11} className="text-green-500 flex-shrink-0" strokeWidth={3} />
                          <span className={`text-xs ${dark ? "text-white/50" : "text-slate-600"}`}>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Backups */}
          {tab === "respaldos" && (
            <div>
              <h3 className={`font-semibold mb-5 ${dark ? "text-white" : "text-slate-800"}`}>Gestión de respaldos</h3>
              <div className="grid grid-cols-2 gap-4 mb-5">
                {[
                  { label: "Último respaldo",  value: "07/07/2026 02:00", status: "Exitoso",    ok: true },
                  { label: "Próximo respaldo", value: "08/07/2026 02:00", status: "Programado", ok: null },
                ].map((b, i) => (
                  <div key={i} className={`p-5 rounded-2xl border flex items-center gap-4 ${dark ? "border-white/8 bg-white/3" : "border-slate-100 bg-slate-50"}`}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,59,122,0.1)" }}>
                      <Database size={22} style={{ color: "#003B7A" }} />
                    </div>
                    <div>
                      <p className={`text-xs ${dark ? "text-white/35" : "text-slate-400"}`}>{b.label}</p>
                      <p className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>{b.value}</p>
                      <span className={`text-xs font-semibold ${b.ok ? "text-green-500" : "text-blue-500"}`}>{b.status}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold" style={{ background: "#003B7A" }}>
                <Database size={15} /> Crear respaldo ahora
              </button>
            </div>
          )}

          {/* Audit */}
          {tab === "auditoria" && (
            <div>
              <h3 className={`font-semibold mb-5 ${dark ? "text-white" : "text-slate-800"}`}>Registro de auditoría del sistema</h3>
              <table className="w-full">
                <thead>
                  <tr className={dark ? "bg-white/3" : "bg-slate-50"}>
                    {["Acción", "Usuario", "Fecha y hora", "Dirección IP"].map(c => (
                      <th key={c} className={`px-4 py-3 text-left text-xs font-semibold ${dark ? "text-white/30" : "text-slate-400"}`}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {audits.map((a, i) => (
                    <tr key={i} className={`border-t ${dark ? "border-white/6" : "border-slate-100"}`}>
                      <td className={`px-4 py-3 text-sm font-medium ${dark ? "text-white" : "text-slate-800"}`}>{a.action}</td>
                      <td className={`px-4 py-3 text-sm ${dark ? "text-white/50" : "text-slate-500"}`}>{a.user}</td>
                      <td className={`px-4 py-3 text-xs font-mono ${dark ? "text-white/35" : "text-slate-400"}`}>{a.time}</td>
                      <td className={`px-4 py-3 text-xs font-mono ${dark ? "text-white/25" : "text-slate-400"}`}>{a.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN METADATA
// ═══════════════════════════════════════════════════════════════════════════════
const screenMeta: Partial<Record<NavId, { title: string; subtitle: string }>> = {
  dashboard:  { title: "Dashboard",               subtitle: "Vista general — Centro de Cómputo UCB" },
  employees:  { title: "Gestión de Empleados",    subtitle: "Administra el personal y auxiliares del Centro" },
  periods:    { title: "Asignación de Periodos",  subtitle: "Configura los horarios de cada empleado" },
  qr:         { title: "Pantalla QR",             subtitle: "Código de registro de asistencia activo" },
  success:    { title: "Pantalla QR",             subtitle: "Asistencia registrada exitosamente" },
  history:    { title: "Historial de Asistencias",subtitle: "Consulta, filtra y exporta los registros" },
  reports:    { title: "Reportes y Análisis",     subtitle: "Estadísticas de cumplimiento y asistencia" },
  settings:   { title: "Configuración",           subtitle: "Usuarios, roles, respaldos y auditoría" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [appScreen, setAppScreen] = useState<AppScreen>("splash");
  const [navId, setNavId] = useState<NavId>("dashboard");
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const meta = screenMeta[navId] ?? { title: "SICAD", subtitle: "" };

  return (
    <div
      className={`w-full h-full flex overflow-hidden ${dark ? "dark" : ""}`}
      style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
    >
      <AnimatePresence mode="wait">
        {appScreen === "splash" && (
          <SplashScreen key="splash" onDone={() => setAppScreen("login")} />
        )}

        {appScreen === "login" && (
          <LoginScreen key="login" dark={dark} onLogin={() => setAppScreen("app")} />
        )}

        {appScreen === "app" && (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex w-full h-full overflow-hidden"
          >
            <Sidebar
              active={navId}
              onNav={id => setNavId(id)}
              collapsed={collapsed}
              onToggle={() => setCollapsed(c => !c)}
              onLogout={() => { setNavId("dashboard"); setAppScreen("login"); }}
            />

            <div className="flex flex-col flex-1 overflow-hidden">
              <Topbar
                title={meta.title}
                subtitle={meta.subtitle}
                dark={dark}
                onToggleDark={() => setDark(d => !d)}
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={navId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col flex-1 overflow-hidden"
                >
                  {navId === "dashboard" && <DashboardScreen dark={dark} />}
                  {navId === "employees" && <EmployeesScreen dark={dark} />}
                  {navId === "periods"   && <PeriodsScreen dark={dark} />}
                  {navId === "qr"        && <QRScreen dark={dark} onSuccess={() => setNavId("success")} />}
                  {navId === "success"   && <SuccessScreen dark={dark} onBack={() => setNavId("qr")} />}
                  {navId === "history"   && <HistoryScreen dark={dark} />}
                  {navId === "reports"   && <ReportsScreen dark={dark} />}
                  {navId === "settings"  && <SettingsScreen dark={dark} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
