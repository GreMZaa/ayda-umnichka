"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Share2,
  Users,
  ExternalLink,
  GraduationCap,
  PenTool,
  Eraser,
  RotateCcw,
  Clock,
  Hand,
  Maximize2,
  Minimize2,
  MessageSquare,
  Send,
  Layout,
  Check,
  ChevronLeft,
  Volume2,
} from "lucide-react";

interface VideoRoomProps {
  roomName: string;
  userName: string;
  userRole: "TEACHER" | "STUDENT";
  lessonTitle: string;
  onEndLesson?: () => void;
  onRoleChange?: (role: "TEACHER" | "STUDENT") => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export default function VideoRoom({
  roomName,
  userName,
  userRole,
  lessonTitle,
  onEndLesson,
  onRoleChange,
}: VideoRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"classroom" | "fullvideo">("classroom");

  // Интерактивная доска (Whiteboard)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#0f172a");
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");

  // Медиа-состояние
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [raisedHand, setRaisedHand] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(620); // 10 мин
  const videoRef = useRef<HTMLVideoElement>(null);

  // Чат урока
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string; isTeacher: boolean }>>([
    { sender: "Анна Сергеевна", text: "Здравствуйте, Миша! Начнем с проверки вчерашнего задания.", time: "16:01", isTeacher: true },
    { sender: "Миша", text: "Здравствуйте! Да, я открыл 3-ю задачу.", time: "16:02", isTeacher: false },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Таймер урока
  useEffect(() => {
    const timer = setInterval(() => setSecondsElapsed((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Камера
  useEffect(() => {
    if (camOn) {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch((err) => console.warn("Camera fallback:", err));
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [camOn]);

  // Сетка интерактивной доски
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 900;
    canvas.height = canvas.parentElement?.clientHeight || 650;

    // Чистая легкая школьная тетрадная клетка
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }, [viewMode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : brushColor;
    ctx.lineWidth = tool === "eraser" ? 24 : brushSize;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const stopDrawing = () => setDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // восстановить клетку
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    setMessages((prev) => [
      ...prev,
      {
        sender: userRole === "TEACHER" ? "Анна Сергеевна" : "Миша",
        text: chatInput,
        time: timeStr,
        isTeacher: userRole === "TEACHER",
      },
    ]);
    setChatInput("");
  };

  const copyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      alert("Ссылка на комнату скопирована в буфер обмена!");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* 1. Верхняя панель онлайн-класса */}
      <div className="bg-white px-4 sm:px-6 py-2.5 border-b border-slate-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"
            title="Вернуться на главную"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm sm:text-base text-slate-900 leading-none">
                {lessonTitle}
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                В эфире
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
              Преподаватель: Анна Сергеевна • Ученик: Миша Смирнов
            </p>
          </div>
        </div>

        {/* Таймер + Управление */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-md">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>

          {/* Быстрый выбор: от чьего имени просмотр */}
          {onRoleChange && (
            <div className="hidden md:flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px]">
              <button
                onClick={() => onRoleChange("TEACHER")}
                className={`px-2.5 py-1 rounded font-semibold transition ${
                  userRole === "TEACHER" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600"
                }`}
              >
                Я: Учитель
              </button>
              <button
                onClick={() => onRoleChange("STUDENT")}
                className={`px-2.5 py-1 rounded font-semibold transition ${
                  userRole === "STUDENT" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600"
                }`}
              >
                Я: Ученик
              </button>
            </div>
          )}

          <button
            onClick={copyLink}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Ссылка</span>
          </button>

          <button
            onClick={onEndLesson}
            className="px-3.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold transition flex items-center gap-1.5"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Завершить</span>
          </button>
        </div>
      </div>

      {/* 2. Основная область урока */}
      <div className="flex-1 flex overflow-hidden">
        {/* РЕЖИМ 1: Классическая учебная комната (Доска 75% + Сайдбар 25%) */}
        {viewMode === "classroom" ? (
          <>
            {/* Доска для совместной работы */}
            <div className="flex-1 flex flex-col bg-white relative border-r border-slate-200">
              {/* Компактный плавающий тулбар инструментов доски */}
              <div className="absolute top-3 left-4 z-10 bg-white border border-slate-200 rounded-xl shadow-xs px-3 py-1.5 flex items-center gap-2">
                <button
                  onClick={() => setTool("pen")}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                    tool === "pen" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
                  }`}
                  title="Маркер"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Маркер</span>
                </button>

                <button
                  onClick={() => setTool("eraser")}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                    tool === "eraser" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
                  }`}
                  title="Ластик"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ластик</span>
                </button>

                <div className="h-4 w-px bg-slate-200 mx-1" />

                {/* 4 строгих аккуратных цвета */}
                <div className="flex items-center gap-1">
                  {[
                    { color: "#0f172a", name: "Черный" },
                    { color: "#2563eb", name: "Синий" },
                    { color: "#dc2626", name: "Красный" },
                    { color: "#16a34a", name: "Зеленый" },
                  ].map((c) => (
                    <button
                      key={c.color}
                      onClick={() => {
                        setBrushColor(c.color);
                        setTool("pen");
                      }}
                      style={{ backgroundColor: c.color }}
                      className={`w-4 h-4 rounded-full transition ${
                        brushColor === c.color && tool === "pen" ? "ring-2 ring-offset-1 ring-blue-500 scale-110" : ""
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>

                <div className="h-4 w-px bg-slate-200 mx-1" />

                {/* Быстрые шаблоны задач для репетитора */}
                <div className="hidden lg:flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">Шаблоны:</span>
                  <button
                    onClick={() => {
                      const canvas = canvasRef.current;
                      if (!canvas) return;
                      const ctx = canvas.getContext("2d");
                      if (!ctx) return;
                      ctx.font = "bold 20px system-ui";
                      ctx.fillStyle = "#2563eb";
                      ctx.fillText("Уравнение: 4x + 18 = 50", 40, 100);
                      ctx.font = "16px system-ui";
                      ctx.fillStyle = "#64748b";
                      ctx.fillText("Шаг 1: 4x = 50 - 18", 40, 140);
                      ctx.fillText("Шаг 2: 4x = 32  ==>  x = 8", 40, 175);
                    }}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                  >
                    + Уравнение
                  </button>
                  <button
                    onClick={() => {
                      const canvas = canvasRef.current;
                      if (!canvas) return;
                      const ctx = canvas.getContext("2d");
                      if (!ctx) return;
                      ctx.font = "bold 18px system-ui";
                      ctx.fillStyle = "#0f172a";
                      ctx.fillText("Геометрия: Треугольник ABC", 40, 240);
                      ctx.strokeStyle = "#dc2626";
                      ctx.lineWidth = 2;
                      ctx.beginPath();
                      ctx.moveTo(100, 360);
                      ctx.lineTo(240, 360);
                      ctx.lineTo(170, 270);
                      ctx.closePath();
                      ctx.stroke();
                      ctx.font = "14px system-ui";
                      ctx.fillStyle = "#dc2626";
                      ctx.fillText("A", 85, 370);
                      ctx.fillText("B", 250, 370);
                      ctx.fillText("C", 165, 260);
                    }}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                  >
                    + Треугольник
                  </button>
                </div>

                <div className="h-4 w-px bg-slate-200 mx-1" />

                <button
                  onClick={clearCanvas}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 text-xs transition"
                  title="Очистить доску"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Холст */}
              <div className="flex-1 relative cursor-crosshair overflow-hidden">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>

            {/* Правый сайдбар: видео участников и чат */}
            <div className="w-80 lg:w-96 flex flex-col bg-slate-50 border-l border-slate-200">
              {/* Видео-плитки */}
              <div className="p-3 space-y-3 border-b border-slate-200">
                {/* Плитка преподавателя */}
                <div className="rounded-xl overflow-hidden bg-slate-900 aspect-video relative border border-slate-200">
                  {userRole === "TEACHER" && camOn ? (
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img
                      src="https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=600&h=400&fit=crop&crop=faces"
                      alt="Анна Сергеевна"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded text-[11px] text-white font-medium flex items-center gap-1.5">
                    <Volume2 className="w-3 h-3 text-emerald-400" />
                    <span>Анна Сергеевна (Учитель)</span>
                  </div>
                </div>

                {/* Плитка ученика */}
                <div className="rounded-xl overflow-hidden bg-slate-900 aspect-video relative border border-slate-200">
                  {userRole === "STUDENT" && camOn ? (
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img
                      src="https://images.unsplash.com/photo-1588072432836-e10032774350?w=600&h=400&fit=crop&crop=faces"
                      alt="Миша"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded text-[11px] text-white font-medium flex items-center gap-1.5">
                    <span>Миша Смирнов (Ученик)</span>
                    {raisedHand && <span className="text-amber-400">✋ Рука</span>}
                  </div>
                </div>
              </div>

              {/* Чат урока */}
              <div className="flex-1 flex flex-col justify-between p-3 bg-white">
                <div className="space-y-3 overflow-y-auto max-h-56 pr-1 text-xs">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-lg ${
                        m.isTeacher ? "bg-blue-50 text-slate-800" : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-[11px] mb-0.5">
                        <span className={m.isTeacher ? "text-blue-700" : "text-slate-700"}>{m.sender}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{m.time}</span>
                      </div>
                      <p>{m.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="mt-2 flex gap-1.5">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Написать сообщение..."
                    className="flex-1 text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : (
          /* РЕЖИМ 2: Полный экран видео (Google Meet стиль) */
          <div className="flex-1 bg-slate-900 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center">
            <div className="h-full bg-slate-800 rounded-xl overflow-hidden relative flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&h=400&fit=crop&crop=faces"
                alt="Учитель"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 bg-slate-950/80 px-2.5 py-1 rounded text-xs text-white">
                Анна Сергеевна (Преподаватель)
              </div>
            </div>

            <div className="h-full bg-slate-800 rounded-xl overflow-hidden relative flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&h=400&fit=crop&crop=faces"
                alt="Ученик"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 bg-slate-950/80 px-2.5 py-1 rounded text-xs text-white">
                Миша Смирнов (Ученик)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Нижняя панель управления звонком (Clean Google Meet Style) */}
      <div className="bg-white px-4 py-2.5 border-t border-slate-200 flex items-center justify-between">
        <div className="text-xs text-slate-500 hidden sm:block">
          Урок: <strong>Математика</strong> • Соединение стабильное
        </div>

        {/* Круглые аккуратные кнопки */}
        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          <button
            onClick={() => setMicOn(!micOn)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
              micOn ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-rose-600 text-white"
            }`}
            title={micOn ? "Выключить микрофон" : "Включить микрофон"}
          >
            {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setCamOn(!camOn)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
              camOn ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-rose-600 text-white"
            }`}
            title={camOn ? "Выключить камеру" : "Включить камеру"}
          >
            {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setRaisedHand(!raisedHand)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
              raisedHand ? "bg-amber-500 text-slate-950" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
            title="Поднять руку"
          >
            <Hand className="w-4 h-4" />
          </button>

          <button
            onClick={() => setViewMode(viewMode === "classroom" ? "fullvideo" : "classroom")}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"
            title={viewMode === "classroom" ? "Полный экран видео" : "Вернуться к доске"}
          >
            <Layout className="w-4 h-4" />
          </button>

          <button
            onClick={onEndLesson}
            className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition"
            title="Завершить занятие"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-slate-500 hidden sm:block">
          Режим: {viewMode === "classroom" ? "Доска + Видео" : "Галерея видео"}
        </div>
      </div>
    </div>
  );
}
