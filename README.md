# 📌 SICAD — Sistema Inteligente de Control de Asistencia Digital

Sistema integral para el registro, monitoreo y análisis de asistencia de empleados. Incluye marcación por código QR dinámico con síntesis de voz, gestión de permisos, reportes estadísticos interactivos y una app móvil instalable (PWA / Android APK).

---

## 🛠️ Tecnologías Utilizadas

| Capa | Tecnologías |
|---|---|
| **Frontend Web** | React + TypeScript + Vite + Tailwind CSS + Recharts + MUI |
| **Backend** | Node.js + Express + Prisma ORM + PostgreSQL |
| **App Móvil** | Progressive Web App (PWA) / PWABuilder (Android APK) |
| **Autenticación** | JWT + bcryptjs |
| **Exportación** | PDF (jsPDF) y Excel (ExcelJS) |

---

## 🔑 Características Principales

- **Marcación rápida con QR dinámico + Síntesis de Voz** — Confirmación inmediata por audio del estado de asistencia registrado.
- **Gestión de Empleados y Horarios por Turnos** — Registro individual de personal y horarios.
- **Permisos y Licencias** — Flujo completo de solicitud y aprobación con archivos adjuntos.
- **Reportes y Análisis Estadístico** — Gráficos interactivos por estado (Puntual, Atraso, Ausente, Justificado).
- **Soporte Offline & Notificaciones Push** — Sincronización en segundo plano e instalación directa en dispositivos móviles.

---

## 📲 App Móvil (PWA / APK)

La aplicación móvil permite a los empleados marcar asistencia escaneando códigos QR y consultar su historial detallado.
- **PWA Deploy:** Vercel (`/app/login`)
- **Android APK:** Empaquetado nativo TWA mediante PWABuilder.
