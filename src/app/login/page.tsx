"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  User,
  GraduationCap,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LogIn,
  Sparkles,
  Phone,
  ShieldCheck,
  Check,
  Star,
  BookOpen,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [selectedRole, setSelectedRole] = useState<"student" | "parent" | "teacher">("student");
  const [selectedGrade, setSelectedGrade] = useState("3 класс");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    const qMode = searchParams.get("mode");
    if (qMode === "signup") {
      setMode("signup");
    }
  }, [searchParams]);

  useEffect(() => {
    setPassword("");
    setEmail("");
    setFullName("");
    setPhone("");
    setPhoneError(null);
    setMessage(null);
  }, [mode]);

  // Маска российского телефона
  const formatRussianPhone = (value: string): string => {
    const rawDigits = value.replace(/\D/g, "");
    if (!rawDigits) return "";

    let digits = rawDigits;
    if (digits.startsWith("8") || digits.startsWith("7")) {
      digits = digits.substring(1);
    }
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
      setPhone("");
      setPhoneError(null);
      return;
    }
    const formatted = formatRussianPhone(val);
    setPhone(formatted);
    if (formatted.replace(/\D/g, "").length === 11) {
      setPhoneError(null);
    }
  };

  const handlePhoneBlur = () => {
    if (!phone.trim()) return;
    if (phone.replace(/\D/g, "").length !== 11) {
      setPhoneError("Номер введён не полностью. Требуется 11 цифр (+7 XXX XXX-XX-XX)");
    } else {
      setPhoneError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setMessage({ type: "error", text: "Пожалуйста, введите e-mail и пароль." });
      return;
    }

    if (mode === "signup") {
      if (!fullName.trim()) {
        setMessage({ type: "error", text: "Пожалуйста, укажите ваше имя." });
        return;
      }
      if (phone.trim()) {
        const d = phone.replace(/\D/g, "");
        if (d.length !== 11) {
          setPhoneError("Номер введён не полностью (+7 XXX XXX-XX-XX)");
          return;
        }
      }
      if (!agreeTerms) {
        setMessage({ type: "error", text: "Необходимо согласиться с правилами сервиса." });
        return;
      }
    }

    setLoading(true);
    setMessage(null);

    const client = getSupabase();

    if (mode === "signin") {
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            setMessage({
              type: "error",
              text: "Неверный e-mail или пароль. Если у вас ещё нет аккаунта, перейдите на вкладку «Регистрация».",
            });
          } else {
            setMessage({ type: "error", text: error.message });
          }
          setLoading(false);
          return;
        }

        let userRole = (data.user?.user_metadata?.role || "").toLowerCase();
        if (!userRole || userRole === "authenticated") {
          try {
            const { data: prof } = await client
              .from("profiles")
              .select("role")
              .eq("id", data.user.id)
              .maybeSingle();
            if (prof?.role) userRole = prof.role.toLowerCase();
          } catch (e) {}
        }
        if (!userRole) userRole = "student";

        setMessage({
          type: "success",
          text: "Вход выполнен успешно! Перенаправляем в личный кабинет...",
        });
        setTimeout(() => {
          router.push(`/${userRole}`);
        }, 500);
      } catch (err: any) {
        setMessage({
          type: "error",
          text: err?.message || "Ошибка подключения к серверу авторизации.",
        });
        setLoading(false);
      }
    } else {
      try {
        const roleStr = selectedRole;
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              role: roleStr,
              full_name: fullName.trim(),
              phone: phone.trim() || null,
              grade: selectedRole === "student" ? selectedGrade : null,
            },
          },
        });

        if (error) {
          if (error.message.includes("User already registered")) {
            setMessage({
              type: "error",
              text: "Пользователь с таким e-mail уже зарегистрирован. Переключитесь на вкладку «Вход».",
            });
          } else {
            setMessage({ type: "error", text: error.message });
          }
          setLoading(false);
          return;
        }

        if (data.user) {
          try {
            await client.from("profiles").upsert([
              {
                id: data.user.id,
                email: email.trim(),
                name: fullName.trim(),
                role: roleStr.toUpperCase(),
                bio: roleStr === "student" ? selectedGrade : roleStr === "parent" ? "Родитель" : "Преподаватель",
                avatar_url:
                  roleStr === "student"
                    ? "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces"
                    : roleStr === "parent"
                    ? "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces"
                    : "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=200&h=200&fit=crop&crop=faces",
              },
            ]);
          } catch (profileErr) {
            console.error("Profile upsert error:", profileErr);
          }
        }

        if (data.session) {
          setMessage({
            type: "success",
            text: "Регистрация успешна! Входим в ваш личный кабинет...",
          });
          setTimeout(() => {
            router.push(`/${roleStr}`);
          }, 600);
        } else {
          setMessage({
            type: "success",
            text: "Аккаунт успешно создан! Теперь вы можете войти со своим логином и паролем.",
          });
          setMode("signin");
        }
      } catch (err: any) {
        setMessage({
          type: "error",
          text: err?.message || "Ошибка при регистрации.",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const gradesList = [
    "Дошкольник",
    "1 класс",
    "2 класс",
    "3 класс",
    "4 класс",
    "5 класс",
    "6 класс",
    "7 класс",
    "8 класс",
    "9 класс",
    "10–11 классы",
  ];

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-8 px-4 sm:px-6">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* ЛЕВАЯ КОЛОНКА В СТИЛЕ ФОКСФОРДА: Промо и преимущества */}
        <div className="lg:col-span-5 space-y-6 hidden lg:block">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Онлайн-школа «АйДаУмничка»</span>
          </div>

          <h2 className="text-3xl font-extrabold text-slate-900 leading-tight">
            Учитесь с удовольствием и достигайте высоких результатов
          </h2>

          <p className="text-sm text-slate-600 leading-relaxed">
            Присоединяйтесь к тысячам учеников и родителей. Индивидуальные уроки, интерактивная онлайн-комната и контроль прогресса в одном месте.
          </p>

          <div className="space-y-4 pt-2">
            {[
              {
                icon: "💻",
                title: "Видеокласс прямо в браузере",
                desc: "Без Zoom и лишних программ. Интерактивная доска, камера и звук.",
              },
              {
                icon: "📊",
                title: "Отчёты для родителей",
                desc: "Полная картина успехов ребёнка и комментарии репетитора после каждого урока.",
              },
              {
                icon: "⭐",
                title: "Мотивация и награды",
                desc: "Игровая геймификация с баллами и звёздами за каждое выполненное задание.",
              },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-2xl">{feature.icon}</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{feature.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2 text-xs font-semibold text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Безопасная платформа, проверенные репетиторы РФ</span>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Фоксфорд форма авторизации и регистрации */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl p-6 sm:p-9 shadow-xl border border-slate-200/90 max-w-lg mx-auto">
            {/* Переключатель Вход / Регистрация в стиле Foxford */}
            <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-1 mb-6">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                  mode === "signin"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Вход</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                  mode === "signup"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Регистрация</span>
              </button>
            </div>

            {/* Сообщения об ошибках / успехах */}
            {message && (
              <div
                className={`mb-5 p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              {/* РЕГИСТРАЦИЯ: ВЫБОР РОЛИ В СТИЛЕ ФОКСФОРДА (3 КАРТОЧКИ) */}
              {mode === "signup" && (
                <div className="space-y-3 mb-4">
                  <label className="block text-xs font-bold text-slate-700">
                    Кто будет пользоваться аккаунтом?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        id: "student" as const,
                        title: "Ученик",
                        desc: "1–11 класс",
                        icon: User,
                        color: "emerald",
                      },
                      {
                        id: "parent" as const,
                        title: "Родитель",
                        desc: "Контроль и оплата",
                        icon: Users,
                        color: "amber",
                      },
                      {
                        id: "teacher" as const,
                        title: "Учитель",
                        desc: "Преподаватель",
                        icon: GraduationCap,
                        color: "blue",
                      },
                    ].map((role) => {
                      const Icon = role.icon;
                      const isSelected = selectedRole === role.id;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setSelectedRole(role.id)}
                          className={`p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-between min-h-[90px] ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20 shadow-xs"
                              : "border-slate-200 bg-slate-50/60 hover:bg-slate-50 text-slate-600"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
                              isSelected ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900 leading-tight">
                              {role.title}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                              {role.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Если выбран ученик: выбор класса как в Фоксфорде */}
                  {selectedRole === "student" && (
                    <div className="pt-2 animate-in fade-in duration-150">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        В каком классе учится ребёнок:
                      </label>
                      <select
                        value={selectedGrade}
                        onChange={(e) => setSelectedGrade(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition cursor-pointer"
                      >
                        {gradesList.map((g, idx) => (
                          <option key={idx} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* ПОЛЯ ДЛЯ РЕГИСТРАЦИИ: Имя и Телефон */}
              {mode === "signup" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {selectedRole === "parent" ? "Ваше имя (родитель):" : "Ваше имя и фамилия:"}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Например: Анна Смирнова"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Номер телефона:
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={handlePhoneChange}
                        onBlur={handlePhoneBlur}
                        placeholder="+7 (999) 000-00-00"
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none transition placeholder:text-slate-400 ${
                          phoneError
                            ? "border-rose-400 bg-rose-50/30 text-rose-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                            : "border-slate-200 bg-white text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                </>
              )}

              {/* ПОЛЯ: Email и Пароль */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Электронная почта (Email):
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    name="user_email"
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@mail.ru"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Пароль:
                  </label>
                  {mode === "signin" && (
                    <span className="text-[11px] text-blue-600 hover:underline cursor-pointer">
                      Забыли пароль?
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    name="user_password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Чекбоксы согласия и запомнить меня */}
              {mode === "signup" ? (
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mt-0.5 shrink-0"
                    />
                    <span className="text-xs text-slate-500 leading-snug">
                      Я согласен с{" "}
                      <span className="text-blue-600 underline">условиями оферты</span> и даю согласие на обработку персональных данных
                    </span>
                  </label>
                </div>
              ) : (
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-xs text-slate-600">Запомнить меня на этом устройстве</span>
                  </label>
                </div>
              )}

              {/* Кнопка отправки формы */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
              >
                {loading ? (
                  <span>Выполняется запрос...</span>
                ) : mode === "signin" ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Войти в личный кабинет</span>
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Зарегистрироваться бесплатно</span>
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </>
                )}
              </button>
            </form>

            {/* Быстрое переключение */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500 space-y-3">
              {mode === "signin" ? (
                <div>
                  Ещё нет аккаунта?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="font-bold text-blue-600 hover:text-blue-700 underline underline-offset-2 ml-1 cursor-pointer"
                  >
                    Зарегистрироваться бесплатно →
                  </button>
                </div>
              ) : (
                <div>
                  Уже зарегистрированы?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="font-bold text-blue-600 hover:text-blue-700 underline underline-offset-2 ml-1 cursor-pointer"
                  >
                    Войти в аккаунт →
                  </button>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Управление школой:</span>
                <Link
                  href="/admin"
                  className="font-bold text-slate-700 hover:text-blue-600 underline underline-offset-2 ml-1 transition"
                >
                  Вход для администратора →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Загрузка формы...</div>}>
      <LoginForm />
    </Suspense>
  );
}
