import api from "./api";

export const attendanceService = {
  getTodaySummary: async () => {
    const response = await api.get("/attendance/summary");
    return response.data;
  },

  registerAttendance: async (data: { employeeCode: string; periodId: number }) => {
    const response = await api.post("/attendance/register", data);
    return response.data;
  },

  getHistory: async (filters?: Record<string, string>) => {
    const response = await api.get("/attendance/history", { params: filters });
    return response.data;
  },
};
