import React, { useState } from "react";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";
import { useNavigate } from "react-router-dom";
import { User, Mail, Hash, BadgeCheck, Shield, Phone, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Key } from "lucide-react";
import { cambiarPassword as cambiarPasswordApi } from "@/services/employee.service";

export const MobilePerfil: React.FC = () => {
  const { user, logout } = useEmployeeAuth();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [passwordActual, setPasswordActual] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogout = () => {
    logout();
    navigate("/app/login", { replace: true });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!passwordActual || !nuevaPassword || !confirmarPassword) {
      setError("Todos los campos son requeridos");
      return;
    }

    if (nuevaPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setError("Las contraseñas nuevas no coinciden");
      return;
    }

    setSubmitting(true);
    try {
      const res = await cambiarPasswordApi({ passwordActual, nuevaPassword });
      if (res.ok) {
        setSuccess("Contraseña actualizada correctamente");
        setPasswordActual("");
        setNuevaPassword("");
        setConfirmarPassword("");
        setTimeout(() => {
          setShowForm(false);
          setSuccess("");
        }, 2000);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Error al cambiar contraseña");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  const infoItems = [
    { icon: User, label: "Nombre completo", value: user.nombre },
    { icon: Hash, label: "Código de empleado", value: user.codigo },
    { icon: BadgeCheck, label: "Cédula de identidad", value: user.ci || "No registrado" },
    { icon: Mail, label: "Correo electrónico", value: user.email },
    { icon: Phone, label: "Celular", value: user.celular || "No registrado" },
    { icon: Shield, label: "Cargo / Rol", value: user.rol === "EMPLEADO" ? "Empleado" : user.rol },
  ];

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl font-black shadow-lg">
          {user.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-foreground">{user.nombre}</h2>
          <p className="text-xs text-muted-foreground">{user.codigo}</p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
          user.activo
            ? "bg-success/10 text-success"
            : "bg-destructive/10 text-destructive"
        }`}>
          {user.activo ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
          {user.activo ? "Activo" : "Inactivo"}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl divide-y divide-border">
        {infoItems.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Icon size={14} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-sm font-semibold text-foreground truncate mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-muted/50 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Key size={14} className="text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Cambiar contraseña</span>
          <span className={`ml-auto text-muted-foreground transition-transform ${showForm ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>

        {showForm && (
          <form onSubmit={handleChangePassword} className="px-4 pb-4 space-y-3">
            {error && (
              <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-xs font-medium px-3 py-2 rounded-lg">
                <AlertCircle size={12} />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 bg-success/10 text-success text-xs font-medium px-3 py-2 rounded-lg">
                <CheckCircle2 size={12} />
                {success}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Contraseña actual</label>
              <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-muted/30 focus-within:border-primary transition-colors">
                <Key size={14} className="text-muted-foreground shrink-0" />
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  className="bg-transparent outline-none text-sm w-full text-foreground placeholder:text-muted-foreground"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((s) => !s)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nueva contraseña</label>
              <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-muted/30 focus-within:border-primary transition-colors">
                <Key size={14} className="text-muted-foreground shrink-0" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  className="bg-transparent outline-none text-sm w-full text-foreground placeholder:text-muted-foreground"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((s) => !s)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Confirmar nueva contraseña</label>
              <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-muted/30 focus-within:border-primary transition-colors">
                <Key size={14} className="text-muted-foreground shrink-0" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  className="bg-transparent outline-none text-sm w-full text-foreground placeholder:text-muted-foreground"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
              {submitting ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </form>
        )}
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-xl border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/5 transition-colors"
      >
        Cerrar sesión
      </button>
    </div>
  );
};
