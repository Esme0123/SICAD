# 📌 SICAD — Sistema de Control de Asistencia Docente

Sistema integral para el registro, monitoreo y análisis de asistencia de docentes y empleados. Incluye marcación por código QR dinámico con síntesis de voz, gestión de permisos, reportes estadísticos interactivos y una app móvil companion.

---

## 🛠️ Tecnologías Utilizadas

| Capa | Tecnologías |
|---|---|
| **Frontend Web** | React + TypeScript + Vite + Tailwind CSS + Recharts + MUI |
| **Backend** | Node.js + Express + Prisma ORM + PostgreSQL |
| **App Móvil** | React Native / Expo |
| **Autenticación** | JWT + bcryptjs |
| **Exportación** | PDF (jsPDF) y Excel (ExcelJS) |

---

## 🔑 Características Principales

- **Marcación rápida con QR dinámico + Síntesis de Voz** — Cada empleado escanea su código y recibe confirmación por voz del estado registrado.
- **Gestión de Empleados** — Registro individual o importación masiva desde Excel.
- **Permisos y Licencias** — Flujo completo de solicitud, aprobación/rechazo con carga de archivos.
- **Reportes y Análisis Estadístico** — Gráficos de barras apiladas y dona con leyendas interactivas (click para filtrar por estado: Puntual, Tardanza, Ausente, Justificado).
- **Guía Interactiva** — Tutorial paso a paso para el administrador al ingresar al sistema.
- **Keep-Alive** — Endpoint `/api/health` para prevenir *Cold Starts* en Render.

---

## ⚙️ Instalación y Ejecución

### 1. Clonar el repositorio

```bash
git clone https://github.com/Esme0123/SICAD.git
cd SICAD
```

### 2. Backend

```bash
cd backend
npm install

# Configurar variables de entorno (crear .env basado en .env.example)
# Luego ejecutar migraciones de Prisma
npx prisma generate
npx prisma db push

# Iniciar en modo desarrollo
npm run dev
```

### 3. Frontend Web

```bash
cd frontend
npm install

# Iniciar en modo desarrollo
npm run dev
```

### 4. Variables de Entorno (Backend)

Crear un archivo `backend/.env` con las siguientes variables:

```env
PORT=3000
DATABASE_URL="postgresql://usuario:password@host:5432/sicad"
JWT_SECRET="tu_secreto_jwt"
NODE_ENV=development
```

---

## 📲 App Móvil (React Native / Expo)

La aplicación móvil permite a los docentes marcar asistencia y gestionar permisos desde su dispositivo.

### Generar APK / Build de producción

```bash
cd mobile
npm install

# Build Android (APK / AAB)
npx eas build --platform android --profile production

# Build iOS (IPA)
npx eas build --platform ios --profile production
```

> **Nota:** Se requiere una cuenta en [Expo.dev](https://expo.dev) y tener configurado `eas.json` con los perfiles de build.

---

## 🌐 Endpoints Principales

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Health check (keep-alive) |
| `POST` | `/api/auth/login` | Inicio de sesión |
| `GET` | `/api/qr/:codigo` | Generar QR de empleado |
| `POST` | `/api/asistencia` | Registrar asistencia |
| `GET` | `/api/reportes/analisis` | Reportes y estadísticas |
| `GET` | `/api/usuarios` | Listado de empleados |

---

## 🚀 Despliegue en Producción

El proyecto está preparado para ser desplegado en **Render** (backend) y **Vercel** o similar (frontend web). La app móvil se distribuye mediante **Expo Application Services (EAS)**.

El endpoint `/api/health` debe configurarse como *cron job* (por ejemplo, UptimeRobot o Cron-job.org) para realizar un ping cada 5 minutos y así evitar que Render detenga el servicio por inactividad.