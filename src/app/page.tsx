"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  ArrowRight,
  LogIn,
  Sparkles,
  Phone,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { normalizeRole, setAuthCookies } from "@/lib/auth-session";

export default function HomePage() {
  const router = useRouter();
  const [selectedGrade, setSelectedGrade] = useState("3 класс");
  const [currentUserRole, setCurrentUserRole] = useState<{ roleKey: string; roleTitle: string } | null>(null);

  useEffect(() => {
    // 1. Проверяем наличие сессии в cookies для мгновенного перехода в личный кабинет
    if (typeof window !== "undefined") {
      const isBypass = window.location.search.includes("logout") || window.location.search.includes("guest");
      if (!isBypass) {
        const cookies = document.cookie;
        const matchRole = cookies.match(/ayda_role=([^;]+)/);
        const matchSession = cookies.match(/ayda_session=([^;]+)/);
        if (matchRole && matchSession) {
          const r = normalizeRole(matchRole[1].trim());
          router.replace(`/${r}`);
          return;
        }
      }
    }

    // 2. Проверяем сессию через Supabase клиент
    const client = getSupabase();
    if (client) {
      const updateRole = (user: any, token?: string) => {
        if (user) {
          const rKey = normalizeRole(user.user_metadata?.role);
          setAuthCookies(rKey, user.id, token);

          if (!window.location.search.includes("logout") && !window.location.search.includes("guest")) {
            router.replace(`/${rKey}`);
            return;
          }

          setCurrentUserRole({
            roleKey: rKey,
            roleTitle:
              rKey === "parent"
                ? "кабинет Родителя"
                : rKey === "teacher"
                ? "кабинет Преподавателя"
                : rKey === "admin"
                ? "Панель управления"
                : "кабинет Ученика",
          });
        } else {
          setCurrentUserRole(null);
        }
      };

      client.auth.getSession().then(({ data }) => {
        updateRole(data?.session?.user, data?.session?.access_token);
      });

      const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
        updateRole(session?.user, session?.access_token);
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, [router]);

  // Состояние формы записи на пробный урок
  const [leadParentName, setLeadParentName] = useState("");
  const [leadChildName, setLeadChildName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [leadSubject, setLeadSubject] = useState("");
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);

  // Форматирование и маска российского номера телефона (+7 (XXX) XXX-XX-XX)
  const formatRussianPhone = (value: string): string => {
    const rawDigits = value.replace(/\D/g, "");
    if (!rawDigits) return "";

    let digits = rawDigits;
    // Если начинается с 8 или 7, отсекаем первую цифру для добавления +7
    if (digits.startsWith("8") || digits.startsWith("7")) {
      digits = digits.substring(1);
    }
    // Максимум 10 цифр после кода страны (+7)
    digits = digits.substring(0, 10);

    let formatted = "+7";
    if (digits.length > 0) {
      formatted += ` (${digits.substring(0, 3)}`;
    }
    if (digits.length >= 3) {
      formatted += `) ${digits.substring(3, 6)}`;
    }
    if (digits.length >= 6) {
      formatted += `-${digits.substring(6, 8)}`;
    }
    if (digits.length >= 8) {
      formatted += `-${digits.substring(8, 10)}`;
    }
    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const digitsOnly = val.replace(/\D/g, "");
    if (!digitsOnly || (digitsOnly === "7" && val.length <= 2)) {
      setLeadPhone("");
      setPhoneError(null);
      return;
    }

    const formatted = formatRussianPhone(val);
    setLeadPhone(formatted);

    // Если уже введено полных 11 цифр, снимаем ошибку
    const totalDigits = formatted.replace(/\D/g, "");
    if (totalDigits.length === 11) {
      setPhoneError(null);
    }
  };

  const handlePhoneBlur = () => {
    if (!leadPhone.trim()) return;
    const totalDigits = leadPhone.replace(/\D/g, "");
    if (totalDigits.length !== 11) {
      setPhoneError("Номер введён не полностью. Требуется 11 цифр: +7 (XXX) XXX-XX-XX");
    } else {
      setPhoneError(null);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadParentName.trim()) return;

    const totalDigits = leadPhone.replace(/\D/g, "");
    if (totalDigits.length !== 11) {
      setPhoneError("Пожалуйста, укажите полный номер телефона: +7 (XXX) XXX-XX-XX");
      return;
    }

    setPhoneError(null);
    setLeadSubmitting(true);
    const client = getSupabase();
    if (client) {
      try {
        await client.from("leads").insert([
          {
            parent_name: leadParentName.trim(),
            child_name: leadChildName.trim() || null,
            phone: leadPhone.trim(),
            grade: selectedGrade,
            subject: leadSubject.trim() || "Математика и логика",
            status: "NEW",
          },
        ]);
        setLeadSuccess(true);
        setLeadParentName("");
        setLeadChildName("");
        setLeadPhone("");
        setLeadSubject("");
        setPhoneError(null);
      } catch (err) {
        console.error(err);
      } finally {
        setLeadSubmitting(false);
      }
    } else {
      setLeadSuccess(true);
      setLeadSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-8 xl:gap-12 items-center">
        {/* ЛЕВАЯ КОЛОНКА: Оффер, преимущества, быстрый вход */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-2 sm:space-y-5 text-left">
          {/* Бейдж */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-[10px] sm:text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Индивидуальные онлайн-уроки с репетитором</span>
          </div>

          {/* Заголовок */}
          <h1 className="text-xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.2]">
            Онлайн-уроки с&nbsp;репетитором, <br className="hidden sm:inline" />
            <span className="text-blue-600">где всё понятно и&nbsp;удобно</span>
          </h1>

          {/* Подзаголовок */}
          <p className="text-xs sm:text-sm lg:text-base text-slate-600 leading-snug sm:leading-relaxed max-w-xl">
            Встроенная интерактивная видеосвязь прямо в браузере. Удобные личные кабинеты для ученика и родителя. Без Zoom и установки сторонних программ.
          </p>

          {/* 3 преимущества: компактные аккуратные плашки */}
          <div className="flex flex-wrap items-center gap-1.5 sm:grid sm:grid-cols-3 sm:gap-3 pt-0.5">
            <div className="px-2.5 py-1 sm:p-2.5 rounded-lg sm:rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm sm:text-base shrink-0">⏱️</span>
              <div className="min-w-0">
                <div className="font-bold text-xs text-slate-900 leading-tight">45 минут</div>
                <div className="text-[10px] text-slate-500 leading-tight hidden sm:block truncate">Урок 1 на 1</div>
              </div>
            </div>
            <div className="px-2.5 py-1 sm:p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm sm:text-base shrink-0">🎯</span>
              <div className="min-w-0">
                <div className="font-bold text-xs text-slate-900 leading-tight">Диагностика</div>
                <div className="text-[10px] text-slate-500 leading-tight hidden sm:block truncate">Выявим пробелы</div>
              </div>
            </div>
            <div className="px-2.5 py-1.5 sm:p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm sm:text-base shrink-0">💻</span>
              <div className="min-w-0">
                <div className="font-bold text-xs text-slate-900 leading-tight">В браузере</div>
                <div className="text-[10px] text-slate-500 leading-tight hidden sm:block truncate">Без лишних ПО</div>
              </div>
            </div>
          </div>

          {/* Десктопная строка действий (на телефоне кнопка входа уже есть в верхней шапке, а телефон в подвале) */}
          <div className="hidden lg:flex pt-1 items-center gap-3">
            {currentUserRole ? (
              <Link
                href={`/${currentUserRole.roleKey}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs sm:text-sm border border-blue-200 shadow-xs transition active:scale-98"
                id="hero-btn-login"
              >
                <User className="w-4 h-4 text-blue-600" />
                <span>Перейти в {currentUserRole.roleTitle}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200 shadow-xs transition active:scale-98"
                id="hero-btn-login"
              >
                <LogIn className="w-4 h-4 text-slate-600" />
                <span>Уже занимаетесь? Войти в кабинет</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5 text-slate-400" />
              </Link>
            )}
            <a
              href="tel:+79954854667"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-700 font-bold hover:text-blue-600 transition"
            >
              <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>8 995 485 46 67</span>
            </a>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Компактная форма записи на бесплатный пробный урок */}
        <div className="lg:col-span-6 xl:col-span-5" id="trial">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden relative p-3 sm:p-5 lg:p-6">
            {/* Декоративная подсветка сверху */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600" />

            <div className="mb-2 sm:mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm sm:text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                  Запишитесь на вводный урок
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500 leading-snug hidden sm:block">
                  Познакомим с репетитором, определим уровень знаний и составим трек обучения.
                </p>
              </div>
              <span className="shrink-0 text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                0 ₽ вместо 1200 ₽
              </span>
            </div>

            {leadSuccess ? (
              <div className="text-center py-5 space-y-2 bg-emerald-50/70 rounded-2xl border border-emerald-200 p-4 shadow-xs">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-emerald-950">Заявка успешно отправлена!</h3>
                <p className="text-xs text-emerald-800 max-w-sm mx-auto leading-relaxed">
                  Наш методист свяжется с вами в течение 15 минут для согласования времени занятия.
                </p>
                <button
                  onClick={() => setLeadSuccess(false)}
                  className="mt-1 inline-block text-xs font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-4 cursor-pointer"
                >
                  Отправить ещё одну заявку
                </button>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-2 sm:space-y-2.5">
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-0.5">
                      Ваше имя:
                    </label>
                    <input
                      type="text"
                      required
                      value={leadParentName}
                      onChange={(e) => setLeadParentName(e.target.value)}
                      placeholder="Имя родителя"
                      className="w-full px-2.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50/60 hover:border-slate-300 focus:bg-white text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-0.5">
                      Телефон:
                    </label>
                    <div className="relative">
                      <Phone className="w-3 h-3 text-slate-400 absolute left-2.5 top-2 sm:top-2.5" />
                      <input
                        type="tel"
                        required
                        value={leadPhone}
                        onChange={handlePhoneChange}
                        onBlur={handlePhoneBlur}
                        placeholder="+7 (999) 000-00-00"
                        className={`w-full pl-7 pr-2.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border text-xs font-medium focus:outline-none transition placeholder:text-slate-400 ${
                          phoneError
                            ? "border-rose-400 bg-rose-50/30 text-rose-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                            : "border-slate-200 bg-slate-50/60 hover:border-slate-300 focus:bg-white text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-0.5">
                      Имя ребёнка:
                    </label>
                    <input
                      type="text"
                      value={leadChildName}
                      onChange={(e) => setLeadChildName(e.target.value)}
                      placeholder="Например: Артём"
                      className="w-full px-2.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50/60 hover:border-slate-300 focus:bg-white text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-0.5">
                      Предмет и класс:
                    </label>
                    <input
                      type="text"
                      required
                      value={leadSubject}
                      onChange={(e) => setLeadSubject(e.target.value)}
                      placeholder="Математика, 3 кл."
                      className="w-full px-2.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50/60 hover:border-slate-300 focus:bg-white text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {phoneError && (
                  <p className="text-[10px] font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{phoneError}</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={leadSubmitting}
                  className="w-full py-2 sm:py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition shadow-md shadow-blue-600/25 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{leadSubmitting ? "Отправляем заявку..." : "Записаться на бесплатный пробный урок"}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </button>

                <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-400 text-center font-medium">
                  <span>🔒 152-ФЗ РФ</span>
                  <span>•</span>
                  <span>Без спама</span>
                  <span>•</span>
                  <span>Перезвоним за 15 минут</span>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
