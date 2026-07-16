import React, { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, X, MoreHorizontal, KeyRound, User, Shield, Mail, Lock, AlertCircle } from "lucide-react";
import { card } from "@/utils/card";
import { COLORS } from "@/theme/colors";
import { Avatar } from "@/components/common/Avatar";
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  changeAdminUserPassword,
  deleteAdminUser,
  AdminUser,
  CreateAdminUserPayload,
} from "@/services/adminUsers.service";

interface Props {
  dark: boolean;
  currentUserEmail: string;
}

export const AdminUsersPanel: React.FC<Props> = ({ dark, currentUserEmail }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "password">("create");
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "COORDINADOR" as "ADMIN" | "COORDINADOR" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await getAdminUsers();
      setUsers(list);
    } catch (err) {
      console.error("Error loading admin users:", err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setModalMode("create");
    setEditingUser(null);
    setForm({ nombre: "", email: "", password: "", rol: "COORDINADOR" });
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setModalMode("edit");
    setEditingUser(u);
    setForm({ nombre: u.nombre, email: u.email, password: "", rol: u.rol });
    setFormError("");
    setModalOpen(true);
    setMenuOpenId(null);
  };

  const openPassword = (u: AdminUser) => {
    setModalMode("password");
    setEditingUser(u);
    setForm({ nombre: u.nombre, email: u.email, password: "", rol: u.rol });
    setFormError("");
    setModalOpen(true);
    setMenuOpenId(null);
  };

  const validateEmail = (email: string): boolean => email.endsWith("@ucb.edu.bo");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (modalMode === "create" || modalMode === "edit") {
      if (!form.nombre.trim()) { setFormError("El nombre es requerido"); return; }
      if (!validateEmail(form.email)) { setFormError("El email debe terminar en @ucb.edu.bo"); return; }
    }
    if (modalMode === "password" && (!form.password || form.password.length < 6)) {
      setFormError("La contraseña debe tener al menos 6 caracteres"); return;
    }

    setSaving(true);
    try {
      if (modalMode === "create") {
        const result = await createAdminUser(form);
        if (result.defaultPassword) {
          alert(`Usuario creado exitosamente.\n\nContraseña por defecto: ${result.defaultPassword}\n\nEntréguela al usuario para su primer inicio de sesión.`);
        } else {
          alert("Usuario creado exitosamente.");
        }
      } else if (modalMode === "edit" && editingUser) {
        await updateAdminUser(editingUser.id, { nombre: form.nombre, email: form.email, rol: form.rol });
      } else if (modalMode === "password" && editingUser) {
        await changeAdminUserPassword(editingUser.id, form.password);
      }
      await loadUsers();
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: AdminUser) => {
    if (!window.confirm(`¿Eliminar al usuario ${u.nombre} (${u.email})?`)) return;
    try {
      await deleteAdminUser(u.id);
      await loadUsers();
    } catch (err) {
      console.error("Error deleting user:", err);
    }
    setMenuOpenId(null);
  };

  const handleToggleActive = async (u: AdminUser) => {
    try {
      await updateAdminUser(u.id, { activo: !u.activo });
      await loadUsers();
    } catch (err) {
      console.error("Error toggling user status:", err);
    }
    setMenuOpenId(null);
  };

  const rolColor = (r: string) => r === "ADMIN" ? "#E63946" : "#0F4C97";
  const rolLabel = (r: string) => r === "ADMIN" ? "Administrador" : "Coordinador";

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className={`font-semibold ${dark ? "text-white" : "text-slate-800"}`}>
            Usuarios del Sistema
          </h3>
          <p className={`text-xs mt-0.5 ${dark ? "text-white/35" : "text-slate-400"}`}>
            {users.length} usuarios registrados
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold cursor-pointer transition-all hover:opacity-90"
          style={{ background: COLORS.primary }}
        >
          <Plus size={14} /> Nuevo usuario
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm text-slate-400">Cargando usuarios...</div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const isCurrentUser = u.email === currentUserEmail;
            return (
              <div
                key={u.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border relative ${dark ? "border-white/8 bg-white/3" : "border-slate-100 bg-slate-50"} ${isCurrentUser ? "ring-2 ring-blue-400/50" : ""}`}
              >
                <Avatar name={u.nombre} size={40} bg={rolColor(u.rol)} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-slate-800"}`}>
                    {u.nombre}
                    {isCurrentUser && <span className="ml-2 text-[10px] text-blue-500 font-medium">(Tú)</span>}
                  </p>
                  <p className={`text-xs truncate ${dark ? "text-white/35" : "text-slate-400"}`}>
                    {u.email}
                  </p>
                </div>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap"
                  style={{ background: `${rolColor(u.rol)}15`, color: rolColor(u.rol) }}
                >
                  {rolLabel(u.rol)}
                </span>
                <div className={`flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${u.activo ? "text-green-500" : "text-red-400"}`}>
                  <span className={`w-2 h-2 rounded-full ${u.activo ? "bg-green-400" : "bg-red-400"}`} />
                  {u.activo ? "Activo" : "Inactivo"}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === u.id ? null : u.id)}
                    className={`p-1.5 rounded-lg cursor-pointer ${dark ? "hover:bg-white/8 text-white/35" : "hover:bg-white text-slate-400"}`}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {menuOpenId === u.id && (
                    <div
                      ref={menuRef}
                      className={`absolute right-0 mt-1 w-44 rounded-xl shadow-lg border z-20 ${dark ? "bg-[#1E293B] border-white/10" : "bg-white border-slate-200"}`}
                    >
                      <button onClick={() => openEdit(u)} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left ${dark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-50"}`}>
                        <Edit2 size={13} /> Editar
                      </button>
                      <button onClick={() => openPassword(u)} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left ${dark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-50"}`}>
                        <KeyRound size={13} /> Cambiar contraseña
                      </button>
                      <button onClick={() => handleToggleActive(u)} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left ${dark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-50"}`}>
                        <Shield size={13} /> {u.activo ? "Inactivar" : "Activar"}
                      </button>
                      <div className={`border-t ${dark ? "border-white/10" : "border-slate-100"}`} />
                      <button onClick={() => handleDelete(u)} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left text-red-500 ${dark ? "hover:bg-red-500/10" : "hover:bg-red-50"}`}>
                        <Trash2 size={13} /> Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl p-6 ${dark ? "bg-[#1E293B] border border-white/10" : "bg-white"}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-bold flex items-center gap-2 ${dark ? "text-white" : "text-slate-800"}`}>
                <User className="text-primary" size={22} />
                {modalMode === "create" ? "Crear Usuario" : modalMode === "edit" ? "Editar Usuario" : "Cambiar Contraseña"}
              </h3>
              <button onClick={() => setModalOpen(false)} className={`cursor-pointer ${dark ? "text-white/40 hover:text-white" : "text-slate-400 hover:text-slate-600"}`}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {modalMode !== "password" && (
                <>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${dark ? "text-white/60" : "text-slate-500"}`}>
                      <User size={13} className="inline mr-1" /> Nombre completo
                    </label>
                    <input
                      type="text" required
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all ${dark ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60" : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${dark ? "text-white/60" : "text-slate-500"}`}>
                      <Mail size={13} className="inline mr-1" /> Email (@ucb.edu.bo)
                    </label>
                    <input
                      type="email" required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="ejemplo@ucb.edu.bo"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all ${form.email && !form.email.endsWith("@ucb.edu.bo") ? "border-red-400" : dark ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60" : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"}`}
                    />
                    {form.email && !validateEmail(form.email) && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} /> Debe terminar en @ucb.edu.bo</p>
                    )}
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${dark ? "text-white/60" : "text-slate-500"}`}>
                      <Shield size={13} className="inline mr-1" /> Rol
                    </label>
                    <select
                      value={form.rol}
                      onChange={(e) => setForm({ ...form, rol: e.target.value as "ADMIN" | "COORDINADOR" })}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all ${dark ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                    >
                      <option value="COORDINADOR">Coordinador</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                </>
              )}

              {(modalMode === "create" || modalMode === "password") && (
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${dark ? "text-white/60" : "text-slate-500"}`}>
                    <Lock size={13} className="inline mr-1" /> {modalMode === "password" ? "Nueva contraseña" : "Contraseña (opcional)"}
                  </label>
                  <input
                    type="password" minLength={modalMode === "password" ? 6 : 0}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={modalMode === "create" ? "Se generará automáticamente" : "Mínimo 6 caracteres"}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all ${dark ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60" : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"}`}
                  />
                  {modalMode === "create" && (
                    <p className={`text-[10px] mt-1.5 ${dark ? "text-white/40" : "text-slate-400"}`}>
                      Si no ingresa una, el sistema generará una automáticamente basada en el correo.
                    </p>
                  )}
                </div>
              )}

              {formError && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-xl">
                  <AlertCircle size={14} /> {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
                <button type="button" onClick={() => setModalOpen(false)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${dark ? "hover:bg-white/10 text-white/70" : "hover:bg-slate-100 text-slate-600"}`}>
                  Cancelar
                </button>
                <button
                  type="submit" disabled={saving}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity flex items-center gap-2 cursor-pointer ${saving ? "bg-slate-400 cursor-not-allowed opacity-50" : "bg-primary hover:opacity-90 shadow-md"}`}
                  style={saving ? {} : { background: COLORS.primary }}
                >
                  {saving ? "Guardando..." : modalMode === "password" ? "Cambiar contraseña" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
