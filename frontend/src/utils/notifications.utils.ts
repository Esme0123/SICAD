const API = import.meta.env.VITE_API_URL;

function getToken(): string | null {
  return localStorage.getItem("sicad_emp_token");
}

export const enviarNotificacionSistema = async (titulo: string, cuerpo: string) => {
  if ('serviceWorker' in navigator && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification(titulo, {
        body: cuerpo,
        icon: '/sicad-icon-192.svg',
      });
    }
  }
};

export const checkAndRequestNotifications = async () => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') return;
  if (Notification.permission === 'denied') return;
  if (Notification.permission === 'default') {
    const hasPromptedThisSession = sessionStorage.getItem('notifications_prompted');
    if (!hasPromptedThisSession) {
      sessionStorage.setItem('notifications_prompted', 'true');
      try {
        await Notification.requestPermission();
      } catch (error) {
        console.error('Error al solicitar permiso:', error);
      }
    }
  }
};

export const solicitarPermisoNotificaciones = async (): Promise<boolean> => {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    suscribirPush().catch(() => {});
  }
  return permission === "granted";
};

async function suscribirPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const registration = await navigator.serviceWorker.ready;

  const publicKey = await fetchPublicKey();
  if (!publicKey) return;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const token = getToken();
  if (!token) return;

  await fetch(`${API}/notificaciones/suscripcion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
    }),
  });
}

async function fetchPublicKey(): Promise<string | null> {
  try {
    const token = getToken();
    const res = await fetch(`${API}/notificaciones/vapid-public-key`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await res.json();
    return json.ok ? json.publicKey : null;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
