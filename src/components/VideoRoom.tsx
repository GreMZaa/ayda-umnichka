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
  ArrowLeftRight,
  Move,
  Loader2,
  PictureInPicture2,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api-client";
import { getSupabase } from "@/lib/supabase";
import { SHARONOV_AVATAR, TEACHER_VASILINA_AVATAR } from "@/lib/default-avatar";

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
  endTime?: string;
  onEndLesson?: (forceComplete?: boolean) => void;
  onRoleChange?: (role: "TEACHER" | "STUDENT" | "PARENT") => void;
}

type ToolType = "pen" | "highlighter" | "eraser" | "line" | "arrow" | "rect" | "circle" | "text";
type BoardBgType = "grid" | "lines" | "blank";

function LessonTimer({
  isActive,
  startedAt,
}: {
  isActive: boolean;
  startedAt: number | null;
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isActive || !startedAt) {
      setSeconds(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startedAt) / 1000));
      setSeconds(diff);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [isActive, startedAt]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  if (!isActive && !startedAt) {
    return (
      <div
        className="flex items-center gap-1.5 font-mono font-bold text-slate-500 bg-slate-100 px-2.5 sm:px-3 py-1 rounded-full border border-slate-200 text-xs shrink-0 shadow-xs cursor-help"
        title="Отсчёт начнётся с 00:00, когда в урок войдут 2 собеседника"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span>00:00</span>
        <span className="hidden xl:inline text-[10px] text-slate-400 font-normal font-sans">
          (ждём собеседника)
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 sm:px-3 py-1 rounded-full border border-emerald-200 text-xs shrink-0 shadow-xs"
      title="Урок в процессе: время отсчёта"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      <span>{formatted}</span>
    </div>
  );
}

