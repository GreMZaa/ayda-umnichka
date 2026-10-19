"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import VideoRoom from "@/components/VideoRoom";
import { fetchWithAuth } from "@/lib/api-client";

export default function RoomPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<"TEACHER" | "STUDENT" | "PARENT">("TEACHER");
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    // 1. Определение текущей роли и профиля
    try {
      const activeRole = localStorage.getItem("ayda_active_role");
      const urlParams = new URLSearchParams(window.location.search);
      const roleFromQuery = urlParams.get("role");

      if (roleFromQuery === "student" || activeRole === "student") {
        setCurrentRole("STUDENT");
      } else if (roleFromQuery === "parent" || activeRole === "parent") {
        setCurrentRole("PARENT");
      } else {
        setCurrentRole("TEACHER");
      }

      const savedUser =
        localStorage.getItem("ayda_current_user_profile") || localStorage.getItem("ayda_user");
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.name) setUserName(u.name);
      }
    } catch (e) {}

    // 2. Загрузка данных урока по его ID или room_name
    fetchWithAuth(`/api/lessons/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Урок не найден в базе данных");
        return res.json();
      })
      .then((data) => {
        setLesson(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Фоллбэк для тестового класса:", err);
        setLesson({
          id: params.id,
          title: "Индивидуальный онлайн-урок: Математика и логика",
          subjectName: "Математика и логика",
          subjectColor: "#2563eb",
          teacherName: "Анна Сергеевна Иванова",
          studentName: "Артём Смирнов",
          roomName: params.id,
          status: "IN_PROGRESS",
        });
        setLoading(false);
      });
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

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4 p-6 max-w-sm">
          <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-base font-extrabold text-white">Вход в онлайн-класс...</h3>
          <p className="text-xs text-slate-400">
            Подключаем интерактивную доску и видеоканал для урока <strong>{params.id}</strong>
          </p>
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
      : lesson?.studentName || "Артём Смирнов");

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
      studentName={lesson?.studentName || "Артём Смирнов"}
      studentAvatar={lesson?.studentAvatar}
      lessonId={lesson?.id || params.id}
      onEndLesson={handleEndLesson}
      onRoleChange={setCurrentRole}
    />
  );
}
