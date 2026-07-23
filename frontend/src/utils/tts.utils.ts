export function anunciarAsistencia(nombreEmpleado: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const mensaje = new SpeechSynthesisUtterance(`Asistencia registrada. Bienvenida ${nombreEmpleado}`);
  mensaje.lang = 'es-ES';
  mensaje.rate = 0.9;
  window.speechSynthesis.speak(mensaje);
}
