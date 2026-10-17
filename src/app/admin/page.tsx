"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Calendar,
  Clock,
  PlusCircle,
  CheckCircle2,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { getSupabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-client";

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Форма нового урока
  const [title, setTitle] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = async () => {
    try {
      const resLessons = await fetchWithAuth("/api/lessons");
      const dataLessons = await resLessons.json();
      setLessons(Array.isArray(dataLessons) ? dataLessons : []);

      const client = getSupabase();
      let dbUsers: any[] = [];
      if (client) {
        try {
          const { data: profiles } = await client.from("profiles").select("*");
          if (profiles && profiles.length > 0) {
            dbUsers = profiles.map((p: any) => ({
              id: p.id,
              name: p.full_name || p.email,
              role: (p.role || "student").toUpperCase(),
              email: p.email || "",
            }));
          }
        } catch {}
      }

      if (dbUsers.length > 0) {
        setUsers(dbUsers);
      } else {
        setUsers([
          { id: "u-teacher-1", name: "Преподаватель центра", role: "TEACHER", email: "teacher@umnichka.ru" },
          { id: "u-student-1", name: "Ученик (3 класс)", role: "STUDENT", email: "student@umnichka.ru" },
          { id: "u-parent-1", name: "Родитель", role: "PARENT", email: "parent@umnichka.ru" },
        ]);
      }

      setSubjects([
        { id: "sub-1", name: "Математика и логика", color: "#2563eb" },
        { id: "sub-2", name: "Русский язык и чтение", color: "#d946ef" },
        { id: "sub-3", name: "Английский язык", color: "#059669" },
        { id: "sub-4", name: "Подготовка к школе", color: "#d97706" },
      ]);

      setTeacherId("u-teacher-1");
      setStudentId("u-student-1");
      setSubjectId("sub-1");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !teacherId || !studentId || !subjectId) return;

    setSubmitting(true);
    try {
      const selectedTeacher = users.find((u) => u.id === teacherId);
      const selectedStudent = users.find((u) => u.id === studentId);
      const selectedSubject = subjects.find((s) => s.id === subjectId);

      const start = dateTime ? new Date(dateTime) : new Date(Date.now() + 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 50 * 60 * 1000);

      const payload = {
        title,
        subjectId,
        subjectName: selectedSubject?.name || "Предмет",
        subjectColor: selectedSubject?.color || "#2563eb",
        teacherId,
        teacherName: selectedTeacher?.name || "Преподаватель",
        studentId,
        studentName: selectedStudent?.name || "Ученик",
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        status: "SCHEDULED",
        roomName: "umnichka-" + Math.random().toString(36).substring(2, 8),
      };

      const res = await fetchWithAuth("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccessMsg("Занятие запланировано, комната создана.");
        setTitle("");
        loadData();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const teachers = users.filter((u) => u.role === "TEACHER");
  const students = users.filter((u) => u.role === "STUDENT");

  const filteredLessons = lessons.filter(
    (l) =>
      l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Шапка админ панели */}
      <div className="clean-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Управление центром «АйДаУмничка»
            </h1>
            <p className="text-xs text-slate-500">
              Преподаватели, ученики и онлайн-расписание
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
            Педагогов: <strong>{teachers.length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
            Учеников: <strong>{students.length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
            Уроков: <strong>{lessons.length}</strong>
          </div>
        </div>
      </div>

      {/* Форма создания урока */}
      <div className="clean-card p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-blue-600" />
          <span>Назначить новое занятие</span>
        </h2>

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleCreateLesson} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Тема занятия
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Математика: решение олимпиадных задач"
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Предмет
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Преподаватель
            </label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ученик
            </label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Дата и время урока
            </label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition disabled:opacity-50"
            >
              {submitting ? "Создание..." : "Запланировать занятие"}
            </button>
          </div>
        </form>
      </div>

      {/* Список занятий */}
      <div className="clean-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">Все уроки центра</h2>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск по уроку, учителю..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100">
                <th className="py-2.5 px-2">Урок / Предмет</th>
                <th className="py-2.5 px-2">Преподаватель</th>
                <th className="py-2.5 px-2">Ученик</th>
                <th className="py-2.5 px-2">Дата и время</th>
                <th className="py-2.5 px-2">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLessons.map((lesson) => (
                <tr key={lesson.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-2 font-medium text-slate-900">
                    <div>{lesson.title}</div>
                    <span className="text-[11px] text-slate-500">{lesson.subjectName}</span>
                  </td>
                  <td className="py-3 px-2 text-slate-700">{lesson.teacherName}</td>
                  <td className="py-3 px-2 text-slate-700">{lesson.studentName}</td>
                  <td className="py-3 px-2 text-slate-500">
                    {format(new Date(lesson.startTime), "d MMM, HH:mm", { locale: ru })}
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                        lesson.status === "LIVE"
                          ? "bg-emerald-50 text-emerald-700"
                          : lesson.status === "COMPLETED"
                          ? "bg-slate-100 text-slate-600"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {lesson.status === "LIVE"
                        ? "В эфире"
                        : lesson.status === "COMPLETED"
                        ? "Завершен"
                        : "Запланирован"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
