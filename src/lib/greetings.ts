/**
 * Greetings for the artisan dashboard, in the languages of the people Sabihand serves. They rotate every 30 seconds.
 * Time of day: morning before 12:00, afternoon until 16:00, evening after.
 * Ikwerre greeting confirmed by the team: "Meka" at any time of day.
 */
export type DayPart = "morning" | "afternoon" | "evening";

export interface Greeting {
  language: string;
  text: Record<DayPart, string>;
}

export const GREETINGS: Greeting[] = [
  { language: "English", text: { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening" } },
  { language: "Yorùbá", text: { morning: "Ẹ káàárọ̀", afternoon: "Ẹ káàsán", evening: "Ẹ kúùrọ̀lẹ́" } },
  { language: "Igbo", text: { morning: "Ụtụtụ ọma", afternoon: "Ehihie ọma", evening: "Mgbede ọma" } },
  { language: "Hausa", text: { morning: "Ina kwana", afternoon: "Ina wuni", evening: "Barka da yamma" } },
  { language: "Pidgin", text: { morning: "Good morning o", afternoon: "How far", evening: "How your day go" } },
  { language: "Ikwerre", text: { morning: "Meka", afternoon: "Meka", evening: "Meka" } },
];

export const ROTATE_MS = 30_000;

export function dayPart(hour: number): DayPart {
  if (hour < 12) return "morning";
  if (hour < 16) return "afternoon";
  return "evening";
}

/** The greeting for a moment in time: which language is on, and its words for the time of day. */
export function greetingAt(ms: number, hour: number, list: Greeting[] = GREETINGS) {
  const g = list[Math.floor(ms / ROTATE_MS) % list.length];
  return { language: g.language, text: g.text[dayPart(hour)] };
}
