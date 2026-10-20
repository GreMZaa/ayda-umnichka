import { format as dateFnsFormat } from "date-fns";
import { ru } from "date-fns/locale";

/**
 * Часовой пояс Тольятти (Самарская область)
 * IANA: Europe/Samara (UTC+4, круглогодично без перехода на зимнее/летнее время)
 */
export const TOLYATTI_TIMEZONE = "Europe/Samara";
export const TOLYATTI_UTC_OFFSET_HOURS = 4;
export const TOLYATTI_TZ_LABEL = "Тольятти (UTC+4)";
export const TOLYATTI_TZ_SHORT = "ТЛТ (UTC+4)";

/**
 * Преобразует любую дату (ISO строку, Date, timestamp) в объект Date,
 * локальные методы которого (getHours, getDate, getMonth, getFullYear, getDay)
 * соответствуют точному настенному времени в Тольятти (UTC+4).
 */
export function toTolyattiDate(dateInput?: Date | string | number | null): Date {
  if (!dateInput) {
    return nowInTolyatti();
  }

  const d = typeof dateInput === "string" || typeof dateInput === "number"
    ? new Date(dateInput)
    : dateInput;

  if (isNaN(d.getTime())) {
    return nowInTolyatti();
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: TOLYATTI_TIMEZONE,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const map: Record<string, string> = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }

    let hour = parseInt(map.hour, 10);
    if (hour === 24) hour = 0;

    return new Date(
      parseInt(map.year, 10),
      parseInt(map.month, 10) - 1,
      parseInt(map.day, 10),
      hour,
      parseInt(map.minute, 10),
      parseInt(map.second, 10)
    );
  } catch (err) {
    // Безопасный фоллбек для сред без Intl: смещение UTC+4
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
    return new Date(utcMs + TOLYATTI_UTC_OFFSET_HOURS * 3600000);
  }
}

/**
 * Возвращает текущее время по Тольятти (UTC+4)
 */
export function nowInTolyatti(): Date {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: TOLYATTI_TIMEZONE,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const map: Record<string, string> = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }

    let hour = parseInt(map.hour, 10);
    if (hour === 24) hour = 0;

    return new Date(
      parseInt(map.year, 10),
      parseInt(map.month, 10) - 1,
      parseInt(map.day, 10),
      hour,
      parseInt(map.minute, 10),
      parseInt(map.second, 10)
    );
  } catch {
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utcMs + TOLYATTI_UTC_OFFSET_HOURS * 3600000);
  }
}

/**
 * Форматирует дату по часовому поясу Тольятти (UTC+4) с русской локалью по умолчанию
 */
export function formatTolyatti(
  dateInput: Date | string | number | null | undefined,
  formatStr: string,
  options?: { locale?: any }
): string {
  if (!dateInput) return "";
  const tDate = toTolyattiDate(dateInput);
  return dateFnsFormat(tDate, formatStr, { locale: ru, ...options });
}

/**
 * Конвертирует выбранную пользователем дату (YYYY-MM-DD) и время (HH:mm)
 * в часовом поясе Тольятти в точный UTC ISO-string для сохранения в БД.
 * Например: "2026-10-21", "16:00" -> "2026-10-21T12:00:00.000Z"
 */
export function tolyattiToIso(dateStr: string, timeStr: string): string {
  const cleanDate = dateStr.trim();
  const cleanTime = timeStr.trim();
  // Гарантируем формат HH:mm:00
  const normalizedTime = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;
  const isoWithTz = `${cleanDate}T${normalizedTime}+04:00`;
  const parsed = new Date(isoWithTz);
  if (isNaN(parsed.getTime())) {
    return new Date(`${cleanDate}T${cleanTime}:00.000Z`).toISOString();
  }
  return parsed.toISOString();
}

/**
 * Возвращает дату в Тольятти со смещением в днях в формате "YYYY-MM-DD"
 */
export function getTolyattiDateStr(offsetDays = 0): string {
  const t = nowInTolyatti();
  if (offsetDays !== 0) {
    t.setDate(t.getDate() + offsetDays);
  }
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Возвращает сегодняшнюю дату по Тольятти "YYYY-MM-DD"
 */
export function getTolyattiTodayDateStr(): string {
  return getTolyattiDateStr(0);
}

/**
 * Возвращает завтрашнюю дату по Тольятти "YYYY-MM-DD"
 */
export function getTolyattiTomorrowDateStr(): string {
  return getTolyattiDateStr(1);
}
