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

export const solicitarPermisoNotificaciones = async (): Promise<boolean> => {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
};
