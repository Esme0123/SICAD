import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "motion/react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  UserCheck,
  QrCode,
  BarChart2,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";
import { UCBLogo } from "@/components/common/UCBLogo";
import { FormInput } from "@/components/forms/FormInput";
import { useAuth } from "@/context/AuthContext";
import { login as loginService, forgotPassword } from "@/services/auth.service";

// Define the validation schema with Zod
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El correo electrónico es requerido")
    .email("Ingrese un correo electrónico válido (ej: usuario@ucb.edu.bo)"),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
  remember: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginProps {
  dark: boolean;
}

export const Login: React.FC<LoginProps> = ({ dark }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const rememberVal = watch("remember");

  useEffect(() => {
    const savedEmail = localStorage.getItem("sicad_remember_email");
    if (savedEmail) {
      setValue("email", savedEmail);
      setValue("remember", true);
    }
  }, [setValue]);

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setApiError(null);

    if (data.remember) {
      localStorage.setItem("sicad_remember_email", data.email);
    } else {
      localStorage.removeItem("sicad_remember_email");
    }

    try {
      const { token, user } = await loginService({
        email:    data.email,
        password: data.password,
      });
      login(token, user);
      const userRole = (user.role || "").toUpperCase();
      navigate(userRole === "KIOSKO" ? "/attendance/qr" : "/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Error inesperado. Intenta nuevamente.";
      setApiError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex w-full h-screen overflow-hidden"
    >
      {/* Left panel - Ahora usa las variables CSS del theme */}
      <div
        className="hidden lg:flex w-[44%] flex-col items-center justify-center relative overflow-hidden"
        style={{
          background:
            "linear-gradient(150deg, var(--color-primary-hover) 0%, var(--color-primary) 100%)",
        }}
      >
        <div
          className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] rounded-full opacity-[0.15]"
          style={{ background: "radial-gradient(circle, var(--color-primary-light), transparent)" }}
        />
        <div
          className="absolute bottom-[-20%] left-[-15%] w-[380px] h-[380px] rounded-full opacity-[0.1]"
          style={{ background: "radial-gradient(circle, var(--color-primary-light), transparent)" }}
        />

        <div className="relative z-10 flex flex-col items-center gap-8 px-14">
          <UCBLogo size={96} />
          <div className="text-center">
            <h1 className="text-5xl font-black text-white tracking-tight">SICAD</h1>
            <p className="text-white/70 text-sm mt-2 leading-relaxed max-w-[280px]">
              Sistema de Control de Asistencia para el Centro de Cómputo UCB
            </p>
          </div>
          <div className="flex flex-col gap-2.5 w-full max-w-[280px]">
            {[
              { icon: <UserCheck size={15} />, text: "Registro de asistencia digital" },
              { icon: <QrCode size={15} />, text: "Verificación QR en tiempo real" },
              { icon: <BarChart2 size={15} />, text: "Reportes y estadísticas avanzadas" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {/* Usamos el color secundario (Dorado UCB) para los íconos */}
                <span style={{ color: "var(--color-secondary)" }}>{item.icon}</span>
                <span className="text-white/80 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
          <div
            className="h-px w-full max-w-[280px] opacity-30"
            style={{ background: "var(--color-secondary)" }}
          />
          <p className="text-white/40 text-xs text-center">
            Desarrollado por<br />
            <span className="text-white/60">Esmeralda Paula Medina Paredes</span>
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div
        className={`flex-1 flex items-center justify-center p-8 ${dark ? "bg-[#0B0F19]" : "bg-slate-50"
          }`}
      >
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className={`w-full max-w-md ${dark ? "bg-[#1E293B] border-white/8" : "bg-white border-slate-200"
            } rounded-2xl shadow-2xl border p-10`}
        >
          <div className="flex flex-col items-center mb-2 lg:hidden">
            <UCBLogo size={52} />
          </div>
          <div className="mb-8">
            <h2 className={`text-2xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>
              Iniciar sesión
            </h2>
            <p className={`text-sm mt-1 ${dark ? "text-white/40" : "text-slate-500"}`}>
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Error de API */}
            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#ef4444",
                }}
              >
                <AlertCircle size={15} className="shrink-0" />
                <span>{apiError}</span>
              </motion.div>
            )}
            <FormInput
              label="Correo electrónico"
              type="email"
              placeholder="usuario@ucb.edu.bo"
              icon={<Mail size={15} />}
              dark={dark}
              error={errors.email}
              {...register("email")}
            />

            <div>
              <div className="relative">
                <FormInput
                  label="Contraseña"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  icon={<Lock size={15} />}
                  dark={dark}
                  error={errors.password}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className={`absolute right-3.5 top-[38px] ${dark ? "text-white/30 hover:text-white/60" : "text-slate-400 hover:text-slate-600"
                    }`}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="rememberMe" className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 select-none">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberVal}
                  onChange={(e) => setValue("remember", e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <span>Recordarme</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(true)}
                className="text-sm font-medium hover:underline text-primary"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={loading}
              // Simplificado usando clases de Tailwind (bg-primary)
              className={`w-full py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${loading ? "bg-muted-foreground" : "bg-primary hover:opacity-90 shadow-md shadow-primary/20"
                }`}
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Verificando...
                </>
              ) : (
                "Ingresar al sistema"
              )}
            </motion.button>
          </form>

          <p className={`text-xs text-center mt-7 ${dark ? "text-white/20" : "text-slate-400"}`}>
            SICAD v1.0 • Centro de Cómputo UCB "San Pablo"
          </p>
        </motion.div>
      </div>

      {/* Modal de Olvidaste tu contraseña */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForgotPasswordModal(false); }}
        >
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border transition-all ${dark ? "bg-[#1E293B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
            }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Restablecer Contraseña</h3>
              <button
                onClick={() => setShowForgotPasswordModal(false)}
                className={`p-1.5 rounded-lg transition-colors ${dark ? "hover:bg-white/10 text-white/50" : "hover:bg-slate-100 text-slate-400"
                  }`}
              >
                <X size={18} />
              </button>
            </div>

            {forgotSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle size={28} />
                </div>
                <p className="text-sm leading-relaxed">
                  Te hemos enviado un enlace a tu correo para restablecer tu contraseña.
                </p>
                <p className={`text-xs ${dark ? "text-white/50" : "text-slate-500"}`}>
                  Revisa tu bandeja de entrada y sigue las instrucciones.
                </p>
                <button
                  onClick={() => { setShowForgotPasswordModal(false); setForgotSent(false); }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 text-white"
                  style={{ background: "var(--primary)" }}
                >
                  Entendido
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className={`text-sm leading-relaxed ${dark ? "text-white/70" : "text-slate-600"}`}>
                  Ingresa tu correo electrónico registrado y te enviaremos un enlace para restablecer tu contraseña.
                </p>

                {forgotError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}
                  >
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${dark ? "text-white/60" : "text-slate-500"}`}>
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="usuario@ucb.edu.bo"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all ${dark
                        ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60"
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                      }`}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowForgotPasswordModal(false)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${dark
                        ? "border-white/10 text-white/70 hover:bg-white/5"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (!forgotEmail) { setForgotError("Ingresa tu correo electrónico"); return; }
                      setForgotLoading(true);
                      setForgotError(null);
                      try {
                        await forgotPassword(forgotEmail);
                        setForgotSent(true);
                      } catch (err: unknown) {
                        setForgotError(err instanceof Error ? err.message : "Error al enviar el correo");
                      } finally {
                        setForgotLoading(false);
                      }
                    }}
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 text-white disabled:opacity-50 cursor-pointer"
                    style={{ background: "var(--primary)" }}
                  >
                    {forgotLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin" /> Enviando...
                      </span>
                    ) : (
                      "Enviar enlace de recuperación"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};