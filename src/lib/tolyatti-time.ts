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
 * Использует прямое вычисление через Date.UTC, исключая влияние часового пояса браузера.
 * Например: "2026-10-21", "16:00" -> "2026-10-21T12:00:00.000Z"
 */
export function tolyattiToIso(dateStr: string, timeStr: string): string {
  const cleanDate = (dateStr || "").trim();
  const cleanTime = (timeStr || "").trim();
  const dateParts = cleanDate.split("-").map((v) => parseInt(v, 10));
  const timeParts = cleanTime.split(":").map((v) => parseInt(v, 10));

  if (
    dateParts.length >= 3 &&
    timeParts.length >= 2 &&
    !isNaN(dateParts[0]) &&
    !isNaN(dateParts[1]) &&
    !isNaN(dateParts[2]) &&
    !isNaN(timeParts[0]) &&
    !isNaN(timeParts[1])
  ) {
    const year = dateParts[0];
    const month = dateParts[1] - 1;
    const day = dateParts[2];
    const hour = timeParts[0];
    const minute = timeParts[1];
    const sec = timeParts.length >= 3 && !isNaN(timeParts[2]) ? timeParts[2] : 0;
    // Тольятти = UTC+4. Следовательно, в UTC: hour - 4
    const utcMs = Date.UTC(year, month, day, hour - TOLYATTI_UTC_OFFSET_HOURS, minute, sec, 0);
    return new Date(utcMs).toISOString();
  }

  // Защитный фоллбек
  const normalizedTime = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;
  const isoWithTz = `${cleanDate}T${normalizedTime}+04:00`;
  const parsed = new Date(isoWithTz);
  if (isNaN(parsed.getTime())) {
    return new Date(`${cleanDate}T${cleanTime}:00.000Z`).toISOString();
  }
  return parsed.toISOString();
}

/**
 * Разница в часах между часовым поясом браузера пользователя и Тольятти (UTC+4).
 * Например, для Нячанга (UTC+7) вернет +3.
 * Для Москвы (UTC+3) вернет -1.
 * Для Самары/Тольятти (UTC+4) вернет 0.
 */
export function getLocalToTolyattiHourDifference(): number {
  if (typeof window === "undefined") return 0;
  try {
    const localOffsetMin = new Date().getTimezoneOffset();
    const tolyattiOffsetMin = -TOLYATTI_UTC_OFFSET_HOURS * 60; // -240
    return Math.round((tolyattiOffsetMin - localOffsetMin) / 60);
  } catch {
    return 0;
  }
}

/**
 * Человекопонятное имя локального часового пояса пользователя
 */
export function getLocalTimezoneName(): string {
  if (typeof window === "undefined") return "Местное время";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.includes("Ho_Chi_Minh") || tz.includes("Saigon") || tz.includes("Bangkok")) {
      return "Нячанг / Вьетнам (UTC+7)";
    }
    if (tz.includes("Moscow")) {
      return "Москва (UTC+3)";
    }
    if (tz.includes("Samara")) {
      return "Тольятти / Самара (UTC+4)";
    }
    return tz || "Местное время";
  } catch {
    return "Местное время";
  }
}

/**
 * Возвращает текущее время по Тольятти в виде строки "HH:mm"
 */
export function getTolyattiNowTimeString(): string {
  const d = nowInTolyatti();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Возвращает рекомендованное время для создания урока (+15 минут от текущего в Тольятти)
 */
export function getTolyattiSuggestedTime(offsetMinutes = 15): string {
  const d = nowInTolyatti();
  d.setMinutes(d.getMinutes() + offsetMinutes);
  const rem = d.getMinutes() % 5;
  if (rem !== 0) {
    d.setMinutes(d.getMinutes() + (5 - rem));
  }
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Переводит время по Тольятти ("HH:mm") в местное время устройства пользователя.
 */
export function formatLocalEquivalent(tolyattiTimeStr: string, dateStr?: string): {
  localTime: string;
  diffHours: number;
  diffLabel: string;
  isDifferent: boolean;
} {
  const diffHours = getLocalToTolyattiHourDifference();
  const isDifferent = diffHours !== 0;
  const diffLabel = diffHours > 0 ? `+${diffHours}ч` : diffHours < 0 ? `${diffHours}ч` : "совпадает";

  if (!tolyattiTimeStr || typeof window === "undefined" || !isDifferent) {
    return {
      localTime: tolyattiTimeStr,
      diffHours: 0,
      diffLabel: "совпадает",
      isDifferent: false,
    };
  }

  try {
    const baseDate = dateStr || getTolyattiTodayDateStr();
    const iso = tolyattiToIso(baseDate, tolyattiTimeStr);
    const localDate = new Date(iso);
    const lh = String(localDate.getHours()).padStart(2, "0");
    const lm = String(localDate.getMinutes()).padStart(2, "0");
    return {
      localTime: `${lh}:${lm}`,
      diffHours,
      diffLabel,
      isDifferent: true,
    };
  } catch {
    return {
      localTime: tolyattiTimeStr,
      diffHours,
      diffLabel,
      isDifferent: false,
    };
  }
}

/**
 * Проверяет, приходится ли дата на сегодняшний день по Тольятти
 */
export function isTodayInTolyatti(dateInput: Date | string | number | null | undefined): boolean {
  if (!dateInput) return false;
  const tDate = toTolyattiDate(dateInput);
  const now = nowInTolyatti();
  return (
    tDate.getFullYear() === now.getFullYear() &&
    tDate.getMonth() === now.getMonth() &&
    tDate.getDate() === now.getDate()
  );
}

/**
 * Проверяет, приходится ли дата на сегодня или будущее по Тольятти
 */
export function isTodayOrFutureInTolyatti(dateInput: Date | string | number | null | undefined): boolean {
  if (!dateInput) return false;
  const tDate = toTolyattiDate(dateInput);
  const now = nowInTolyatti();
  const dStart = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDate()).getTime();
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return dStart >= nowStart;
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
