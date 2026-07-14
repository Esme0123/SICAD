import api from "./api";

export interface QRTokenResponse {
  ok: boolean;
  token: string;
  expiresAt: number;      // Unix timestamp en segundos
  expiresAtISO: string;
}

/**
 * Genera un token QR temporal firmado desde el backend.
 * GET /api/qr/generate
 */
export async function generateQRToken(): Promise<QRTokenResponse> {
  const { data } = await api.get<QRTokenResponse>("/qr/generate");
  if (!data.ok) {
    throw new Error("Error al generar el token QR");
  }
  return data;
}

export default { generateQRToken };
