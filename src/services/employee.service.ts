import api from "./api";

export const employeeService = {
  getAll: async () => {
    const response = await api.get("/employees");
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  },

  create: async (data: unknown) => {
    const response = await api.post("/employees", data);
    return response.data;
  },

  update: async (id: string, data: unknown) => {
    const response = await api.put(`/employees/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
  },
};
