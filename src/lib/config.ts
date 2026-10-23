/**
 * Конфигурация адресов проекта (лендинг и личный кабинет)
 */

export const LK_DEFAULT_URL = "https://lk-ayda-umnichka.vercel.app";
export const MAIN_SITE_DEFAULT_URL = "https://ayda-umnichka.vercel.app";

/**
 * Получить URL для перехода на основной сайт (лендинг).
 * Если сайт открыт на поддомене личного кабинета (lk-* или lk.*),
 * возвращает абсолютный URL на основной домен.
 */
export function getMainSiteUrl(path: string = "/"): string {
  const customMain = process.env.NEXT_PUBLIC_MAIN_SITE_URL;
  if (customMain) {
    const cleanBase = customMain.replace(/\/+$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.startsWith("lk-") || host.startsWith("lk.")) {
      const cleanPath = path.startsWith("/") ? path : `/${path}`;
      return `${MAIN_SITE_DEFAULT_URL}${cleanPath}`;
    }
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return cleanPath;
}

/**
 * Получить URL для перехода в личный кабинет.
 * В локальной разработке (localhost) возвращает относительный путь,
 * а в рабочей среде или при наличии NEXT_PUBLIC_LK_URL направляет на отдельный Vercel-адрес.
 */
export function getLkUrl(path: string = "/login"): string {
  const customLk = process.env.NEXT_PUBLIC_LK_URL;
  if (customLk) {
    const cleanBase = customLk.replace(/\/+$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  }

  // Если сайт открыт локально на localhost и переменная не переопределена, остаёмся внутри локального сервера
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return path.startsWith("/") ? path : `/${path}`;
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${LK_DEFAULT_URL}${cleanPath}`;
}
