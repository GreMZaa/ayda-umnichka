"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import VideoRoom from "@/components/VideoRoom";

export default function RoomPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<"TEACHER" | "STUDENT">("TEACHER");

  useEffect(() => {
    fetch(`/api/lessons/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Lesson not found");
        return res.json();
      })
      .then((data) => {
        setLesson(data);
        setLoading(false);
      })
      .catch(() => {
        setLesson({
          title: "Индивидуальный урок: Математика и логика",
          teacherName: "Преподаватель центра",
          studentName: "Ученик",
        });
        setLoading(false);
      });
  }, [params.id]);

  const handleEndLesson = async () => {
    if (lesson?.id) {
      try {
        await fetch(`/api/lessons/${lesson.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "COMPLETED" }),
        });
      } catch (e) {
        console.error(e);
      }
    }
    if (currentRole === "TEACHER") {
      router.push("/teacher");
    } else {
      router.push("/student");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Подключение к уроку...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <VideoRoom
        roomName={params.id}
        userName={currentRole === "TEACHER" ? (lesson?.teacherName || "Преподаватель") : (lesson?.studentName || "Ученик")}
        userRole={currentRole}
        lessonTitle={lesson?.title || "Индивидуальный урок"}
        onEndLesson={handleEndLesson}
        onRoleChange={setCurrentRole}
      />
    </div>
  );
}
