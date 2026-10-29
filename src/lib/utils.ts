import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TIMEZONE_TOLYATTI = "Europe/Samara";

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("ru-RU", {
      timeZone: TIMEZONE_TOLYATTI,
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export function formatTimeTolyatti(dateOrIso: Date | string): string {
  try {
    const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
    return d.toLocaleTimeString("ru-RU", {
      timeZone: TIMEZONE_TOLYATTI,
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function formatDateTolyatti(dateOrIso: Date | string, options?: Intl.DateTimeFormatOptions): string {
  try {
    const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
    return d.toLocaleDateString("ru-RU", {
      timeZone: TIMEZONE_TOLYATTI,
      ...options,
    });
  } catch {
    return "";
  }
}

export function getTolyattiParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_TOLYATTI,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hours: get('hour') % 24,
    minutes: get('minute'),
  };
}

export function getTolyattiDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_TOLYATTI,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function formatLastSeenTolyatti(dateOrIso?: string | Date | null): string {
  if (!dateOrIso) return 'Не в сети';
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) return 'Не в сети';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 0 || diffMs < 90_000) {
    return 'В сети';
  }
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) {
    return `Был(а) ${mins} мин. назад`;
  }

  const timeStr = formatTimeTolyatti(d);
  const targetDateStr = getTolyattiDateString(d);
  const todayDateStr = getTolyattiDateString(now);

  if (targetDateStr === todayDateStr) {
    return `Был(а) сегодня в ${timeStr}`;
  }

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayDateStr = getTolyattiDateString(yesterday);
  if (targetDateStr === yesterdayDateStr) {
    return `Был(а) вчера в ${timeStr}`;
  }

  const dayMonth = formatDateTolyatti(d, {
    day: 'numeric',
    month: 'short',
  });
  return `Был(а) ${dayMonth} в ${timeStr}`;
}

export function formatMsgFullTime(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const targetDateStr = getTolyattiDateString(d);
    const todayDateStr = getTolyattiDateString(now);
    const time = formatTimeTolyatti(d);

    if (targetDateStr === todayDateStr) {
      return time;
    }

    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayDateStr = getTolyattiDateString(yesterday);
    if (targetDateStr === yesterdayDateStr) {
      return `вчера в ${time}`;
    }

    const partsTarget = getTolyattiParts(d);
    const partsNow = getTolyattiParts(now);

    if (partsTarget.year === partsNow.year) {
      const dayMonth = formatDateTolyatti(d, { day: 'numeric', month: 'short' }).replace('.', '');
      return `${dayMonth} в ${time}`;
    } else {
      const fullDate = formatDateTolyatti(d, { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
      return `${fullDate} в ${time}`;
    }
  } catch {
    return '';
  }
}

export function getMsgDateSeparator(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const targetDateStr = getTolyattiDateString(d);
    const todayDateStr = getTolyattiDateString(now);

    if (targetDateStr === todayDateStr) {
      return 'Сегодня';
    }

    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayDateStr = getTolyattiDateString(yesterday);
    if (targetDateStr === yesterdayDateStr) {
      return 'Вчера';
    }

    const partsTarget = getTolyattiParts(d);
    const partsNow = getTolyattiParts(now);

    if (partsTarget.year === partsNow.year) {
      return formatDateTolyatti(d, { day: 'numeric', month: 'long' });
    } else {
      return formatDateTolyatti(d, { day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch {
    return '';
  }
}
