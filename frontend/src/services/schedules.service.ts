import { Schedule, MOCK_SCHEDULES } from "@/mocks/schedules";

const STORAGE_KEY = "sicad_schedules";

function getStoredSchedules(): Schedule[] {
  if (typeof window === "undefined") return MOCK_SCHEDULES;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_SCHEDULES));
    return MOCK_SCHEDULES;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return MOCK_SCHEDULES;
  }
}

function saveSchedules(schedules: Schedule[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  }
}

export async function getSchedules(): Promise<Schedule[]> {
  return getStoredSchedules();
}

export async function createSchedule(schedule: Schedule): Promise<Schedule> {
  const schedules = getStoredSchedules();
  schedules.push(schedule);
  saveSchedules(schedules);
  return schedule;
}

export async function updateSchedule(id: string, updatedData: Partial<Schedule>): Promise<Schedule> {
  const schedules = getStoredSchedules();
  const idx = schedules.findIndex((s) => s.id === id);
  if (idx === -1) {
    throw new Error("Horario no encontrado");
  }
  const updated = { ...schedules[idx], ...updatedData };
  schedules[idx] = updated;
  saveSchedules(schedules);
  return updated;
}

export async function deleteSchedule(id: string): Promise<void> {
  const schedules = getStoredSchedules();
  const filtered = schedules.filter((s) => s.id !== id);
  saveSchedules(filtered);
}

export default {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
};
