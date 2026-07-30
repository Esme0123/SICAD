import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { User, Fingerprint, Phone, Lock, Eye, EyeOff, RefreshCw, CheckCircle, AlertCircle, X } from "lucide-react";
import { UCBLogo } from "@/components/common/UCBLogo";
import api from "@/services/api";

export const RegisterEmployee: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [nombre, setNombre] = useState("");
  const [ci, setCi] = useState("");
  const [celular, setCelular] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("El enlace de invitación no es válido o falta el token.");
      return;
    }

    if (!nombre.trim()) {
      setError("El nombre completo es requerido");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post<{ ok: boolean; message: string }>("/usuarios/complete-registration", {
        token,
        nombre: nombre.trim(),
        ci: ci.trim(),
        celular: celular.trim(),
        password,
      });
      if (data.ok) {
        setSuccess(true);
      } else {
        setError(data.message || "Error al completar el registro");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || "Error al completar el registro";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex w-full h-screen overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="w-full max-w-md rounded-2xl shadow-2xl border p-10"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="flex flex-col items-center mb-6">
            <UCBLogo size={52} />
            <h2 className="text-2xl font-bold mt-4" style={{ color: "var(--foreground)" }}>
              Completar Registro
            </h2>
            <p className="text-sm mt-1 text-center" style={{ color: "var(--muted-foreground)" }}>
              Completa tus datos personales para activar tu cuenta en SICAD
            </p>
          </div>

          {success ? (
            <div className="text-center space-y-4 py-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ background: "rgba(34,197,94,0.15)" }}
              >
                <CheckCircle size={32} style={{ color: "#22c55e" }} />
              </div>
              <h3 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                Registro completado
              </h3>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                Tu cuenta ha sido activada exitosamente. Ya puedes iniciar sesión con tu código de empleado y contraseña.
              </p>
              <button
                onClick={() => navigate("/app/login")}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 cursor-pointer"
                style={{ background: "var(--primary)" }}
              >
                Ir al inicio de sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}
                >
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>
                  Nombre Completo *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }}>
                    <User size={15} />
                  </span>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all"
                    style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>
                  CI (Cédula de Identidad)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }}>
                    <Fingerprint size={15} />
                  </span>
                  <input
                    type="text"
                    value={ci}
                    onChange={(e) => setCi(e.target.value)}
                    placeholder="1234567"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all"
                    style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>
                  Teléfono / Celular
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }}>
                    <Phone size={15} />
                  </span>
                  <input
                    type="tel"
                    value={celular}
                    onChange={(e) => setCelular(e.target.value)}
                    placeholder="76543210"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all"
                    style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>
                  Contraseña *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }}>
                    <Lock size={15} />
                  </span>
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm outline-none transition-all"
                    style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>
                  Confirmar Contraseña *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }}>
                    <Lock size={15} />
                  </span>
                  <input
                    type={showPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all"
                    style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                style={{ background: "var(--primary)" }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> Guardando...
                  </>
                ) : (
                  "Completar Registro"
                )}
              </motion.button>
            </form>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default RegisterEmployee;
