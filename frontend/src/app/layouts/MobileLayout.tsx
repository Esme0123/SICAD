import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Home, Calendar, FileText, ScrollText, User, LogOut } from "lucide-react";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";

const navItems = [
  { to: "/app/inicio",    icon: Home,       label: "Inicio" },
  { to: "/app/horarios",  icon: Calendar,   label: "Horarios" },
  { to: "/app/historial", icon: ScrollText,  label: "Historial" },
  { to: "/app/permisos",  icon: FileText,   label: "Permisos" },
  { to: "/app/perfil",    icon: User,        label: "Perfil" },
];

export const MobileLayout: React.FC = () => {
  const { isAuthenticated, user, logout } = useEmployeeAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/app/login", { replace: true });
  };

  const hideNav = location.pathname === "/app/marcar";

  return (
    <div className={`h-screen w-full flex flex-col overflow-hidden ${dark ? "dark" : ""}`}
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <header className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            S
          </div>
          <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>SICAD</span>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <span className="text-xs truncate max-w-[120px]" style={{ color: "var(--muted-foreground)" }}>
              {user.nombre}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--muted-foreground)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--destructive)"; e.currentTarget.style.background = "color-mix(in srgb, var(--destructive) 10%, transparent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; }}
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-16"
        style={{ background: "var(--background)" }}
      >
        <Outlet />
      </main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
            {navItems.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to || location.pathname.startsWith(to + "/");
              return (
                <NavLink
                  key={to}
                  to={to}
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
                  style={{ color: isActive ? "var(--primary)" : "var(--muted-foreground)" }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "var(--foreground)"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "var(--muted-foreground)"; }}
                >
                  <Icon size={20} />
                  <span className="text-[10px] font-medium">{label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};
