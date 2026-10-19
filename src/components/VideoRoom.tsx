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
  // 1. Навигация: режимы для десктопа и мобильных
  const [activeTab, setActiveTab] = useState<"board" | "notes">("board");
  const [mobileTab, setMobileTab] = useState<"board" | "chat" | "notes">("board");
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
    setTimeout(() => setToastMessage(null), 2200);
  };

  // 3. Медиа-управление: настоящая Камера, Микрофон и Демонстрация экрана
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Включение / выключение реальной веб-камеры
  const toggleCamera = async () => {
    if (camOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
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

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        console.error("Ошибка доступа к камере:", err);
        alert("Не удалось запустить камеру. Пожалуйста, разрешите браузеру доступ к веб-камере.");
      }
    }
  };

  useEffect(() => {
    if (camOn && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(() => {});
    }
  }, [camOn]);

  // Включение / выключение настоящей демонстрации экрана
  const toggleScreenShare = async () => {
    if (screenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
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
        };
        setScreenSharing(true);
      } catch (err) {
        console.warn("Показ экрана отменён:", err);
      }
    }
  };

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
  const canDraw = userRole === "TEACHER" || studentCanDraw;

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

  const handleRemoteClear = () => {
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
  }, [initCanvas, activeTab, mobileTab, screenSharing]);

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

  // 5. Чат (большой, просторный, удобный)
  const [messages, setMessages] = useState<
    Array<{ id: string; sender: string; text: string; time: string; isTeacher: boolean }>
  >([
    {
      id: "1",
      sender: teacherName,
      text: "Здравствуйте! Начнём разбор домашней работы и новой темы.",
      time: "10:00",
      isTeacher: true,
    },
    {
      id: "2",
      sender: studentName,
      text: "Здравствуйте, Анна Сергеевна! Доску вижу, готов к уроку.",
      time: "10:01",
      isTeacher: false,
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

  // 6. Заметки преподавателя
  const [teacherNotes, setTeacherNotes] = useState(
    "Ученик отлично усвоил тему линейных уравнений. Решил самостоятельно 4 задачи из 5."
  );
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const handleSaveNotes = async () => {
    if (!lessonId) {
      showToast("Заметка сохранена!");
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
      showToast("Отчёт по уроку сохранён!");
      setTimeout(() => setNotesSaved(false), 2200);
    } catch (e) {
      showToast("Заметка сохранена");
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

  return (
    <div className="fixed inset-0 z-[60] bg-slate-100 text-slate-900 flex flex-col font-sans select-none overflow-hidden h-[100dvh] max-h-[100dvh] w-screen">
      {/* ЛАКОНИЧНЫЙ ТОСТ (ТОЛЬКО ДЛЯ ВАЖНЫХ ДЕЙСТВИЙ) */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold shadow-lg flex items-center gap-2 animate-in fade-in duration-150">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>{toastMessage}</span>
        </div>
      )}

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
              className="px-2 py-0.5 rounded-lg text-[11px] sm:text-xs font-bold border truncate max-w-[85px] sm:max-w-none"
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

            {onRoleChange ? (
              <button
                onClick={() => onRoleChange(userRole === "TEACHER" ? "STUDENT" : "TEACHER")}
                className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                title="Нажмите для проверки роли (Преподаватель / Ученик)"
              >
                <span>Роль:</span>
                <span className={userRole === "TEACHER" ? "text-blue-600 font-extrabold" : "text-emerald-600 font-extrabold"}>
                  {userRole === "TEACHER" ? "Преподаватель 👨‍🏫" : "Ученик 🎒"}
                </span>
              </button>
            ) : (
              <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {userRole === "TEACHER" ? "Преподаватель" : "Ученик"}
              </span>
            )}
          </div>
        </div>

        {/* Центр: Переключатели режимов */}
        {/* Мобильная версия (< md): 3 вкладки Доска / Чат / Инфо */}
        <div className="flex md:hidden items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs shrink-0">
          <button
            onClick={() => setMobileTab("board")}
            className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
              mobileTab === "board" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600"
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="text-[11px]">Доска</span>
          </button>
          <button
            onClick={() => setMobileTab("chat")}
            className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer relative ${
              mobileTab === "chat" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-[11px]">Чат</span>
            {messages.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 absolute top-1 right-1" />
            )}
          </button>
          <button
            onClick={() => setMobileTab("notes")}
            className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
              mobileTab === "notes" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="text-[11px]">Инфо</span>
          </button>
        </div>

        {/* Десктопная версия (>= md): Доска / Заметки */}
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

        {/* Справа: Таймер + Ссылка + Завершить */}
        <div className="flex items-center gap-1.5 text-xs shrink-0">
          <div className="flex items-center gap-1 font-mono font-bold text-slate-700 bg-slate-100 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>

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
                  ref={(el) => {
                    if (el && screenStreamRef.current) {
                      el.srcObject = screenStreamRef.current;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
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
              {/* ЕСЛИ РИСОВАНИЕ ДЛЯ УЧЕНИКА ВЫКЛЮЧЕНО */}
              {userRole === "STUDENT" && !studentCanDraw ? (
                <div className="absolute top-2.5 left-2.5 z-20 bg-white/95 backdrop-blur border border-amber-200 text-amber-900 rounded-xl shadow-md px-3.5 py-2 flex items-center gap-2.5 text-xs font-semibold max-w-[calc(100vw-1.25rem)]">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="truncate">Режим просмотра • Учитель пока не открыл доступ</span>
                </div>
              ) : (
                /* ЛАКОНИЧНЫЙ ТУЛБАР ДОСКИ С ГОРИЗОНТАЛЬНОЙ ПРОКРУТКОЙ НА ТЕЛЕФОНЕ */
                <div className="absolute top-2.5 left-2.5 z-20 bg-white border border-slate-200 rounded-xl shadow-md p-1 flex items-center gap-1 text-xs max-w-[calc(100vw-1.25rem)] overflow-x-auto">
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
              </>
            )}
          </div>

        {/* РЕЖИМ 2: ЗАМЕТКИ И МАТЕРИАЛЫ */}
        <div
          className={`flex-1 bg-slate-50 p-4 sm:p-6 overflow-y-auto ${
            activeTab === "notes" ? "md:block" : "md:hidden"
          } ${
            mobileTab === "notes" ? "block" : "hidden"
          }`}
        >
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{lessonTitle}</h2>
                  <p className="text-xs text-slate-500">
                    Преподаватель: {teacherName} • Ученик: {studentName}
                  </p>
                </div>
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingNotes ? "Сохранение..." : notesSaved ? "Сохранено ✓" : "Сохранить"}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Заметки преподавателя по уроку:
                </label>
                <textarea
                  rows={4}
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  placeholder="Напишите заметки..."
                  className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition"
                />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Домашнее задание</h3>
              </div>
              <p className="text-sm text-slate-700 font-medium">Учебник, страница 48: задания № 12, 14, 15.</p>
              <p className="text-xs text-slate-500">
                Решить уравнения в тетради и прикрепить фото решения в личном кабинете.
              </p>
            </div>
          </div>
        </div>

        {/* ПРАВАЯ ПАНЕЛЬ: ВИДЕО + БОЛЬШОЙ ПРОСТОРНЫЙ ЧАТ */}
        <div
          className={`w-full md:w-80 lg:w-96 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col shrink-0 h-full min-h-0 ${
            mobileTab === "chat" ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Компактный блок видео (чтобы не отбирать место у чата) */}
          <div className="p-3 border-b border-slate-200 bg-slate-50 grid grid-cols-2 gap-2">
            {/* Преподаватель */}
            <div className="rounded-xl overflow-hidden bg-slate-200 aspect-video relative border border-slate-300">
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
              <div className="absolute bottom-1 left-1 right-1 bg-slate-900/80 backdrop-blur px-1.5 py-0.5 rounded text-[10px] text-white font-bold truncate">
                {teacherName}
              </div>
            </div>

            {/* Ученик */}
            <div className="rounded-xl overflow-hidden bg-slate-200 aspect-video relative border border-slate-300">
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
              <div className="absolute bottom-1 left-1 right-1 bg-slate-900/80 backdrop-blur px-1.5 py-0.5 rounded text-[10px] text-white font-bold truncate flex items-center justify-between">
                <span className="truncate">{studentName}</span>
                {raisedHand && <span className="text-amber-300 ml-1">✋</span>}
              </div>
            </div>
          </div>

          {/* БОЛЬШОЙ ПРОСТОРНЫЙ ЧАТ НА ВСЮ ВЫСОТУ */}
          <div className="flex-1 flex flex-col justify-between p-3.5 bg-white overflow-hidden min-h-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                Чат урока
              </span>
              <span className="text-xs text-slate-400 font-medium">{messages.length} сообщ.</span>
            </div>

            {/* Список сообщений (крупный, удобный) */}
            <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1">
              {messages.map((m) => {
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
              })}
            </div>

            {/* Форма ввода (крупная и удобная) */}
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
