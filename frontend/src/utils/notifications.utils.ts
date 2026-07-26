export const enviarNotificacionSistema = (titulo: string, cuerpo: string) => {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(titulo, {
      body: cuerpo,
      icon: "/icon-192x192.png",
    });
  }
};

export const solicitarPermisoNotificaciones = async (): Promise<boolean> => {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
};
