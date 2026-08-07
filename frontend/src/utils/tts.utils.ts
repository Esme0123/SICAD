export function anunciarAsistencia(nombreEmpleado: string, accion?: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  let frase: string;
  if (accion === 'ENTRADA') {
    frase = `Entrada registrada, ${nombreEmpleado}`;
  } else if (accion === 'SALIDA') {
    frase = `Salida registrada, ${nombreEmpleado}`;
  } else {
    frase = `Asistencia registrada para ${nombreEmpleado}`;
  }
  const mensaje = new SpeechSynthesisUtterance(frase);
  mensaje.lang = 'es-ES';
  mensaje.rate = 0.9;
  window.speechSynthesis.speak(mensaje);
}
