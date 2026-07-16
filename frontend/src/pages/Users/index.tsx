import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, Eye, X, KeyRound } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { card } from "@/utils/card";
import { COLORS } from "@/theme/colors";
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  changeAdminUserPassword,
  AdminUser,
} from "@/services/adminUsers.service";

interface UsersViewProps {
  dark: boolean;
}

export const UsersView: React.FC<UsersViewProps> = ({ dark }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);

  const [formValues, setFormValues] = useState({
    nombre: "",
    email: "",
    rol: "COORDINADOR" as "ADMIN" | "COORDINADOR",
    codigo: "",
    ci: "",
    celular: "",
  });

  const [passwordValue, setPasswordValue] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await getAdminUsers();
      setUsers(list);
    } catch (err) {
      console.error("Error al cargar usuarios del sistema:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredRows = users.filter((u) => {
    const term = search.toLowerCase();
    return (
      u.nombre.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.codigo && u.codigo.toLowerCase().includes(term))
    );
  });

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [filteredRows.length, totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + itemsPerPage);

  const handleOpenCreate = () => {
    setIsEditing(false);
    const codes = users
      .map((u) => {
        const match = u.codigo?.match(/US-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);
    const nextNum = codes.length > 0 ? Math.max(...codes) + 1 : 1;
    const nextCode = `US-${nextNum.toString().padStart(3, "0")}`;

    setFormValues({
      nombre: "",
      email: "",
      rol: "COORDINADOR",
      codigo: nextCode,
      ci: "",
      celular: "",
    });
    setFormModalOpen(true);
  };

  const handleOpenEdit = (u: AdminUser) => {
    setSelectedUser(u);
    setIsEditing(true);
    setFormValues({
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      codigo: u.codigo || "",
      ci: u.ci || "",
      celular: u.celular || "",
    });
    setFormModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.nombre || !formValues.email) {
      alert("Por favor complete los campos obligatorios");
      return;
    }
    if (!formValues.email.endsWith("@ucb.edu.bo")) {
      alert("El email debe terminar en @ucb.edu.bo");
      return;
    }

    setSaving(true);
    try {
      if (isEditing && selectedUser) {
        await updateAdminUser(selectedUser.id, {
          nombre: formValues.nombre,
          email: formValues.email,
          rol: formValues.rol,
          ...(formValues.codigo ? { codigo: formValues.codigo } : {}),
          ...(formValues.ci ? { ci: formValues.ci } : {}),
          ...(formValues.celular ? { celular: formValues.celular } : {}),
        });
      } else {
        const result = await createAdminUser({
          nombre: formValues.nombre,
          email: formValues.email,
          rol: formValues.rol,
          codigo: formValues.codigo || undefined,
          ci: formValues.ci || undefined,
          celular: formValues.celular || undefined,
        });
        if (result.defaultPassword) {
          alert(
            `Usuario creado exitosamente.\n\nContraseña por defecto: ${result.defaultPassword}\n\nEntréguela al usuario para su primer inicio de sesión.`
          );
        } else {
          alert("Usuario creado exitosamente.");
        }
      }
      setFormModalOpen(false);
      loadUsers();
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPassword = (u: AdminUser) => {
    setSelectedUser(u);
    setPasswordValue("");
    setPasswordError("");
    setPasswordModalOpen(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValue || passwordValue.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setSaving(true);
    try {
      await changeAdminUserPassword(selectedUser!.id, passwordValue);
      alert("Contraseña cambiada exitosamente.");
      setPasswordModalOpen(false);
    } catch (err: any) {
      setPasswordError(err?.response?.data?.message || err.message || "Error al cambiar contraseña");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDelete = (u: AdminUser) => {
    setUserToDelete(u);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (userToDelete) {
      try {
        await deleteAdminUser(userToDelete.id);
        setDeleteConfirmOpen(false);
        setUserToDelete(null);
        loadUsers();
      } catch (err) {
        console.error(err);
        alert("Error al eliminar el usuario");
      }
    }
  };

  const rolColor = (r: string) => (r === "ADMIN" ? "#E63946" : "#0F4C97");
  const rolLabel = (r: string) => (r === "ADMIN" ? "Administrador" : "Coordinador");

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      style={{ background: dark ? "#0B0F19" : "#F8FAFC" }}
    >
      <div className={card(dark, "overflow-hidden")}>
        {/* Toolbar */}
        <div
          className={`flex items-center justify-between p-5 border-b ${
            dark ? "border-white/8" : "border-slate-100"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search
                size={15}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                  dark ? "text-white/30" : "text-slate-400"
                }`}
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar por nombre, código o email..."
                className={`pl-9 pr-4 py-2 rounded-xl border text-sm outline-none w-72 transition-all ${
                  dark
                    ? "bg-white/5 border-white/10 text-white placeholder-white/25 focus:border-blue-500/60"
                    : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                }`}
              />
            </div>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 cursor-pointer"
            style={{ background: COLORS.primary }}
          >
            <Plus size={14} /> Nuevo usuario
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={dark ? "bg-white/3" : "bg-slate-50/80"}>
                {[
                  "Código",
                  "Nombre completo",
                  "CI",
                  "Correo",
                  "Teléfono",
                  "Rol",
                  "Estado",
                  "Acciones",
                ].map((col) => (
                  <th
                    key={col}
                    className={`px-5 py-3 text-left text-xs font-semibold tracking-wide ${
                      dark ? "text-white/35" : "text-slate-400"
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    <span className={dark ? "text-white/50" : "text-slate-500"}>
                      Cargando usuarios...
                    </span>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    <span className={dark ? "text-white/50" : "text-slate-500"}>
                      No se encontraron usuarios
                    </span>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-t transition-colors ${
                      dark
                        ? "border-white/6 hover:bg-white/3"
                        : "border-slate-100 hover:bg-blue-50/10"
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs font-mono font-bold ${
                          dark ? "text-blue-400" : "text-blue-700"
                        }`}
                      >
                        {u.codigo || `US-${String(u.id).padStart(3, "0")}`}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.nombre} size={32} bg={rolColor(u.rol)} />
                        <span
                          className={`text-sm font-medium ${
                            dark ? "text-white" : "text-slate-800"
                          }`}
                        >
                          {u.nombre}
                        </span>
                      </div>
                    </td>
                    <td
                      className={`px-5 py-3.5 text-sm font-mono ${
                        dark ? "text-white/70" : "text-slate-700"
                      }`}
                    >
                      {u.ci || "—"}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-sm ${
                        dark ? "text-white/50" : "text-slate-600"
                      }`}
                    >
                      {u.email}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-sm font-mono ${
                        dark ? "text-white/50" : "text-slate-600"
                      }`}
                    >
                      {u.celular || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{
                          background: `${rolColor(u.rol)}15`,
                          color: rolColor(u.rol),
                        }}
                      >
                        {rolLabel(u.rol)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={u.activo ? "Activo" : "Inactivo"} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setDetailModalOpen(true);
                          }}
                          title="Ver detalle"
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            dark
                              ? "hover:bg-white/8 text-white/50 hover:text-white"
                              : "hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(u)}
                          title="Editar"
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            dark
                              ? "hover:bg-white/8 text-white/50 hover:text-white"
                              : "hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleOpenPassword(u)}
                          title="Cambiar contraseña"
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            dark
                              ? "hover:bg-white/8 text-white/50 hover:text-yellow-400"
                              : "hover:bg-slate-100 text-slate-500 hover:text-yellow-600"
                          }`}
                        >
                          <KeyRound size={13} />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(u)}
                          title="Eliminar"
                          className="p-1.5 rounded-lg transition-colors hover:bg-red-50 text-red-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t ${
            dark ? "border-white/8" : "border-slate-100"
          }`}
        >
          <p className={`text-xs ${dark ? "text-white/30" : "text-slate-400"}`}>
            Mostrando {filteredRows.length > 0 ? startIndex + 1 : 0} a{" "}
            {Math.min(startIndex + itemsPerPage, filteredRows.length)} de {filteredRows.length} usuarios
          </p>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    pageNum === currentPage
                      ? "text-white"
                      : dark
                      ? "text-white/35 hover:bg-white/6"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                  style={pageNum === currentPage ? { background: COLORS.primary } : {}}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {detailModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl border transition-all ${
              dark ? "bg-[#1E293B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-lg font-bold">Detalle del Usuario</h3>
              <button
                onClick={() => setDetailModalOpen(false)}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${
                  dark ? "text-white/50" : "text-slate-400"
                }`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-6 space-y-6">
              <div className="flex items-center gap-4">
                <Avatar name={selectedUser.nombre} size={64} bg={rolColor(selectedUser.rol)} />
                <div>
                  <h4 className="text-lg font-semibold">{selectedUser.nombre}</h4>
                  <div className="flex gap-2 mt-1">
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded-md ${
                        dark ? "bg-white/8 text-blue-400" : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {selectedUser.codigo || `US-${String(selectedUser.id).padStart(3, "0")}`}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: `${rolColor(selectedUser.rol)}15`,
                        color: rolColor(selectedUser.rol),
                      }}
                    >
                      {rolLabel(selectedUser.rol)}
                    </span>
                    <StatusBadge status={selectedUser.activo ? "Activo" : "Inactivo"} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span
                    className={`block text-xs font-semibold ${
                      dark ? "text-white/40" : "text-slate-400"
                    }`}
                  >
                    CI
                  </span>
                  <span className="font-mono mt-0.5 block">{selectedUser.ci || "No registrado"}</span>
                </div>
                <div>
                  <span
                    className={`block text-xs font-semibold ${
                      dark ? "text-white/40" : "text-slate-400"
                    }`}
                  >
                    Teléfono
                  </span>
                  <span className="mt-0.5 block">{selectedUser.celular || "No registrado"}</span>
                </div>
                <div className="col-span-2">
                  <span
                    className={`block text-xs font-semibold ${
                      dark ? "text-white/40" : "text-slate-400"
                    }`}
                  >
                    Correo Electrónico
                  </span>
                  <span className="mt-0.5 block">{selectedUser.email}</span>
                </div>
                <div>
                  <span
                    className={`block text-xs font-semibold ${
                      dark ? "text-white/40" : "text-slate-400"
                    }`}
                  >
                    Código
                  </span>
                  <span className="font-mono mt-0.5 block">
                    {selectedUser.codigo || `US-${String(selectedUser.id).padStart(3, "0")}`}
                  </span>
                </div>
                <div>
                  <span
                    className={`block text-xs font-semibold ${
                      dark ? "text-white/40" : "text-slate-400"
                    }`}
                  >
                    Fecha de registro
                  </span>
                  <span className="mt-0.5 block">
                    {selectedUser.createdAt
                      ? new Date(selectedUser.createdAt).toLocaleDateString("es-BO")
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 cursor-pointer text-white"
                style={{ background: COLORS.primary }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE & EDIT FORM MODAL */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl border transition-all ${
              dark ? "bg-[#1E293B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-lg font-bold">
                {isEditing ? "Editar Usuario" : "Nuevo Usuario"}
              </h3>
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${
                  dark ? "text-white/50" : "text-slate-400"
                }`}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${
                        dark ? "text-white/60" : "text-slate-500"
                      }`}
                    >
                      Código *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isEditing}
                      value={formValues.codigo}
                      onChange={(e) => setFormValues({ ...formValues, codigo: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                        dark
                          ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60 disabled:opacity-50"
                          : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50 disabled:opacity-50"
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${
                        dark ? "text-white/60" : "text-slate-500"
                      }`}
                    >
                      CI *
                    </label>
                    <input
                      type="text"
                      required
                      value={formValues.ci}
                      onChange={(e) => setFormValues({ ...formValues, ci: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                        dark
                          ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60"
                          : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${
                      dark ? "text-white/60" : "text-slate-500"
                    }`}
                  >
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formValues.nombre}
                    onChange={(e) => setFormValues({ ...formValues, nombre: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                      dark
                        ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60"
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${
                        dark ? "text-white/60" : "text-slate-500"
                      }`}
                    >
                      Correo Electrónico (@ucb.edu.bo) *
                    </label>
                    <input
                      type="email"
                      required
                      value={formValues.email}
                      onChange={(e) => setFormValues({ ...formValues, email: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                        dark
                          ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60"
                          : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                      }`}
                    />
                    {formValues.email && !formValues.email.endsWith("@ucb.edu.bo") && (
                      <p className="text-xs text-red-500 mt-1">Debe terminar en @ucb.edu.bo</p>
                    )}
                  </div>
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${
                        dark ? "text-white/60" : "text-slate-500"
                      }`}
                    >
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={formValues.celular}
                      onChange={(e) => setFormValues({ ...formValues, celular: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                        dark
                          ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60"
                          : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${
                        dark ? "text-white/60" : "text-slate-500"
                      }`}
                    >
                      Rol *
                    </label>
                    <select
                      value={formValues.rol}
                      onChange={(e) =>
                        setFormValues({ ...formValues, rol: e.target.value as "ADMIN" | "COORDINADOR" })
                      }
                      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                        dark
                          ? "bg-[#1E293B] border-white/10 text-white focus:border-blue-500/60"
                          : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                      }`}
                    >
                      <option value="COORDINADOR">Coordinador</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                    dark
                      ? "border-white/10 text-white/70 hover:bg-white/5"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 cursor-pointer"
                  style={{ background: COLORS.primary }}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {passwordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border transition-all ${
              dark ? "bg-[#1E293B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
            }`}
          >
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <KeyRound size={20} className="text-yellow-500" /> Cambiar Contraseña
            </h3>
            <p className={`text-sm mb-4 ${dark ? "text-white/60" : "text-slate-500"}`}>
              Usuario: <span className="font-semibold">{selectedUser.nombre}</span>
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-4">
                <label
                  className={`block text-xs font-semibold mb-1.5 ${
                    dark ? "text-white/60" : "text-slate-500"
                  }`}
                >
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all ${
                    dark
                      ? "bg-white/5 border-white/10 text-white focus:border-blue-500/60"
                      : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600/50"
                  }`}
                />
                {passwordError && (
                  <p className="text-xs text-red-500 mt-1">{passwordError}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                    dark
                      ? "border-white/10 text-white/70 hover:bg-white/5"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-yellow-600 hover:bg-yellow-700 transition-all cursor-pointer"
                >
                  {saving ? "Cambiando..." : "Cambiar contraseña"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border transition-all ${
              dark ? "bg-[#1E293B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
            }`}
          >
            <h3 className="text-lg font-bold text-red-500 flex items-center gap-2 mb-2">
              <Trash2 size={20} /> Eliminar Usuario
            </h3>
            <p className={`text-sm mb-6 ${dark ? "text-white/75" : "text-slate-600"}`}>
              ¿Está seguro de que desea eliminar al usuario{" "}
              <span className="font-semibold">{userToDelete.nombre}</span> ({userToDelete.email})?
              Esta acción no se puede deshacer.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                  dark
                    ? "border-white/10 text-white/70 hover:bg-white/5"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-all cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersView;
