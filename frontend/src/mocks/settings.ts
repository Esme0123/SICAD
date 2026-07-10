export interface SystemSettings {
  toleranceTime: number; // minutos
  qrDuration: number;    // segundos
  openingHour: string;   // HH:MM
  closingHour: string;   // HH:MM
  exportFormat: "PDF" | "Excel" | "CSV";
  institutionName: string;
}

export const MOCK_SYSTEM_SETTINGS: SystemSettings = {
  toleranceTime: 10,
  qrDuration: 15,
  openingHour: "07:00",
  closingHour: "22:00",
  exportFormat: "PDF",
  institutionName: "Universidad Católica Boliviana San Pablo",
};
