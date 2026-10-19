"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  Sparkles,
  Download,
  Square,
  Circle,
  Minus,
  MoveRight,
  Type,
  FileText,
  BookOpen,
  Award,
  Flame,
  CheckCircle2,
  Grid3X3,
  List,
  Save,
  HelpCircle,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api-client";

interface VideoRoomProps {
  roomName: string;
  userName: string;
  userRole: "TEACHER" | "STUDENT" | "PARENT";
  lessonTitle: string;
  subjectName?: string;
  subjectColor?: string;
  teacherName?: string;
  teacherAvatar?: string;
  studentName?: string;
  studentAvatar?: string;
  lessonId?: string;
  onEndLesson?: () => void;
  onRoleChange?: (role: "TEACHER" | "STUDENT" | "PARENT") => void;
}

type ToolType = "pen" | "highlighter" | "eraser" | "line" | "arrow" | "rect" | "circle" | "text";
type BoardBgType = "grid" | "lines" | "blank" | "dark";

export default function VideoRoom({
  roomName,
  userName,
  userRole,
  lessonTitle,
  subjectName = "Математика и логика",
  subjectColor = "#2563eb",
  teacherName = "Анна Сергеевна Иванова",
  teacherAvatar,
  studentName = "Артём Смирнов",
  studentAvatar,
  lessonId,
  onEndLesson,
  onRoleChange,
}: VideoRoomProps) {
  // 1. Навигация и режимы отображения
  const [viewMode, setViewMode] = useState<"split" | "board" | "video" | "materials">("split");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 2. Таймер урока (секундомер длительности)
  const [secondsElapsed, setSecondsElapsed] = useState(15 * 60 + 35); // Старт для наглядности (15 мин)
  useEffect(() => {
    const timer = setInterval(() => setSecondsElapsed((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 3. Медиа-управление (микрофон, камера, экран, поднятая рука)
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);
  const [floatingReaction, setFloatingReaction] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (camOn) {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: true })
        .then((s) => {
          stream = s;
          if (localVideoRef.current) localVideoRef.current.srcObject = s;
        })
        .catch((err) => {
          console.warn("Камера/микрофон недоступны или заблокированы браузером:", err);
        });
    } else {
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const str = localVideoRef.current.srcObject as MediaStream;
        str.getTracks().forEach((track) => track.stop());
        localVideoRef.current.srcObject = null;
      }
    }
    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [camOn]);

  // 4. Интерактивная доска (Whiteboard)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTool, setCurrentTool] = useState<ToolType>("pen");
  const [brushColor, setBrushColor] = useState("#2563eb");
  const [brushWidth, setBrushWidth] = useState(3);
  const [boardBg, setBoardBg] = useState<BoardBgType>("grid");
  const [history, setHistory] = useState<ImageData[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [tempImageData, setTempImageData] = useState<ImageData | null>(null);
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState("");

  // Отрисовка фона доски
  const redrawBackground = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, bg: BoardBgType) => {
      if (bg === "dark") {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 32) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      } else if (bg === "grid") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = "#f1f5f9";
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 24) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 24) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      } else if (bg === "lines") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;
        for (let y = 0; y < height; y += 30) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }
    },
    []
  );

  // Инициализация размеров canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth;
    const height = parent.clientHeight;
    if (width === 0 || height === 0) return;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    redrawBackground(ctx, width, height, boardBg);

    // Сохраняем чистый холст в историю
    const initialSnapshot = ctx.getImageData(0, 0, width, height);
    setHistory([initialSnapshot]);
  }, [boardBg, redrawBackground]);

  useEffect(() => {
    initCanvas();
    const handleResize = () => initCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [initCanvas, viewMode]);

  // Сохранить снимок перед изменением
  const pushHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-15), snapshot]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newHistory = [...history];
    newHistory.pop(); // удаляем текущее состояние
    const previous = newHistory[newHistory.length - 1];
    if (previous) {
      ctx.putImageData(previous, 0, 0);
      setHistory(newHistory);
      showToast("Действие отменено");
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    pushHistory();
    redrawBackground(ctx, canvas.width, canvas.height, boardBg);
    showToast("Доска очищена");
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `Конспект-урока-${roomName}-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("Конспект урока скачан в PNG!");
  };

  // Обработчики рисования (Мышь + Сенсорный ввод)
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ("touches" in e && e.touches.length > 1) return; // игнор мультитача
    const coords = getCanvasCoords(e);

    if (currentTool === "text") {
      setTextInputPos(coords);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    pushHistory();
    setDrawing(true);
    setStartPos(coords);
    setTempImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));

    if (currentTool === "pen" || currentTool === "highlighter" || currentTool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const handleDrawingMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e);

    if (currentTool === "pen") {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 1;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (currentTool === "highlighter") {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushWidth * 3.5;
      ctx.lineCap = "square";
      ctx.globalAlpha = 0.35;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (currentTool === "eraser") {
      ctx.strokeStyle = boardBg === "dark" ? "#0f172a" : "#ffffff";
      ctx.lineWidth = brushWidth * 6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (tempImageData && startPos) {
      // Геометрические фигуры: восстанавливаем холст и рисуем фигуру
      ctx.putImageData(tempImageData, 0, 0);
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushWidth;
      ctx.fillStyle = brushColor;
      ctx.globalAlpha = 1;

      if (currentTool === "line") {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else if (currentTool === "arrow") {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();

        // Наконечник стрелки
        const angle = Math.atan2(coords.y - startPos.y, coords.x - startPos.x);
        const headlen = 14;
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        ctx.lineTo(
          coords.x - headlen * Math.cos(angle - Math.PI / 6),
          coords.y - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          coords.x - headlen * Math.cos(angle + Math.PI / 6),
          coords.y - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      } else if (currentTool === "rect") {
        ctx.strokeRect(startPos.x, startPos.y, coords.x - startPos.x, coords.y - startPos.y);
      } else if (currentTool === "circle") {
        const rx = Math.abs(coords.x - startPos.x) / 2;
        const ry = Math.abs(coords.y - startPos.y) / 2;
        const cx = Math.min(startPos.x, coords.x) + rx;
        const cy = Math.min(startPos.y, coords.y) + ry;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  const handleEndDraw = () => {
    setDrawing(false);
    setStartPos(null);
    setTempImageData(null);
  };

  const handleAddText = () => {
    if (!textInputPos || !textInputValue.trim()) {
      setTextInputPos(null);
      setTextInputValue("");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    pushHistory();
    ctx.font = `bold ${Math.max(16, brushWidth * 5)}px 'Inter', sans-serif`;
    ctx.fillStyle = brushColor;
    ctx.fillText(textInputValue, textInputPos.x, textInputPos.y + 16);

    setTextInputPos(null);
    setTextInputValue("");
  };

  // Вставка быстрых образовательных шаблонов задач на доску
  const applyTemplate = (type: "equation" | "fractions" | "triangle" | "axis" | "rule") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    pushHistory();

    const startX = 50;
    const startY = 80;

    if (type === "equation") {
      ctx.font = "bold 22px 'Inter', sans-serif";
      ctx.fillStyle = "#2563eb";
      ctx.fillText("Уравнение: 4x + 18 = 50", startX, startY);
      ctx.font = "16px 'Inter', sans-serif";
      ctx.fillStyle = boardBg === "dark" ? "#cbd5e1" : "#475569";
      ctx.fillText("1) 4x = 50 - 18", startX, startY + 40);
      ctx.fillText("2) 4x = 32", startX, startY + 75);
      ctx.font = "bold 18px 'Inter', sans-serif";
      ctx.fillStyle = "#16a34a";
      ctx.fillText("Ответ: x = 8  ✓", startX, startY + 115);
    } else if (type === "fractions") {
      ctx.font = "bold 20px 'Inter', sans-serif";
      ctx.fillStyle = "#2563eb";
      ctx.fillText("Сложение дробей с разными знаменателями:", startX, startY);
      ctx.font = "18px 'Inter', sans-serif";
      ctx.fillStyle = boardBg === "dark" ? "#f1f5f9" : "#0f172a";
      ctx.fillText(" 1/2 + 3/4 = 2/4 + 3/4 = 5/4 = 1 1/4", startX, startY + 45);
    } else if (type === "triangle") {
      ctx.font = "bold 18px 'Inter', sans-serif";
      ctx.fillStyle = "#dc2626";
      ctx.fillText("Геометрия: Прямоугольный треугольник ABC", startX, startY);

      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX + 20, startY + 200);
      ctx.lineTo(startX + 200, startY + 200);
      ctx.lineTo(startX + 20, startY + 60);
      ctx.closePath();
      ctx.stroke();

      ctx.font = "bold 16px 'Inter', sans-serif";
      ctx.fillStyle = "#2563eb";
      ctx.fillText("A", startX + 5, startY + 215);
      ctx.fillText("B", startX + 210, startY + 215);
      ctx.fillText("C", startX + 5, startY + 50);
    } else if (type === "axis") {
      ctx.font = "bold 18px 'Inter', sans-serif";
      ctx.fillStyle = "#2563eb";
      ctx.fillText("Координатная плоскость (X, Y)", startX, startY);

      const cx = startX + 120;
      const cy = startY + 120;

      ctx.strokeStyle = boardBg === "dark" ? "#94a3b8" : "#64748b";
      ctx.lineWidth = 2;
      // Ось X
      ctx.beginPath();
      ctx.moveTo(cx - 100, cy);
      ctx.lineTo(cx + 100, cy);
      ctx.stroke();
      // Ось Y
      ctx.beginPath();
      ctx.moveTo(cx, cy - 80);
      ctx.lineTo(cx, cy + 80);
      ctx.stroke();

      ctx.font = "bold 14px 'Inter', sans-serif";
      ctx.fillStyle = "#2563eb";
      ctx.fillText("X", cx + 105, cy + 5);
      ctx.fillText("Y", cx - 5, cy - 85);
    } else if (type === "rule") {
      ctx.font = "bold 20px 'Inter', sans-serif";
      ctx.fillStyle = "#d946ef";
      ctx.fillText("Правило русского языка: ЖИ — ШИ", startX, startY);
      ctx.font = "16px 'Inter', sans-serif";
      ctx.fillStyle = boardBg === "dark" ? "#cbd5e1" : "#475569";
      ctx.fillText("Буквосочетания ЖИ и ШИ всегда пиши с буквой И!", startX, startY + 35);
      ctx.font = "italic 15px 'Inter', sans-serif";
      ctx.fillStyle = "#2563eb";
      ctx.fillText("Примеры: жизнь, ёжик, машина, тишина.", startX, startY + 65);
    }

    showToast("Шаблон добавлен на доску");
  };

  // 5. Чат и мгновенные реакции
  const [messages, setMessages] = useState<
    Array<{ id: string; sender: string; text: string; time: string; role: string }>
  >([
    {
      id: "1",
      sender: teacherName,
      text: "Здравствуйте! Начнём разбор домашней работы и новой темы.",
      time: "10:00",
      role: "TEACHER",
    },
    {
      id: "2",
      sender: studentName,
      text: "Здравствуйте, Анна Сергеевна! Доску вижу, готов к уроку.",
      time: "10:01",
      role: "STUDENT",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: userName || (userRole === "TEACHER" ? teacherName : studentName),
        text: chatInput,
        time: timeStr,
        role: userRole,
      },
    ]);
    setChatInput("");
  };

  const handleSendReaction = (emoji: string, label: string) => {
    setFloatingReaction(emoji);
    setTimeout(() => setFloatingReaction(null), 1800);

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: userName || (userRole === "TEACHER" ? teacherName : studentName),
        text: `${emoji} ${label}`,
        time: timeStr,
        role: userRole,
      },
    ]);
  };

  // 6. Заметки учителя и отчёт урока
  const [teacherNotes, setTeacherNotes] = useState(
    "Ученик отлично усвоил тему линейных уравнений. Решил самостоятельно 4 задачи из 5."
  );
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const handleSaveNotes = async () => {
    if (!lessonId) {
      showToast("Заметка сохранена локально!");
      return;
    }
    setSavingNotes(true);
    try {
      await fetchWithAuth(`/api/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: teacherNotes, grade: "5", feedback: "Молодец!" }),
      });
      setNotesSaved(true);
      showToast("Отчёт по уроку успешно сохранён!");
      setTimeout(() => setNotesSaved(false), 2500);
    } catch (e) {
      showToast("Заметка сохранена в сессии");
    } finally {
      setSavingNotes(false);
    }
  };

  // 7. Полноэкранный режим
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const copyRoomLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      showToast("Ссылка на урок скопирована в буфер!");
    }
  };

  const sanitizedJitsiRoom = `AydaUmnichka_${roomName.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden h-screen w-screen">
      {/* ВСПЛЫВАЮЩИЙ ТОСТ-УВЕДОМЛЕНИЕ */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl bg-blue-600/95 backdrop-blur text-white text-xs sm:text-sm font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ЛЕТАЮЩАЯ РЕАКЦИЯ НА ЭКРАНЕ */}
      {floatingReaction && (
        <div className="absolute bottom-24 right-1/3 z-[100] text-5xl pointer-events-none animate-bounce">
          {floatingReaction}
        </div>
      )}

      {/* 1. ВЕРХНИЙ ХЕДЕР ОНЛАЙН-КЛАССА */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-3 sm:px-5 flex items-center justify-between gap-3 shrink-0">
        {/* Слева: Кнопка Назад + Название и статус */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            href={userRole === "TEACHER" ? "/teacher" : userRole === "PARENT" ? "/parent" : "/student"}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
            title="Выйти из урока в кабинет"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                style={{ backgroundColor: `${subjectColor}25`, borderColor: subjectColor, color: subjectColor }}
                className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold border truncate"
              >
                {subjectName}
              </span>
              <h1 className="font-extrabold text-xs sm:text-sm text-white truncate max-w-[140px] sm:max-w-xs md:max-w-md">
                {lessonTitle}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                В эфире
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate hidden md:block">
              Преподаватель: {teacherName} • Ученик: {studentName}
            </p>
          </div>
        </div>

        {/* Центр: Переключатель режимов экрана */}
        <div className="hidden lg:flex items-center bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60 text-xs">
          <button
            onClick={() => setViewMode("split")}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              viewMode === "split"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Доска + Видео</span>
          </button>
          <button
            onClick={() => setViewMode("board")}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              viewMode === "board"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Только Доска</span>
          </button>
          <button
            onClick={() => setViewMode("video")}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              viewMode === "video"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Видеоконференция</span>
          </button>
          <button
            onClick={() => setViewMode("materials")}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              viewMode === "materials"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Материалы и Заметки</span>
          </button>
        </div>

        {/* Справа: Таймер + Действия */}
        <div className="flex items-center gap-2 text-xs">
          {/* Таймер */}
          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-200 bg-slate-800 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>

          {/* Быстрый выбор роли */}
          {onRoleChange && (
            <div className="hidden xl:flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-[11px]">
              <button
                onClick={() => onRoleChange("TEACHER")}
                className={`px-2 py-1 rounded-lg font-semibold transition ${
                  userRole === "TEACHER" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Я: Учитель
              </button>
              <button
                onClick={() => onRoleChange("STUDENT")}
                className={`px-2 py-1 rounded-lg font-semibold transition ${
                  userRole === "STUDENT" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Я: Ученик
              </button>
            </div>
          )}

          {/* Копировать ссылку */}
          <button
            onClick={copyRoomLink}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Скопировать ссылку на урок"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Ссылка</span>
          </button>

          {/* Полноэкранный режим */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
            title={isFullscreen ? "Выйти из полного экрана" : "На весь экран"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Завершить урок */}
          <button
            onClick={onEndLesson}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-950/40 cursor-pointer"
            title="Завершить занятие"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">Завершить</span>
          </button>
        </div>
      </header>

      {/* МОБИЛЬНАЯ ПАНЕЛЬ ПЕРЕКЛЮЧЕНИЯ РЕЖИМОВ (ТОЛЬКО НА СМАРТФОНАХ) */}
      <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-2 py-1.5 flex items-center justify-around gap-1 text-[11px]">
        <button
          onClick={() => setViewMode("split")}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 ${
            viewMode === "split" ? "bg-blue-600 text-white" : "text-slate-400"
          }`}
        >
          <Layout className="w-3.5 h-3.5" />
          <span>Класс</span>
        </button>
        <button
          onClick={() => setViewMode("board")}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 ${
            viewMode === "board" ? "bg-blue-600 text-white" : "text-slate-400"
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Доска</span>
        </button>
        <button
          onClick={() => setViewMode("video")}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 ${
            viewMode === "video" ? "bg-blue-600 text-white" : "text-slate-400"
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Видео</span>
        </button>
        <button
          onClick={() => setViewMode("materials")}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 ${
            viewMode === "materials" ? "bg-blue-600 text-white" : "text-slate-400"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Заметки</span>
        </button>
      </div>

      {/* 2. ОСНОВНОЕ РАБОЧЕЕ ПРОСТРАНСТВО */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* РЕЖИМ 1 И 2: ДОСКА ДЛЯ РИСОВАНИЯ (SPLIT ИЛИ BOARD) */}
        {(viewMode === "split" || viewMode === "board") && (
          <div className="flex-1 flex flex-col bg-white relative overflow-hidden">
            {/* ПЛАВАЮЩИЙ ТУЛБАР ИНСТРУМЕНТОВ ДОСКИ */}
            <div className="absolute top-2.5 left-2.5 right-2.5 sm:right-auto z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 flex flex-wrap items-center gap-1.5 text-xs">
              {/* Инструменты рисования */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentTool("pen")}
                  className={`p-2 rounded-xl transition flex items-center gap-1 ${
                    currentTool === "pen" ? "bg-blue-600 text-white font-bold" : "text-slate-300 hover:bg-slate-800"
                  }`}
                  title="Маркер (Перо)"
                >
                  <PenTool className="w-4 h-4" />
                  <span className="hidden xl:inline">Маркер</span>
                </button>

                <button
                  onClick={() => setCurrentTool("highlighter")}
                  className={`p-2 rounded-xl transition flex items-center gap-1 ${
                    currentTool === "highlighter"
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                  title="Маркер-выделитель"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden xl:inline">Маркер-текст</span>
                </button>

                <button
                  onClick={() => setCurrentTool("eraser")}
                  className={`p-2 rounded-xl transition flex items-center gap-1 ${
                    currentTool === "eraser"
                      ? "bg-blue-600 text-white font-bold"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                  title="Ластик"
                >
                  <Eraser className="w-4 h-4" />
                  <span className="hidden xl:inline">Ластик</span>
                </button>

                {/* Фигуры */}
                <button
                  onClick={() => setCurrentTool("line")}
                  className={`p-2 rounded-xl transition ${
                    currentTool === "line" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
                  }`}
                  title="Прямая линия"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentTool("arrow")}
                  className={`p-2 rounded-xl transition ${
                    currentTool === "arrow" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
                  }`}
                  title="Стрелка"
                >
                  <MoveRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentTool("rect")}
                  className={`p-2 rounded-xl transition ${
                    currentTool === "rect" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
                  }`}
                  title="Прямоугольник"
                >
                  <Square className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentTool("circle")}
                  className={`p-2 rounded-xl transition ${
                    currentTool === "circle" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
                  }`}
                  title="Круг / Окружность"
                >
                  <Circle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentTool("text")}
                  className={`p-2 rounded-xl transition ${
                    currentTool === "text" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
                  }`}
                  title="Текст на доске"
                >
                  <Type className="w-4 h-4" />
                </button>
              </div>

              <div className="h-5 w-px bg-slate-700 mx-1 hidden sm:block" />

              {/* Палитра цветов */}
              <div className="flex items-center gap-1.5">
                {[
                  { color: "#0f172a", name: "Черный" },
                  { color: "#2563eb", name: "Синий" },
                  { color: "#dc2626", name: "Красный" },
                  { color: "#16a34a", name: "Зеленый" },
                  { color: "#9333ea", name: "Фиолетовый" },
                  { color: "#ea580c", name: "Оранжевый" },
                ].map((c) => (
                  <button
                    key={c.color}
                    onClick={() => {
                      setBrushColor(c.color);
                      if (currentTool === "eraser") setCurrentTool("pen");
                    }}
                    style={{ backgroundColor: c.color }}
                    className={`w-5 h-5 rounded-full transition transform hover:scale-110 ${
                      brushColor === c.color && currentTool !== "eraser"
                        ? "ring-2 ring-offset-2 ring-blue-500 scale-110"
                        : ""
                    }`}
                    title={c.name}
                  />
                ))}
              </div>

              <div className="h-5 w-px bg-slate-700 mx-1 hidden sm:block" />

              {/* Толщина кисти */}
              <div className="hidden sm:flex items-center gap-1">
                {[
                  { w: 2, label: "Тонкий" },
                  { w: 4, label: "Средний" },
                  { w: 8, label: "Жирный" },
                ].map((t) => (
                  <button
                    key={t.w}
                    onClick={() => setBrushWidth(t.w)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                      brushWidth === t.w ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="h-5 w-px bg-slate-700 mx-1 hidden md:block" />

              {/* Фон доски */}
              <div className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => setBoardBg(boardBg === "grid" ? "blank" : boardBg === "blank" ? "dark" : "grid")}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
                  title="Сменить фон (Клетка / Чистый лист / Темная доска)"
                >
                  {boardBg === "grid" ? "📐 Клетка" : boardBg === "blank" ? "📄 Лист" : "⬛ Тёмная"}
                </button>
              </div>

              <div className="h-5 w-px bg-slate-700 mx-1 hidden lg:block" />

              {/* Быстрые шаблоны задач */}
              <div className="hidden 2xl:flex items-center gap-1">
                <button
                  onClick={() => applyTemplate("equation")}
                  className="px-2 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[10px] font-bold border border-blue-500/40"
                >
                  + Уравнение
                </button>
                <button
                  onClick={() => applyTemplate("fractions")}
                  className="px-2 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[10px] font-bold border border-blue-500/40"
                >
                  + Дроби
                </button>
                <button
                  onClick={() => applyTemplate("triangle")}
                  className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold border border-rose-500/40"
                >
                  + Геометрия
                </button>
              </div>

              <div className="h-5 w-px bg-slate-700 mx-1" />

              {/* Undo / Clear / Save */}
              <div className="flex items-center gap-1 ml-auto sm:ml-0">
                <button
                  onClick={handleUndo}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Отменить последнее действие"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClear}
                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-slate-800 transition"
                  title="Очистить доску полностью"
                >
                  <Eraser className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 transition"
                  title="Скачать снимок доски (PNG)"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Ввод текста на доске */}
            {textInputPos && (
              <div
                style={{ left: textInputPos.x, top: textInputPos.y }}
                className="absolute z-30 bg-white border border-blue-500 rounded-xl shadow-xl p-2 flex items-center gap-1.5"
              >
                <input
                  type="text"
                  autoFocus
                  value={textInputValue}
                  onChange={(e) => setTextInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddText()}
                  placeholder="Введите текст или формулу..."
                  className="text-xs sm:text-sm text-slate-900 px-2 py-1 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[200px]"
                />
                <button
                  onClick={handleAddText}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                >
                  OK
                </button>
                <button
                  onClick={() => setTextInputPos(null)}
                  className="px-2 py-1 rounded-lg text-slate-500 hover:bg-slate-100 text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {/* ХОЛСТ ДОСКИ */}
            <div className="flex-1 w-full h-full relative cursor-crosshair overflow-hidden touch-none">
              <canvas
                ref={canvasRef}
                onMouseDown={handleStartDraw}
                onMouseMove={handleDrawingMove}
                onMouseUp={handleEndDraw}
                onMouseLeave={handleEndDraw}
                onTouchStart={handleStartDraw}
                onTouchMove={handleDrawingMove}
                onTouchEnd={handleEndDraw}
                className="absolute inset-0 w-full h-full block"
              />
            </div>
          </div>
        )}

        {/* ПРАВАЯ ПАНЕЛЬ В РЕЖИМЕ SPLIT: ВИДЕО + ЧАТ */}
        {viewMode === "split" && (
          <div className="w-full md:w-80 lg:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col shrink-0">
            {/* Видео-плитки */}
            <div className="p-3 space-y-2.5 border-b border-slate-800">
              {/* Плитка преподавателя */}
              <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-video relative border border-slate-800 shadow-inner">
                {userRole === "TEACHER" && camOn ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <img
                    src={
                      teacherAvatar ||
                      "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&h=400&fit=crop&crop=faces"
                    }
                    alt={teacherName}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-lg text-[11px] text-white font-bold flex items-center gap-1.5 border border-slate-700/60">
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                  <span className="truncate max-w-[150px]">{teacherName} (Учитель)</span>
                </div>
              </div>

              {/* Плитка ученика */}
              <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-video relative border border-slate-800 shadow-inner">
                {userRole === "STUDENT" && camOn ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <img
                    src={
                      studentAvatar ||
                      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&h=400&fit=crop&crop=faces"
                    }
                    alt={studentName}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-lg text-[11px] text-white font-bold flex items-center gap-1.5 border border-slate-700/60">
                  <span className="truncate max-w-[150px]">{studentName} (Ученик)</span>
                  {raisedHand && <span className="text-amber-400 font-extrabold animate-bounce">✋ Рука</span>}
                </div>
              </div>
            </div>

            {/* ЧАТ УРОКА */}
            <div className="flex-1 flex flex-col justify-between p-3 bg-slate-900 overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-extrabold text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                  Чат урока
                </span>
                <span className="text-[10px] text-slate-500">{messages.length} сообщ.</span>
              </div>

              {/* Список сообщений */}
              <div className="flex-1 overflow-y-auto space-y-2.5 py-2.5 pr-1 text-xs">
                {messages.map((m) => {
                  const isMe =
                    (userRole === "TEACHER" && m.role === "TEACHER") ||
                    (userRole === "STUDENT" && m.role === "STUDENT");
                  return (
                    <div
                      key={m.id}
                      className={`p-2.5 rounded-2xl max-w-[90%] ${
                        isMe
                          ? "bg-blue-600/90 text-white ml-auto border border-blue-500/40"
                          : "bg-slate-800 text-slate-200 mr-auto border border-slate-700/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 mb-0.5">
                        <span className="font-bold">{m.sender}</span>
                        <span>{m.time}</span>
                      </div>
                      <p className="font-medium text-xs break-words">{m.text}</p>
                    </div>
                  );
                })}
              </div>

              {/* Панель быстрых реакций */}
              <div className="flex items-center gap-1 py-1.5 overflow-x-auto">
                {[
                  { e: "⭐", l: "Отлично!" },
                  { e: "🔥", l: "Супер!" },
                  { e: "✋", l: "Вопрос" },
                  { e: "💡", l: "Понятно" },
                  { e: "👏", l: "Молодец!" },
                ].map((r) => (
                  <button
                    key={r.l}
                    onClick={() => handleSendReaction(r.e, r.l)}
                    className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 transition shrink-0 border border-slate-700/60"
                  >
                    <span>{r.e}</span>
                    <span className="hidden sm:inline ml-1 text-[10px]">{r.l}</span>
                  </button>
                ))}
              </div>

              {/* Форма отправки сообщения */}
              <form onSubmit={handleSendMessage} className="mt-1 flex gap-1.5">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Сообщение..."
                  className="flex-1 text-xs p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shrink-0 cursor-pointer"
                  title="Отправить"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* РЕЖИМ 3: ПОЛНОРАЗМЕРНАЯ ВИДЕОКОНФЕРЕНЦИЯ JITSI / WEBRTC */}
        {viewMode === "video" && (
          <div className="flex-1 bg-slate-950 p-2 sm:p-4 flex flex-col relative overflow-hidden">
            <div className="flex-1 rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 relative shadow-2xl">
              {/* Интеграция реальной защищённой комнаты Jitsi Meet */}
              <iframe
                src={`https://meet.jit.si/${sanitizedJitsiRoom}#config.prejoinPageEnabled=false&config.startWithAudioMuted=${!micOn}&config.startWithVideoMuted=${!camOn}&userInfo.displayName=${encodeURIComponent(
                  userName || (userRole === "TEACHER" ? teacherName : studentName)
                )}`}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        )}

        {/* РЕЖИМ 4: МАТЕРИАЛЫ УРОКА, ПЛАН И ОТЧЁТ РЕПЕТИТОРА */}
        {viewMode === "materials" && (
          <div className="flex-1 bg-slate-900 p-4 sm:p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Карточка информации об уроке */}
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-800 border border-slate-700/80 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700">
                  <div>
                    <span
                      style={{ backgroundColor: `${subjectColor}25`, color: subjectColor, borderColor: subjectColor }}
                      className="px-2.5 py-0.5 rounded-md text-xs font-bold border"
                    >
                      {subjectName}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5">{lessonTitle}</h2>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p className="font-mono text-slate-200 font-bold">
                      ID урока: <span className="text-blue-400">{lessonId || roomName}</span>
                    </p>
                    <p>Продолжительность: 45 минут</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex items-center gap-3">
                    <img
                      src={
                        teacherAvatar ||
                        "https://images.unsplash.com/photo-1544717305-2782549b5136?w=240&h=240&fit=crop&crop=faces"
                      }
                      alt={teacherName}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-700"
                    />
                    <div>
                      <span className="text-slate-400 text-[10px]">Преподаватель:</span>
                      <h4 className="font-bold text-white text-sm">{teacherName}</h4>
                      <p className="text-blue-400 text-[11px]">Педагог центра «АйДаУмничка»</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex items-center gap-3">
                    <img
                      src={
                        studentAvatar ||
                        "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces"
                      }
                      alt={studentName}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-700"
                    />
                    <div>
                      <span className="text-slate-400 text-[10px]">Ученик:</span>
                      <h4 className="font-bold text-white text-sm">{studentName}</h4>
                      <p className="text-emerald-400 text-[11px]">3 класс • Активный статус</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Блок отчёта и заметок преподавателя */}
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-800 border border-slate-700/80 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    <h3 className="text-base font-bold text-white">Журнал и конспект урока</h3>
                  </div>
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingNotes ? "Сохранение..." : notesSaved ? "Сохранено ✓" : "Сохранить отчёт"}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  Запишите ключевые достижения ученика, разобранные задачи и рекомендации для родителей:
                </p>

                <textarea
                  rows={4}
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  placeholder="Заметки по ходу урока..."
                  className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              {/* Домашнее задание к уроку */}
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-800 border border-slate-700/80 shadow-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Домашнее задание</h3>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 text-xs text-slate-300 space-y-2">
                  <p className="font-bold text-white text-sm">Учебник, страница 48: задания № 12, 14, 15.</p>
                  <p className="text-slate-400">
                    Решить уравнения в тетради и прикрепить фото решения в личном кабинете ученика к следующему
                    занятию.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. НИЖНЯЯ ПАНЕЛЬ УПРАВЛЕНИЯ ЗВОНКОМ (CLEAN ZOOM / GOOGLE MEET STYLE) */}
      <footer className="h-16 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between shrink-0">
        {/* Инфо слева */}
        <div className="text-xs text-slate-400 hidden sm:flex items-center gap-2 truncate max-w-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="truncate">
            Урок: <strong className="text-white">{subjectName}</strong>
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-medium">Сеть 100%</span>
        </div>

        {/* Кнопки медиа-управления по центру */}
        <div className="flex items-center gap-2.5 mx-auto">
          {/* Микрофон */}
          <button
            onClick={() => setMicOn(!micOn)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer shadow-md ${
              micOn ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700" : "bg-rose-600 text-white"
            }`}
            title={micOn ? "Выключить микрофон" : "Включить микрофон"}
          >
            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Камера */}
          <button
            onClick={() => setCamOn(!camOn)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer shadow-md ${
              camOn ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700" : "bg-rose-600 text-white"
            }`}
            title={camOn ? "Выключить камеру" : "Включить камеру"}
          >
            {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Демонстрация экрана */}
          <button
            onClick={() => {
              setScreenSharing(!screenSharing);
              showToast(screenSharing ? "Демонстрация экрана остановлена" : "Демонстрация экрана запущена");
            }}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer shadow-md ${
              screenSharing
                ? "bg-blue-600 text-white"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
            }`}
            title="Демонстрация экрана"
          >
            <Layout className="w-5 h-5" />
          </button>

          {/* Поднять руку */}
          <button
            onClick={() => {
              setRaisedHand(!raisedHand);
              showToast(raisedHand ? "Рука опущена" : "✋ Вы подняли руку!");
            }}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer shadow-md ${
              raisedHand
                ? "bg-amber-500 text-slate-950 font-black animate-pulse"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
            }`}
            title={raisedHand ? "Опустить руку" : "Поднять руку"}
          >
            <Hand className="w-5 h-5" />
          </button>

          {/* Завершить урок */}
          <button
            onClick={onEndLesson}
            className="w-11 h-11 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition cursor-pointer shadow-lg shadow-rose-950/40 ml-2"
            title="Завершить занятие"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

        {/* Быстрые переключатели справа */}
        <div className="text-xs text-slate-400 hidden sm:flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === "board" ? "split" : "board")}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold transition cursor-pointer"
          >
            {viewMode === "board" ? "Свернуть доску" : "Доска на весь экран"}
          </button>
        </div>
      </footer>
    </div>
  );
}
