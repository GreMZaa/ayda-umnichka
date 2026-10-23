/**
 * Конфигурация адресов проекта (лендинг и личный кабинет)
 */

export const LK_DEFAULT_URL = "https://lk-ayda-umnichka.vercel.app";
export const MAIN_SITE_DEFAULT_URL = "https://ayda-umnichka.vercel.app";

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
