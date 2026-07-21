import React from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Home, Calendar, FileText, User, LogOut } from "lucide-react";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";

const navItems = [
  { to: "/app/inicio",   icon: Home,     label: "Inicio" },
  { to: "/app/horarios", icon: Calendar,  label: "Horarios" },
  { to: "/app/permisos", icon: FileText,  label: "Permisos" },
  { to: "/app/perfil",   icon: User,      label: "Perfil" },
];

export const MobileLayout: React.FC = () => {
  const { isAuthenticated, user, logout } = useEmployeeAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/app/login", { replace: true });
  };

  const hideNav = location.pathname === "/app/marcar";

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
            S
          </div>
          <span className="text-sm font-bold text-foreground">SICAD</span>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {user.nombre}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
            {navItems.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to || location.pathname.startsWith(to + "/");
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
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
