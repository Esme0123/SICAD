import React, { useState, useEffect } from "react";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const diasSemana = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

interface PeriodoInfo {
  nombre: string;
  horaInicio: string;
  horaFin: string;
  duracion: number;
}

export const MobileHorarios: React.FC = () => {
  const { user } = useEmployeeAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [horarios, setHorarios] = useState<Record<string, PeriodoInfo[]>>({});
  const [loading, setLoading] = useState(true);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_URL}/api/horarios/${user.id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("sicad_emp_token")}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) {
          const agrupado: Record<string, PeriodoInfo[]> = {};
          for (const h of res.data || []) {
            const dia = h.diaSemana;
            if (!agrupado[dia]) agrupado[dia] = [];
            agrupado[dia].push({
              nombre: h.periodo?.nombre || "Sin nombre",
              horaInicio: h.periodo?.horaInicio || "--:--",
              horaFin: h.periodo?.horaFin || "--:--",
              duracion: h.periodo?.duracion || 0,
            });
          }
          setHorarios(agrupado);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentWeek((w) => subWeeks(w, 1))}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft size={20} className="text-muted-foreground" />
        </button>
        <span className="text-sm font-bold text-foreground">
          {format(weekStart, "d MMM", { locale: es })} - {format(weekEnd, "d MMM", { locale: es })}
        </span>
        <button
          onClick={() => setCurrentWeek((w) => addWeeks(w, 1))}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight size={20} className="text-muted-foreground" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-3" />
              <div className="h-3 bg-muted rounded w-40" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {days.map((day) => {
            const diaNombre = diasSemana[day.getDay()];
            const periodosDia = horarios[diaNombre] || [];
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`bg-card border rounded-xl p-4 transition-colors ${
                  isToday ? "border-primary/40 bg-primary/[0.03]" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                    {format(day, "EEEE d", { locale: es })}
                  </span>
                  {isToday && (
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Hoy
                    </span>
                  )}
                </div>
                {periodosDia.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin horarios asignados</p>
                ) : (
                  <div className="space-y-1.5">
                    {periodosDia.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock size={12} className="shrink-0 text-primary" />
                        <span className="font-mono font-medium text-foreground">
                          {p.horaInicio} - {p.horaFin}
                        </span>
                        <span className="text-muted-foreground">· {p.nombre}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
