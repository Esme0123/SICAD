import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { RootLayout } from "../layouts/RootLayout";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Employees } from "@/pages/Employees";
import { Attendance } from "@/pages/Attendance";
import { QRView } from "@/pages/Attendance/QRView";
import { SuccessView } from "@/pages/Attendance/SuccessView";
import { PeriodsView } from "@/pages/Attendance/PeriodsView";
import { HistoryView } from "@/pages/Attendance/HistoryView";
import { Reports } from "@/pages/Reports";
import { Settings } from "@/pages/Settings";

interface AppRoutesProps {
  dark: boolean;
  onToggleDark: () => void;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ dark, onToggleDark }) => {
  return (
    <Routes>
      <Route path="/login" element={<Login dark={dark} />} />

      <Route element={<RootLayout dark={dark} onToggleDark={onToggleDark} />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard dark={dark} />} />
        <Route path="/employees" element={<Employees dark={dark} />} />

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

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
