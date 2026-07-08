export const card = (dark: boolean, extra = "") =>
  `rounded-2xl border ${
    dark ? "bg-[#1E293B] border-white/8" : "bg-white border-slate-100 shadow-sm"
  } ${extra}`;
