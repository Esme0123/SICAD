import React, { useState } from "react";
import { Clock, Check, Calendar } from "lucide-react";
import { card } from "@/utils/card";

interface PeriodsViewProps {
  dark: boolean;
}

export const PeriodsView: React.FC<PeriodsViewProps> = ({ dark }) => {
  const slots = Array.from({ length: 14 }, (_, i) => {
    const sh = 7 + i,
      sm = 15,
      eh = sh + 1;
    const f = (h: number, m: number) =>
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    return { id: i, label: `${f(sh, sm)} – ${f(eh, sm)}` };
  });

  const [sel, setSel] = useState<number[]>([0, 1, 2, 4, 5, 8]);
  const toggle = (id: number) =>
    setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const assigned: Record<string, number[]> = {
    Lun: [0, 1, 4],
    Mar: [1, 2, 5],
    Mié: [0, 3, 4],
    Jue: [2, 4, 5],
    Vie: [1, 3],
    Sáb: [6],
  };

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      style={{ background: dark ? "#0B0F19" : "#F8FAFC" }}
    >
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Periods list */}
        <div className={card(dark, "xl:col-span-2 flex flex-col h-[600px]")}>
          <div className={`p-5 border-b ${dark ? "border-white/8" : "border-slate-100"}`}>
            <h3 className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>
              Periodos disponibles
            </h3>
            <p className={`text-xs mt-1 ${dark ? "text-white/35" : "text-slate-400"}`}>
              Selecciona los periodos a asignar
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
            {slots.map((p) => {
              const on = sel.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    on
                      ? dark
                        ? "border-purple-600/50 bg-purple-900/25"
                        : "border-purple-600/50 bg-purple-50"
                      : dark
                      ? "border-white/8 hover:border-white/15"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      on
                        ? "border-purple-600 bg-purple-600"
                        : dark
                        ? "border-white/20"
                        : "border-slate-300"
                    }`}
                  >
                    {on && <Check size={11} className="text-white" strokeWidth={3} />}
                  </div>
                  <Clock
                    size={13}
                    style={{ color: on ? "#6A1B9A" : dark ? "#475569" : "#94A3B8" }}
                  />
                  <span
                    className={`text-sm font-mono ${
                      on
                        ? dark
                          ? "text-purple-300"
                          : "text-purple-700"
                        : dark
                        ? "text-white/60"
                        : "text-slate-600"
                    }`}
                  >
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className={`p-4 border-t ${dark ? "border-white/8" : "border-slate-100"}`}>
            <div className="flex gap-2">
              <button
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold cursor-pointer"
                style={{ background: "#6A1B9A" }}
              >
                Guardar asignación
              </button>
              <button
                onClick={() => setSel([])}
                className={`px-4 py-2.5 rounded-xl border text-sm cursor-pointer ${
                  dark ? "border-white/10 text-white/50" : "border-slate-200 text-slate-500"
                }`}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Weekly calendar */}
        <div className={card(dark, "xl:col-span-3 flex flex-col")}>
          <div className={`p-5 border-b ${dark ? "border-white/8" : "border-slate-100"}`}>
            <h3 className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>
              Vista semanal de asignaciones
            </h3>
            <p className={`text-xs mt-1 ${dark ? "text-white/35" : "text-slate-400"}`}>
              Semana del{" "}
              {new Date().toLocaleDateString("es-BO", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex-1 p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {days.map((day, di) => (
                <div key={day} className="flex flex-col gap-1.5">
                  <div
                    className={`text-xs font-semibold text-center py-1.5 rounded-lg ${
                      di === 0
                        ? "text-white"
                        : dark
                        ? "text-white/40 bg-white/5"
                        : "text-slate-50 bg-slate-100"
                    }`}
                    style={di === 0 ? { background: "#6A1B9A" } : {}}
                  >
                    {day}
                  </div>
                  {(assigned[day] || []).map((sid) => (
                    <div
                      key={sid}
                      className="px-1.5 py-1.5 rounded-lg text-center"
                      style={{
                        background: "rgba(106,27,154,0.09)",
                        border: "1px solid rgba(106,27,154,0.18)",
                      }}
                    >
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: dark ? "#E1BEE7" : "#4A148C" }}
                      >
                        {slots[sid]?.label.split(" – ")[0]}
                      </span>
                    </div>
                  ))}
                  {!(assigned[day]?.length) && (
                    <div
                      className={`py-3 rounded-lg flex items-center justify-center ${
                        dark ? "bg-white/3" : "bg-slate-50"
                      }`}
                    >
                      <span className={`text-xs ${dark ? "text-white/15" : "text-slate-300"}`}>
                        —
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className={`mt-5 p-4 rounded-xl ${dark ? "bg-white/4" : "bg-slate-50"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${dark ? "text-white/40" : "text-slate-500"}`}>
                    Seleccionados
                  </p>
                  <p
                    className="text-3xl font-bold mt-0.5"
                    style={{ color: "#6A1B9A" }}
                  >
                    {sel.length}
                    <span
                      className={`text-sm font-normal ml-1 ${
                        dark ? "text-white/30" : "text-slate-400"
                      }`}
                    >
                      / {slots.length}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 max-w-xs justify-end">
                  {sel.slice(0, 8).map((id) => (
                    <span
                      key={id}
                      className="px-2 py-0.5 rounded-full text-xs font-mono"
                      style={{ background: "rgba(106,27,154,0.1)", color: "#6A1B9A" }}
                    >
                      {slots[id]?.label.split(" – ")[0]}
                    </span>
                  ))}
                  {sel.length > 8 && <span className="text-xs text-slate-400">+{sel.length - 8}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
