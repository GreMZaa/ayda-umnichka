"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import VideoRoom from "@/components/VideoRoom";
import { fetchWithAuth } from "@/lib/api-client";
import { Lock, Clock, ArrowLeft, Loader2 } from "lucide-react";
import { formatTolyatti } from "@/lib/tolyatti-time";

export default function RoomPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<"TEACHER" | "STUDENT" | "PARENT">("TEACHER");
  const [userName, setUserName] = useState<string>("");
  const [bypassedExpired, setBypassedExpired] = useState(false);
  const [extending, setExtending] = useState(false);

  useEffect(() => {
    // 1. Определение текущей роли и профиля
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const roleFromQuery = urlParams.get("role")?.toLowerCase();
      const activeRole = localStorage.getItem("ayda_active_role")?.toLowerCase();

      let profileRole: string | null = null;
      const savedUser =
        localStorage.getItem("ayda_current_user_profile") || localStorage.getItem("ayda_user");
      if (savedUser) {
        try {
          const u = JSON.parse(savedUser);
          if (u.name) setUserName(u.name);
          if (u.role) profileRole = String(u.role).toLowerCase();
        } catch (e) {}
      }

      const referrer = typeof document !== "undefined" ? document.referrer.toLowerCase() : "";

      if (roleFromQuery === "student" || activeRole === "student" || profileRole === "student" || referrer.includes("/student")) {
        setCurrentRole("STUDENT");
      } else if (roleFromQuery === "parent" || activeRole === "parent" || profileRole === "parent" || referrer.includes("/parent")) {
        setCurrentRole("PARENT");
      } else if (roleFromQuery === "teacher" || activeRole === "teacher" || profileRole === "teacher" || referrer.includes("/teacher")) {
        setCurrentRole("TEACHER");
      } else {
        // На мобильных устройствах по умолчанию вход ученика (ссылку открыл ребенок по приглашению)
        const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
        setCurrentRole(isMobile ? "STUDENT" : "TEACHER");
      }
    } catch (e) {}

    // 2. Загрузка данных урока по его ID или room_name с гарантированным таймаутом
    let isMounted = true;
    const fallbackLesson = {
      id: params.id,
      title: "Индивидуальный онлайн-урок: Математика и логика",
      subjectName: "Математика и логика",
      subjectColor: "#2563eb",
      teacherName: "Анна Сергеевна Иванова",
      studentName: "Ученик",
      roomName: params.id,
      status: "IN_PROGRESS",
    };

    const timer = setTimeout(() => {
      if (isMounted) {
        setLesson((prev: any) => prev || fallbackLesson);
        setLoading(false);
      }
    }, 1500);

    fetchWithAuth(`/api/lessons/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Урок не найден в базе данных");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          clearTimeout(timer);
          setLesson(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn("Фоллбэк для тестового класса:", err);
        if (isMounted) {
          clearTimeout(timer);
          setLesson(fallbackLesson);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [params.id]);

  const handleEndLesson = async () => {
    const targetId = lesson?.id || params.id;
    if (targetId) {
      try {
        await fetchWithAuth(`/api/lessons/${targetId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "COMPLETED" }),
        });
      } catch (e) {
        console.error("Ошибка обновления статуса урока:", e);
      }
    }

    if (currentRole === "TEACHER") {
      router.push("/teacher");
    } else if (currentRole === "PARENT") {
      router.push("/parent");
    } else {
      router.push("/student");
    }
  };

  const isLessonExpired = () => {
    if (!lesson) return false;
    if (lesson.id === "umnichka-test-room" || lesson.id === "test-room") return false;
    if (lesson.status === "COMPLETED") return true;
    if (lesson.endTime) {
      const endMs = new Date(lesson.endTime).getTime();
      return endMs < Date.now();
    }
    return false;
  };

  const handleExtendAndEnter = async () => {
    const targetId = lesson?.id || params.id;
    try {
      setExtending(true);
      const res = await fetchWithAuth(`/api/lessons/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extendMinutes: 30 }),
      });
      if (res.ok) {
        const data = await res.json();
        setLesson((prev: any) => ({
          ...prev,
          endTime: data.endTime || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          status: "LIVE",
        }));
        setBypassedExpired(true);
      } else {
        alert("Не удалось продлить урок. Попробуйте еще раз.");
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка при продлении урока.");
    } finally {
      setExtending(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-base font-extrabold text-slate-900">Вход в онлайн-класс...</h3>
          <p className="text-xs text-slate-500">
            Подключаем интерактивную доску и видеоканал для урока <strong>{params.id}</strong>
          </p>
          <button
            type="button"
            onClick={() => setLoading(false)}
            className="mt-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            Войти прямо сейчас
          </button>
        </div>
      </div>
    );
  }

  // Экран закрытой комнаты, если время урока прошло
  if (isLessonExpired() && !bypassedExpired) {
    if (currentRole === "TEACHER") {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Время урока истекло
              </span>
              <h2 className="text-xl font-black text-slate-900">
                Занятие подошло к концу
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Запланированное время урока завершилось. Комната сейчас закрыта для ученика и родителей, но вы можете продлить занятие ещё на 30 минут.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1">
              <div className="text-xs font-bold text-slate-800">{lesson?.title}</div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Ученик: <strong>{lesson?.studentName || "Ученик"}</strong></span>
                {lesson?.endTime && (
                  <span>Завершился в {formatTolyatti(lesson.endTime, "HH:mm")}</span>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleExtendAndEnter}
                disabled={extending}
                className="w-full py-3.5 px-5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-sm shadow-lg shadow-amber-500/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {extending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                <span>Продлить урок на 30 минут</span>
              </button>

              <button
                type="button"
                onClick={() => setBypassedExpired(true)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Войти в режиме просмотра
              </button>

              <button
                type="button"
                onClick={() => router.push("/teacher")}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Вернуться в кабинет</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // STUDENT or PARENT
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto border border-slate-200">
            <Lock className="w-8 h-8 text-slate-400" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-extrabold text-xs inline-flex items-center gap-1.5 border border-slate-200">
              <Lock className="w-3.5 h-3.5" />
              Комната закрыта
            </span>
            <h2 className="text-xl font-black text-slate-900">
              Время урока истекло
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Запланированное время занятия завершилось, и вход в онлайн-класс закрыт. Если вам нужно продолжить урок, попросите преподавателя продлить занятие.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1">
            <div className="text-xs font-bold text-slate-800">{lesson?.title}</div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Преподаватель: <strong>{lesson?.teacherName || "Репетитор"}</strong></span>
              {lesson?.endTime && (
                <span>Окончание: {formatTolyatti(lesson.endTime, "HH:mm")}</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push(currentRole === "PARENT" ? "/parent" : "/student")}
            className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-sm shadow-lg shadow-blue-500/25 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Вернуться в личный кабинет</span>
          </button>
        </div>
      </div>
    );
  }

  const displayName =
    userName ||
    (currentRole === "TEACHER"
      ? lesson?.teacherName || "Анна Сергеевна Иванова"
      : currentRole === "PARENT"
      ? "Родитель"
      : lesson?.studentName || "Ученик");

  return (
    <VideoRoom
      roomName={params.id}
      userName={displayName}
      userRole={currentRole}
      lessonTitle={lesson?.title || "Индивидуальный онлайн-урок"}
      subjectName={lesson?.subjectName || "Математика и логика"}
      subjectColor={lesson?.subjectColor || "#2563eb"}
      teacherName={lesson?.teacherName || "Анна Сергеевна Иванова"}
      teacherAvatar={lesson?.teacherAvatar}
      studentName={lesson?.studentName || "Ученик"}
      studentAvatar={lesson?.studentAvatar}
      lessonId={lesson?.id || params.id}
      onEndLesson={handleEndLesson}
      onRoleChange={(newRole) => {
        setCurrentRole(newRole);
        try {
          localStorage.setItem("ayda_active_role", newRole.toLowerCase());
        } catch (e) {}
      }}
    />
  );
}
