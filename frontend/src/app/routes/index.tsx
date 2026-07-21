import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { RootLayout } from "../layouts/RootLayout";
import { MobileLayout } from "../layouts/MobileLayout";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Employees } from "@/pages/Employees";
import { LeavesView } from "@/pages/Leaves";
import { Attendance } from "@/pages/Attendance";
import { QRView } from "@/pages/Attendance/QRView";
import { SuccessView } from "@/pages/Attendance/SuccessView";
import { PeriodsView } from "@/pages/Attendance/PeriodsView";
import { HistoryView } from "@/pages/Attendance/HistoryView";
import { Reports } from "@/pages/Reports";
import { Settings } from "@/pages/Settings";
import { ScanProcessor } from "@/pages/Mobile/ScanProcessor";
import { MobileLogin } from "@/pages/MobileLogin";
import { MobileInicio } from "@/pages/MobileApp/Inicio";
import { MobileHorarios } from "@/pages/MobileApp/Horarios";
import { MobileHistorial } from "@/pages/MobileApp/Historial";
import { MobilePermisos } from "@/pages/MobileApp/Permisos";
import { MobilePerfil } from "@/pages/MobileApp/Perfil";
import { MobileMarcar } from "@/pages/Mobile/MarcarMobile";

interface AppRoutesProps {
  dark: boolean;
  onToggleDark: () => void;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ dark, onToggleDark }) => {
  return (
    <Routes>
      <Route path="/login" element={<Login dark={dark} />} />

      {/* Admin Layout */}
      <Route element={<RootLayout dark={dark} onToggleDark={onToggleDark} />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard dark={dark} />} />
        <Route path="/employees" element={<Employees dark={dark} />} />
        <Route path="/leaves" element={<LeavesView dark={dark} />} />
        <Route path="/attendance" element={<Attendance />}>
          <Route path="" element={<Navigate to="/attendance/qr" replace />} />
          <Route path="qr" element={<QRView dark={dark} />} />
          <Route path="success" element={<SuccessView dark={dark} />} />
          <Route path="periods" element={<PeriodsView dark={dark} />} />
          <Route path="history" element={<HistoryView dark={dark} />} />
        </Route>

        <Route path="/reports" element={<Reports dark={dark} />} />
        <Route path="/settings" element={<Settings dark={dark} />} />
      </Route>

      {/* Mobile App Layout — requiere autenticación de empleado */}
      <Route path="/app" element={<MobileLayout />}>
        <Route index element={<Navigate to="/app/inicio" replace />} />
        <Route path="inicio" element={<MobileInicio />} />
        <Route path="horarios" element={<MobileHorarios />} />
        <Route path="historial" element={<MobileHistorial />} />
        <Route path="permisos" element={<MobilePermisos />} />
        <Route path="perfil" element={<MobilePerfil />} />
      </Route>

      {/* Mobile Login — ruta pública sin layout */}
      <Route path="/app/login" element={<MobileLogin />} />

      {/* Mobile Marcar — ruta pública que procesa el escaneo QR */}
      <Route path="/app/marcar" element={<MobileMarcar />} />

      {/* Ruta pública para escaneo móvil — no requiere layout de admin */}
      <Route path="/marcar" element={<ScanProcessor />} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
