import { useEffect, useRef } from "react";

/**
 * Re-ejecuta `refetch` cuando la ventana/pestaña recupera el foco
 * o cuando el documento vuelve a estar visible (PWA / mobile).
 *
 * Se usa un ref para que el efecto se registre una sola vez y siempre
 * invoque la última versión del callback (sin volver a suscribirse).
 */
export function useRefetchOnFocus(refetch: () => void) {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    const onFocus = () => refetchRef.current();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetchRef.current();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
}
