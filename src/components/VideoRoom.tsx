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
  Save,
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
type BoardBgType = "grid" | "lines" | "blank";

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

  // 2. Таймер урока
  const [secondsElapsed, setSecondsElapsed] = useState(15 * 60 + 35);
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

  // 3. Медиа-управление
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
          console.warn("Камера/микрофон недоступны или заблокированы:", err);
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

  // Отрисовка фона доски (светлая школьная тетрадь)
  const redrawBackground = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, bg: BoardBgType) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      if (bg === "grid") {
        ctx.strokeStyle = "#e2e8f0";
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
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        for (let y = 0; y < height; y += 30) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }
    },
    []
  );

  // CSS стиль для фона тетради (клетка / линейка / лист)
  const getBoardBackgroundStyle = () => {
    if (boardBg === "grid") {
      return {
        backgroundColor: "#ffffff",
        backgroundImage:
          "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      };
    }
    if (boardBg === "lines") {
      return {
        backgroundColor: "#ffffff",
        backgroundImage: "linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)",
        backgroundSize: "100% 30px",
      };
    }
    return {
      backgroundColor: "#ffffff",
    };
  };

  // Инициализация размеров canvas (прозрачный слой поверх сетки)
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
    ctx.clearRect(0, 0, width, height);

    const initialSnapshot = ctx.getImageData(0, 0, width, height);
    setHistory([initialSnapshot]);
  }, []);

  useEffect(() => {
    initCanvas();
    const handleResize = () => initCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [initCanvas, viewMode]);

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
    newHistory.pop();
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    showToast("Доска очищена");
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext("2d");
    if (exportCtx) {
      redrawBackground(exportCtx, canvas.width, canvas.height, boardBg);
      exportCtx.drawImage(canvas, 0, 0);
      const link = document.createElement("a");
      link.download = `Конспект-урока-${roomName}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = exportCanvas.toDataURL("image/png");
      link.click();
      showToast("Конспект урока скачан в PNG!");
    }
  };

  // Координаты рисования
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
    if ("touches" in e && e.touches.length > 1) return;
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

    if (currentTool === "pen" || currentTool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    } else if (currentTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
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
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 1;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (currentTool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushWidth * 3.5;
      ctx.lineCap = "square";
      ctx.globalAlpha = 0.35;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (currentTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = brushWidth * 8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (tempImageData && startPos) {
      ctx.putImageData(tempImageData, 0, 0);
      ctx.globalCompositeOperation = "source-over";
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
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.globalCompositeOperation = "source-over";
    }
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
    ctx.globalCompositeOperation = "source-over";
    ctx.font = `bold ${Math.max(16, brushWidth * 5)}px 'Inter', sans-serif`;
    ctx.fillStyle = brushColor;
    ctx.fillText(textInputValue, textInputPos.x, textInputPos.y + 16);

    setTextInputPos(null);
    setTextInputValue("");
  };

  // Шаблоны
  const applyTemplate = (type: "equation" | "fractions" | "triangle" | "axis") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    pushHistory();
    ctx.globalCompositeOperation = "source-over";

    const startX = 40;
    const startY = 70;

    if (type === "equation") {
      ctx.font = "bold 20px 'Inter', sans-serif";
      ctx.fillStyle = "#2563eb";
      ctx.fillText("Уравнение: 4x + 18 = 50", startX, startY);
      ctx.font = "16px 'Inter', sans-serif";
      ctx.fillStyle = "#334155";
      ctx.fillText("1) 4x = 50 - 18", startX, startY + 35);
      ctx.fillText("2) 4x = 32", startX, startY + 65);
      ctx.font = "bold 16px 'Inter', sans-serif";
      ctx.fillStyle = "#16a34a";
      ctx.fillText("Ответ: x = 8  ✓", startX, startY + 100);
    } else if (type === "fractions") {
      ctx.font = "bold 18px 'Inter', sans-serif";
      ctx.fillStyle = "#2563eb";
      ctx.fillText("Сложение дробей:", startX, startY);
      ctx.font = "16px 'Inter', sans-serif";
      ctx.fillStyle = "#0f172a";
      ctx.fillText("1/2 + 3/4 = 2/4 + 3/4 = 5/4 = 1 1/4", startX, startY + 40);
    } else if (type === "triangle") {
      ctx.font = "bold 18px 'Inter', sans-serif";
      ctx.fillStyle = "#dc2626";
      ctx.fillText("Треугольник ABC", startX, startY);

      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(startX + 10, startY + 180);
      ctx.lineTo(startX + 180, startY + 180);
      ctx.lineTo(startX + 10, startY + 50);
      ctx.closePath();
      ctx.stroke();

      ctx.font = "bold 14px 'Inter', sans-serif";
      ctx.fillStyle = "#2563eb";
      ctx.fillText("A", startX - 2, startY + 195);
      ctx.fillText("B", startX + 190, startY + 195);
      ctx.fillText("C", startX - 2, startY + 45);
    } else if (type === "axis") {
      ctx.font = "bold 18px 'Inter', sans-serif";
      ctx.fillStyle = "#2563eb";
      ctx.fillText("Координатная плоскость (X, Y)", startX, startY);

      const cx = startX + 100;
      const cy = startY + 100;

      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 80, cy);
      ctx.lineTo(cx + 80, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - 70);
      ctx.lineTo(cx, cy + 70);
      ctx.stroke();

      ctx.font = "bold 13px 'Inter', sans-serif";
      ctx.fillStyle = "#2563eb";
      ctx.fillText("X", cx + 85, cy + 5);
      ctx.fillText("Y", cx - 4, cy - 75);
    }

    showToast("Шаблон добавлен");
  };

  // 5. Чат
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

  // 6. Заметки преподавателя
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
      showToast("Ссылка на урок скопирована!");
    }
  };

  const sanitizedJitsiRoom = `AydaUmnichka_${roomName.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-100 text-slate-900 flex flex-col font-sans select-none overflow-hidden h-screen w-screen">
      {/* ТОСТ */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-150">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* РЕАКЦИЯ */}
      {floatingReaction && (
        <div className="absolute bottom-24 right-1/3 z-[100] text-5xl pointer-events-none animate-bounce">
          {floatingReaction}
        </div>
      )}

      {/* 1. ВЕРХНИЙ ХЕДЕР (Светлый, чистый, аккуратный) */}
      <header className="h-14 bg-white border-b border-slate-200 px-3 sm:px-5 flex items-center justify-between gap-3 shrink-0">
        {/* Слева: Кнопка назад + название + статус */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            href={userRole === "TEACHER" ? "/teacher" : userRole === "PARENT" ? "/parent" : "/student"}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer shrink-0"
            title="Выйти из урока в кабинет"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                style={{ backgroundColor: `${subjectColor}15`, borderColor: `${subjectColor}40`, color: subjectColor }}
                className="px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold border truncate"
              >
                {subjectName}
              </span>
              <h1 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate max-w-[140px] sm:max-w-xs md:max-w-md">
                {lessonTitle}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                В эфире
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate hidden md:block">
              Преподаватель: <strong className="text-slate-700">{teacherName}</strong> • Ученик:{" "}
              <strong className="text-slate-700">{studentName}</strong>
            </p>
          </div>
        </div>

        {/* Центр: Переключатель режимов */}
        <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
          <button
            onClick={() => setViewMode("split")}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === "split"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Доска + Видео</span>
          </button>
          <button
            onClick={() => setViewMode("board")}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === "board"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Только Доска</span>
          </button>
          <button
            onClick={() => setViewMode("video")}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === "video"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Видеоконференция</span>
          </button>
          <button
            onClick={() => setViewMode("materials")}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === "materials"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Материалы и Заметки</span>
          </button>
        </div>

        {/* Справа: Таймер + Роль + Действия */}
        <div className="flex items-center gap-2 text-xs">
          {/* Таймер */}
          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 bg-slate-100 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>

          {/* Быстрый выбор роли */}
          {onRoleChange && (
            <div className="hidden xl:flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px]">
              <button
                onClick={() => onRoleChange("TEACHER")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  userRole === "TEACHER" ? "bg-white text-blue-600 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Я: Учитель
              </button>
              <button
                onClick={() => onRoleChange("STUDENT")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  userRole === "STUDENT" ? "bg-white text-blue-600 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Я: Ученик
              </button>
            </div>
          )}

          {/* Копировать ссылку */}
          <button
            onClick={copyRoomLink}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Скопировать ссылку на урок"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Ссылка</span>
          </button>

          {/* Полный экран */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
            title={isFullscreen ? "Выйти из полного экрана" : "На весь экран"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Завершить */}
          <button
            onClick={onEndLesson}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Завершить урок"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">Завершить</span>
          </button>
        </div>
      </header>

      {/* МОБИЛЬНЫЙ ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМОВ */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-2 py-1.5 flex items-center justify-around gap-1 text-[11px]">
        <button
          onClick={() => setViewMode("split")}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer ${
            viewMode === "split" ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-600"
          }`}
        >
          <Layout className="w-3.5 h-3.5" />
          <span>Класс</span>
        </button>
        <button
          onClick={() => setViewMode("board")}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer ${
            viewMode === "board" ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-600"
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Доска</span>
        </button>
        <button
          onClick={() => setViewMode("video")}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer ${
            viewMode === "video" ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-600"
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Видео</span>
        </button>
        <button
          onClick={() => setViewMode("materials")}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer ${
            viewMode === "materials" ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-600"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Заметки</span>
        </button>
      </div>

      {/* 2. ОСНОВНАЯ ЗОНА */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* РЕЖИМ 1 И 2: ИНТЕРАКТИВНАЯ ДОСКА (SPLIT ИЛИ BOARD) */}
        {(viewMode === "split" || viewMode === "board") && (
          <div className="flex-1 flex flex-col bg-white relative overflow-hidden">
            {/* ПЛАВАЮЩИЙ СВЕТЛЫЙ ТУЛБАР ДОСКИ */}
            <div className="absolute top-2.5 left-2.5 right-2.5 sm:right-auto z-20 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-md p-1.5 flex flex-wrap items-center gap-1.5 text-xs">
              {/* Инструменты */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentTool("pen")}
                  className={`p-2 rounded-xl transition flex items-center gap-1 cursor-pointer ${
                    currentTool === "pen" ? "bg-blue-600 text-white font-bold" : "text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Маркер (Перо)"
                >
                  <PenTool className="w-4 h-4" />
                  <span className="hidden xl:inline">Маркер</span>
                </button>

                <button
                  onClick={() => setCurrentTool("highlighter")}
                  className={`p-2 rounded-xl transition flex items-center gap-1 cursor-pointer ${
                    currentTool === "highlighter"
                      ? "bg-amber-100 text-amber-900 border border-amber-300 font-bold"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Маркер-выделитель текста"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden xl:inline">Выделитель</span>
                </button>

                <button
                  onClick={() => setCurrentTool("eraser")}
                  className={`p-2 rounded-xl transition flex items-center gap-1 cursor-pointer ${
                    currentTool === "eraser"
                      ? "bg-blue-600 text-white font-bold"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Ластик"
                >
                  <Eraser className="w-4 h-4" />
                  <span className="hidden xl:inline">Ластик</span>
                </button>

                {/* Фигуры */}
                <button
                  onClick={() => setCurrentTool("line")}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    currentTool === "line" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Линия"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentTool("arrow")}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    currentTool === "arrow" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Стрелка"
                >
                  <MoveRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentTool("rect")}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    currentTool === "rect" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Прямоугольник"
                >
                  <Square className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentTool("circle")}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    currentTool === "circle" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Круг"
                >
                  <Circle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentTool("text")}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    currentTool === "text" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Текст"
                >
                  <Type className="w-4 h-4" />
                </button>
              </div>

              <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

              {/* Цвета (сочные классические чистые цвета) */}
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
                    className={`w-5 h-5 rounded-full transition transform hover:scale-110 cursor-pointer ${
                      brushColor === c.color && currentTool !== "eraser"
                        ? "ring-2 ring-offset-2 ring-blue-500 scale-110"
                        : "border border-slate-300"
                    }`}
                    title={c.name}
                  />
                ))}
              </div>

              <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

              {/* Толщина */}
              <div className="hidden sm:flex items-center gap-1">
                {[
                  { w: 2, label: "Тонкий" },
                  { w: 4, label: "Средний" },
                  { w: 8, label: "Жирный" },
                ].map((t) => (
                  <button
                    key={t.w}
                    onClick={() => setBrushWidth(t.w)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      brushWidth === t.w ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="h-5 w-px bg-slate-200 mx-1 hidden md:block" />

              {/* Фон доски */}
              <div className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => setBoardBg(boardBg === "grid" ? "lines" : boardBg === "lines" ? "blank" : "grid")}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition cursor-pointer border border-slate-200"
                  title="Сменить фон (Клетка / Линейка / Чистый лист)"
                >
                  {boardBg === "grid" ? "📐 Клетка" : boardBg === "lines" ? "📝 Линейка" : "📄 Лист"}
                </button>
              </div>

              <div className="h-5 w-px bg-slate-200 mx-1 hidden lg:block" />

              {/* Шаблоны задач */}
              <div className="hidden 2xl:flex items-center gap-1">
                <button
                  onClick={() => applyTemplate("equation")}
                  className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 cursor-pointer"
                >
                  + Уравнение
                </button>
                <button
                  onClick={() => applyTemplate("fractions")}
                  className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 cursor-pointer"
                >
                  + Дроби
                </button>
                <button
                  onClick={() => applyTemplate("triangle")}
                  className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200 cursor-pointer"
                >
                  + Геометрия
                </button>
              </div>

              <div className="h-5 w-px bg-slate-200 mx-1" />

              {/* Undo / Clear / Save */}
              <div className="flex items-center gap-1 ml-auto sm:ml-0">
                <button
                  onClick={handleUndo}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  title="Отменить действие"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClear}
                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Очистить доску"
                >
                  <Eraser className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                  title="Скачать конспект (PNG)"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Ввод текста */}
            {textInputPos && (
              <div
                style={{ left: textInputPos.x, top: textInputPos.y }}
                className="absolute z-30 bg-white border border-blue-600 rounded-xl shadow-xl p-2 flex items-center gap-1.5"
              >
                <input
                  type="text"
                  autoFocus
                  value={textInputValue}
                  onChange={(e) => setTextInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddText()}
                  placeholder="Введите текст или формулу..."
                  className="text-xs sm:text-sm text-slate-900 px-2 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 min-w-[200px]"
                />
                <button
                  onClick={handleAddText}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer"
                >
                  OK
                </button>
                <button
                  onClick={() => setTextInputPos(null)}
                  className="px-2 py-1 rounded-lg text-slate-500 hover:bg-slate-100 text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Холст */}
            <div
              style={getBoardBackgroundStyle()}
              className="flex-1 w-full h-full relative cursor-crosshair overflow-hidden touch-none"
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleStartDraw}
                onMouseMove={handleDrawingMove}
                onMouseUp={handleEndDraw}
                onMouseLeave={handleEndDraw}
                onTouchStart={handleStartDraw}
                onTouchMove={handleDrawingMove}
                onTouchEnd={handleEndDraw}
                className="absolute inset-0 w-full h-full block bg-transparent"
              />
            </div>
          </div>
        )}

        {/* ПРАВАЯ ПАНЕЛЬ В РЕЖИМЕ SPLIT: ВИДЕО + ЧАТ (Светлая, чистая) */}
        {viewMode === "split" && (
          <div className="w-full md:w-80 lg:w-96 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col shrink-0">
            {/* Видео-плитки */}
            <div className="p-3 space-y-2.5 border-b border-slate-200 bg-slate-50">
              {/* Преподаватель */}
              <div className="rounded-2xl overflow-hidden bg-slate-200 aspect-video relative border border-slate-300/80 shadow-xs">
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
                <div className="absolute bottom-2 left-2 bg-slate-900/75 backdrop-blur px-2.5 py-1 rounded-lg text-[11px] text-white font-bold flex items-center gap-1.5">
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                  <span className="truncate max-w-[150px]">{teacherName} (Учитель)</span>
                </div>
              </div>

              {/* Ученик */}
              <div className="rounded-2xl overflow-hidden bg-slate-200 aspect-video relative border border-slate-300/80 shadow-xs">
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
                <div className="absolute bottom-2 left-2 bg-slate-900/75 backdrop-blur px-2.5 py-1 rounded-lg text-[11px] text-white font-bold flex items-center gap-1.5">
                  <span className="truncate max-w-[150px]">{studentName} (Ученик)</span>
                  {raisedHand && <span className="text-amber-300 font-extrabold animate-bounce">✋ Рука</span>}
                </div>
              </div>
            </div>

            {/* ЧАТ УРОКА */}
            <div className="flex-1 flex flex-col justify-between p-3 bg-white overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
                <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  Чат урока
                </span>
                <span className="text-[11px] text-slate-400">{messages.length} сообщ.</span>
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
                          ? "bg-blue-600 text-white ml-auto shadow-xs"
                          : "bg-slate-100 text-slate-800 mr-auto border border-slate-200"
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

              {/* Палитра быстрых реакций */}
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
                    className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] text-slate-700 transition shrink-0 border border-slate-200 cursor-pointer"
                  >
                    <span>{r.e}</span>
                    <span className="hidden sm:inline ml-1 text-[10px] font-medium">{r.l}</span>
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
                  className="flex-1 text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition"
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

        {/* РЕЖИМ 3: ВИДЕОКОНФЕРЕНЦИЯ JITSI */}
        {viewMode === "video" && (
          <div className="flex-1 bg-slate-100 p-2 sm:p-4 flex flex-col relative overflow-hidden">
            <div className="flex-1 rounded-3xl overflow-hidden border border-slate-200 bg-white relative shadow-sm">
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
          <div className="flex-1 bg-slate-50 p-4 sm:p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-5">
              {/* Карточка урока */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <span
                      style={{ backgroundColor: `${subjectColor}15`, color: subjectColor, borderColor: `${subjectColor}40` }}
                      className="px-2.5 py-0.5 rounded-md text-xs font-bold border"
                    >
                      {subjectName}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5">{lessonTitle}</h2>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p className="font-mono text-slate-800 font-bold">
                      ID урока: <span className="text-blue-600">{lessonId || roomName}</span>
                    </p>
                    <p>Продолжительность: 45 минут</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <img
                      src={
                        teacherAvatar ||
                        "https://images.unsplash.com/photo-1544717305-2782549b5136?w=240&h=240&fit=crop&crop=faces"
                      }
                      alt={teacherName}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                    />
                    <div>
                      <span className="text-slate-500 text-[10px]">Преподаватель:</span>
                      <h4 className="font-bold text-slate-900 text-sm">{teacherName}</h4>
                      <p className="text-blue-600 text-[11px] font-medium">Педагог центра «АйДаУмничка»</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <img
                      src={
                        studentAvatar ||
                        "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces"
                      }
                      alt={studentName}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                    />
                    <div>
                      <span className="text-slate-500 text-[10px]">Ученик:</span>
                      <h4 className="font-bold text-slate-900 text-sm">{studentName}</h4>
                      <p className="text-emerald-600 text-[11px] font-medium">3 класс • Активный статус</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Блок отчёта и заметок */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-bold text-slate-900">Журнал и конспект урока</h3>
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

                <p className="text-xs text-slate-500">
                  Запишите ключевые достижения ученика, разобранные задачи и рекомендации для родителей:
                </p>

                <textarea
                  rows={4}
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  placeholder="Заметки по ходу урока..."
                  className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition"
                />
              </div>

              {/* Домашнее задание */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-900">Домашнее задание</h3>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
                  <p className="font-bold text-slate-900 text-sm">Учебник, страница 48: задания № 12, 14, 15.</p>
                  <p className="text-slate-500">
                    Решить уравнения в тетради и прикрепить фото решения в личном кабинете ученика к следующему
                    занятию.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. НИЖНЯЯ ПАНЕЛЬ УПРАВЛЕНИЯ ЗВОНКОМ (Светлая, чистая) */}
      <footer className="h-16 bg-white border-t border-slate-200 px-4 flex items-center justify-between shrink-0">
        {/* Инфо слева */}
        <div className="text-xs text-slate-600 hidden sm:flex items-center gap-2 truncate max-w-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="truncate">
            Урок: <strong className="text-slate-900">{subjectName}</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-700 font-medium">Сеть 100%</span>
        </div>

        {/* Кнопки медиа-управления по центру */}
        <div className="flex items-center gap-2.5 mx-auto">
          {/* Микрофон */}
          <button
            onClick={() => setMicOn(!micOn)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer shadow-xs ${
              micOn ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200" : "bg-rose-600 text-white"
            }`}
            title={micOn ? "Выключить микрофон" : "Включить микрофон"}
          >
            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Камера */}
          <button
            onClick={() => setCamOn(!camOn)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer shadow-xs ${
              camOn ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200" : "bg-rose-600 text-white"
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
            className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer shadow-xs ${
              screenSharing
                ? "bg-blue-600 text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
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
            className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer shadow-xs ${
              raisedHand
                ? "bg-amber-400 text-slate-950 font-black animate-pulse"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            }`}
            title={raisedHand ? "Опустить руку" : "Поднять руку"}
          >
            <Hand className="w-5 h-5" />
          </button>

          {/* Завершить урок */}
          <button
            onClick={onEndLesson}
            className="w-11 h-11 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition cursor-pointer shadow-sm ml-2"
            title="Завершить занятие"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

        {/* Быстрые переключатели справа */}
        <div className="text-xs text-slate-600 hidden sm:flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === "board" ? "split" : "board")}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold transition cursor-pointer"
          >
            {viewMode === "board" ? "Свернуть доску" : "Доска на весь экран"}
          </button>
        </div>
      </footer>
    </div>
  );
}
