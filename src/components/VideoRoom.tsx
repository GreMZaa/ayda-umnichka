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
  PenTool,
  Eraser,
  RotateCcw,
  Clock,
  Hand,
  Maximize2,
  Minimize2,
  MessageSquare,
  Send,
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
  Monitor,
  MonitorOff,
  Lock,
  Unlock,
  Check,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api-client";
import { getSupabase } from "@/lib/supabase";

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

function LessonTimer({ initialSeconds = 15 * 60 + 35 }: { initialSeconds?: number }) {
  const [seconds, setSeconds] = useState(initialSeconds);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-1 font-mono font-bold text-slate-700 bg-slate-100 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-200 text-xs shrink-0">
      <Clock className="w-3.5 h-3.5 text-blue-600" />
      <span>{formatted}</span>
    </div>
  );
}

export default function VideoRoom({
  roomName,
  userName,
  userRole,
  lessonTitle,
  subjectName = "Математика и логика",
  subjectColor = "#2563eb",
  teacherName = "Анна Сергеевна Иванова",
  teacherAvatar,
  studentName = "Ученик",
  studentAvatar,
  lessonId,
  onEndLesson,
  onRoleChange,
}: VideoRoomProps) {
  // 1. Навигация: режимы для десктопа и мобильных
  const [activeTab, setActiveTab] = useState<"board" | "video" | "notes">("board");
  const [mobileTab, setMobileTab] = useState<"board" | "video" | "chat" | "notes">("board");
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileSplitView, setMobileSplitView] = useState(false);
  const [mobilePipOpen, setMobilePipOpen] = useState(true);

  // Собеседник и текущий пользователь
  const isTeacher = userRole === "TEACHER";
  const partnerName = isTeacher ? studentName : teacherName;
  const partnerRole = isTeacher ? "Ученик" : "Преподаватель";
  const partnerAvatar = isTeacher
    ? studentAvatar || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&h=600&fit=crop&crop=faces"
    : teacherAvatar || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&h=600&fit=crop&crop=faces";

  const myName = isTeacher ? teacherName : studentName;
  const myAvatar = isTeacher
    ? teacherAvatar || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&h=300&fit=crop&crop=faces"
    : studentAvatar || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=300&fit=crop&crop=faces";

  // Всплывающие уведомления полностью отключены по запросу пользователя
  const showToast = (_msg: string) => {};

  // 2. Медиа-управление: настоящая Камера, Микрофон и Демонстрация экрана
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoSideRef = useRef<HTMLVideoElement>(null);
  const localVideoMainRef = useRef<HTMLVideoElement>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // Синхронизация всех активных video-элементов локальной камеры
  const syncLocalVideos = useCallback((stream: MediaStream | null) => {
    if (localVideoRef.current && localVideoRef.current.srcObject !== stream) {
      localVideoRef.current.srcObject = stream;
      if (stream) localVideoRef.current.play().catch(() => {});
    }
    if (localVideoSideRef.current && localVideoSideRef.current.srcObject !== stream) {
      localVideoSideRef.current.srcObject = stream;
      if (stream) localVideoSideRef.current.play().catch(() => {});
    }
    if (localVideoMainRef.current && localVideoMainRef.current.srcObject !== stream) {
      localVideoMainRef.current.srcObject = stream;
      if (stream) localVideoMainRef.current.play().catch(() => {});
    }
    if (mobileVideoRef.current && mobileVideoRef.current.srcObject !== stream) {
      mobileVideoRef.current.srcObject = stream;
      if (stream) mobileVideoRef.current.play().catch(() => {});
    }
  }, []);

  // Включение / выключение реальной веб-камеры
  const toggleCamera = async () => {
    if (camOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      syncLocalVideos(null);
      setCamOn(false);
    } else {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        localStreamRef.current = stream;
        setCamOn(true);
        syncLocalVideos(stream);
      } catch (err: any) {
        console.error("Ошибка доступа к камере:", err);
        alert("Не удалось запустить камеру. Пожалуйста, разрешите браузеру доступ к веб-камере.");
      }
    }
  };

  useEffect(() => {
    if (camOn && localStreamRef.current) {
      syncLocalVideos(localStreamRef.current);
    }
  }, [camOn, chatCollapsed, activeTab, mobileTab, syncLocalVideos]);

  // Включение / выключение настоящей демонстрации экрана
  const toggleScreenShare = async () => {
    if (screenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }
      setScreenSharing(false);
    } else {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          alert("Демонстрация экрана не поддерживается в данном браузере.");
          return;
        }
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        screenStreamRef.current = stream;
        stream.getVideoTracks()[0].onended = () => {
          setScreenSharing(false);
          screenStreamRef.current = null;
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = null;
          }
        };
        setScreenSharing(true);
      } catch (err) {
        console.warn("Показ экрана отменён:", err);
      }
    }
  };

  useEffect(() => {
    if (screenSharing && screenVideoRef.current && screenStreamRef.current) {
      if (screenVideoRef.current.srcObject !== screenStreamRef.current) {
        screenVideoRef.current.srcObject = screenStreamRef.current;
        screenVideoRef.current.play().catch(() => {});
      }
    }
  }, [screenSharing]);

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

  // Разрешение на рисование для ученика (по умолчанию выключено)
  const [studentCanDraw, setStudentCanDraw] = useState(false);
  const canDraw = userRole === "TEACHER" || (userRole === "STUDENT" && Boolean(studentCanDraw));

  // Рефы для синхронизации в реальном времени через Supabase Realtime
  const channelRef = useRef<any>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentPosRef = useRef<{ x: number; y: number } | null>(null);
  const currentBoardBgRef = useRef(boardBg);
  const currentStudentCanDrawRef = useRef(studentCanDraw);

  useEffect(() => {
    currentBoardBgRef.current = boardBg;
  }, [boardBg]);

  useEffect(() => {
    currentStudentCanDrawRef.current = studentCanDraw;
  }, [studentCanDraw]);

  // CSS стиль фона (сетка не рисуется на холсте, поэтому ластик её никогда не стирает)
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

  // Отрисовка сетки на экспортном холсте (только при сохранении картинки)
  const redrawBackgroundForExport = (ctx: CanvasRenderingContext2D, width: number, height: number, bg: BoardBgType) => {
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
  };

  // Отрисовка удалённых штрихов (от преподавателя или ученика)
  const drawRemoteSegment = (payload: any) => {
    if (!payload || !payload.from || !payload.to) return;
    if (userRole === "TEACHER" && payload.senderRole === "STUDENT" && !currentStudentCanDrawRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const fromX = payload.from.x * w;
    const fromY = payload.from.y * h;
    const toX = payload.to.x * w;
    const toY = payload.to.y * h;

    ctx.save();
    if (payload.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = (payload.width || 3) * 8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
    } else if (payload.tool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = payload.color || "#2563eb";
      ctx.lineWidth = (payload.width || 3) * 3.5;
      ctx.lineCap = "square";
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = payload.color || "#2563eb";
      ctx.lineWidth = payload.width || 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawRemoteShape = (payload: any) => {
    if (!payload || !payload.start || !payload.end) return;
    if (userRole === "TEACHER" && payload.senderRole === "STUDENT" && !currentStudentCanDrawRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const startX = payload.start.x * w;
    const startY = payload.start.y * h;
    const endX = payload.end.x * w;
    const endY = payload.end.y * h;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = payload.color || "#2563eb";
    ctx.lineWidth = payload.width || 3;
    ctx.fillStyle = payload.color || "#2563eb";
    ctx.globalAlpha = 1;

    if (payload.tool === "line") {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    } else if (payload.tool === "arrow") {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const angle = Math.atan2(endY - startY, endX - startX);
      const headlen = 14;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headlen * Math.cos(angle - Math.PI / 6),
        endY - headlen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        endX - headlen * Math.cos(angle + Math.PI / 6),
        endY - headlen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    } else if (payload.tool === "rect") {
      ctx.strokeRect(startX, startY, endX - startX, endY - startY);
    } else if (payload.tool === "circle") {
      const rx = Math.abs(endX - startX) / 2;
      const ry = Math.abs(endY - startY) / 2;
      const cx = Math.min(startX, endX) + rx;
      const cy = Math.min(startY, endY) + ry;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawRemoteText = (payload: any) => {
    if (!payload || !payload.text) return;
    if (userRole === "TEACHER" && payload.senderRole === "STUDENT" && !currentStudentCanDrawRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.font = `bold ${Math.max(16, (payload.width || 3) * 5)}px 'Inter', sans-serif`;
    ctx.fillStyle = payload.color || "#2563eb";
    ctx.fillText(payload.text, payload.x * w, payload.y * h + 16);
    ctx.restore();
  };

  const handleRemoteClear = (payload?: any) => {
    if (userRole === "TEACHER" && payload?.senderRole === "STUDENT" && !currentStudentCanDrawRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Инициализация размеров canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth;
    const height = parent.clientHeight;
    if (width === 0 || height === 0) return;

    if (canvas.width === width && canvas.height === height) return;

    let tempImg: ImageData | null = null;
    if (canvas.width > 0 && canvas.height > 0) {
      try {
        const ctx = canvas.getContext("2d");
        if (ctx) tempImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch (e) {}
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    if (tempImg) {
      try {
        ctx.putImageData(tempImg, 0, 0);
      } catch (e) {}
    }

    const initialSnapshot = ctx.getImageData(0, 0, width, height);
    setHistory((prev) => (prev.length > 0 ? prev : [initialSnapshot]));
  }, []);

  useEffect(() => {
    initCanvas();
    const handleResize = () => initCanvas();
    window.addEventListener("resize", handleResize);
    const t = setTimeout(initCanvas, 80);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(t);
    };
  }, [initCanvas, activeTab, mobileTab, screenSharing, mobileSplitView]);

  // Подключение Supabase Realtime Broadcast для мгновенной синхронизации доски и чата
  useEffect(() => {
    const supabase = getSupabase();
    const cleanRoom = (roomName || "room").replace(/[^a-zA-Z0-9_-]/g, "_");
    const channel = supabase.channel(`classroom_${cleanRoom}`, {
      config: {
        broadcast: { ack: false, self: false },
      },
    });

    channelRef.current = channel;

    channel
      .on("broadcast", { event: "draw_segment" }, ({ payload }) => {
        drawRemoteSegment(payload);
      })
      .on("broadcast", { event: "draw_shape" }, ({ payload }) => {
        drawRemoteShape(payload);
      })
      .on("broadcast", { event: "draw_text" }, ({ payload }) => {
        drawRemoteText(payload);
      })
      .on("broadcast", { event: "clear_board" }, () => {
        handleRemoteClear();
      })
      .on("broadcast", { event: "canvas_snapshot" }, ({ payload }) => {
        if (payload?.dataUrl && canvasRef.current) {
          const img = new Image();
          img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = payload.dataUrl;
        }
      })
      .on("broadcast", { event: "board_bg" }, ({ payload }) => {
        if (payload?.bg) {
          setBoardBg(payload.bg);
        }
      })
      .on("broadcast", { event: "permission_change" }, ({ payload }) => {
        if (userRole === "STUDENT") {
          setStudentCanDraw(Boolean(payload?.canDraw));
          showToast(
            payload?.canDraw
              ? "Учитель разрешил вам рисовать на доске! ✏️"
              : "Учитель перевёл доску в режим просмотра 🔒"
          );
        }
      })
      .on("broadcast", { event: "request_canvas_sync" }, () => {
        if (userRole === "TEACHER" && canvasRef.current) {
          const dataUrl = canvasRef.current.toDataURL("image/png");
          channel.send({
            type: "broadcast",
            event: "response_canvas_sync",
            payload: {
              dataUrl,
              boardBg: currentBoardBgRef.current,
              studentCanDraw: currentStudentCanDrawRef.current,
            },
          });
        }
      })
      .on("broadcast", { event: "response_canvas_sync" }, ({ payload }) => {
        if (userRole === "STUDENT") {
          if (typeof payload?.studentCanDraw === "boolean") {
            setStudentCanDraw(payload.studentCanDraw);
          }
          if (payload?.boardBg) {
            setBoardBg(payload.boardBg);
          }
          if (payload?.dataUrl && canvasRef.current) {
            const img = new Image();
            img.onload = () => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const ctx = canvas.getContext("2d");
              if (!ctx) return;
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = payload.dataUrl;
          }
        }
      })
      .on("broadcast", { event: "chat_message" }, ({ payload }) => {
        if (payload && payload.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
        }
      })
      .on("broadcast", { event: "homework_update" }, ({ payload }) => {
        if (payload) {
          if (typeof payload.homeworkText === "string") setHomeworkText(payload.homeworkText);
          if (typeof payload.homeworkDeadline === "string") setHomeworkDeadline(payload.homeworkDeadline);
          if (typeof payload.teacherNotes === "string") setTeacherNotes(payload.teacherNotes);
          if (typeof payload.lessonGrade === "string") setLessonGrade(payload.lessonGrade);
          if (typeof payload.studentHomeworkNotes === "string") setStudentHomeworkNotes(payload.studentHomeworkNotes);
          if (typeof payload.studentHomeworkDone === "boolean") setStudentHomeworkDone(payload.studentHomeworkDone);

          if (userRole === "STUDENT" || userRole === "PARENT") {
            showToast("Преподаватель обновил домашнее задание! 📝");
          } else {
            showToast("Данные урока синхронизированы");
          }
        }
      })
      .on("broadcast", { event: "raise_hand" }, ({ payload }) => {
        if (userRole === "TEACHER") {
          setRaisedHand(Boolean(payload?.raised));
          if (payload?.raised) {
            showToast(`${payload.name || "Ученик"} поднял руку! ✋`);
          }
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (userRole === "STUDENT") {
            channel.send({
              type: "broadcast",
              event: "request_canvas_sync",
              payload: {},
            });
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomName, userRole]);

  // Управление правами ученика со стороны преподавателя
  const toggleStudentPermission = () => {
    if (userRole !== "TEACHER") return;
    const next = !studentCanDraw;
    setStudentCanDraw(next);
    channelRef.current?.send({
      type: "broadcast",
      event: "permission_change",
      payload: { canDraw: next },
    });
    showToast(
      next
        ? "Рисование для ученика разрешено ✓"
        : "Рисование для ученика заблокировано 🔒"
    );
  };

  const pushHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-15), snapshot]);
  };

  const handleUndo = () => {
    if (!canDraw || history.length <= 1) return;
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

      const dataUrl = canvas.toDataURL("image/png");
      channelRef.current?.send({
        type: "broadcast",
        event: "canvas_snapshot",
        payload: { dataUrl },
      });
    }
  };

  const handleClear = () => {
    if (!canDraw) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    pushHistory();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    channelRef.current?.send({
      type: "broadcast",
      event: "clear_board",
      payload: {},
    });
  };

  const handleToggleBoardBg = () => {
    if (!canDraw) return;
    const nextBg: BoardBgType = boardBg === "grid" ? "lines" : boardBg === "lines" ? "blank" : "grid";
    setBoardBg(nextBg);
    channelRef.current?.send({
      type: "broadcast",
      event: "board_bg",
      payload: { bg: nextBg },
    });
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext("2d");
    if (exportCtx) {
      redrawBackgroundForExport(exportCtx, canvas.width, canvas.height, boardBg);
      exportCtx.drawImage(canvas, 0, 0);
      const link = document.createElement("a");
      link.download = `Конспект-урока-${roomName}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = exportCanvas.toDataURL("image/png");
      link.click();
      showToast("Конспект урока скачан в PNG!");
    }
  };

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
    if (!canDraw) {
      showToast("Рисование заблокировано учителем 🔒");
      return;
    }
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
    lastPointRef.current = coords;
    currentPosRef.current = coords;
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
    if (!drawing || !canDraw) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    currentPosRef.current = coords;

    if (currentTool === "pen") {
      const prev = lastPointRef.current || coords;
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      if (canvas.width > 0 && canvas.height > 0) {
        channelRef.current?.send({
          type: "broadcast",
          event: "draw_segment",
          payload: {
            tool: currentTool,
            color: brushColor,
            width: brushWidth,
            from: { x: prev.x / canvas.width, y: prev.y / canvas.height },
            to: { x: coords.x / canvas.width, y: coords.y / canvas.height },
          },
        });
      }
      lastPointRef.current = coords;
    } else if (currentTool === "highlighter") {
      const prev = lastPointRef.current || coords;
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushWidth * 3.5;
      ctx.lineCap = "square";
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (canvas.width > 0 && canvas.height > 0) {
        channelRef.current?.send({
          type: "broadcast",
          event: "draw_segment",
          payload: {
            tool: currentTool,
            color: brushColor,
            width: brushWidth,
            from: { x: prev.x / canvas.width, y: prev.y / canvas.height },
            to: { x: coords.x / canvas.width, y: coords.y / canvas.height },
          },
        });
      }
      lastPointRef.current = coords;
    } else if (currentTool === "eraser") {
      const prev = lastPointRef.current || coords;
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = brushWidth * 8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      if (canvas.width > 0 && canvas.height > 0) {
        channelRef.current?.send({
          type: "broadcast",
          event: "draw_segment",
          payload: {
            tool: currentTool,
            color: brushColor,
            width: brushWidth,
            from: { x: prev.x / canvas.width, y: prev.y / canvas.height },
            to: { x: coords.x / canvas.width, y: coords.y / canvas.height },
          },
        });
      }
      lastPointRef.current = coords;
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
    if (!drawing) return;
    setDrawing(false);

    const canvas = canvasRef.current;
    if (canvas && startPos && currentPosRef.current && ["line", "arrow", "rect", "circle"].includes(currentTool)) {
      channelRef.current?.send({
        type: "broadcast",
        event: "draw_shape",
        payload: {
          tool: currentTool,
          color: brushColor,
          width: brushWidth,
          start: { x: startPos.x / canvas.width, y: startPos.y / canvas.height },
          end: { x: currentPosRef.current.x / canvas.width, y: currentPosRef.current.y / canvas.height },
        },
      });
    }

    setStartPos(null);
    currentPosRef.current = null;
    lastPointRef.current = null;
    setTempImageData(null);

    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.globalCompositeOperation = "source-over";
    }
  };

  const handleAddText = () => {
    if (!canDraw) return;
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

    channelRef.current?.send({
      type: "broadcast",
      event: "draw_text",
      payload: {
        text: textInputValue,
        color: brushColor,
        width: brushWidth,
        x: textInputPos.x / canvas.width,
        y: textInputPos.y / canvas.height,
      },
    });

    setTextInputPos(null);
    setTextInputValue("");
  };

  // 5. Чат (большой, просторный, удобный) — тестовые данные удалены
  const [messages, setMessages] = useState<
    Array<{ id: string; sender: string; text: string; time: string; isTeacher: boolean }>
  >([]);
  const [chatInput, setChatInput] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    const newMsg = {
      id: String(Date.now()),
      sender: userName || (userRole === "TEACHER" ? teacherName : studentName),
      text: chatInput,
      time: timeStr,
      isTeacher: userRole === "TEACHER",
    };

    setMessages((prev) => [...prev, newMsg]);
    channelRef.current?.send({
      type: "broadcast",
      event: "chat_message",
      payload: newMsg,
    });
    setChatInput("");
  };

  const handleToggleRaisedHand = () => {
    const next = !raisedHand;
    setRaisedHand(next);
    channelRef.current?.send({
      type: "broadcast",
      event: "raise_hand",
      payload: { raised: next, name: userName || studentName },
    });
    showToast(next ? "Вы подняли руку ✋" : "Вы опустили руку");
  };

  // 6. Домашнее задание и заметки преподавателя (без тестовых данных, полностью редактируемые)
  const [homeworkText, setHomeworkText] = useState("");
  const [homeworkDeadline, setHomeworkDeadline] = useState("");
  const [teacherNotes, setTeacherNotes] = useState("");
  const [lessonGrade, setLessonGrade] = useState("5");
  const [studentHomeworkNotes, setStudentHomeworkNotes] = useState("");
  const [studentHomeworkDone, setStudentHomeworkDone] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // Загрузка сохранённого домашнего задания и заметок из localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`lesson_notes_${roomName}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.homeworkText) setHomeworkText(parsed.homeworkText);
          if (parsed.homeworkDeadline) setHomeworkDeadline(parsed.homeworkDeadline);
          if (parsed.teacherNotes) setTeacherNotes(parsed.teacherNotes);
          if (parsed.lessonGrade) setLessonGrade(parsed.lessonGrade);
          if (parsed.studentHomeworkNotes) setStudentHomeworkNotes(parsed.studentHomeworkNotes);
          if (typeof parsed.studentHomeworkDone === "boolean") setStudentHomeworkDone(parsed.studentHomeworkDone);
        }
      } catch (e) {}
    }
  }, [roomName]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      // 1. Сохраняем в localStorage для надежности
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            `lesson_notes_${roomName}`,
            JSON.stringify({
              homeworkText,
              homeworkDeadline,
              teacherNotes,
              lessonGrade,
              studentHomeworkNotes,
              studentHomeworkDone,
            })
          );
        } catch (e) {}
      }

      // 2. Отправляем в Supabase Realtime чтобы собеседник увидел сразу
      channelRef.current?.send({
        type: "broadcast",
        event: "homework_update",
        payload: {
          homeworkText,
          homeworkDeadline,
          teacherNotes,
          lessonGrade,
          studentHomeworkNotes,
          studentHomeworkDone,
        },
      });

      // 3. Отправляем на бэкенд
      if (lessonId) {
        try {
          await fetchWithAuth(`/api/lessons/${lessonId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: teacherNotes || "Заметки по уроку сохранены",
              grade: Number(lessonGrade) || 5,
              feedback: homeworkText ? `Д/З: ${homeworkText}` : undefined,
            }),
          });
        } catch (err) {}
      }

      setNotesSaved(true);
      showToast("Домашнее задание и заметки сохранены! ✓");
      setTimeout(() => setNotesSaved(false), 2200);
    } catch (e) {
      showToast("Сохранено локально ✓");
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
      try {
        const url = new URL(window.location.href);
        // Если ссылку копирует учитель, создаем ссылку специально для входа ученика!
        if (userRole === "TEACHER") {
          url.searchParams.set("role", "student");
        } else {
          url.searchParams.set("role", "teacher");
        }
        navigator.clipboard.writeText(url.toString());
      } catch (e) {
        navigator.clipboard.writeText(window.location.href);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-100 text-slate-900 flex flex-col font-sans select-none overflow-hidden h-[100dvh] max-h-[100dvh] w-screen">
      {/* 1. АДАПТИВНЫЙ ВЕРХНИЙ ХЕДЕР */}
      <header className="h-14 bg-white border-b border-slate-200 px-2.5 sm:px-5 flex items-center justify-between gap-2 shrink-0 z-30">
        {/* Слева: Кнопка назад + название + статус */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <Link
            href={userRole === "TEACHER" ? "/teacher" : userRole === "PARENT" ? "/parent" : "/student"}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer shrink-0"
            title="Выйти в кабинет"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <div className="min-w-0 flex items-center gap-1.5 sm:gap-2.5">
            <span
              style={{ backgroundColor: `${subjectColor}15`, borderColor: `${subjectColor}40`, color: subjectColor }}
              className="px-2.5 py-1 rounded-xl text-xs font-bold border truncate max-w-[130px] sm:max-w-none"
            >
              {subjectName}
            </span>
            <h1 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate max-w-[110px] sm:max-w-xs md:max-w-md hidden xs:block">
              {lessonTitle}
            </h1>
            <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              В эфире
            </span>

            {onRoleChange && (
              <button
                onClick={() => onRoleChange(userRole === "TEACHER" ? "STUDENT" : "TEACHER")}
                className={`px-2 sm:px-2.5 py-1 rounded-xl text-xs font-bold border transition flex items-center gap-1 cursor-pointer shrink-0 ${
                  userRole === "TEACHER"
                    ? "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                }`}
                title="Нажмите для переключения роли (Преподаватель / Ученик)"
              >
                <span>{userRole === "TEACHER" ? "👨‍🏫 Учитель" : "🎒 Ученик"}</span>
                <span className="text-[10px] opacity-60 underline ml-0.5 hidden xs:inline">сменить</span>
              </button>
            )}
          </div>
        </div>

        {/* Десктопная версия (>= md): Доска / Собеседник / Заметки */}
        <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab("board")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "board"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Доска</span>
          </button>
          <button
            onClick={() => setActiveTab("video")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "video"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Собеседник</span>
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "notes"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Заметки урока</span>
          </button>
        </div>

        {/* Справа: Таймер + Д/З (на моб.) + Ссылка + Завершить */}
        <div className="flex items-center gap-1.5 text-xs shrink-0">
          <LessonTimer />

          {/* Быстрое открытие Д/З и заметок на телефоне */}
          <button
            onClick={() => setMobileTab(mobileTab === "notes" ? "board" : "notes")}
            className={`md:hidden px-2.5 py-1.5 rounded-xl border font-bold transition flex items-center gap-1 cursor-pointer ${
              mobileTab === "notes"
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
            }`}
            title={mobileTab === "notes" ? "Вернуться к доске" : "Открыть домашнее задание и заметки"}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="text-[11px]">Д/З</span>
          </button>

          <button
            onClick={copyRoomLink}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold transition flex items-center gap-1 cursor-pointer"
            title="Скопировать ссылку на урок"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Ссылка</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="hidden sm:flex p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
            title={isFullscreen ? "Свернуть" : "На весь экран"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onEndLesson}
            className="hidden md:flex px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition items-center gap-1.5 cursor-pointer shadow-xs"
            title="Завершить урок"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Завершить</span>
          </button>
        </div>
      </header>

      {/* 2. ОСНОВНАЯ ЗОНА */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative min-h-0">
        {/* РЕЖИМ 1: ДОСКА ДЛЯ РИСОВАНИЯ ИЛИ ПОКАЗ ЭКРАНА */}
        <div
          className={`flex-1 flex flex-col bg-white relative overflow-hidden min-h-0 ${
            activeTab === "board" ? "md:flex" : "md:hidden"
          } ${
            mobileTab === "board" ? "flex" : "hidden md:flex"
          }`}
        >
          {/* ЕСЛИ ВКЛЮЧЕНА НАСТОЯЩАЯ ДЕМОНСТРАЦИЯ ЭКРАНА */}
          {screenSharing ? (
            <div className="flex-1 bg-slate-900 flex flex-col relative overflow-hidden">
              <div className="flex-1 flex items-center justify-center p-3">
                <video
                  ref={screenVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="max-h-full max-w-full rounded-2xl shadow-xl object-contain bg-black"
                />
              </div>
              <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  Трансляция вашего экрана активна
                </span>
                <button
                  onClick={toggleScreenShare}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Остановить показ
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* НА ТЕЛЕФОНЕ: СПЛИТ-ЭКРАН — КАМЕРА УЧИТЕЛЯ СВЕРХУ */}
              {mobileSplitView && (
                <div className="md:hidden w-full h-44 xs:h-48 shrink-0 bg-slate-950 border-b border-slate-300 relative overflow-hidden group">
                  {userRole === "TEACHER" && camOn ? (
                    <video
                      ref={mobileVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  ) : (
                    <img
                      src={isTeacher ? myAvatar : partnerAvatar}
                      alt={isTeacher ? myName : partnerName}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                  {/* Верхняя плашка с именем и кнопкой свернуть в PiP */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto">
                    <div className="bg-slate-900/85 backdrop-blur px-2.5 py-1 rounded-lg text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700/60 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="truncate">{isTeacher ? "Камера учителя (Вы)" : `Камера: ${partnerName}`}</span>
                    </div>
                    <button
                      onClick={() => setMobileSplitView(false)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900/85 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 border border-slate-700/60 shadow-xs cursor-pointer"
                      title="Свернуть камеру в мини-окно"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">В окно</span>
                    </button>
                  </div>

                  {/* Нижняя плашка со статусом */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 pointer-events-none">
                    <span className="bg-slate-900/85 backdrop-blur px-2 py-0.5 rounded text-[10px] text-slate-300 font-semibold border border-slate-700/40">
                      {isTeacher ? "Преподаватель (Вы)" : "Преподаватель"}
                    </span>
                    {partnerRole === "Ученик" && raisedHand && (
                      <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-bold text-[10px] animate-pulse">
                        ✋ Рука поднята
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ЕСЛИ РИСОВАНИЕ ДЛЯ УЧЕНИКА ВЫКЛЮЧЕНО */}
              {userRole === "STUDENT" && !studentCanDraw ? (
                <div className="absolute top-2.5 left-2.5 z-20 bg-white/95 backdrop-blur border border-amber-200 text-amber-900 rounded-xl shadow-md px-3.5 py-2 flex items-center gap-2.5 text-xs font-semibold max-w-[calc(100vw-1.25rem)]">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="truncate">Режим просмотра • Учитель пока не открыл доступ</span>
                </div>
              ) : (
                /* ЛАКОНИЧНЫЙ ТУЛБАР ДОСКИ С ГОРИЗОНТАЛЬНОЙ ПРОКРУТКОЙ НА ТЕЛЕФОНЕ */
                <div className="absolute top-2.5 left-2.5 z-20 bg-white border border-slate-200 rounded-xl shadow-md p-1 flex items-center gap-1 text-xs max-w-[calc(100vw-1.25rem)] overflow-x-auto">
                  {/* Кнопка сплит-экрана для телефона */}
                  <button
                    onClick={() => setMobileSplitView((prev) => !prev)}
                    className={`md:hidden px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                      mobileSplitView
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                    }`}
                    title={mobileSplitView ? "Развернуть доску на весь экран" : "Показать камеру учителя сверху"}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span className="text-[11px]">{mobileSplitView ? "Доска" : "Сплит"}</span>
                  </button>
                  <div className="md:hidden h-4 w-px bg-slate-200 mx-0.5" />

                  <button
                    onClick={() => setCurrentTool("pen")}
                    className={`p-2 rounded-lg transition cursor-pointer shrink-0 ${
                      currentTool === "pen" ? "bg-blue-600 text-white font-bold" : "text-slate-700 hover:bg-slate-100"
                    }`}
                    title="Маркер"
                  >
                    <PenTool className="w-4 h-4" />
                  </button>

                    <button
                      onClick={() => setCurrentTool("highlighter")}
                      className={`p-2 rounded-lg transition cursor-pointer ${
                        currentTool === "highlighter"
                          ? "bg-amber-100 text-amber-900 border border-amber-300 font-bold"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                      title="Выделитель"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setCurrentTool("eraser")}
                      className={`p-2 rounded-lg transition cursor-pointer ${
                        currentTool === "eraser"
                          ? "bg-blue-600 text-white font-bold"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                      title="Ластик"
                    >
                      <Eraser className="w-4 h-4" />
                    </button>

                    <div className="h-4 w-px bg-slate-200 mx-0.5" />

                    <button
                      onClick={() => setCurrentTool("line")}
                      className={`p-2 rounded-lg transition cursor-pointer ${
                        currentTool === "line" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                      }`}
                      title="Линия"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setCurrentTool("rect")}
                      className={`p-2 rounded-lg transition cursor-pointer ${
                        currentTool === "rect" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                      }`}
                      title="Прямоугольник"
                    >
                      <Square className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setCurrentTool("circle")}
                      className={`p-2 rounded-lg transition cursor-pointer ${
                        currentTool === "circle" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                      }`}
                      title="Круг"
                    >
                      <Circle className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setCurrentTool("text")}
                      className={`p-2 rounded-lg transition cursor-pointer ${
                        currentTool === "text" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                      }`}
                      title="Текст"
                    >
                      <Type className="w-4 h-4" />
                    </button>

                    <div className="h-4 w-px bg-slate-200 mx-0.5" />

                    {/* 4 классических цвета */}
                    <div className="flex items-center gap-1 px-1">
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
                            if (currentTool === "eraser") setCurrentTool("pen");
                          }}
                          style={{ backgroundColor: c.color }}
                          className={`w-4 h-4 rounded-full transition transform hover:scale-110 cursor-pointer ${
                            brushColor === c.color && currentTool !== "eraser"
                              ? "ring-2 ring-offset-1 ring-blue-500 scale-110"
                              : "border border-slate-300"
                          }`}
                          title={c.name}
                        />
                      ))}
                    </div>

                    <div className="h-4 w-px bg-slate-200 mx-0.5" />

                    {/* Смена фона (клетка / линейка / лист) */}
                    <button
                      onClick={handleToggleBoardBg}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition cursor-pointer"
                      title="Сменить фон"
                    >
                      {boardBg === "grid" ? "Клетка" : boardBg === "lines" ? "Линейка" : "Лист"}
                    </button>

                    <div className="h-4 w-px bg-slate-200 mx-0.5" />

                    <button
                      onClick={handleUndo}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      title="Отменить"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleClear}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Очистить"
                    >
                      <Eraser className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleDownload}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                      title="Скачать PNG"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Кнопка управления правами рисования для преподавателя */}
                    {userRole === "TEACHER" && (
                      <>
                        <div className="h-4 w-px bg-slate-200 mx-0.5" />
                        <button
                          onClick={toggleStudentPermission}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                            studentCanDraw
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                          }`}
                          title={
                            studentCanDraw
                              ? "Запретить ученику рисовать на доске"
                              : "Разрешить ученику рисовать на доске"
                          }
                        >
                          {studentCanDraw ? (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Ученик: Доступ открыт</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Ученик: Доступ закрыт</span>
                            </>
                          )}
                        </button>
                      </>
                    )}

                    {/* Статус для ученика, когда рисование разрешено */}
                    {userRole === "STUDENT" && studentCanDraw && (
                      <>
                        <div className="h-4 w-px bg-slate-200 mx-0.5" />
                        <div className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Рисование доступно</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

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
                      placeholder="Введите текст..."
                      className="text-sm text-slate-900 px-2 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 min-w-[200px]"
                    />
                    <button
                      onClick={handleAddText}
                      className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer"
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

                {/* Холст доски (прозрачный слой над сеткой) */}
                <div
                  style={getBoardBackgroundStyle()}
                  className={`flex-1 w-full h-full relative overflow-hidden touch-none ${
                    canDraw ? "cursor-crosshair" : "cursor-default"
                  }`}
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
                    className={`absolute inset-0 w-full h-full block bg-transparent ${
                      canDraw
                        ? "pointer-events-auto"
                        : "pointer-events-none select-none"
                    }`}
                  />

                  {/* НА ТЕЛЕФОНЕ: ПЛАВАЮЩЕЕ ОКНО КАМЕРЫ УЧИТЕЛЯ (PiP поверх доски) */}
                  {!mobileSplitView && mobilePipOpen && (
                    <div className="md:hidden absolute bottom-3 right-3 z-30 w-32 xs:w-36 aspect-video rounded-2xl overflow-hidden bg-slate-950 border-2 border-white shadow-2xl group transition-all">
                      {userRole === "TEACHER" && camOn ? (
                        <video
                          ref={mobileVideoRef}
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-full object-cover transform -scale-x-100"
                        />
                      ) : (
                        <img
                          src={isTeacher ? myAvatar : partnerAvatar}
                          alt={isTeacher ? myName : partnerName}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                      {/* Имя учителя */}
                      <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                        <span className="text-[10px] font-bold text-white truncate max-w-[80px]">
                          {isTeacher ? "Вы" : partnerName.split(" ")[0]}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      </div>

                      {/* Кнопки управления окном */}
                      <div className="absolute top-1 right-1 flex items-center gap-1">
                        <button
                          onClick={() => setMobileSplitView(true)}
                          className="p-1 rounded-md bg-slate-900/80 hover:bg-blue-600 text-white transition cursor-pointer shadow-xs"
                          title="Разделить экран (камера сверху, доска снизу)"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setMobilePipOpen(false)}
                          className="p-1 rounded-md bg-slate-900/80 hover:bg-rose-600 text-white transition cursor-pointer shadow-xs"
                          title="Скрыть мини-камеру"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* НА ТЕЛЕФОНЕ: КНОПКА ВОЗВРАТА ПЛАВАЮЩЕЙ КАМЕРЫ */}
                  {!mobileSplitView && !mobilePipOpen && (
                    <button
                      onClick={() => setMobilePipOpen(true)}
                      className="md:hidden absolute bottom-3 right-3 z-30 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg border border-slate-700 cursor-pointer animate-fade-in"
                      title="Показать камеру учителя"
                    >
                      <Video className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Камера учителя</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

        {/* РЕЖИМ 2: ЗАМЕТКИ УРОКА И ДОМАШНЕЕ ЗАДАНИЕ */}
        <div
          className={`flex-1 bg-slate-50 p-4 sm:p-6 overflow-y-auto ${
            activeTab === "notes" ? "md:block" : "md:hidden"
          } ${
            mobileTab === "notes" ? "block" : "hidden"
          }`}
        >
          <div className="max-w-3xl mx-auto space-y-5">
            {/* Карточка заголовка */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 mb-1.5">
                  {subjectName}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">{lessonTitle}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Преподаватель: <strong className="text-slate-700">{teacherName}</strong> • Ученик: <strong className="text-slate-700">{studentName}</strong>
                </p>
              </div>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>{savingNotes ? "Сохранение..." : notesSaved ? "Сохранено ✓" : "Сохранить всё"}</span>
              </button>
            </div>

            {/* Карточка 1: Домашнее задание (Homework) */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Домашнее задание</h3>
                    <p className="text-[11px] text-slate-500">
                      {isTeacher ? "Задайте домашнюю работу ученику к следующему занятию" : "Задание от преподавателя"}
                    </p>
                  </div>
                </div>

                {homeworkDeadline && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Срок: {homeworkDeadline}
                  </span>
                )}
              </div>

              {isTeacher ? (
                /* Режим редактирования для учителя */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Текст домашнего задания:
                    </label>
                    <textarea
                      rows={4}
                      value={homeworkText}
                      onChange={(e) => setHomeworkText(e.target.value)}
                      placeholder="Напишите номера заданий, параграфы учебника или инструкции для ученика..."
                      className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-700">Срок сдачи:</label>
                      <input
                        type="date"
                        value={homeworkDeadline}
                        onChange={(e) => setHomeworkDeadline(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-blue-600"
                      />
                    </div>

                    {/* Быстрые шаблоны */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-slate-400 text-xs">Шаблоны:</span>
                      {[
                        "Учебник: упр. №",
                        "Повторить правила",
                        "Решить задачи в тетради",
                      ].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setHomeworkText((prev) => (prev ? `${prev}\n${t} ` : `${t} `))}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                        >
                          + {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Режим просмотра для ученика и родителя */
                <div className="space-y-3">
                  {homeworkText ? (
                    <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 text-sm text-slate-800 whitespace-pre-wrap font-medium">
                      {homeworkText}
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-400 text-xs">
                      Преподаватель пока не оставил домашнее задание. Оно появится здесь после заполнения.
                    </div>
                  )}

                  {/* Чекбокс выполнения для ученика */}
                  {homeworkText && (
                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={studentHomeworkDone}
                          onChange={(e) => {
                            setStudentHomeworkDone(e.target.checked);
                            handleSaveNotes();
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          {studentHomeworkDone ? "Выполнено ✓" : "Отметить как выполненное"}
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Карточка 2: Заметки и рекомендации преподавателя */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Заметки и рекомендации урока</h3>
                    <p className="text-[11px] text-slate-500">
                      {isTeacher ? "Ваш отчет о занятии и комментарии к прогрессу" : "Отзыв и рекомендации преподавателя"}
                    </p>
                  </div>
                </div>

                {isTeacher && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-600">Оценка:</span>
                    <select
                      value={lessonGrade}
                      onChange={(e) => setLessonGrade(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-blue-600 focus:outline-none focus:bg-white"
                    >
                      <option value="5">5 (Отлично)</option>
                      <option value="4">4 (Хорошо)</option>
                      <option value="3">3 (Удовл.)</option>
                      <option value="зачёт">Зачёт</option>
                      <option value="б/о">Без оценки</option>
                    </select>
                  </div>
                )}
              </div>

              {isTeacher ? (
                <div>
                  <textarea
                    rows={4}
                    value={teacherNotes}
                    onChange={(e) => setTeacherNotes(e.target.value)}
                    placeholder="Напишите заметки по уроку: что усвоено, какие были трудности, что повторить..."
                    className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition"
                  />
                </div>
              ) : (
                <div>
                  {teacherNotes ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap font-medium">
                      {teacherNotes}
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-400 text-xs">
                      Заметки преподавателя появятся здесь в ходе или по окончании занятия.
                    </div>
                  )}
                </div>
              )}

              {/* Нижняя кнопка сохранения для учителя */}
              {isTeacher && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingNotes ? "Сохранение..." : notesSaved ? "Сохранено ✓" : "Сохранить домашнее задание и заметки"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* РЕЖИМ 3: СОБЕСЕДНИК В ОСНОВНОМ ОКНЕ (FULLSTAGE ВИДЕО) */}
        <div
          className={`flex-1 flex flex-col bg-slate-950 relative overflow-hidden min-h-0 ${
            activeTab === "video" ? "md:flex" : "md:hidden"
          } ${
            mobileTab === "video" ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Верхняя плашка управления видео-режимом */}
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
            <div className="bg-slate-900/85 backdrop-blur border border-slate-700/80 text-white rounded-xl shadow-lg px-3.5 py-2 flex items-center gap-2.5 text-xs font-semibold pointer-events-auto">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {partnerRole}: <strong className="text-white">{partnerName}</strong>
              </span>
              {partnerRole === "Ученик" && raisedHand && (
                <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md font-bold text-[11px] animate-pulse">
                  ✋ Поднята рука
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => {
                  setActiveTab("board");
                  setMobileTab("board");
                }}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                title="Вернуться к интерактивной доске"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>К доске</span>
              </button>
            </div>
          </div>

          {/* Большое центрированное видео/изображение собеседника */}
          <div className="flex-1 flex items-center justify-center p-3 sm:p-6 relative">
            <div className="w-full h-full max-w-5xl rounded-3xl overflow-hidden relative shadow-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
              <img
                src={partnerAvatar}
                alt={partnerName}
                className="w-full h-full object-cover sm:object-contain"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

              {/* Бейдж собеседника внизу экрана */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700/60 text-white flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-bold truncate">{partnerName}</span>
                  <span className="text-xs text-slate-400">({partnerRole})</span>
                </div>
              </div>
            </div>

            {/* Картинка-в-картинке (камера пользователя) */}
            <div className="absolute bottom-5 right-5 sm:bottom-8 sm:right-8 w-36 sm:w-48 aspect-video rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-700/80 shadow-2xl z-20">
              {camOn ? (
                <video
                  ref={localVideoMainRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-300 p-2">
                  <img
                    src={myAvatar}
                    alt={myName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-600 mb-1"
                  />
                  <span className="text-[10px] font-bold truncate max-w-full">Вы (камера выкл)</span>
                </div>
              )}
              <div className="absolute bottom-1.5 left-1.5 bg-slate-950/80 backdrop-blur px-1.5 py-0.5 rounded text-[10px] text-white font-bold">
                Вы
              </div>
            </div>
          </div>
        </div>

        {/* ПРАВАЯ ПАНЕЛЬ: КАМЕРЫ + ЧАТ С ВОЗМОЖНОСТЬЮ СВЕРНУТЬ ЧАТ ВНИЗ */}
        <div
          className={`w-full md:w-80 lg:w-96 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col shrink-0 h-full min-h-0 ${
            mobileTab === "chat" ? "flex" : "hidden md:flex"
          }`}
        >
          {chatCollapsed ? (
            /* РЕЖИМ: ЧАТ СВЕРНУТ ВНИЗ — КАМЕРА СОБЕСЕДНИКА БОЛЬШАЯ */
            <>
              <div className="flex-1 flex flex-col p-3 bg-slate-100 min-h-0 overflow-hidden">
                {/* Камера собеседника на весь размер панели */}
                <div className="flex-1 w-full min-h-0 relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-300 shadow-sm flex items-center justify-center group">
                  <img
                    src={partnerAvatar}
                    alt={partnerName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                  {/* Верхняя плашка (показывается только при наведении) */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
                    <div className="bg-slate-900/85 backdrop-blur px-2.5 py-1 rounded-lg text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700/60 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="truncate">{partnerName}</span>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab("video");
                        setMobileTab("video");
                      }}
                      className="p-1.5 rounded-lg bg-slate-900/85 hover:bg-blue-600 text-white transition border border-slate-700/60 shadow-xs cursor-pointer"
                      title="Вывести в главное окно"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Нижняя информация (показывается только при наведении) */}
                  <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <span className="bg-slate-900/85 backdrop-blur px-2 py-0.5 rounded text-[11px] text-slate-300 font-medium border border-slate-700/40">
                      {partnerRole}
                    </span>
                    {partnerRole === "Ученик" && raisedHand && (
                      <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-bold text-[11px] animate-pulse">
                        ✋ Рука
                      </span>
                    )}
                  </div>

                  {/* PiP текущего пользователя */}
                  <div className="absolute bottom-2.5 right-2.5 w-24 sm:w-28 aspect-video rounded-xl overflow-hidden bg-slate-800 border-2 border-white shadow-lg z-10">
                    {camOn ? (
                      <video
                        ref={localVideoSideRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover transform -scale-x-100"
                      />
                    ) : (
                      <img
                        src={myAvatar}
                        alt={myName}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute bottom-0.5 left-0.5 bg-slate-900/85 px-1 py-0.2 rounded text-[9px] text-white font-bold opacity-0 hover:opacity-100 transition-opacity">
                      Вы
                    </div>
                  </div>
                </div>
              </div>

              {/* Свернутая плашка чата внизу */}
              <div
                onClick={() => setChatCollapsed(false)}
                className="p-3 bg-white border-t border-slate-200 flex items-center justify-between shadow-xs hover:bg-slate-50 transition cursor-pointer select-none"
                title="Нажмите, чтобы развернуть чат"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800">Чат урока</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                        {messages.length}
                      </span>
                    </div>
                    {messages.length > 0 ? (
                      <p className="text-[11px] text-slate-500 truncate max-w-[150px] sm:max-w-[180px]">
                        {messages[messages.length - 1].sender}: {messages[messages.length - 1].text}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400">Сообщений пока нет</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setChatCollapsed(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1 transition shrink-0 cursor-pointer"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Развернуть</span>
                </button>
              </div>
            </>
          ) : (
            /* РЕЖИМ: ОБЫЧНЫЙ (ВИДЕО СВЕРХУ + РАЗВЕРНУТЫЙ ЧАТ) */
            <>
              {/* Компактный блок видео */}
              <div className="p-3 border-b border-slate-200 bg-slate-50 grid grid-cols-2 gap-2">
                {/* Преподаватель */}
                <div className="rounded-xl overflow-hidden bg-slate-200 aspect-video relative border border-slate-300 group cursor-pointer">
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
                        "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&h=300&fit=crop&crop=faces"
                      }
                      alt={teacherName}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Имя скрыто по умолчанию, показывается при наведении */}
                  <div className="absolute bottom-1 left-1 right-1 bg-slate-900/80 backdrop-blur px-1.5 py-0.5 rounded text-[10px] text-white font-bold truncate opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    {teacherName}
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("video");
                      setMobileTab("video");
                    }}
                    className="absolute top-1 right-1 p-1 rounded-md bg-slate-900/70 hover:bg-blue-600 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-xs cursor-pointer"
                    title="Вывести в главное окно"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Ученик */}
                <div className="rounded-xl overflow-hidden bg-slate-200 aspect-video relative border border-slate-300 group cursor-pointer">
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
                        "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=300&fit=crop&crop=faces"
                      }
                      alt={studentName}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Имя скрыто по умолчанию, показывается при наведении */}
                  <div className="absolute bottom-1 left-1 right-1 bg-slate-900/80 backdrop-blur px-1.5 py-0.5 rounded text-[10px] text-white font-bold truncate flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <span className="truncate">{studentName}</span>
                    {raisedHand && <span className="text-amber-300 ml-1">✋</span>}
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("video");
                      setMobileTab("video");
                    }}
                    className="absolute top-1 right-1 p-1 rounded-md bg-slate-900/70 hover:bg-blue-600 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-xs cursor-pointer"
                    title="Вывести в главное окно"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* БОЛЬШОЙ ЧАТ С КНОПКОЙ СВОРАЧИВАНИЯ */}
              <div className="flex-1 flex flex-col justify-between p-3.5 bg-white overflow-hidden min-h-0">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    Чат урока
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">{messages.length} сообщ.</span>
                    <button
                      onClick={() => setChatCollapsed(true)}
                      className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                      title="Скрыть чат вниз (увеличить камеру собеседника)"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Список сообщений (крупный, удобный) */}
                <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1">
                  {messages.length === 0 ? (
                    <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 text-slate-400">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center mb-1.5 text-slate-400">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-semibold text-slate-600">В чате пока нет сообщений</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Напишите вопрос или реплику в поле ниже</p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe =
                        (userRole === "TEACHER" && m.isTeacher) ||
                        (userRole === "STUDENT" && !m.isTeacher);
                      return (
                        <div
                          key={m.id}
                          className={`p-3 rounded-2xl max-w-[85%] text-sm ${
                            isMe
                              ? "bg-blue-600 text-white ml-auto shadow-xs"
                              : "bg-slate-100 text-slate-900 mr-auto border border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-xs opacity-80 mb-1">
                            <span className="font-bold">{m.sender}</span>
                            <span className="text-[11px]">{m.time}</span>
                          </div>
                          <p className="font-medium text-sm leading-relaxed break-words">{m.text}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Форма ввода */}
                <form onSubmit={handleSendMessage} className="mt-2 flex gap-2 pt-2 border-t border-slate-100">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Напишите сообщение..."
                    className="flex-1 text-sm p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition"
                  />
                  <button
                    type="submit"
                    className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shrink-0 cursor-pointer shadow-xs"
                    title="Отправить"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. НИЖНЯЯ ПАНЕЛЬ УПРАВЛЕНИЯ (ВСЕГДА ВИДНА, АДАПТИРОВАНА ПОД МОБИЛЬНЫЕ) */}
      <footer className="h-16 bg-white border-t border-slate-200 px-3 sm:px-4 flex items-center justify-center shrink-0 z-40 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around w-full max-w-md md:justify-center md:gap-3">
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

          {/* Камера (настоящее переключение веб-камеры) */}
          <button
            onClick={toggleCamera}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer shadow-xs ${
              camOn ? "bg-blue-600 text-white shadow-md shadow-blue-500/25" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            }`}
            title={camOn ? "Выключить камеру" : "Включить камеру"}
          >
            {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Показ экрана (настоящий getDisplayMedia - на десктопе) */}
          <button
            onClick={toggleScreenShare}
            className={`hidden md:flex w-11 h-11 rounded-full items-center justify-center transition cursor-pointer shadow-xs ${
              screenSharing
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            }`}
            title={screenSharing ? "Остановить показ экрана" : "Демонстрация экрана"}
          >
            {screenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </button>

          {/* Поднять руку */}
          <button
            onClick={handleToggleRaisedHand}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer shadow-xs ${
              raisedHand
                ? "bg-amber-400 text-slate-950 font-black animate-pulse"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            }`}
            title={raisedHand ? "Опустить руку" : "Поднять руку"}
          >
            <Hand className="w-5 h-5" />
          </button>

          {/* Быстрое переключение Чат / Доска на мобильных устройствах */}
          <button
            onClick={() => setMobileTab(mobileTab === "board" ? "chat" : "board")}
            className={`md:hidden w-11 h-11 rounded-full flex items-center justify-center border transition cursor-pointer relative shadow-xs ${
              mobileTab === "board"
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                : "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25"
            }`}
            title={mobileTab === "board" ? "Открыть видео и чат" : "Перейти на доску"}
          >
            {mobileTab === "board" ? (
              <>
                <MessageSquare className="w-5 h-5 text-blue-600" />
                {messages.length > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white absolute top-2 right-2" />
                )}
              </>
            ) : (
              <PenTool className="w-5 h-5" />
            )}
          </button>

          {/* Завершить урок */}
          <button
            onClick={onEndLesson}
            className="w-11 h-11 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition cursor-pointer shadow-xs"
            title="Завершить занятие"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
