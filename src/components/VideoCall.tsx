'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Layout,
  Maximize2,
  Minimize2,
  ExternalLink,
  Wifi,
  Users,
  MessageSquare,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Plus,
  Volume2,
  VolumeX,
  Paperclip,
  FileText,
  Download,
  Loader2,
  Smartphone,
  RefreshCw,
  Hand,
  LayoutGrid,
} from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export interface ChatAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
  isImage?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'teacher' | 'student';
  text: string;
  time: string;
  attachment?: ChatAttachment;
}

interface VideoCallProps {
  roomToken: string;
  isTeacher?: boolean;
  participantName?: string;
  topic?: string;
  onEndLesson?: (durationSec: number) => void;
  onToggleWhiteboard?: () => void;
  isWhiteboardActive?: boolean;
}

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
  ],
};

export default function VideoCall({
  roomToken,
  isTeacher = false,
  participantName,
  topic,
  onEndLesson,
  onToggleWhiteboard,
  isWhiteboardActive = false,
}: VideoCallProps) {
  const router = useRouter();

  // Helper to clean technical metadata from participant name
  const cleanDisplayName = (name: string): string => {
    if (!name) return '';
    return name.replace(/\s*\(.*?\)$/, '').trim();
  };

  // Resolve participant label based on role
  const rawParticipant =
    participantName || (isTeacher ? 'Ученик центра' : 'Василина Владимировна');
  const resolvedParticipantName = cleanDisplayName(rawParticipant);

  const [micActive, setMicActive] = useState(true);
  const [remoteMicActive, setRemoteMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);
  const [remoteCamActive, setRemoteCamActive] = useState(true);
  const [isSwapped, setIsSwapped] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isPipActive, setIsPipActive] = useState(false);
  const [isPipMinimized, setIsPipMinimized] = useState(false);
  const [isIPhone, setIsIPhone] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  // Vertical / Portrait orientation for mobile phone video calls & screens
  const [isVerticalMode, setIsVerticalMode] = useState(true);

  // VK-Style Video Call States
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const facingModeRef = useRef<'user' | 'environment'>('user');
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [peerHandNotification, setPeerHandNotification] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [areControlsVisible, setAreControlsVisible] = useState(true);

  // Lesson In-Call Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    url: string;
    type: string;
    size: number;
    isImage?: boolean;
  } | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  // Detect iOS / iPhone for screen sharing capability & mobile default orientation
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      const isApple = /iPhone|iPod/.test(ua) || (/iPad/.test(ua) && navigator.maxTouchPoints > 1);
      setIsIPhone(isApple);
    }
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setIsVerticalMode(true);
    }
  }, []);

  // WebRTC Audio element & playback unlock states
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioAutoplayBlocked, setIsAudioAutoplayBlocked] = useState(false);

  // Sync deafen state to remote audio & video tracks
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isDeafened;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = true; // Video element is always muted; audio is handled by dedicated <audio>
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isDeafened && remoteMicActive;
      });
    }
  }, [isDeafened, remoteMicActive]);

  const timerStartTimeRef = useRef<number | null>(null);

  // Synchronize start timestamp across peers and Supabase so both devices match down to the second
  const syncTimerWithTimestamp = (peerStartMs: number | null | undefined) => {
    if (!peerStartMs || isNaN(peerStartMs) || peerStartMs <= 0) return;

    // Use the earliest start timestamp so neither participant has a lagging timer
    const currentStart = timerStartTimeRef.current;
    const authoritativeStart =
      currentStart && currentStart > 0 ? Math.min(currentStart, peerStartMs) : peerStartMs;

    if (timerStartTimeRef.current !== authoritativeStart) {
      timerStartTimeRef.current = authoritativeStart;
      try {
        localStorage.setItem(`aida_lesson_started_${roomToken}`, String(authoritativeStart));
      } catch (_) {}
      const elapsed = Math.max(0, Math.floor((Date.now() - authoritativeStart) / 1000));
      setCallDuration(elapsed);
    }
  };

  // User gesture unlock for audio (iOS/Safari requirement)
  useEffect(() => {
    const unlockAudio = () => {
      if (remoteAudioRef.current && remoteStreamRef.current) {
        if (remoteAudioRef.current.paused) {
          remoteAudioRef.current
            .play()
            .then(() => setIsAudioAutoplayBlocked(false))
            .catch(() => {});
        }
      }
    };

    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Initialize or restore timer from localStorage immediately upon mount
  useEffect(() => {
    if (!roomToken) return;
    try {
      const savedStart = localStorage.getItem(`aida_lesson_started_${roomToken}`);
      if (savedStart) {
        const ms = parseInt(savedStart, 10);
        if (!isNaN(ms) && ms > 0) {
          timerStartTimeRef.current = ms;
          const elapsed = Math.max(0, Math.floor((Date.now() - ms) / 1000));
          setCallDuration(elapsed);
        }
      }
    } catch (_) {}
  }, [roomToken]);

  // Load chat history & authoritative timer start from Supabase on mount/roomToken change
  useEffect(() => {
    if (!roomToken) return;
    let isCancelled = false;

    fetch(`/api/room/messages?roomToken=${encodeURIComponent(roomToken)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isCancelled) return;
        if (Array.isArray(data?.messages)) {
          setChatMessages(data.messages);
        }

        // Restore start timestamp from Supabase if present and lesson is active
        if (data?.startedAt && data.status !== 'completed') {
          const serverStartMs = new Date(data.startedAt).getTime();
          if (!isNaN(serverStartMs) && serverStartMs > 0) {
            syncTimerWithTimestamp(serverStartMs);
          }
        }
      })
      .catch((err) => console.warn('Could not load room messages:', err));

    return () => {
      isCancelled = true;
    };
  }, [roomToken]);

  // WebRTC P2P states
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'waiting'>('waiting');

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const candidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const myPeerIdRef = useRef<string>(
    `peer_${isTeacher ? 'teacher' : 'student'}_${Math.random().toString(36).slice(2, 9)}`
  );

  // Duration clock — ONLY starts counting when both participants are connected in the room, and continues across reloads!
  useEffect(() => {
    // If both participants are in room and timer hasn't started yet: initialize it now!
    if (hasRemoteStream && !timerStartTimeRef.current) {
      const now = Date.now();
      timerStartTimeRef.current = now;
      try {
        localStorage.setItem(`aida_lesson_started_${roomToken}`, String(now));
      } catch (_) {}

      // Inform peer via realtime broadcast
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'timer-started',
          payload: { startedAt: now },
        });
      }

      // Persist started_at in database
      fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_room',
          room_token: roomToken,
          started_at: new Date(now).toISOString(),
        }),
      }).catch(() => {});
    }

    // Tick every second if timer is active
    const timer = setInterval(() => {
      if (timerStartTimeRef.current && (hasRemoteStream || callDuration > 0)) {
        const elapsed = Math.max(0, Math.floor((Date.now() - timerStartTimeRef.current) / 1000));
        setCallDuration(elapsed);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [hasRemoteStream, roomToken, callDuration]);

  // Keep remote audio element updated with remoteStreamRef
  useEffect(() => {
    if (remoteAudioRef.current && remoteStreamRef.current) {
      if (remoteAudioRef.current.srcObject !== remoteStreamRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
      }
      remoteAudioRef.current.muted = isDeafened;
      remoteAudioRef.current
        .play()
        .then(() => setIsAudioAutoplayBlocked(false))
        .catch((err) => {
          console.warn('[WebRTC] Audio autoPlay blocked by policy:', err);
          setIsAudioAutoplayBlocked(true);
        });
    }
  }, [hasRemoteStream, isDeafened, remoteMicActive, isWhiteboardActive, isPipMinimized]);

  // WebRTC PeerConnection management & stream helpers
  const cameraPromiseRef = useRef<Promise<MediaStream | null> | null>(null);

  const resetPeerConnection = () => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (_) {}
      pcRef.current = null;
    }
    candidateQueueRef.current = [];
  };

  const ensureLocalStream = async (): Promise<MediaStream | null> => {
    if (streamRef.current && streamRef.current.active) {
      return streamRef.current;
    }
    if (cameraPromiseRef.current) {
      return await cameraPromiseRef.current;
    }
    const p = startCamera();
    cameraPromiseRef.current = p;
    return await p;
  };

  // WebRTC PeerConnection factory
  const getOrCreatePeerConnection = (stream: MediaStream): RTCPeerConnection => {
    if (pcRef.current && pcRef.current.signalingState !== 'closed') {
      return pcRef.current;
    }

    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    // Attach local media tracks (video & audio)
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle remote tracks (audio & video from student or teacher)
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind, event.track.id);
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = event.streams[0] || new MediaStream();
      }
      if (!remoteStreamRef.current.getTracks().some((t) => t.id === event.track.id)) {
        remoteStreamRef.current.addTrack(event.track);
      }

      if (event.track.kind === 'audio') {
        event.track.enabled = !isDeafened && remoteMicActive;
      }

      // 1. Dedicated audio element for crystal-clear sound that never pauses
      if (remoteAudioRef.current) {
        if (remoteAudioRef.current.srcObject !== remoteStreamRef.current) {
          remoteAudioRef.current.srcObject = remoteStreamRef.current;
        }
        remoteAudioRef.current.muted = isDeafened;
        remoteAudioRef.current
          .play()
          .then(() => setIsAudioAutoplayBlocked(false))
          .catch((err) => {
            console.warn('[WebRTC] Remote audio autoPlay blocked, waiting for user gesture:', err);
            setIsAudioAutoplayBlocked(true);
          });
      }

      // 2. Video element (muted so browser never blocks video playback)
      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
        remoteVideoRef.current.muted = true;
        remoteVideoRef.current.play().catch(() => {});
      }

      setHasRemoteStream(true);
      setConnectionStatus('connected');
    };

    // Send local ICE candidates to peer
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate.toJSON(),
            senderId: myPeerIdRef.current,
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state change:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectionStatus('connected');
        setHasRemoteStream(true);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setConnectionStatus('waiting');
        setHasRemoteStream(false);
        // Automatically attempt reconnection
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'user-joined',
            payload: { senderId: myPeerIdRef.current, isTeacher },
          });
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionStatus('connected');
        setHasRemoteStream(true);
      }
    };

    return pc;
  };

  // Create and send SDP Offer
  const createAndSendOffer = async (pc: RTCPeerConnection) => {
    try {
      console.log('[WebRTC] Creating SDP offer...');
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'offer',
          payload: {
            sdp: offer,
            senderId: myPeerIdRef.current,
          },
        });
        console.log('[WebRTC] SDP offer sent');
      }
    } catch (err) {
      console.warn('[WebRTC] Error creating offer:', err);
    }
  };

  // Handle incoming SDP Offer (Callee)
  const handleRemoteOffer = async (sdp: RTCSessionDescriptionInit, stream: MediaStream) => {
    try {
      console.log('[WebRTC] Handling remote offer...');
      const pc = getOrCreatePeerConnection(stream);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Flush queued ICE candidates
      while (candidateQueueRef.current.length > 0) {
        const cand = candidateQueueRef.current.shift();
        if (cand) {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        }
      }

      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      } as any);
      await pc.setLocalDescription(answer);

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'answer',
          payload: {
            sdp: answer,
            senderId: myPeerIdRef.current,
          },
        });
        console.log('[WebRTC] SDP answer sent');
      }
    } catch (err) {
      console.warn('[WebRTC] Error handling offer:', err);
    }
  };

  // Handle incoming SDP Answer (Caller)
  const handleRemoteAnswer = async (sdp: RTCSessionDescriptionInit) => {
    try {
      console.log('[WebRTC] Handling remote answer...');
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

      // Flush queued ICE candidates
      while (candidateQueueRef.current.length > 0) {
        const cand = candidateQueueRef.current.shift();
        if (cand) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
        }
      }
    } catch (err) {
      console.warn('[WebRTC] Error handling answer:', err);
    }
  };

  // Handle incoming ICE candidate
  const handleRemoteIceCandidate = async (candidate: RTCIceCandidateInit) => {
    try {
      if (pcRef.current && pcRef.current.remoteDescription) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        candidateQueueRef.current.push(candidate);
      }
    } catch (err) {
      console.warn('[WebRTC] Error adding ICE candidate:', err);
    }
  };

  // Start local camera & microphone (supports flipping between selfie and rear camera)
  const startCamera = async (targetFacing?: 'user' | 'environment'): Promise<MediaStream | null> => {
    try {
      const mode = targetFacing || facingModeRef.current;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (err) {
        console.warn('getUserMedia strict audio constraints fallback:', err);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: true,
        });
      }

      // Preserve current microphone and camera states
      stream.getAudioTracks().forEach((track) => {
        track.enabled = micActive;
      });
      stream.getVideoTracks().forEach((track) => {
        track.enabled = camActive;
      });

      streamRef.current = stream;

      // Update local preview depending on swapped state
      if (isSwapped) {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      } else {
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      }
      if (pipVideoRef.current) {
        pipVideoRef.current.srcObject = stream;
      }

      // Update peer connection with local tracks
      if (pcRef.current && pcRef.current.signalingState !== 'closed') {
        const senders = pcRef.current.getSenders();
        stream.getTracks().forEach((newTrack) => {
          const sender = senders.find((s) => s.track?.kind === newTrack.kind);
          if (sender) {
            sender.replaceTrack(newTrack);
          } else {
            pcRef.current?.addTrack(newTrack, stream);
          }
        });
      }

      // Announce ready in room
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'user-joined',
          payload: {
            senderId: myPeerIdRef.current,
            isTeacher,
            startedAt: timerStartTimeRef.current,
          },
        });
      }

      return stream;
    } catch (err) {
      console.warn('WebRTC camera preview error:', err);
      return null;
    } finally {
      cameraPromiseRef.current = null;
    }
  };

  // Flip between front/selfie camera and back/rear camera (VK style)
  const handleFlipCamera = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    facingModeRef.current = nextFacing;
    await startCamera(nextFacing);
  };

  // Raise / lower hand in video call (VK style)
  const handleRaiseHand = () => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'peer-hand-raise',
        payload: {
          senderId: myPeerIdRef.current,
          senderName: isTeacher ? 'Преподаватель' : 'Ученик',
          isRaised: next,
        },
      });
    }
  };

  // Minimize or return to personal cabinet
  const handleMinimizeOrReturn = () => {
    if (confirm('Вернуться в личный кабинет? (Урок продолжится, вы сможете вернуться через кабинет)')) {
      const savedUserId =
        localStorage.getItem('aida_auth_user_id') ||
        localStorage.getItem('aida_user_id') ||
        '';
      if (isTeacher) {
        router.push(`/teacher?id=${savedUserId || 'id179017'}`);
      } else {
        router.push(savedUserId ? `/${savedUserId}` : '/student');
      }
    }
  };

  // Supabase Realtime Signaling setup
  useEffect(() => {
    if (!roomToken) return;

    startCamera();

    const cleanRoomId = roomToken.replace(/[^a-zA-Z0-9_-]/g, '_');
    const channel = supabase.channel(`webrtc_${cleanRoomId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'user-joined' }, async ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        console.log('[WebRTC] Peer joined room:', payload);

        // Sync timer start with peer if available
        syncTimerWithTimestamp(payload?.startedAt);

        // 1. Immediately acknowledge presence so newcomer knows we are already in the room!
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'user-here',
            payload: {
              senderId: myPeerIdRef.current,
              isTeacher,
              startedAt: timerStartTimeRef.current,
            },
          });

          // Also explicitly share active timer timestamp if already running
          if (timerStartTimeRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'timer-started',
              payload: { startedAt: timerStartTimeRef.current },
            });
          }
        }

        // 2. Reset old peer connection to negotiate clean session
        resetPeerConnection();
        setConnectionStatus('connecting');

        // 3. Teacher initiates the offer when a peer joins
        if (isTeacher) {
          const stream = await ensureLocalStream();
          if (stream) {
            const pc = getOrCreatePeerConnection(stream);
            await createAndSendOffer(pc);
          }
        }
      })
      .on('broadcast', { event: 'user-here' }, async ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        console.log('[WebRTC] Peer is already in room (user-here):', payload);

        // Sync timer start with peer if available
        syncTimerWithTimestamp(payload?.startedAt);

        // Reset old peer connection to negotiate clean session
        resetPeerConnection();
        setConnectionStatus('connecting');

        // If I am the teacher and just joined/rejoined, send offer to the peer who was already waiting
        if (isTeacher) {
          const stream = await ensureLocalStream();
          if (stream) {
            const pc = getOrCreatePeerConnection(stream);
            await createAndSendOffer(pc);
          }
        }
      })
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        if (payload?.sdp) {
          console.log('[WebRTC] Received SDP offer, answering...');
          setConnectionStatus('connecting');
          const stream = await ensureLocalStream();
          if (stream) {
            await handleRemoteOffer(payload.sdp, stream);
          }
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        if (payload?.sdp) {
          await handleRemoteAnswer(payload.sdp);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        if (payload?.candidate) {
          await handleRemoteIceCandidate(payload.candidate);
        }
      })
      .on('broadcast', { event: 'peer-mic-change' }, ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        if (typeof payload?.micActive === 'boolean') {
          console.log('[WebRTC] Remote peer mic status changed:', payload.micActive);
          setRemoteMicActive(payload.micActive);
          if (remoteStreamRef.current) {
            remoteStreamRef.current.getAudioTracks().forEach((track) => {
              track.enabled = payload.micActive;
            });
          }
        }
      })
      .on('broadcast', { event: 'peer-screen-share' }, ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        if (typeof payload?.isSharing === 'boolean') {
          console.log('[WebRTC] Peer screen share status changed:', payload.isSharing);
          setIsRemoteScreenSharing(payload.isSharing);
        }
      })
      .on('broadcast', { event: 'peer-cam-change' }, ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        if (typeof payload?.camActive === 'boolean') {
          console.log('[WebRTC] Remote peer camera status changed:', payload.camActive);
          setRemoteCamActive(payload.camActive);
        }
      })
      .on('broadcast', { event: 'peer-hand-raise' }, ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        if (payload?.isRaised) {
          const name = payload?.senderName || 'Собеседник';
          setPeerHandNotification(`${name} поднял(а) руку ✋`);
          setTimeout(() => setPeerHandNotification(null), 6000);
        } else {
          setPeerHandNotification(null);
        }
      })
      .on('broadcast', { event: 'chat-message' }, ({ payload }) => {
        if (payload?.id && (payload?.text || payload?.attachment)) {
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
          setIsChatOpen((open) => {
            if (!open) {
              setUnreadChatCount((count) => count + 1);
            }
            return open;
          });
          setTimeout(() => {
            chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }
      })
      .on('broadcast', { event: 'timer-started' }, ({ payload }) => {
        if (payload?.startedAt) {
          syncTimerWithTimestamp(Number(payload.startedAt));
        }
      })
      .on('broadcast', { event: 'lesson-ended' }, ({ payload }) => {
        if (!isTeacher) {
          const durationMin = Math.round((payload?.durationSec || 0) / 60) || 1;
          alert(`Преподаватель завершил урок! Длительность: ${durationMin} мин.`);
          if (onEndLesson) onEndLesson(payload?.durationSec || 0);
        }
      })
      .on('broadcast', { event: 'user-left' }, ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        console.log('[WebRTC] Peer left room:', payload);
        resetPeerConnection();
        setHasRemoteStream(false);
        setConnectionStatus('waiting');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[WebRTC] Connected to signaling channel');
          channel.send({
            type: 'broadcast',
            event: 'user-joined',
            payload: {
              senderId: myPeerIdRef.current,
              isTeacher,
              startedAt: timerStartTimeRef.current,
            },
          });
        }
      });

    return () => {
      try {
        channel.send({
          type: 'broadcast',
          event: 'user-left',
          payload: { senderId: myPeerIdRef.current },
        });
        supabase.removeChannel(channel);
      } catch (_) {}

      resetPeerConnection();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      remoteStreamRef.current = null;
    };
  }, [roomToken, isTeacher]);

  // Periodic presence ping while waiting for peer (auto-reconnects smoothly on page reload)
  useEffect(() => {
    if (!roomToken || hasRemoteStream) return;

    const interval = setInterval(() => {
      if (channelRef.current && !hasRemoteStream) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'user-joined',
          payload: {
            senderId: myPeerIdRef.current,
            isTeacher,
            startedAt: timerStartTimeRef.current,
          },
        });
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [roomToken, hasRemoteStream, isTeacher]);

  // Re-bind video srcObject if ref attaches or mode switches
  useEffect(() => {
    if (streamRef.current) {
      if (localVideoRef.current && localVideoRef.current.srcObject !== streamRef.current) {
        localVideoRef.current.srcObject = streamRef.current;
      }
      if (pipVideoRef.current && pipVideoRef.current.srcObject !== streamRef.current) {
        pipVideoRef.current.srcObject = streamRef.current;
      }
    }
  }, [isWhiteboardActive, camActive, isSwapped]);

  // Native Picture-in-Picture (stays floating on top of all OS apps like in Telegram/VK)
  const togglePictureInPicture = async () => {
    try {
      const activeVideo = ((hasRemoteStream ? remoteVideoRef.current : localVideoRef.current) || pipVideoRef.current) as any;
      if (!activeVideo) {
        alert('Камера еще подключается, попробуйте через секунду.');
        return;
      }

      // 1. iOS Safari (WebKit Presentation Mode)
      if (
        typeof activeVideo.webkitSetPresentationMode === 'function' &&
        activeVideo.webkitSupportsPresentationMode?.('picture-in-picture')
      ) {
        const isPiP = activeVideo.webkitPresentationMode === 'picture-in-picture';
        const nextMode = isPiP ? 'inline' : 'picture-in-picture';
        activeVideo.webkitSetPresentationMode(nextMode);
        setIsPipActive(nextMode === 'picture-in-picture');
        return;
      }

      // 2. Standard W3C Picture-in-Picture (Android Chrome, Desktop Chrome, Edge, Safari macOS)
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
      } else if (typeof activeVideo.requestPictureInPicture === 'function') {
        await activeVideo.requestPictureInPicture();
        setIsPipActive(true);
      } else {
        alert('Режим «Картинка в картинке» не поддерживается этим браузером.');
      }
    } catch (err: any) {
      console.warn('Picture-in-Picture error:', err);
      if (err?.name === 'NotAllowedError') {
        alert('Нажмите кнопку еще раз для активации режима «Картинка в картинке».');
      }
    }
  };

  // Auto Picture-in-Picture when user minimizes tab, presses home or switches to another app
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        try {
          const activeVideo = (hasRemoteStream ? remoteVideoRef.current : localVideoRef.current) as any;
          if (!activeVideo) return;

          // iOS WebKit
          if (
            typeof activeVideo.webkitSetPresentationMode === 'function' &&
            activeVideo.webkitSupportsPresentationMode?.('picture-in-picture')
          ) {
            if (activeVideo.webkitPresentationMode !== 'picture-in-picture') {
              activeVideo.webkitSetPresentationMode('picture-in-picture');
              setIsPipActive(true);
            }
            return;
          }

          // Standard W3C
          if (!document.pictureInPictureElement && typeof activeVideo.requestPictureInPicture === 'function') {
            await activeVideo.requestPictureInPicture();
            setIsPipActive(true);
          }
        } catch (_) {
          // Handled silently
        }
      }
    };

    const handleLeavePiP = () => {
      setIsPipActive(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('leavepictureinpicture', handleLeavePiP);
    window.addEventListener('pagehide', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('leavepictureinpicture', handleLeavePiP);
      window.removeEventListener('pagehide', handleVisibilityChange);
    };
  }, [hasRemoteStream]);

  // Screen sharing toggle with capability check and track replacement
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // 1. Check if browser supports getDisplayMedia
        if (
          typeof navigator !== 'undefined' &&
          navigator.mediaDevices &&
          typeof navigator.mediaDevices.getDisplayMedia === 'function'
        ) {
          try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
              video: {
                cursor: 'always',
                displaySurface: 'monitor',
              } as any,
              audio: false,
            });

            screenStreamRef.current = screenStream;
            const screenTrack = screenStream.getVideoTracks()[0];
            if (!screenTrack) return;

            // Replace track in peer connection
            if (pcRef.current && pcRef.current.signalingState !== 'closed') {
              const videoSender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
              if (videoSender) {
                await videoSender.replaceTrack(screenTrack);
              } else {
                pcRef.current.addTrack(screenTrack, screenStream);
              }
            }

            if (localVideoRef.current) {
              localVideoRef.current.srcObject = screenStream;
            }

            // Notify peer via signaling channel
            if (channelRef.current) {
              channelRef.current.send({
                type: 'broadcast',
                event: 'peer-screen-share',
                payload: { senderId: myPeerIdRef.current, isSharing: true },
              });
            }

            screenTrack.onended = () => {
              stopScreenSharing();
            };

            setIsScreenSharing(true);
            return;
          } catch (captureErr: any) {
            // User cancelled browser capture dialog
            if (captureErr?.name === 'NotAllowedError') {
              return;
            }
            console.warn('getDisplayMedia attempt error:', captureErr);
          }
        }

        // 2. If getDisplayMedia is not available (e.g. iOS Safari on iPhone where Apple restricts system screen recording):
        // Offer interactive whiteboard mode for visual collaboration
        if (onToggleWhiteboard) {
          const switchMode = confirm(
            'На iPhone в браузере Safari компания Apple блокирует запись экрана веб-сайтами.\n\nВключить интерактивную доску для показа учебных материалов и совместной работы?'
          );
          if (switchMode) {
            onToggleWhiteboard();
          }
        } else {
          alert(
            'На мобильных устройствах iOS Safari демонстрация всего экрана ограничена Apple. Для показа учебных материалов используйте интерактивную доску или компьютер.'
          );
        }
      } else {
        stopScreenSharing();
      }
    } catch (err: any) {
      console.warn('Screen share error:', err);
      setIsScreenSharing(false);
    }
  };

  const stopScreenSharing = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (streamRef.current) {
      const cameraTrack = streamRef.current.getVideoTracks()[0];
      if (pcRef.current && cameraTrack) {
        const videoSender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(cameraTrack);
        }
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = streamRef.current;
      }
    }

    // Notify peer that screen share ended
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'peer-screen-share',
        payload: { senderId: myPeerIdRef.current, isSharing: false },
      });
    }

    setIsScreenSharing(false);
  };

  const toggleMic = () => {
    const nextMicActive = !micActive;
    setMicActive(nextMicActive);

    // 1. Mute local media stream audio tracks
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextMicActive;
      });
    }

    // 2. Mute RTCPeerConnection audio senders directly
    if (pcRef.current && pcRef.current.signalingState !== 'closed') {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = nextMicActive;
        }
      });
    }

    // 3. Broadcast status change to peer via signaling channel
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'peer-mic-change',
        payload: {
          senderId: myPeerIdRef.current,
          micActive: nextMicActive,
        },
      });
    }
  };

  const toggleCam = async () => {
    if (camActive) {
      // 1. Fully stop camera tracks so hardware sensor and LED indicator shut off
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach((track) => {
          track.stop();
        });
      }
      setCamActive(false);

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'peer-cam-change',
          payload: { senderId: myPeerIdRef.current, camActive: false },
        });
      }
    } else {
      // 2. Re-acquire camera stream
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        if (newVideoTrack && streamRef.current) {
          // Remove old stopped tracks
          streamRef.current.getVideoTracks().forEach((t) => streamRef.current?.removeTrack(t));
          streamRef.current.addTrack(newVideoTrack);

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = streamRef.current;
          }

          if (pcRef.current && pcRef.current.signalingState !== 'closed') {
            const videoSender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
            if (videoSender) {
              await videoSender.replaceTrack(newVideoTrack);
            }
          }
        }
        setCamActive(true);

        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'peer-cam-change',
            payload: { senderId: myPeerIdRef.current, camActive: true },
          });
        }
      } catch (err) {
        console.warn('Failed to restart camera:', err);
      }
    }
  };

  // Toggle deafen (Заглушить динамики как в ВК)
  const toggleDeafen = () => {
    setIsDeafened((prev) => !prev);
  };

  // Client-side image compression: downscales max 1280px and converts to 72% JPEG
  const compressImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) return file;
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          const maxDim = 1280;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) {
                resolve(file);
              } else {
                const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressed);
              }
            },
            'image/jpeg',
            0.72
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const originalFile = files[0];
    e.target.value = '';

    try {
      setIsUploadingAttachment(true);
      const processedFile = await compressImage(originalFile);

      const formData = new FormData();
      formData.append('file', processedFile);

      const res = await fetch('/api/room/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка при загрузке файла');
      }

      setAttachedFile({
        name: data.name || originalFile.name,
        url: data.url,
        type: data.type || originalFile.type,
        size: data.size || processedFile.size,
        isImage: Boolean(data.isImage),
      });
    } catch (err: any) {
      console.error('File upload error:', err);
      alert(err.message || 'Не удалось прикрепить файл');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed && !attachedFile) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId: myPeerIdRef.current,
      senderName: isTeacher ? 'Преподаватель' : 'Ученик',
      senderRole: isTeacher ? 'teacher' : 'student',
      text: trimmed,
      time: timeStr,
      attachment: attachedFile ? { ...attachedFile } : undefined,
    };

    setChatMessages((prev) => [...prev, msg]);
    setChatInput('');
    setAttachedFile(null);

    // 1. Broadcast to peer via Supabase Realtime
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: msg,
      });
    }

    // 2. Persist in Supabase DB
    try {
      await fetch('/api/room/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomToken, message: msg }),
      });
    } catch (err) {
      console.warn('Failed to persist message in Supabase:', err);
    }

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleChatButtonClick = () => {
    setIsChatOpen(true);
    setUnreadChatCount(0);
    setTimeout(() => {
      document.getElementById('lesson-chat-section')?.scrollIntoView({ behavior: 'smooth' });
      chatInputRef.current?.focus();
    }, 60);
  };

  const handleEnd = () => {
    if (confirm('Завершить урок? Будет зафиксировано время и открыто окно для отправки домашнего задания.')) {
      const finalDuration = timerStartTimeRef.current
        ? Math.max(callDuration, Math.floor((Date.now() - timerStartTimeRef.current) / 1000))
        : callDuration;

      try {
        localStorage.removeItem(`aida_lesson_started_${roomToken}`);
      } catch (_) {}

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'lesson-ended',
          payload: { durationSec: finalDuration },
        });
      }
      if (onEndLesson) onEndLesson(finalDuration);
    }
  };

  // PiP (Picture in Picture) mode when Whiteboard is open — strictly displays the REMOTE participant (student or teacher)
  if (isWhiteboardActive) {
    if (isPipMinimized) {
      return (
        <>
          <audio
            ref={remoteAudioRef}
            autoPlay
            playsInline
            controls={false}
            style={{
              position: 'fixed',
              top: -9999,
              left: -9999,
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
          <div
            onClick={() => setIsPipMinimized(false)}
            className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-40 bg-white/95 backdrop-blur-md rounded-full shadow-2xl border-2 border-coralAccent p-1.5 flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            title="Нажмите, чтобы развернуть видео собеседника"
          >
            <div className="w-9 h-9 rounded-full bg-[#161F38] text-white flex items-center justify-center font-black text-xs shrink-0 overflow-hidden relative border border-coralAccent/40">
              {hasRemoteStream && remoteCamActive ? (
                <video
                  ref={(el) => {
                    if (el) {
                      if (remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
                        el.srcObject = remoteStreamRef.current;
                      }
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{resolvedParticipantName[0] || 'П'}</span>
              )}
            </div>
            <div className="pr-2 flex items-center gap-1.5">
              <span className="text-xs font-black text-[#161F38] truncate max-w-[90px] sm:max-w-none">
                {resolvedParticipantName}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${hasRemoteStream ? 'bg-[#5C8519] animate-pulse' : 'bg-amber-400'}`}
              />
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          controls={false}
          style={{
            position: 'fixed',
            top: -9999,
            left: -9999,
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: 'none',
          }}
        />
        <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-40 w-44 xs:w-52 sm:w-80 bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-coralAccent overflow-hidden text-ink-900 animate-in slide-in-from-bottom-2">
          <div className="p-1.5 sm:p-2.5 bg-[#FFF7EE] flex items-center justify-between text-xs border-b border-[#F4E3D2] font-black">
            <div className="flex items-center gap-1 sm:gap-1.5 truncate">
              <span
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                  hasRemoteStream ? 'bg-[#5C8519] animate-pulse' : 'bg-amber-400'
                } shrink-0`}
              />
              <span className="truncate text-[#161F38] text-[10px] sm:text-[11px] font-black">{resolvedParticipantName}</span>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              {/* Minimize to small pill */}
              <button
                type="button"
                onClick={() => setIsPipMinimized(true)}
                className="p-1 hover:bg-[#FDEEDC] rounded-md text-[#161F38] cursor-pointer"
                title="Свернуть видео, чтобы освободить доску"
              >
                <Minimize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <button
                type="button"
                onClick={togglePictureInPicture}
                className="p-1 hover:bg-[#FDEEDC] rounded-md text-[#161F38] hidden sm:block cursor-pointer"
                title="Поверх всех окон (как в Telegram/VK)"
              >
                <ExternalLink className="w-3.5 h-3.5 text-coralAccent" />
              </button>
              <button
                type="button"
                onClick={onToggleWhiteboard}
                className="p-1 hover:bg-[#FDEEDC] rounded-md text-[#161F38] cursor-pointer"
                title="Развернуть видео на весь экран"
              >
                <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          </div>

          {/* Real Live Video of Remote Peer ( собеседник: ученик или учитель ) */}
          <div className="relative aspect-video bg-[#161F38] flex items-center justify-center overflow-hidden">
            {/* Live Video element for remote stream */}
            <video
              ref={(el) => {
                if (el) {
                  if (remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
                    el.srcObject = remoteStreamRef.current;
                  } else if (remoteVideoRef.current?.srcObject && el.srcObject !== remoteVideoRef.current.srcObject) {
                    el.srcObject = remoteVideoRef.current.srcObject;
                  }
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted
              controls={false}
              className={`w-full h-full ${isRemoteScreenSharing ? 'object-contain bg-black' : 'object-cover'} ${
                hasRemoteStream && remoteCamActive ? 'block' : 'hidden'
              }`}
            />

            {/* Remote peer camera turned off or waiting placeholder — clean without text clutter */}
            {(!hasRemoteStream || !remoteCamActive) && (
              <div className="absolute inset-0 bg-[#161F38] flex items-center justify-center p-2 select-none z-10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-coralAccent text-lg sm:text-xl font-black shadow-inner">
                  {resolvedParticipantName[0] || 'П'}
                </div>
              </div>
            )}

            {/* Time Pill */}
            <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold shadow-xs z-20">
              <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${hasRemoteStream ? 'bg-[#5C8519] animate-pulse' : 'bg-amber-400'}`} />
              <span>{formatTime(callDuration)}</span>
            </div>

            {/* Remote Peer name badge in PiP — strictly the other person */}
            <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1 shadow-xs z-20">
              <span className={`w-1.5 h-1.5 rounded-full ${hasRemoteStream ? 'bg-[#5C8519] animate-pulse' : 'bg-amber-400'}`} />
              <span className="truncate max-w-[100px] sm:max-w-[140px]">{resolvedParticipantName}</span>
              {!remoteMicActive && hasRemoteStream && (
                <MicOff className="w-2.5 h-2.5 text-rose-300 ml-0.5" />
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Full Video Workspace (100% spacious, responsive on mobile & desktop)
  return (
    <>
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        controls={false}
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
      {/* VK Calls Layout */}
      <div className="relative w-full h-[100dvh] bg-[#FFF7EE] overflow-hidden select-none">
        {/* Banner if browser autoplay policy blocked sound until interaction */}
        {isAudioAutoplayBlocked && hasRemoteStream && !isDeafened && (
          <div
            onClick={() => {
              if (remoteAudioRef.current) {
                remoteAudioRef.current
                  .play()
                  .then(() => setIsAudioAutoplayBlocked(false))
                  .catch(() => {});
              }
            }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold text-xs rounded-full flex items-center gap-2 shadow-2xl cursor-pointer animate-pulse active:scale-95"
          >
            <Volume2 className="w-4 h-4 shrink-0" />
            <span>Нажмите, чтобы включить звук собеседника 🔊</span>
          </div>
        )}

        {/* Hand Raise Notification Toast */}
        {peerHandNotification && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-black/75 backdrop-blur-md border border-amber-400/40 text-amber-300 font-bold text-xs sm:text-sm rounded-full flex items-center gap-2 shadow-2xl animate-bounce">
            <Hand className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{peerHandNotification}</span>
          </div>
        )}

        {/* Screen share banner */}
        {isScreenSharing && (
          <div className="fixed top-16 left-4 z-40 px-3 py-1 bg-indigo-600/80 backdrop-blur-md text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-lg">
            <Monitor className="w-3.5 h-3.5 animate-pulse" />
            <span>Вы делитесь экраном</span>
          </div>
        )}

        {/* 1. Main Fullscreen Video (Remote by default, or Local if isSwapped) */}
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#FFF7EE]">
          {!isSwapped ? (
            /* Main View: Remote stream */
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full ${
                  isScreenSharing || isVerticalMode ? 'object-contain bg-black' : 'object-cover'
                } ${hasRemoteStream && remoteCamActive ? 'block' : 'hidden'}`}
              />

              {(!hasRemoteStream || !remoteCamActive) && (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#FFFDFB] via-[#FFF7EE] to-[#FFEFE0]">
                  <div className="relative mb-4">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259] text-white flex items-center justify-center text-3xl sm:text-4xl font-black shadow-xl shadow-orange-500/15 border-4 border-white">
                      <span>{resolvedParticipantName[0] || 'П'}</span>
                    </div>
                    {hasRemoteStream && (
                      <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-white border border-[#F2DECE] shadow-sm flex items-center justify-center">
                        {!remoteMicActive ? (
                          <MicOff className="w-4 h-4 text-rose-500" />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#5C8519] animate-pulse" />
                        )}
                      </div>
                    )}
                  </div>
                  <h3 className="text-[#161F38] font-black text-xl sm:text-2xl tracking-tight">
                    {resolvedParticipantName}
                  </h3>
                  <p className="text-[#6B758E] font-medium text-xs sm:text-sm mt-1">
                    {hasRemoteStream ? 'Камера выключена' : 'Ожидание подключения собеседника...'}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Main View: Local stream (Swapped) */
            <>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full ${
                  isScreenSharing || isVerticalMode ? 'object-contain bg-black' : 'object-cover'
                } ${facingMode === 'user' ? '-scale-x-100' : ''} ${!camActive ? 'hidden' : 'block'}`}
              />
              {!camActive && (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#FFFDFB] via-[#FFF7EE] to-[#FFEFE0]">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259] text-white flex items-center justify-center text-3xl sm:text-4xl font-black shadow-xl shadow-orange-500/15 border-4 border-white mb-4">
                    <span>Вы</span>
                  </div>
                  <h3 className="text-[#161F38] font-black text-xl sm:text-2xl">Ваша камера выключена</h3>
                </div>
              )}
            </>
          )}
        </div>

        {/* 2. Floating PiP Card (Selfie / Remote) in Top-Right */}
        <div
          onClick={() => setIsSwapped(!isSwapped)}
          className="absolute top-16 right-3 sm:top-20 sm:right-6 z-30 w-28 xs:w-32 sm:w-44 aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-white/30 shadow-2xl bg-black/60 backdrop-blur-md cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 group"
          title="Нажмите, чтобы переключить отображение видео"
        >
          {!isSwapped ? (
            /* PiP shows Local stream */
            <>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? '-scale-x-100' : ''
                } ${!camActive ? 'hidden' : 'block'}`}
              />
              {!camActive && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#161F38] text-white p-2 text-center">
                  <div className="w-9 h-9 rounded-full bg-coralAccent/20 text-coralAccent flex items-center justify-center mb-1">
                    <VideoOff className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-white/70 font-semibold">Камера выкл.</span>
                </div>
              )}
              {/* Bottom label */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[10px] font-bold bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                <span className="truncate">Вы</span>
                {!micActive && <MicOff className="w-3 h-3 text-rose-400 shrink-0" />}
              </div>
            </>
          ) : (
            /* PiP shows Remote stream */
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${
                  hasRemoteStream && remoteCamActive ? 'block' : 'hidden'
                }`}
              />
              {(!hasRemoteStream || !remoteCamActive) && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#161F38] text-white p-2 text-center">
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-1">
                    <span className="text-xs font-black">{resolvedParticipantName[0] || 'П'}</span>
                  </div>
                  <span className="text-[10px] text-white/70 font-semibold truncate max-w-[80px]">
                    {resolvedParticipantName}
                  </span>
                </div>
              )}
              {/* Bottom label */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[10px] font-bold bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                <span className="truncate">{resolvedParticipantName}</span>
                {!remoteMicActive && hasRemoteStream && (
                  <MicOff className="w-3 h-3 text-rose-400 shrink-0" />
                )}
              </div>
            </>
          )}

          {/* Hover Swap Indicator Overlay */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <RefreshCw className="w-5 h-5 text-white/90" />
          </div>
        </div>

        {/* 3. Floating Top Bar */}
        <div className="absolute top-0 left-0 right-0 z-40 p-3 sm:p-5 flex items-center justify-between pointer-events-none">
          {/* Top Left: Chat, Participants, Whiteboard, and Timer Counter (all grouped together on the left) */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="relative p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/15 transition-all active:scale-95 cursor-pointer shadow-lg"
              title="Чат урока"
            >
              <MessageSquare className="w-5 h-5" />
              {chatMessages.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-black shadow-xs">
                  {chatMessages.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsParticipantsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/15 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-lg"
              title="Участники"
            >
              <Users className="w-4 h-4" />
              <span>{hasRemoteStream ? 2 : 1}</span>
            </button>

            {onToggleWhiteboard && (
              <button
                type="button"
                onClick={onToggleWhiteboard}
                className="p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/15 transition-all active:scale-95 cursor-pointer shadow-lg"
                title="Интерактивная доска"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            )}

            {/* Timer Counter placed right next to the left buttons */}
            <div className="flex items-center gap-2 px-3.5 py-2 sm:py-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white text-xs font-mono font-bold shadow-lg">
              <span
                className={`w-2 h-2 rounded-full ${
                  hasRemoteStream ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>{formatTime(callDuration)}</span>
            </div>
          </div>

          {/* Top Right: Minimize / Return */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleMinimizeOrReturn}
              className="p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/15 transition-all active:scale-95 cursor-pointer shadow-lg"
              title="Свернуть / Вернуться к платформе"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4. Floating Bottom Bar (VK Video Calls Style) */}
        <div className="absolute bottom-0 left-0 right-0 z-40 pb-6 sm:pb-8 pt-10 px-4 flex flex-col items-center gap-3 bg-gradient-to-t from-black/95 via-black/55 to-transparent pointer-events-none">
          {/* "Ещё" Upward Pill */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white backdrop-blur-md border border-white/15 text-xs font-medium transition-all active:scale-95 cursor-pointer pointer-events-auto mb-1 shadow-md"
            title="Дополнительные функции"
          >
            <ChevronUp
              className={`w-3.5 h-3.5 transition-transform duration-300 ${
                isDrawerOpen ? 'rotate-180' : ''
              }`}
            />
            <span>{isDrawerOpen ? 'Скрыть меню' : 'Ещё'}</span>
          </button>

          {/* 5 Main Action Circles */}
          <div className="flex items-center justify-center gap-3.5 sm:gap-6 w-full max-w-md pointer-events-auto">
            {/* 1. Speakers / Deafen Toggle (Выключить / включить динамики) */}
            <button
              type="button"
              onClick={toggleDeafen}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full backdrop-blur-md border flex items-center justify-center transition-all active:scale-90 shadow-xl cursor-pointer ${
                isDeafened
                  ? 'bg-rose-600 hover:bg-rose-700 border-rose-400 text-white'
                  : 'bg-white/20 hover:bg-white/30 border-white/20 text-white'
              }`}
              title={isDeafened ? 'Включить звук собеседника' : 'Выключить динамики (заглушить звук)'}
            >
              {isDeafened ? (
                <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>

            {/* 2. Video Toggle */}
            <button
              type="button"
              onClick={toggleCam}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full backdrop-blur-md border flex items-center justify-center transition-all active:scale-90 shadow-xl cursor-pointer ${
                !camActive
                  ? 'bg-rose-600/90 hover:bg-rose-700 border-rose-400 text-white'
                  : 'bg-white/20 hover:bg-white/30 border-white/20 text-white'
              }`}
              title={!camActive ? 'Включить камеру' : 'Выключить камеру'}
            >
              {!camActive ? (
                <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Video className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>

            {/* 3. Hero Mic Button (Центральная кнопка VK - белый круг) */}
            <button
              type="button"
              onClick={toggleMic}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-2xl cursor-pointer relative ${
                !micActive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-2 border-rose-400 shadow-rose-600/40'
                  : 'bg-white hover:bg-white/95 text-[#161F38] shadow-white/30 border-2 border-white'
              }`}
              title={!micActive ? 'Включить микрофон' : 'Выключить микрофон'}
            >
              {!micActive ? (
                <MicOff className="w-6 h-6 sm:w-7 sm:h-7" />
              ) : (
                <Mic className="w-6 h-6 sm:w-7 sm:h-7" />
              )}
            </button>

            {/* 4. Raise Hand (Поднять руку) */}
            <button
              type="button"
              onClick={handleRaiseHand}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full backdrop-blur-md border flex items-center justify-center transition-all active:scale-90 shadow-xl cursor-pointer ${
                isHandRaised
                  ? 'bg-amber-500 border-amber-300 text-white ring-4 ring-amber-400/30'
                  : 'bg-white/20 hover:bg-white/30 border-white/20 text-white'
              }`}
              title={isHandRaised ? 'Опустить руку' : 'Поднять руку'}
            >
              <Hand className={`w-5 h-5 sm:w-6 sm:h-6 ${isHandRaised ? 'animate-bounce' : ''}`} />
            </button>

            {/* 5. End Call (Завершить звонок - красный круг) */}
            <button
              type="button"
              onClick={handleEnd}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#FF334B] hover:bg-[#E0243C] text-white flex items-center justify-center transition-all active:scale-90 shadow-2xl shadow-red-500/40 cursor-pointer border border-red-400/40"
              title="Завершить урок"
            >
              <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* 5. "Ещё" (More Options Drawer) */}
        {isDrawerOpen && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm bg-black/85 backdrop-blur-xl border border-white/20 rounded-3xl p-4 shadow-2xl text-white animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <span className="font-bold text-sm">Дополнительные функции</span>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 text-white/60 hover:text-white rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  toggleScreenShare();
                  setIsDrawerOpen(false);
                }}
                className={`flex items-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all text-left ${
                  isScreenSharing
                    ? 'bg-indigo-600/40 border-indigo-400 text-indigo-200'
                    : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                }`}
              >
                <Monitor className="w-4 h-4 shrink-0" />
                <span>{isScreenSharing ? 'Стоп экран' : 'Экран'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleDeafen();
                  setIsDrawerOpen(false);
                }}
                className={`flex items-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all text-left ${
                  isDeafened
                    ? 'bg-rose-600/40 border-rose-400 text-rose-200'
                    : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                }`}
              >
                {isDeafened ? (
                  <VolumeX className="w-4 h-4 shrink-0" />
                ) : (
                  <Volume2 className="w-4 h-4 shrink-0" />
                )}
                <span>{isDeafened ? 'Вкл. динамики' : 'Заглушить'}</span>
              </button>

              {onToggleWhiteboard && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleWhiteboard();
                    setIsDrawerOpen(false);
                  }}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-white transition-all text-left"
                >
                  <LayoutGrid className="w-4 h-4 shrink-0" />
                  <span>Доска урока</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  handleFlipCamera();
                  setIsDrawerOpen(false);
                }}
                className="flex items-center gap-2 p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-white transition-all text-left"
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                <span>Сменить камеру</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsVerticalMode(!isVerticalMode);
                  setIsDrawerOpen(false);
                }}
                className={`flex items-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all text-left ${
                  isVerticalMode
                    ? 'bg-emerald-600/40 border-emerald-400 text-emerald-200'
                    : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                }`}
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>{isVerticalMode ? 'Вместить видео' : 'Заполнить экран'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 6. Participants Modal / Sheet */}
        {isParticipantsOpen && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full sm:max-w-md bg-[#161F38] border border-white/20 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl text-white">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-coralAccent" />
                  <span className="font-extrabold text-base">
                    Участники ({hasRemoteStream ? 2 : 1})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsParticipantsOpen(false)}
                  className="p-1.5 text-white/60 hover:text-white rounded-full bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {/* You */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-coralAccent text-white flex items-center justify-center font-bold text-sm">
                      Вы
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        Вы ({isTeacher ? 'Учитель' : 'Ученик'})
                      </p>
                      <p className="text-[11px] text-white/60">В сети</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!micActive ? (
                      <MicOff className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Mic className="w-4 h-4 text-emerald-400" />
                    )}
                    {!camActive ? (
                      <VideoOff className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Video className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                </div>

                {/* Remote Participant */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                      {resolvedParticipantName.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{resolvedParticipantName}</p>
                      <p className="text-[11px] text-white/60">
                        {hasRemoteStream ? 'Подключен к уроку' : 'Ожидание подключения...'}
                      </p>
                    </div>
                  </div>
                  {hasRemoteStream && (
                    <div className="flex items-center gap-2">
                      {!remoteMicActive ? (
                        <MicOff className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Mic className="w-4 h-4 text-emerald-400" />
                      )}
                      {!remoteCamActive ? (
                        <VideoOff className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Video className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. Full-Screen VK Chat with Floating Video Call PiP */}
        {isChatOpen && (
          <div className="absolute inset-0 z-50 bg-[#0A0E1A] flex flex-col animate-in fade-in duration-200">
            {/* VK Messenger Header */}
            <div className="h-14 sm:h-16 px-3 sm:px-4 bg-[#111726]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between z-30 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="p-1.5 -ml-1 text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer flex items-center"
                  title="Вернуться к звонку"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#3b5998] to-[#6389e8] text-white flex items-center justify-center font-bold text-sm shrink-0 border border-white/20 shadow-md">
                  <span>{resolvedParticipantName[0] || 'П'}</span>
                </div>

                <div className="min-w-0 flex flex-col justify-center">
                  <h3 className="font-extrabold text-sm sm:text-base text-white truncate max-w-[180px] sm:max-w-xs">
                    {resolvedParticipantName}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>В звонке • {formatTime(callDuration)}</span>
                  </div>
                </div>
              </div>

              {/* Close / Return button on header */}
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full cursor-pointer transition-colors"
                title="Свернуть чат"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Floating Video Call Mini-Window (PiP) in Top Right — Exactly like VK! */}
            <div
              onClick={() => setIsChatOpen(false)}
              className="absolute top-16 right-3 sm:top-20 sm:right-6 z-40 w-32 xs:w-36 sm:w-44 aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-white/30 shadow-2xl bg-black/85 backdrop-blur-md cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 group"
              title="Нажмите, чтобы вернуться к видеозвонку"
            >
              {/* Remote Video Stream */}
              <video
                ref={(el) => {
                  if (el && remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
                    el.srcObject = remoteStreamRef.current;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  hasRemoteStream && remoteCamActive ? 'block' : 'hidden'
                }`}
              />

              {/* Avatar placeholder if camera is off or connecting */}
              {(!hasRemoteStream || !remoteCamActive) && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#161F38] text-white p-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-1 font-black text-sm">
                    <span>{resolvedParticipantName[0] || 'П'}</span>
                  </div>
                  <span className="text-[10px] text-white/80 font-semibold truncate max-w-[90px]">
                    {resolvedParticipantName}
                  </span>
                  <span className="text-[9px] text-white/50">
                    {hasRemoteStream ? 'Камера выкл.' : 'Ожидание...'}
                  </span>
                </div>
              )}

              {/* Bottom controls on the mini-card (Expand icon on left, Mute on right) */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                <div className="p-1 bg-black/60 backdrop-blur-md rounded-lg text-white">
                  <Maximize2 className="w-3.5 h-3.5 drop-shadow" />
                </div>
                <div className="p-1 bg-black/60 backdrop-blur-md rounded-lg text-white">
                  {!remoteMicActive ? (
                    <MicOff className="w-3.5 h-3.5 text-rose-400 drop-shadow" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400 drop-shadow" />
                  )}
                </div>
              </div>

              {/* Hover overlay hint */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full">
                  Развернуть звонок
                </span>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-3 bg-[#0A0E1A] bg-radial from-[#121929] to-[#0A0E1A]">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-white/50 p-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-coralAccent mb-3">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-extrabold text-white">Сообщений пока нет</p>
                  <p className="text-xs text-white/60 max-w-xs mt-1">
                    Здесь можно обмениваться быстрыми сообщениями, фото и учебными материалами
                  </p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.senderId === myPeerIdRef.current;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1 text-[10px] text-white/50 mb-0.5">
                        <span className="font-semibold">{isMe ? 'Вы' : msg.senderName}</span>
                        <span>• {msg.time}</span>
                      </div>
                      <div
                        className={`px-4 py-2.5 rounded-2xl max-w-[85%] sm:max-w-[70%] break-words text-sm shadow-md ${
                          isMe
                            ? 'bg-[#2B5278] text-white rounded-br-xs border border-[#3E6F9F]'
                            : 'bg-[#1E293B] text-white rounded-bl-xs border border-white/10'
                        }`}
                      >
                        {msg.attachment && (
                          <div className="mb-2">
                            {msg.attachment.isImage ? (
                              <a
                                href={msg.attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block overflow-hidden rounded-xl border border-white/10 hover:opacity-95 transition-opacity"
                              >
                                <img
                                  src={msg.attachment.url}
                                  alt={msg.attachment.name}
                                  className="max-h-56 w-auto object-cover rounded-xl"
                                  loading="lazy"
                                />
                              </a>
                            ) : (
                              <a
                                href={msg.attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                download={msg.attachment.name}
                                className="flex items-center gap-2 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                              >
                                <FileText className="w-4 h-4 shrink-0 text-coralAccent" />
                                <span className="truncate max-w-[160px]">
                                  {msg.attachment.name}
                                </span>
                                <Download className="w-3.5 h-3.5 ml-auto shrink-0 opacity-70" />
                              </a>
                            )}
                          </div>
                        )}
                        {msg.text && <div>{msg.text}</div>}
                        <div
                          className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
                            isMe ? 'text-blue-200' : 'text-white/50'
                          }`}
                        >
                          <span>{msg.time}</span>
                          {isMe && <span>✓✓</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Attached file preview chip prior to sending */}
            {attachedFile && (
              <div className="px-4 py-2 bg-[#161F38] border-t border-white/10 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 truncate">
                  {attachedFile.isImage ? (
                    <img
                      src={attachedFile.url}
                      alt=""
                      className="w-8 h-8 object-cover rounded-md border border-white/20"
                    />
                  ) : (
                    <FileText className="w-4 h-4 text-coralAccent shrink-0" />
                  )}
                  <span className="font-bold text-white truncate">{attachedFile.name}</span>
                  <span className="text-[10px] text-white/50">
                    ({Math.round(attachedFile.size / 1024)} КБ)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="p-1 text-white/60 hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                  title="Удалить прикрепленный файл"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Chat Input Bar (VK Style) */}
            <form
              onSubmit={handleSendMessage}
              className="p-2.5 sm:p-3 bg-[#111726] border-t border-white/10 flex items-center gap-2 shrink-0"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.txt"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAttachment}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                title="Прикрепить фото или файл"
              >
                {isUploadingAttachment ? (
                  <Loader2 className="w-4 h-4 animate-spin text-coralAccent" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </button>
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Сообщение..."
                className="flex-1 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/10 focus:border-blue-400 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={(!chatInput.trim() && !attachedFile) || isUploadingAttachment}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-md shrink-0"
                title="Отправить"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

  </>
  );
}
