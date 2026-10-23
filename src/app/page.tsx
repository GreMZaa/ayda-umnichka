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
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* 1. HERO СЕКЦИЯ */}
      <section className="pt-4 sm:pt-12 text-center max-w-4xl mx-auto space-y-5 sm:space-y-6">
        <h1 className="text-2xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.2]">
          Онлайн-уроки с&nbsp;репетитором, <br className="hidden sm:inline" />
          <span className="text-blue-600">где всё понятно и&nbsp;удобно</span>
        </h1>

        <p className="text-sm sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Встроенная видеосвязь прямо в браузере. Личные кабинеты для ученика и родителя. Без установки сторонних программ.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a
            href="#trial"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 sm:px-8 sm:py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-600/25 transition transform hover:-translate-y-0.5 active:scale-98 min-h-[48px]"
          >
            <Sparkles className="w-5 h-5" />
            <span>Записаться на пробный урок</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </a>

          {currentUserRole ? (
            <Link
              href={`/${currentUserRole.roleKey}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:px-7 sm:py-4 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-sm sm:text-base border border-blue-200 shadow-xs transition active:scale-98 min-h-[48px]"
              id="hero-btn-login"
            >
              <User className="w-5 h-5 text-blue-600" />
              <span>Перейти в {currentUserRole.roleTitle}</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:px-7 sm:py-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm sm:text-base border border-slate-200 shadow-xs transition active:scale-98 min-h-[48px]"
              id="hero-btn-login"
            >
              <LogIn className="w-5 h-5" />
              <span>Войти в личный кабинет</span>
            </Link>
          )}
        </div>
      </section>

      {/* 2. ФОРМА ЗАПИСИ НА БЕСПЛАТНЫЙ ПРОБНЫЙ УРОК */}
      <section id="trial" className="max-w-4xl mx-auto scroll-mt-28 sm:scroll-mt-32">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden relative p-4 sm:p-8 lg:p-10">
          {/* Декоративная подсветка сверху */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600" />

          {/* Заголовок по центру */}
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-8">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Бесплатное первое занятие</span>
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Запишитесь на вводный онлайн-урок
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Познакомим ребенка с репетитором, определим уровень знаний и составим персональный трек обучения.
            </p>
          </div>

          {/* 3 преимущества в ряд */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto mb-8">
            {[
              { icon: "⏱️", title: "45 минут", desc: "Полноценный индивидуальный урок" },
              { icon: "🎯", title: "Диагностика знаний", desc: "Выявим пробелы и составим трек" },
              { icon: "💻", title: "Прямо в браузере", desc: "Без Zoom и установки программ" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3 text-left transition hover:bg-slate-100/70"
              >
                <span className="text-2xl shrink-0">{item.icon}</span>
                <div>
                  <div className="font-bold text-xs text-slate-900">{item.title}</div>
                  <div className="text-[11px] text-slate-500 leading-snug">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Форма записи */}
          <div className="max-w-2xl mx-auto">
            {leadSuccess ? (
              <div className="text-center py-10 space-y-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 p-8 shadow-xs">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-xl text-emerald-950">Заявка успешно отправлена!</h3>
                <p className="text-xs sm:text-sm text-emerald-800 max-w-md mx-auto leading-relaxed">
                  Наш методист свяжется с вами в течение 15 минут, чтобы согласовать удобный день и время для бесплатного занятия.
                </p>
                <button
                  onClick={() => setLeadSuccess(false)}
                  className="mt-3 inline-block text-xs font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-4 cursor-pointer"
                >
                  Отправить ещё одну заявку
                </button>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="bg-slate-50/60 p-4 sm:p-7 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ваше имя (родитель):
                    </label>
                    <input
                      type="text"
                      required
                      value={leadParentName}
                      onChange={(e) => setLeadParentName(e.target.value)}
                      placeholder="Например: Елена"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:bg-white text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Имя ребёнка (необязательно):
                    </label>
                    <input
                      type="text"
                      value={leadChildName}
                      onChange={(e) => setLeadChildName(e.target.value)}
                      placeholder="Например: Артём"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:bg-white text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Телефон для связи:
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        required
                        value={leadPhone}
                        onChange={handlePhoneChange}
                        onBlur={handlePhoneBlur}
                        placeholder="+7 (999) 000-00-00"
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none transition placeholder:text-slate-400 shadow-xs ${
                          phoneError
                            ? "border-rose-400 bg-rose-50/30 text-rose-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                            : "border-slate-200 bg-white hover:border-slate-300 focus:bg-white text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        }`}
                      />
                    </div>
                    {phoneError && (
                      <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{phoneError}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Интересующий предмет:
                    </label>
                    <input
                      type="text"
                      required
                      value={leadSubject}
                      onChange={(e) => setLeadSubject(e.target.value)}
                      placeholder="Например: Математика, 3 класс"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:bg-white text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 shadow-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={leadSubmitting}
                  className="w-full mt-2 py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{leadSubmitting ? "Отправляем заявку..." : "Записаться на бесплатный пробный урок"}</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </button>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-400 text-center pt-1 font-medium">
                  <span>🔒 152-ФЗ РФ</span>
                  <span>•</span>
                  <span>Без спама</span>
                  <span>•</span>
                  <span>Свяжемся в течение 15 минут</span>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
