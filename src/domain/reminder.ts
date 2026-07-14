import { calculateReminderTime } from "./time";

export function reminderSchedule(eventTimeUtc: string, reminderMinutes: number[]): Array<{ reminderMinutes: number; scheduledForUtc: string }> {
  return reminderMinutes.map((minutes) => ({ reminderMinutes: minutes, scheduledForUtc: calculateReminderTime(eventTimeUtc, minutes) }));
}