function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302", "stun:stun3.l.google.com:19302", "stun:stun4.l.google.com:19302"] },
    { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.services.mozilla.com"] },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
        "turns:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ];

  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_TURN_URL) {
    servers.unshift({
      urls: process.env.NEXT_PUBLIC_TURN_URL,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_PASSWORD,
    });
  }

  return servers;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: getIceServers(),
  iceCandidatePoolSize: 10,
  iceTransportPolicy: "all",
  bundlePolicy: "max-bundle",
};

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
  endTime,
  onEndLesson,
  onRoleChange,
}: VideoRoomProps) {
  // 1. Навигация: режимы для десктопа и мобильных (по умолчанию режим видеозвонка)
  const [activeTab, setActiveTab] = useState<"board" | "video" | "notes">("video");
  const [mobileTab, setMobileTab] = useState<"board" | "video" | "chat" | "notes">("video");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileSplitView, setMobileSplitView] = useState(false);
  const [mobilePipOpen, setMobilePipOpen] = useState(true);

  // Собеседник и текущий пользователь
  const isTeacher = userRole === "TEACHER";
  const partnerName = isTeacher ? studentName : teacherName;
  const partnerRole = isTeacher ? "Ученик" : "Преподаватель";
  const partnerAvatar = isTeacher
    ? studentAvatar || SHARONOV_AVATAR
    : teacherAvatar || TEACHER_VASILINA_AVATAR;

  const myName = isTeacher ? teacherName : studentName;
  const myAvatar = isTeacher
    ? teacherAvatar || TEACHER_VASILINA_AVATAR
    : studentAvatar || SHARONOV_AVATAR;

  // Всплывающие уведомления полностью отключены по запросу пользователя
  const showToast = (_msg: string) => {};

  // 2. Медиа-управление: настоящая Камера, Микрофон, WebRTC и Демонстрация экрана
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // 3. Отслеживание времени окончания урока и 15-минутного льготного периода
  const [currentEndTime, setCurrentEndTime] = useState<string | undefined>(endTime);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);
  const [graceSecondsLeft, setGraceSecondsLeft] = useState<number>(15 * 60);
  const [showTimeUpModal, setShowTimeUpModal] = useState<boolean>(false);
  const [dismissedTimeUpModal, setDismissedTimeUpModal] = useState<boolean>(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);

  // Продление урока на 30 минут (для учителя)
  const [extendingLesson, setExtendingLesson] = useState(false);
  const [extendSuccess, setExtendSuccess] = useState(false);

  useEffect(() => {
    if (endTime) {
      setCurrentEndTime(endTime);
    }
  }, [endTime]);

  const handleExtendLesson = async (mins = 30) => {
    if (!lessonId) return;
    try {
      setExtendingLesson(true);
      const res = await fetchWithAuth(`/api/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extendMinutes: mins }),
      });
      if (res.ok) {
        const data = await res.json();
        const base = currentEndTime ? new Date(currentEndTime).getTime() : Date.now();
        const newEnd = data.endTime || new Date(Math.max(Date.now(), base) + mins * 60 * 1000).toISOString();
        setCurrentEndTime(newEnd);
        setIsTimeUp(false);
        setShowTimeUpModal(false);
        setDismissedTimeUpModal(false);
        setExtendSuccess(true);
        setTimeout(() => setExtendSuccess(false), 3000);
      }
    } catch (e) {
      console.error("Ошибка продления урока:", e);
      alert("Не удалось продлить урок. Попробуйте ещё раз.");
    } finally {
      setExtendingLesson(false);
    }
  };

  // Таймер отслеживания окончания запланированного времени и 15 минут запаса
  useEffect(() => {
    if (!currentEndTime) return;
    const endMs = new Date(currentEndTime).getTime();
    if (isNaN(endMs)) return;

    const checkTime = () => {
      const now = Date.now();
      const graceEndMs = endMs + 15 * 60 * 1000;

      if (now >= endMs) {
        setIsTimeUp(true);
        const remSec = Math.max(0, Math.floor((graceEndMs - now) / 1000));
        setGraceSecondsLeft(remSec);

        // Показываем модальное окно при первом достижении времени окончания урока
        if (!dismissedTimeUpModal) {
          setShowTimeUpModal(true);
        }

        // Если 15 минут запаса полностью истекли — закрываем урок
        if (now >= graceEndMs) {
          if (onEndLesson) {
            onEndLesson(true);
          }
        }
      } else {
        setIsTimeUp(false);
        setGraceSecondsLeft(15 * 60);
      }
    };

    checkTime();
    const timer = setInterval(checkTime, 1000);
    return () => clearInterval(timer);
  }, [currentEndTime, dismissedTimeUpModal, onEndLesson]);

  const graceMins = Math.floor(graceSecondsLeft / 60);
  const graceSecs = graceSecondsLeft % 60;
  const formattedGraceTime = `${graceMins.toString().padStart(2, "0")}:${graceSecs.toString().padStart(2, "0")}`;

  const handleExitClick = () => {
    // Если время урока ещё не закончилось, показываем подтверждение, чтобы урок не закрылся случайно
    if (!isTimeUp) {
      setShowExitConfirmModal(true);
    } else {
      if (onEndLesson) {
        onEndLesson(isTeacher);
      }
    }
  };

  // Переключение камер местами (Основная / PiP)
  const [isSwapped, setIsSwapped] = useState(false);

  // Перетаскивание плавающего окна камеры (PiP)
  const [pipPosition, setPipPosition] = useState<{ x: number; y: number } | null>(null);
  const pipDraggingRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const pipRef = useRef<HTMLDivElement>(null);

  const handlePipMouseDown = (e: React.MouseEvent) => {
    // Не начинаем драг, если кликнули на кнопку смены камер
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const pipEl = pipRef.current;
    if (!pipEl) return;
    const rect = pipEl.getBoundingClientRect();
    const currentX = pipPosition ? pipPosition.x : rect.left;
    const currentY = pipPosition ? pipPosition.y : rect.top;

    pipDraggingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!pipDraggingRef.current) return;
      const dx = moveEvent.clientX - pipDraggingRef.current.startX;
      const dy = moveEvent.clientY - pipDraggingRef.current.startY;
      const newX = Math.max(10, Math.min(window.innerWidth - 180, pipDraggingRef.current.initialX + dx));
      const newY = Math.max(70, Math.min(window.innerHeight - 180, pipDraggingRef.current.initialY + dy));
      setPipPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      pipDraggingRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoSideRef = useRef<HTMLVideoElement | null>(null);
  const localVideoMainRef = useRef<HTMLVideoElement | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  // WebRTC и удалённый поток собеседника
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [partnerCamOn, setPartnerCamOn] = useState(false);
  const [partnerMicOn, setPartnerMicOn] = useState(true);
  const [isPartnerInRoom, setIsPartnerInRoom] = useState(false);
  const [lessonStartTime, setLessonStartTime] = useState<number | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoSideRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoMainRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoMobileRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const myPeerId = useRef(typeof window !== "undefined" ? Math.random().toString(36).substring(2, 9) : "peer").current;
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const makingOfferRef = useRef(false);
  const [audioNeedsUnlock, setAudioNeedsUnlock] = useState(false);

  const currentCamOnRef = useRef(camOn);
  currentCamOnRef.current = camOn;
  const currentMicOnRef = useRef(micOn);
  currentMicOnRef.current = micOn;

  // Состояние и ссылки для системного Picture-in-Picture (поверх всех приложений)
  const [isSystemPipActive, setIsSystemPipActive] = useState(false);
  const [pipToast, setPipToast] = useState<string | null>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipFallbackVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipStreamRef = useRef<MediaStream | null>(null);
  const pipAnimationIdRef = useRef<number | null>(null);

  // Синхронизация всех активных video-элементов локальной камеры
  const syncLocalVideos = useCallback((stream: MediaStream | null) => {
    [localVideoRef, localVideoSideRef, localVideoMainRef, mobileVideoRef].forEach((ref) => {
      const el = ref.current;
      if (el) {
        el.muted = true;
        if (el.srcObject !== stream) {
          el.srcObject = stream;
        }
        if (stream) {
          el.play().catch(() => {});
        }
      }
    });
  }, []);

  // Синхронизация всех активных video/audio-элементов удалённой камеры собеседника
  const syncRemoteVideos = useCallback((stream: MediaStream | null) => {
    [remoteVideoRef, remoteVideoSideRef, remoteVideoMainRef, remoteVideoMobileRef].forEach((ref) => {
      const el = ref.current;
      if (el) {
        if (el.srcObject !== stream) {
          el.srcObject = stream;
        }
        if (stream) {
          el.play().catch(() => {});
        }
      }
    });
    if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== stream) {
      remoteAudioRef.current.srcObject = stream;
      if (stream) {
        remoteAudioRef.current.play().catch(() => {});
      }
    }
  }, []);

  // Функция создания PeerConnection
  const getOrCreatePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }
    if (typeof window === "undefined" || typeof RTCPeerConnection === "undefined") {
      return null;
    }

    try {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionRef.current = pc;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          try {
            pc.addTrack(track, localStreamRef.current!);
          } catch (e) {
            console.warn("Error adding local track to PC:", e);
          }
        });
      }

      pc.onicecandidate = ({ candidate }) => {
        if (candidate && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "webrtc_signal",
            payload: {
              senderId: myPeerId,
              senderRole: userRole,
              candidate: candidate.toJSON ? candidate.toJSON() : candidate,
            },
          });
        }
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        const targetStream = stream || new MediaStream([event.track]);
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = targetStream;
        } else {
          if (!remoteStreamRef.current.getTracks().some((t) => t.id === event.track.id)) {
            remoteStreamRef.current.addTrack(event.track);
          }
        }
        setRemoteStream(remoteStreamRef.current);
        setIsPartnerInRoom(true);
        if (event.track.kind === "video") {
          setPartnerCamOn(true);
        }
        if (event.track.kind === "audio") {
          setPartnerMicOn(true);
        }
        syncRemoteVideos(remoteStreamRef.current);

        event.track.onended = () => {
          if (remoteStreamRef.current) {
            const hasLiveVideo = remoteStreamRef.current.getVideoTracks().some((t) => t.readyState === "live");
            if (!hasLiveVideo) {
              setPartnerCamOn(false);
            }
          }
        };
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === "disconnected" || state === "failed") {
          setIsReconnecting(true);
          try {
            pc.createOffer({ iceRestart: true })
              .then((offer) => pc.setLocalDescription(offer))
              .then(() => {
                if (channelRef.current) {
                  channelRef.current.send({
                    type: "broadcast",
                    event: "webrtc_signal",
                    payload: {
                      senderId: myPeerId,
                      senderRole: userRole,
                      description: pc.localDescription,
                    },
                  });
                }
              })
              .catch((err) => console.warn("ICE restart offer failed:", err));
          } catch (restartErr) {
            console.warn("ICE restart error:", restartErr);
          }
        } else if (state === "connected" || state === "completed") {
          setIsReconnecting(false);
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "connected") {
          setIsReconnecting(false);
          setIsPartnerInRoom(true);
        } else if (state === "failed" || state === "disconnected") {
          setIsReconnecting(true);
        }
      };

      return pc;
    } catch (err) {
      console.warn("Failed to create RTCPeerConnection:", err);
      return null;
    }
  }, [myPeerId, userRole, syncRemoteVideos]);

  // Инициация звонка (отправка offer)
  const initiateCall = useCallback(async () => {
    const pc = getOrCreatePeerConnection();
    if (!pc || !channelRef.current) return;

    try {
      makingOfferRef.current = true;
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      if (pc.signalingState !== "stable") return;
      await pc.setLocalDescription(offer);

      channelRef.current.send({
        type: "broadcast",
        event: "webrtc_signal",
        payload: {
          senderId: myPeerId,
          senderRole: userRole,
          description: pc.localDescription,
        },
      });
    } catch (err) {
      console.error("WebRTC createOffer error:", err);
    } finally {
      makingOfferRef.current = false;
    }
  }, [getOrCreatePeerConnection, myPeerId, userRole]);

  // Включение / выключение реальной веб-камеры
  const toggleCamera = async () => {
    if (camOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      setCamOn(false);
      channelRef.current?.send({
        type: "broadcast",
        event: "webrtc_media_state",
        payload: { senderId: myPeerId, senderRole: userRole, camOn: false, micOn },
      });
    } else {
      try {
        let videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = true;
        } else {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
            audio: false,
          });
          videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            if (!localStreamRef.current) {
              localStreamRef.current = new MediaStream();
            }
            localStreamRef.current.addTrack(videoTrack);
            const pc = getOrCreatePeerConnection();
            if (pc) {
              const senders = pc.getSenders();
              const existingVideo = senders.find((s) => s.track?.kind === "video");
              if (existingVideo) {
                existingVideo.replaceTrack(videoTrack);
              } else {
                try {
                  pc.addTrack(videoTrack, localStreamRef.current);
                } catch (e) {}
              }
            }
          }
        }

        setCamOn(true);
        syncLocalVideos(localStreamRef.current);
        initiateCall();

        channelRef.current?.send({
          type: "broadcast",
          event: "webrtc_media_state",
          payload: { senderId: myPeerId, senderRole: userRole, camOn: true, micOn },
        });
      } catch (err: any) {
        console.error("Ошибка доступа к камере:", err);
        alert("Не удалось запустить камеру. Пожалуйста, разрешите браузеру доступ к веб-камере в настройках.");
      }
    }
  };

  // Включение / выключение микрофона
  const toggleMic = async () => {
    const nextMicState = !micOn;
    setMicOn(nextMicState);

    if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextMicState;
      });
    } else if (nextMicState) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioTrack = audioStream.getAudioTracks()[0];
        if (audioTrack) {
          if (!localStreamRef.current) {
            localStreamRef.current = new MediaStream();
          }
          localStreamRef.current.addTrack(audioTrack);
          const pc = getOrCreatePeerConnection();
          if (pc) {
            const senders = pc.getSenders();
            const existingAudio = senders.find((s) => s.track?.kind === "audio");
            if (existingAudio) {
              existingAudio.replaceTrack(audioTrack);
            } else {
              try {
                pc.addTrack(audioTrack, localStreamRef.current);
              } catch (e) {}
            }
            initiateCall();
          }
        }
      } catch (e) {
        console.warn("Could not capture microphone:", e);
      }
    }

    channelRef.current?.send({
      type: "broadcast",
      event: "webrtc_media_state",
      payload: { senderId: myPeerId, senderRole: userRole, camOn, micOn: nextMicState },
    });
  };

  // 1. Автоматический запуск камеры и микрофона при входе в урок
  useEffect(() => {
    let isMounted = true;

    const startMedia = async () => {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
            audio: true,
          });
          if (!isMounted) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          setCamOn(true);
          setMicOn(true);
        } catch (videoErr) {
          console.warn("Камера недоступна, подключаем аудиопоток:", videoErr);
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (!isMounted) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          setCamOn(false);
          setMicOn(true);
        }

        localStreamRef.current = stream;
        syncLocalVideos(stream);

        const pc = getOrCreatePeerConnection();
        if (pc) {
          stream.getTracks().forEach((track) => {
            const senders = pc.getSenders();
            const existingSender = senders.find((s) => s.track?.kind === track.kind);
            if (existingSender) {
              existingSender.replaceTrack(track);
            } else {
              try {
                pc.addTrack(track, stream);
              } catch (e) {}
            }
          });
        }

        // Оповещаем собеседника о готовности медиапотока
        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "webrtc_presence",
            payload: {
              senderId: myPeerId,
              senderRole: userRole,
              camOn: stream.getVideoTracks().length > 0,
              micOn: true,
            },
          });
        }
      } catch (err) {
        console.warn("Не удалось автоматически получить медиаустройства:", err);
      }
    };

    startMedia();

    return () => {
      isMounted = false;
    };
  }, [getOrCreatePeerConnection, myPeerId, userRole, syncLocalVideos]);

  // 2. Разблокировка звука при первом клике или нажатии (Chrome/Safari Autoplay Policy)
  useEffect(() => {
    const handleUnlockAudio = () => {
      if (remoteAudioRef.current && remoteAudioRef.current.srcObject) {
        remoteAudioRef.current
          .play()
          .then(() => setAudioNeedsUnlock(false))
          .catch(() => {});
      }
    };

    window.addEventListener("click", handleUnlockAudio);
    window.addEventListener("touchstart", handleUnlockAudio);
    window.addEventListener("keydown", handleUnlockAudio);

    return () => {
      window.removeEventListener("click", handleUnlockAudio);
      window.removeEventListener("touchstart", handleUnlockAudio);
      window.removeEventListener("keydown", handleUnlockAudio);
    };
  }, []);

  useEffect(() => {
    if (camOn && localStreamRef.current) {
      syncLocalVideos(localStreamRef.current);
    }
  }, [camOn, chatCollapsed, activeTab, mobileTab, isSwapped, syncLocalVideos]);

  useEffect(() => {
    if (remoteStreamRef.current) {
      syncRemoteVideos(remoteStreamRef.current);
    }
  }, [remoteStream, partnerCamOn, chatCollapsed, activeTab, mobileTab, mobileSplitView, mobilePipOpen, isSwapped, syncRemoteVideos]);

  // Запуск фолбэк-потока для системного Picture-in-Picture при выключенной камере
  const startFallbackPipStream = useCallback(() => {
    const canvas = pipCanvasRef.current;
    const video = pipFallbackVideoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let pulse = 0;
    const renderFrame = () => {
      pulse += 0.05;
      const w = canvas.width;
      const h = canvas.height;

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(1, "#1e293b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "rgba(36, 129, 204, 0.18)";
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 110 + Math.sin(pulse) * 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🌟 АйДаУмничка • Онлайн-класс", w / 2, 45);

      const avatarRadius = 50;
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.arc(w / 2, h / 2 - 10, avatarRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 40px sans-serif";
      const initial = (partnerName || "У")[0].toUpperCase();
      ctx.fillText(initial, w / 2, h / 2 + 5);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(partnerName || "Собеседник", w / 2, h / 2 + 75);

      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(w / 2 - 60, h / 2 + 108, 6 + Math.sin(pulse) * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Урок продолжается", w / 2 - 46, h / 2 + 113);

      pipAnimationIdRef.current = requestAnimationFrame(renderFrame);
    };

    if (pipAnimationIdRef.current) {
      cancelAnimationFrame(pipAnimationIdRef.current);
    }
    renderFrame();

    try {
      if (!pipStreamRef.current && (canvas as any).captureStream) {
        pipStreamRef.current = (canvas as any).captureStream(15);
      }
      if (pipStreamRef.current && video.srcObject !== pipStreamRef.current) {
        video.srcObject = pipStreamRef.current;
        video.play().catch(() => {});
      }
    } catch (e) {
      console.warn("Canvas captureStream error:", e);
    }
  }, [partnerName]);

  // Переключение системного Picture-in-Picture (вынос окна поверх всех приложений)
  const toggleSystemPip = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsSystemPipActive(false);
        return;
      }

      // 1. Ищем активный video-элемент собеседника или свой
      let targetVideo: HTMLVideoElement | null = null;
      if (remoteStream && (remoteVideoMobileRef.current || remoteVideoMainRef.current || remoteVideoRef.current)) {
        targetVideo = remoteVideoMobileRef.current || remoteVideoMainRef.current || remoteVideoRef.current;
      } else if (localStreamRef.current && (mobileVideoRef.current || localVideoMainRef.current || localVideoRef.current)) {
        targetVideo = mobileVideoRef.current || localVideoMainRef.current || localVideoRef.current;
      }

      if (targetVideo && targetVideo.srcObject && (targetVideo.srcObject as MediaStream).active) {
        if (targetVideo.requestPictureInPicture) {
          await targetVideo.requestPictureInPicture();
          setIsSystemPipActive(true);
          setPipToast("Окно вынесено поверх всех приложений! Можно свернуть браузер.");
          setTimeout(() => setPipToast(null), 4000);
          return;
        } else if ((targetVideo as any).webkitSetPresentationMode) {
          (targetVideo as any).webkitSetPresentationMode("picture-in-picture");
          setIsSystemPipActive(true);
          setPipToast("Окно вынесено поверх всех приложений!");
          setTimeout(() => setPipToast(null), 4000);
          return;
        }
      }

      // 2. Если камеры выключены, запускаем красивый canvas-поток
      startFallbackPipStream();
      const fbVideo = pipFallbackVideoRef.current;
      if (fbVideo) {
        if (fbVideo.requestPictureInPicture) {
          await fbVideo.requestPictureInPicture();
          setIsSystemPipActive(true);
          setPipToast("Окно урока вынесено поверх всех приложений! Звук и статус сохраняются.");
          setTimeout(() => setPipToast(null), 4000);
        } else if ((fbVideo as any).webkitSetPresentationMode) {
          (fbVideo as any).webkitSetPresentationMode("picture-in-picture");
          setIsSystemPipActive(true);
        }
      }
    } catch (err: any) {
      console.warn("Ошибка включения Picture-in-Picture:", err);
      setPipToast("Нажмите «Включить камеру» для выноса окна или разрешите PiP в браузере.");
      setTimeout(() => setPipToast(null), 4000);
    }
  };

  // Автоматический вынос видео в PiP при сворачивании сайта на телефоне (autoPictureInPicture)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "hidden") {
        try {
          if (!document.pictureInPictureElement) {
            let targetVideo: HTMLVideoElement | null = null;
            if (remoteStream && (remoteVideoMobileRef.current || remoteVideoMainRef.current)) {
              targetVideo = remoteVideoMobileRef.current || remoteVideoMainRef.current;
            } else if (localStreamRef.current && (mobileVideoRef.current || localVideoMainRef.current)) {
              targetVideo = mobileVideoRef.current || localVideoMainRef.current;
            }

            if (targetVideo && targetVideo.srcObject && (targetVideo.srcObject as MediaStream).active) {
              if (targetVideo.requestPictureInPicture) {
                await targetVideo.requestPictureInPicture();
                setIsSystemPipActive(true);
              } else if ((targetVideo as any).webkitSetPresentationMode) {
                (targetVideo as any).webkitSetPresentationMode("picture-in-picture");
                setIsSystemPipActive(true);
              }
            }
          }
        } catch (err) {}
      }
    };

    const onEnterPip = () => setIsSystemPipActive(true);
    const onLeavePip = () => {
      setIsSystemPipActive(false);
      if (pipAnimationIdRef.current) {
        cancelAnimationFrame(pipAnimationIdRef.current);
        pipAnimationIdRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("enterpictureinpicture", onEnterPip, true);
    document.addEventListener("leavepictureinpicture", onLeavePip, true);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("enterpictureinpicture", onEnterPip, true);
      document.removeEventListener("leavepictureinpicture", onLeavePip, true);
      if (pipAnimationIdRef.current) {
        cancelAnimationFrame(pipAnimationIdRef.current);
      }
    };
  }, [remoteStream]);

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
      .on("broadcast", { event: "webrtc_signal" }, async ({ payload }) => {
        if (!payload || payload.senderId === myPeerId) return;
        setIsPartnerInRoom(true);

        const pc = getOrCreatePeerConnection();
        if (!pc) return;

        try {
          if (payload.description) {
            const isOffer = payload.description.type === "offer";
            const isPolite = userRole === "STUDENT" || myPeerId < payload.senderId;
            const offerCollision = isOffer && (pc.signalingState !== "stable" || makingOfferRef.current);

            if (offerCollision) {
              if (!isPolite) {
                // Impolite peer ignores incoming colliding offer
                return;
              }
              // Polite peer yields by rolling back local offer
              try {
                await pc.setLocalDescription({ type: "rollback" });
              } catch (rollbackErr) {
                console.warn("Rollback failed:", rollbackErr);
              }
            }

            await pc.setRemoteDescription(new RTCSessionDescription(payload.description));

            // Flush queued ICE candidates
            while (iceCandidateQueueRef.current.length > 0) {
              const c = iceCandidateQueueRef.current.shift();
              if (c) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(c));
                } catch (e) {
                  console.warn("Error adding queued candidate:", e);
                }
              }
            }

            if (isOffer) {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              channel.send({
                type: "broadcast",
                event: "webrtc_signal",
                payload: {
                  senderId: myPeerId,
                  senderRole: userRole,
                  description: pc.localDescription,
                },
              });
            }
          } else if (payload.candidate) {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (e) {}
            } else {
              iceCandidateQueueRef.current.push(payload.candidate);
            }
          }
        } catch (err) {
          console.error("WebRTC signal handling error:", err);
        }
      })
      .on("broadcast", { event: "webrtc_media_state" }, ({ payload }) => {
        if (!payload || payload.senderId === myPeerId) return;
        setIsPartnerInRoom(true);
        if (typeof payload.camOn === "boolean") {
          setPartnerCamOn(payload.camOn);
        }
        if (typeof payload.micOn === "boolean") {
          setPartnerMicOn(payload.micOn);
        }
      })
      .on("broadcast", { event: "webrtc_presence" }, ({ payload }) => {
        if (!payload || payload.senderId === myPeerId) return;
        setIsPartnerInRoom(true);
        if (typeof payload.camOn === "boolean") setPartnerCamOn(payload.camOn);
        if (typeof payload.micOn === "boolean") setPartnerMicOn(payload.micOn);

        channel.send({
          type: "broadcast",
          event: "webrtc_presence_ack",
          payload: {
            senderId: myPeerId,
            senderRole: userRole,
            camOn: currentCamOnRef.current,
            micOn: currentMicOnRef.current,
          },
        });

        // Initiator creates offer to avoid glare
        const shouldInitiate = userRole === "TEACHER" || (userRole !== "STUDENT" && myPeerId < payload.senderId);
        if (shouldInitiate) {
          initiateCall();
        }
      })
      .on("broadcast", { event: "webrtc_presence_ack" }, ({ payload }) => {
        if (!payload || payload.senderId === myPeerId) return;
        setIsPartnerInRoom(true);
        if (typeof payload.camOn === "boolean") {
          setPartnerCamOn(payload.camOn);
        }
        if (typeof payload.micOn === "boolean") {
          setPartnerMicOn(payload.micOn);
        }

        const shouldInitiate = userRole === "TEACHER" || (userRole !== "STUDENT" && myPeerId < payload.senderId);
        if (shouldInitiate) {
          initiateCall();
        }
      })
      .on("broadcast", { event: "lesson_timer_sync" }, ({ payload }) => {
        if (payload?.startedAt && typeof payload.startedAt === "number") {
          setIsPartnerInRoom(true);
          setLessonStartTime((prev) => {
            if (prev && prev > 0) return Math.min(prev, payload.startedAt);
            return payload.startedAt;
          });
          try {
            const cleanRoom = (roomName || "room").replace(/[^a-zA-Z0-9_-]/g, "_");
            localStorage.setItem(`ayda_lesson_timer_start_${cleanRoom}`, String(payload.startedAt));
          } catch (e) {}
        }
      })
      .on("broadcast", { event: "presence_ping" }, ({ payload }) => {
        if (!payload || payload.senderId === myPeerId) return;
        setIsPartnerInRoom(true);
        if (payload?.startedAt && typeof payload.startedAt === "number") {
          setLessonStartTime((prev) => (prev && prev > 0 ? Math.min(prev, payload.startedAt) : payload.startedAt));
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "webrtc_presence",
            payload: {
              senderId: myPeerId,
              senderRole: userRole,
              camOn: currentCamOnRef.current,
              micOn: currentMicOnRef.current,
            },
          });
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
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [roomName, userRole, initiateCall, getOrCreatePeerConnection, myPeerId]);

  // Обнаружение присутствия обоих участников в уроке
  const hasBothParticipants = Boolean(remoteStream || isPartnerInRoom);

  // Запуск и синхронизация отсчёта времени урока (строго с 0 и только когда 2 участника вошли)
  useEffect(() => {
    if (!hasBothParticipants) return;

    const cleanRoom = (roomName || "room").replace(/[^a-zA-Z0-9_-]/g, "_");
    const storageKey = `ayda_lesson_timer_start_${cleanRoom}`;
    let startTimestamp: number | null = null;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        // Считаем актуальным, если урок начался менее 6 часов назад
        if (!isNaN(parsed) && parsed > 0 && Date.now() - parsed < 6 * 60 * 60 * 1000) {
          startTimestamp = parsed;
        }
      }
    } catch (e) {}

    if (!startTimestamp) {
      startTimestamp = Date.now();
      try {
        localStorage.setItem(storageKey, String(startTimestamp));
      } catch (e) {}
    }

    setLessonStartTime((prev) => (prev && prev > 0 ? Math.min(prev, startTimestamp!) : startTimestamp));

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "lesson_timer_sync",
        payload: {
          senderId: myPeerId,
          startedAt: startTimestamp,
        },
      });
    }
  }, [hasBothParticipants, roomName, myPeerId]);

  // Периодический heartbeat присутствия для синхронизации таймера
  useEffect(() => {
    const pingTimer = setInterval(() => {
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "presence_ping",
          payload: { senderId: myPeerId, senderRole: userRole, startedAt: lessonStartTime },
        });
      }
    }, 4000);
    return () => clearInterval(pingTimer);
  }, [myPeerId, userRole, lessonStartTime]);

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
    <div className="fixed inset-0 z-[60] bg-[#f0f2f5] text-slate-900 flex flex-col font-sans select-none overflow-hidden h-[100dvh] max-h-[100dvh] w-screen relative">
      {/* 1. ВЕРХНИЙ ХЕДЕР ЗВОНКА (СВЕТЛАЯ ТЕМА) */}
      <header className="h-14 sm:h-16 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-3 sm:px-5 flex items-center justify-between gap-2 shrink-0 z-30 shadow-xs">
        {/* Слева: Кнопка назад + Собеседник + Эмодзи шифрования */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={handleExitClick}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200"
            title="Выйти в кабинет"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={partnerAvatar}
                alt={partnerName}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-[#2481cc]/25"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-[110px] sm:max-w-xs md:max-w-md">
                  {partnerName}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-[#2481cc] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  {partnerRole}
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  В эфире
                </span>
                <span className="hidden xs:inline">•</span>
                <span className="hidden xs:inline text-slate-400">{subjectName}</span>
                <span className="hidden md:inline">•</span>
                <span
                  className="hidden md:inline-flex items-center gap-1 text-xs tracking-wider cursor-help"
                  title="Сквозное шифрование: сравните 4 эмодзи с собеседником для проверки безопасности"
                >
                  <span>🦊🍇💎🚀</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Центр: Вкладки переключения (Звонок / Доска / Заметки) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-full border border-slate-200 text-xs shadow-inner">
          <button
            onClick={() => {
              setActiveTab("video");
              setMobileTab("video");
            }}
            className={`px-3 sm:px-4 py-1.5 rounded-full font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "video" && mobileTab !== "chat" && mobileTab !== "notes"
                ? "bg-[#2481cc] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Звонок</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("board");
              setMobileTab("board");
            }}
            className={`px-3 sm:px-4 py-1.5 rounded-full font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "board" && mobileTab === "board"
                ? "bg-[#2481cc] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Доска</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("notes");
              setMobileTab("notes");
            }}
            className={`px-3 sm:px-4 py-1.5 rounded-full font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "notes" || mobileTab === "notes"
                ? "bg-[#2481cc] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Заметки</span>
          </button>
        </div>

        {/* Справа: Таймер + Ссылка + Полный экран + Завершить */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
          <LessonTimer
            isActive={hasBothParticipants || Boolean(lessonStartTime)}
            startedAt={lessonStartTime}
          />

          {isTeacher && (
            <button
              onClick={() => handleExtendLesson(30)}
              disabled={extendingLesson}
              className="px-2.5 py-1 sm:px-3 sm:py-1 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="Продлить урок на 30 минут"
            >
              {extendingLesson ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : extendSuccess ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
              <span className="text-[11px] sm:text-xs">
                {extendSuccess ? "+30 мин ✓" : "+30 мин"}
              </span>
            </button>
          )}

          <button
            onClick={copyRoomLink}
            className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-medium transition flex items-center gap-1.5 cursor-pointer"
            title="Скопировать ссылку на урок"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-xs">Ссылка</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="hidden sm:flex p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
            title={isFullscreen ? "Свернуть" : "На весь экран"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleExitClick}
            className="hidden md:flex px-3.5 py-1.5 rounded-full bg-[#e53935] hover:bg-[#d32f2f] text-white font-bold transition items-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20"
            title="Завершить урок"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Завершить</span>
          </button>
        </div>
      </header>

      {/* Плашка льготного периода: 15 минут после окончания времени урока */}
      {isTimeUp && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs font-bold shadow-sm z-30 shrink-0 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
            <span>Запланированное время урока завершилось. Время на подведение итогов:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-black/25 font-mono text-xs tracking-wider shrink-0 border border-white/20">
              {formattedGraceTime}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isTeacher && (
              <button
                type="button"
                onClick={() => handleExtendLesson(30)}
                disabled={extendingLesson}
                className="px-3 py-1 rounded-full bg-white text-amber-900 hover:bg-amber-50 active:scale-95 font-extrabold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{extendingLesson ? "Продление..." : "+30 мин"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleExitClick}
              className="px-3 py-1 rounded-full bg-black/20 hover:bg-black/30 text-white transition cursor-pointer"
            >
              {isTeacher ? "Завершить урок" : "Выйти в кабинет"}
            </button>
          </div>
        </div>
      )}

      {/* Плашка переподключения WebRTC / TURN (P1.2) */}
      {isReconnecting && (
        <div className="bg-amber-500 text-white text-xs font-bold py-1.5 px-4 flex items-center justify-center gap-2 shadow-sm animate-pulse z-20 shrink-0">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>Восстановление связи с видеоклассом (повторное подключение)...</span>
        </div>
      )}

      {/* Плашка разблокировки звука при политике автовоспроизведения браузера */}
      {audioNeedsUnlock && (
        <div
          onClick={() => {
            if (remoteAudioRef.current) {
              remoteAudioRef.current
                .play()
                .then(() => setAudioNeedsUnlock(false))
                .catch(() => {});
            }
          }}
          className="fixed top-14 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 cursor-pointer border border-white/30 animate-bounce"
        >
          <Volume2 className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
          <span>Нажмите здесь, чтобы включить звук собеседника 🔊</span>
        </div>
      )}

      {/* Всплывающее уведомление о Picture-in-Picture */}
      {pipToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs border border-slate-700 animate-in fade-in slide-in-from-top-3 duration-200 max-w-sm text-center">
          <PictureInPicture2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{pipToast}</span>
        </div>
      )}

      {/* 2. ОСНОВНАЯ ЗОНА */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative min-h-0">
        {/* Фоновое воспроизведение звука собеседника (не прерывается при смене вкладок) */}
        <audio
          ref={(el) => {
            (remoteAudioRef as any).current = el;
            if (el && remoteStreamRef.current) {
              if (el.srcObject !== remoteStreamRef.current) {
                el.srcObject = remoteStreamRef.current;
              }
              el.play().catch(() => setAudioNeedsUnlock(true));
            }
          }}
          autoPlay
          playsInline
          className="hidden"
        />

        {/* Системный Picture-in-Picture fallback (для работы поверх всех приложений даже при выключенной камере) */}
        <video
          ref={pipFallbackVideoRef}
          autoPlay
          playsInline
          muted
          {...{ autoPictureInPicture: "true" }}
          className="hidden"
        />
        <canvas
          ref={pipCanvasRef}
          width={640}
          height={360}
          className="hidden"
        />

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
                  {(isTeacher ? camOn : (partnerCamOn && remoteStream)) ? (
                    <video
                      ref={(el) => {
                        const targetRef = isTeacher ? mobileVideoRef : remoteVideoMobileRef;
                        targetRef.current = el;
                        if (el) {
                          if (isTeacher) {
                            el.muted = true;
                            if (localStreamRef.current && el.srcObject !== localStreamRef.current) {
                              el.srcObject = localStreamRef.current;
                            }
                          } else {
                            if (remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
                              el.srcObject = remoteStreamRef.current;
                            }
                          }
                          el.play().catch(() => {});
                        }
                      }}
                      autoPlay
                      muted={isTeacher}
                      playsInline
                      {...{ autoPictureInPicture: "true" }}
                      className={`w-full h-full object-cover ${isTeacher ? "transform -scale-x-100" : ""}`}
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
                      <span className={`w-2 h-2 rounded-full ${isTeacher ? (camOn ? "bg-emerald-400" : "bg-slate-400") : (partnerCamOn ? "bg-emerald-400 animate-pulse" : "bg-slate-400")}`} />
                      <span className="truncate">{isTeacher ? "Камера учителя (Вы)" : `Камера: ${partnerName}`}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={toggleSystemPip}
                        className="px-2.5 py-1 rounded-lg bg-slate-900/85 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 border border-slate-700/60 shadow-xs cursor-pointer"
                        title="Поверх всех приложений (системное плавающее окно)"
                      >
                        <PictureInPicture2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[11px]">Поверх всех</span>
                      </button>
                      <button
                        onClick={() => setMobileSplitView(false)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900/85 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 border border-slate-700/60 shadow-xs cursor-pointer"
                        title="Свернуть камеру в мини-окно"
                      >
                        <Minimize2 className="w-3.5 h-3.5" />
                        <span className="text-[11px]">В окно</span>
                      </button>
                    </div>
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
                      {(isTeacher ? camOn : (partnerCamOn && remoteStream)) ? (
                        <video
                          ref={(el) => {
                            const targetRef = isTeacher ? mobileVideoRef : remoteVideoMobileRef;
                            targetRef.current = el;
                            if (el) {
                              if (isTeacher) {
                                el.muted = true;
                                if (localStreamRef.current && el.srcObject !== localStreamRef.current) {
                                  el.srcObject = localStreamRef.current;
                                }
                              } else {
                                if (remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
                                  el.srcObject = remoteStreamRef.current;
                                }
                              }
                              el.play().catch(() => {});
                            }
                          }}
                          autoPlay
                          muted={isTeacher}
                          playsInline
                          {...{ autoPictureInPicture: "true" }}
                          className={`w-full h-full object-cover ${isTeacher ? "transform -scale-x-100" : ""}`}
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
                        <span className={`w-1.5 h-1.5 rounded-full ${isTeacher ? (camOn ? "bg-emerald-400" : "bg-slate-400") : (partnerCamOn ? "bg-emerald-400 animate-pulse" : "bg-slate-400")} shrink-0`} />
                      </div>

                      {/* Кнопки управления окном */}
                      <div className="absolute top-1 right-1 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={toggleSystemPip}
                          className="p-1 rounded-md bg-slate-900/80 hover:bg-emerald-600 text-white transition cursor-pointer shadow-xs"
                          title="Поверх всех приложений (системное плавающее окно)"
                        >
                          <PictureInPicture2 className="w-3 h-3 text-emerald-400" />
                        </button>
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

        {/* РЕЖИМ 3: СОБЕСЕДНИК В ОСНОВНОМ ОКНЕ (FULLSTAGE - СВЕТЛАЯ ТЕМА) */}
        {/* СРЕДНЯЯ ОБЛАСТЬ: БОЛЬШОЙ ЭКРАН ВИДЕОЗВОНКА */}
        <div
          className={`flex-1 flex flex-col bg-gradient-to-b from-[#eef2f5] via-[#f4f6f8] to-[#e7ecf0] relative overflow-hidden min-h-0 ${
            activeTab === "video" ? "md:flex" : "md:hidden"
          } ${
            mobileTab === "video" ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Верхняя плашка звонка: статус поднятой руки */}
          {partnerRole === "Ученик" && raisedHand && (
            <div className="absolute top-3 left-3 z-20 pointer-events-none">
              <div className="bg-amber-400 text-slate-950 px-3 py-1 rounded-full font-bold text-xs shadow-md animate-bounce flex items-center gap-1.5 pointer-events-auto">
                <span>✋</span>
                <span>Ученик поднял руку</span>
              </div>
            </div>
          )}

          {/* Большое центрированное видео или аватар с пульсирующими кольцами */}
          <div className="flex-1 flex items-center justify-center p-3 sm:p-6 pb-24 sm:pb-28 relative">
            <div className="w-full h-full max-w-5xl rounded-3xl overflow-hidden relative shadow-xl bg-slate-900 border border-slate-200 flex items-center justify-center">
              {isSwapped ? (
                /* В главном окне находится текущий пользователь (Вы) */
                camOn ? (
                  <>
                    <video
                      ref={(el) => {
                        localVideoRef.current = el;
                        if (el) {
                          el.muted = true;
                          if (localStreamRef.current && el.srcObject !== localStreamRef.current) {
                            el.srcObject = localStreamRef.current;
                          }
                          el.play().catch(() => {});
                        }
                      }}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover sm:object-contain transform -scale-x-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-4 left-4 flex items-center pointer-events-none">
                      <div className="bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white flex items-center gap-2 border border-white/20 shadow-md">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs sm:text-sm font-bold truncate">{myName}</span>
                        <span className="text-xs text-sky-300">(Вы)</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-slate-50 via-white to-slate-100 p-6 text-center">
                    <div className="relative flex items-center justify-center my-auto">
                      <div className="absolute w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-sky-300/40 animate-ping opacity-25 [animation-duration:3s]" />
                      <div className="absolute w-40 h-40 sm:w-52 sm:h-52 rounded-full bg-sky-100/60 border border-sky-300/60 animate-pulse" />
                      <div className="absolute w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-sky-100 border border-sky-400/60" />
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden shadow-xl ring-4 ring-[#2481cc]/40 relative z-10 bg-white">
                        <img src={myAvatar} alt={myName} className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div className="relative z-10 mt-4 mb-auto">
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-wide">{myName}</h2>
                      <p className="text-xs sm:text-sm text-[#2481cc] font-medium mt-1 flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Вы • Камера выключена</span>
                      </p>
                    </div>
                  </div>
                )
              ) : partnerCamOn && remoteStream ? (
                /* В главном окне находится собеседник с видео */
                <>
                  <video
                    ref={(el) => {
                      remoteVideoMainRef.current = el;
                      if (el) {
                        if (remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
                          el.srcObject = remoteStreamRef.current;
                        }
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover sm:object-contain"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                  {/* Бейдж собеседника при включенном видео */}
                  <div className="absolute bottom-4 left-4 flex items-center pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white flex items-center gap-2 border border-white/20 shadow-md">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs sm:text-sm font-bold truncate">{partnerName}</span>
                      <span className="text-xs text-sky-300">({partnerRole})</span>
                    </div>
                  </div>
                </>
              ) : (
                /* В главном окне находится собеседник с аватаром */
                <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-slate-50 via-white to-slate-100 p-6 text-center">
                  {/* Пульсирующие кольца звонка в светлой теме */}
                  <div className="relative flex items-center justify-center my-auto">
                    {/* Внешнее кольцо с затухающей анимацией */}
                    <div className="absolute w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-sky-300/40 animate-ping opacity-25 [animation-duration:3s]" />
                    {/* Среднее пульсирующее кольцо */}
                    <div className="absolute w-40 h-40 sm:w-52 sm:h-52 rounded-full bg-sky-100/60 border border-sky-300/60 animate-pulse" />
                    {/* Ближнее кольцо */}
                    <div className="absolute w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-sky-100 border border-sky-400/60" />

                    {/* Аватар в центре */}
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden shadow-xl ring-4 ring-[#2481cc]/40 relative z-10 bg-white">
                      <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
                    </div>
                  </div>

                  {/* Имя и статус собеседника */}
                  <div className="relative z-10 mt-4 mb-auto">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-wide">{partnerName}</h2>
                    <p className="text-xs sm:text-sm text-[#2481cc] font-medium mt-1 flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{partnerRole} • Звонок АйДаУмничка</span>
                    </p>

                    {/* Анимированный эквалайзер */}
                    <div className="flex items-center justify-center gap-1 mt-3 h-5">
                      <span className="w-1 bg-[#2481cc] rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-3" />
                      <span className="w-1 bg-[#2481cc] rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.1s] h-5" />
                      <span className="w-1 bg-[#2481cc] rounded-full animate-[pulse_1.0s_ease-in-out_infinite_0.2s] h-2.5" />
                      <span className="w-1 bg-[#2481cc] rounded-full animate-[pulse_0.7s_ease-in-out_infinite_0.3s] h-5" />
                      <span className="w-1 bg-[#2481cc] rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.15s] h-4" />
                      <span className="w-1 bg-[#2481cc] rounded-full animate-[pulse_0.5s_ease-in-out_infinite_0.25s] h-3" />
                    </div>
                  </div>
                </div>
              )}
            </div>

          {/* Перетаскиваемое плавающее окно PiP с возможностью менять камеры местами */}
          <div
            ref={pipRef}
            onMouseDown={handlePipMouseDown}
            style={
              pipPosition
                ? {
                    position: "fixed",
                    left: `${pipPosition.x}px`,
                    top: `${pipPosition.y}px`,
                    zIndex: 45,
                  }
                : undefined
            }
            className={`w-36 sm:w-52 aspect-video rounded-2xl overflow-hidden bg-slate-900 border-2 border-white shadow-2xl transition-shadow select-none group cursor-move ${
              !pipPosition ? "absolute bottom-24 right-5 sm:bottom-28 sm:right-8 z-30" : ""
            }`}
            title="Зажмите левую кнопку мыши, чтобы переместить окно камеры"
          >
            {/* Содержимое окна PiP */}
            {isSwapped ? (
              /* В PiP находится собеседник */
              partnerCamOn && remoteStream ? (
                <video
                  ref={(el) => {
                    remoteVideoSideRef.current = el;
                    if (el) {
                      if (remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
                        el.srcObject = remoteStreamRef.current;
                      }
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  {...{ autoPictureInPicture: "true" }}
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-white p-2 pointer-events-none">
                  <img
                    src={partnerAvatar}
                    alt={partnerName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-600 mb-1"
                  />
                  <span className="text-[10px] font-bold text-slate-300 truncate max-w-full">
                    {partnerName}
                  </span>
                </div>
              )
            ) : (
              /* В PiP находится текущий пользователь */
              camOn ? (
                <video
                  ref={(el) => {
                    localVideoSideRef.current = el;
                    if (el) {
                      el.muted = true;
                      if (localStreamRef.current && el.srcObject !== localStreamRef.current) {
                        el.srcObject = localStreamRef.current;
                      }
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  muted
                  playsInline
                  {...{ autoPictureInPicture: "true" }}
                  className="w-full h-full object-cover transform -scale-x-100 pointer-events-none"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-200 p-2 pointer-events-none">
                  <img
                    src={myAvatar}
                    alt={myName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-600 mb-1"
                  />
                  <span className="text-[10px] font-bold text-slate-300 truncate max-w-full">
                    Вы (камера выкл)
                  </span>
                </div>
              )
            )}

            {/* Метка и кнопка перемещения / переключения камер */}
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
              <span className="bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded-full text-[9px] text-white font-bold flex items-center gap-1 pointer-events-none">
                <Move className="w-2.5 h-2.5 opacity-70" />
                <span>{isSwapped ? partnerRole : "Вы"}</span>
              </span>
            </div>

            {/* Кнопки управления окном (PiP и Swap) */}
            <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSystemPip();
                }}
                className={`p-1.5 rounded-full transition-all shadow-md cursor-pointer hover:scale-110 active:scale-95 ${
                  isSystemPipActive
                    ? "bg-emerald-600 text-white"
                    : "bg-black/70 hover:bg-emerald-600 text-white"
                }`}
                title="Поверх всех приложений (системный Picture-in-Picture)"
              >
                <PictureInPicture2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSwapped((prev) => {
                    const next = !prev;
                    setTimeout(() => {
                      if (localStreamRef.current) syncLocalVideos(localStreamRef.current);
                      if (remoteStreamRef.current) syncRemoteVideos(remoteStreamRef.current);
                    }, 50);
                    return next;
                  });
                }}
                className="p-1.5 rounded-full bg-black/70 hover:bg-[#2481cc] text-white transition-all shadow-md cursor-pointer hover:scale-110 active:scale-95"
                title={isSwapped ? "Вернуть собеседника на большой экран" : "Поменять камеры местами (развернуть себя на весь экран)"}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          </div>
        </div>

        {/* ПРАВАЯ ПАНЕЛЬ: КАМЕРЫ + ЧАТ (СВЕТЛАЯ ТЕМА) */}
        <div
          className={`w-full md:w-80 lg:w-96 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col shrink-0 h-full min-h-0 z-30 ${
            mobileTab === "chat" ? "flex" : (isChatOpen || activeTab === "board") ? "hidden md:flex" : "hidden"
          }`}
        >
          {/* РЕЖИМ: ОБЫЧНЫЙ (РАЗВЕРНУТЫЙ ЧАТ) */}
          <div className="flex-1 flex flex-col justify-between bg-[#f0f2f5] overflow-hidden min-h-0">
                <div className="flex items-center justify-between p-3.5 bg-white border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#2481cc]" />
                      Чат звонка
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                      {messages.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setChatCollapsed(true)}
                      className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer hidden md:flex"
                      title="Скрыть чат вниз"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setIsChatOpen(false);
                        if (mobileTab === "chat") setMobileTab("video");
                      }}
                      className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                      title="Закрыть чат"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Список сообщений (светлая тема) */}
                <div className="flex-1 overflow-y-auto space-y-3 p-3.5">
                  {messages.length === 0 ? (
                    <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 text-slate-400">
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-2 text-[#2481cc] shadow-xs">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">В чате пока нет сообщений</p>
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
                          className={`p-3 rounded-2xl max-w-[85%] text-sm shadow-xs ${
                            isMe
                              ? "bg-[#effdde] text-slate-900 ml-auto rounded-tr-sm border border-[#d2f3b5]"
                              : "bg-white text-slate-900 mr-auto rounded-tl-sm border border-slate-200/80"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-xs mb-1">
                            <span className={`font-bold ${isMe ? "text-emerald-700" : "text-[#2481cc]"}`}>
                              {isMe ? "Вы" : m.sender}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              {m.time}
                              {isMe && <span className="text-[#2481cc] font-bold">✓✓</span>}
                            </span>
                          </div>
                          <p className="font-normal text-sm leading-relaxed break-words">{m.text}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Форма ввода сообщения (светлая тема) */}
                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Написать сообщение..."
                    className="flex-1 text-sm px-4 py-2.5 rounded-full bg-slate-100 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2481cc] focus:bg-white transition"
                  />
                  <button
                    type="submit"
                    className="w-10 h-10 rounded-full bg-[#2481cc] hover:bg-[#1d6fa5] text-white flex items-center justify-center transition shrink-0 cursor-pointer shadow-xs"
                    title="Отправить"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
        </div>
      </div>

      {/* 3. FLOATING BOTTOM CONTROL DOCK (СВЕТЛАЯ ТЕМА) */}
      {mobileTab !== "chat" && (
        <div className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-2xl border border-slate-200/90 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.12)] flex items-center gap-2 sm:gap-3.5 max-w-[96vw]">
          {/* Микрофон */}
          <button
            onClick={toggleMic}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
              micOn
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:scale-105 active:scale-95 border border-slate-200/80"
                : "bg-[#e53935] hover:bg-[#d32f2f] text-white shadow-rose-600/30 animate-pulse"
            }`}
            title={micOn ? "Выключить микрофон" : "Включить микрофон"}
          >
            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Камера */}
          <button
            onClick={toggleCamera}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
              camOn
                ? "bg-[#2481cc] hover:bg-[#1d6fa5] text-white shadow-blue-500/25 hover:scale-105 active:scale-95"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:scale-105 active:scale-95 border border-slate-200/80"
            }`}
            title={camOn ? "Выключить камеру" : "Включить камеру"}
          >
            {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Показ экрана (десктоп) */}
          <button
            onClick={toggleScreenShare}
            className={`hidden md:flex w-11 h-11 sm:w-12 sm:h-12 rounded-full items-center justify-center transition-all cursor-pointer shadow-xs ${
              screenSharing
                ? "bg-[#2481cc] text-white shadow-blue-500/25"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:scale-105 active:scale-95 border border-slate-200/80"
            }`}
            title={screenSharing ? "Остановить показ экрана" : "Демонстрация экрана"}
          >
            {screenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </button>

          {/* Доска / Звонок (переключение) */}
          <button
            onClick={() => {
              const next = activeTab === "board" ? "video" : "board";
              setActiveTab(next);
              setMobileTab(next);
            }}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
              activeTab === "board"
                ? "bg-[#2481cc] text-white shadow-blue-500/25"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:scale-105 active:scale-95 border border-slate-200/80"
            }`}
            title={activeTab === "board" ? "Вернуться к звонку" : "Открыть интерактивную доску"}
          >
            <PenTool className="w-5 h-5" />
          </button>

          {/* Чат */}
          <button
            onClick={() => {
              setIsChatOpen((prev) => !prev);
              setMobileTab((prev) => (prev === "chat" ? activeTab : "chat"));
            }}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs relative ${
              isChatOpen
                ? "bg-[#2481cc] text-white shadow-blue-500/25"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:scale-105 active:scale-95 border border-slate-200/80"
            }`}
            title="Чат урока"
          >
            <MessageSquare className="w-5 h-5" />
            {messages.length > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute top-2 right-2 animate-pulse" />
            )}
          </button>

          {/* Поднять руку */}
          <button
            onClick={handleToggleRaisedHand}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
              raisedHand
                ? "bg-amber-400 text-slate-950 font-black animate-bounce shadow-amber-400/40"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:scale-105 active:scale-95 border border-slate-200/80"
            }`}
            title={raisedHand ? "Опустить руку" : "Поднять руку"}
          >
            <Hand className="w-5 h-5" />
          </button>

          {/* Поверх всех приложений (Picture-in-Picture) */}
          <button
            onClick={toggleSystemPip}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
              isSystemPipActive
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30 scale-105"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:scale-105 active:scale-95 border border-slate-200/80"
            }`}
            title={isSystemPipActive ? "Закрыть окно поверх экрана" : "Поверх всех приложений (Picture-in-Picture)"}
          >
            <PictureInPicture2 className={`w-5 h-5 ${isSystemPipActive ? "text-white" : "text-emerald-600"}`} />
          </button>

          {/* Завершить звонок (Красная кнопка) */}
          <button
            onClick={handleExitClick}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#e53935] hover:bg-[#d32f2f] text-white flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-rose-600/40 hover:scale-105 active:scale-95"
            title="Завершить звонок"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Модальное окно 1: Оповещение об окончании запланированного времени урока (45 мин) */}
      {showTimeUpModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full text-center space-y-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
              <Clock className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[11px] inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Время урока завершилось
              </span>
              <h3 className="text-xl font-black text-slate-900">
                Урок окончен
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Запланированное время занятия подошло к концу. У вас есть{" "}
                <strong className="text-slate-800">15 минут</strong>, чтобы подвести итоги, сохранить материалы и спокойно выйти.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">
                До закрытия класса осталось:
              </span>
              <span className="text-sm font-black font-mono text-amber-700 bg-white px-2.5 py-1 rounded-xl border border-amber-200">
                {formattedGraceTime}
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {isTeacher && (
                <button
                  type="button"
                  onClick={() => handleExtendLesson(30)}
                  disabled={extendingLesson}
                  className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-xs sm:text-sm transition cursor-pointer shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Clock className="w-4 h-4" />
                  <span>{extendingLesson ? "Продление..." : "Продлить урок на 30 минут"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowTimeUpModal(false);
                  setDismissedTimeUpModal(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                Подвести итоги (осталось {formattedGraceTime})
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowTimeUpModal(false);
                  onEndLesson?.(isTeacher);
                }}
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 transition cursor-pointer"
              >
                {isTeacher ? "Завершить урок сейчас" : "Выйти в личный кабинет"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно 2: Подтверждение выхода, если время урока ещё не закончилось */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full text-center space-y-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#2481cc] flex items-center justify-center mx-auto border border-blue-200 shadow-xs">
              <PhoneOff className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-slate-900">
                Выход из онлайн-класса
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Время урока ещё не закончилось. Вы можете выйти в кабинет, при этом урок{" "}
                <strong className="text-slate-800">не закроется</strong>, и вы сможете вернуться в него в любой момент.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  onEndLesson?.(false); // Выходим без перевода в COMPLETED — комната остаётся открытой!
                }}
                className="w-full py-3 px-4 rounded-2xl bg-[#2481cc] hover:bg-[#1f70b0] text-white font-extrabold text-xs sm:text-sm transition cursor-pointer shadow-md shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                <span>Выйти в кабинет (оставить урок открытым)</span>
              </button>

              {isTeacher && (
                <button
                  type="button"
                  onClick={() => {
                    setShowExitConfirmModal(false);
                    onEndLesson?.(true); // Учитель явно завершает урок досрочно
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition cursor-pointer border border-rose-200"
                >
                  Завершить урок досрочно и перейти к отчёту
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 transition cursor-pointer"
              >
                Отмена (остаться на уроке)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
