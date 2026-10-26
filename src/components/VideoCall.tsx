'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Volume2,
  VolumeX,
  Paperclip,
  FileText,
  Download,
  Loader2,
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

  // Lesson In-Call Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(true);
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

  // Detect iOS / iPhone for screen sharing capability
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      const isApple = /iPhone|iPod/.test(ua) || (/iPad/.test(ua) && navigator.maxTouchPoints > 1);
      setIsIPhone(isApple);
    }
  }, []);

  // Sync deafen state to remote video & audio tracks
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = isDeafened;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isDeafened && remoteMicActive;
      });
    }
  }, [isDeafened, remoteMicActive]);

  // Load chat history from Supabase on mount/roomToken change
  useEffect(() => {
    if (!roomToken) return;
    let isCancelled = false;

    fetch(`/api/room/messages?roomToken=${encodeURIComponent(roomToken)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && Array.isArray(data?.messages)) {
          setChatMessages(data.messages);
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

  // Duration clock — ONLY starts counting when both participants are connected in the room
  useEffect(() => {
    if (!hasRemoteStream) return;

    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [hasRemoteStream]);

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
      console.log('[WebRTC] Received remote track:', event.track.kind);
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = event.streams[0] || new MediaStream();
      }
      if (!remoteStreamRef.current.getTracks().some((t) => t.id === event.track.id)) {
        remoteStreamRef.current.addTrack(event.track);
      }

      if (event.track.kind === 'audio') {
        event.track.enabled = !isDeafened && remoteMicActive;
      }

      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.muted = isDeafened;
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

      const answer = await pc.createAnswer();
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

  // Start local camera & microphone (Selfie camera only)
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Preserve current microphone and camera states
      stream.getAudioTracks().forEach((track) => {
        track.enabled = micActive;
      });
      stream.getVideoTracks().forEach((track) => {
        track.enabled = camActive;
      });

      streamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
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
          payload: { senderId: myPeerIdRef.current, isTeacher },
        });
      }
    } catch (err) {
      console.warn('WebRTC camera preview error:', err);
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
        setConnectionStatus('connecting');

        // Teacher initiates the offer when a peer joins
        if (streamRef.current && isTeacher) {
          const pc = getOrCreatePeerConnection(streamRef.current);
          await createAndSendOffer(pc);
        } else if (streamRef.current && !isTeacher) {
          // Student can also create peer connection ready for offer
          getOrCreatePeerConnection(streamRef.current);
        }
      })
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        if (payload?.sdp && streamRef.current) {
          setConnectionStatus('connecting');
          await handleRemoteOffer(payload.sdp, streamRef.current);
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
      .on('broadcast', { event: 'lesson-ended' }, ({ payload }) => {
        if (!isTeacher) {
          const durationMin = Math.round((payload?.durationSec || 0) / 60) || 1;
          alert(`Преподаватель завершил урок! Длительность: ${durationMin} мин.`);
          if (onEndLesson) onEndLesson(payload?.durationSec || 0);
        }
      })
      .on('broadcast', { event: 'user-left' }, ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
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

      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      remoteStreamRef.current = null;
    };
  }, [roomToken, isTeacher]);

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
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'lesson-ended',
          payload: { durationSec: callDuration },
        });
      }
      if (onEndLesson) onEndLesson(callDuration);
    }
  };

  // PiP (Picture in Picture) mode when Whiteboard is open — strictly displays the REMOTE participant (student or teacher)
  if (isWhiteboardActive) {
    if (isPipMinimized) {
      return (
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
      );
    }

    return (
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
            controls={false}
            className={`w-full h-full ${isRemoteScreenSharing ? 'object-contain bg-black' : 'object-cover'} ${
              hasRemoteStream && remoteCamActive ? 'block' : 'hidden'
            }`}
          />

          {/* Remote peer camera turned off placeholder */}
          {hasRemoteStream && !remoteCamActive && (
            <div className="absolute inset-0 bg-[#161F38] flex flex-col items-center justify-center p-2 sm:p-3 text-center z-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/10 flex items-center justify-center text-coralAccent text-lg sm:text-xl font-black mb-1 shadow-xs">
                {resolvedParticipantName[0] || 'П'}
              </div>
              <p className="text-white text-[11px] sm:text-xs font-black">{resolvedParticipantName}</p>
              <p className="text-white/60 text-[9px] sm:text-[10px]">Камера собеседника выключена</p>
            </div>
          )}

          {/* Waiting for remote peer to connect */}
          {!hasRemoteStream && (
            <div className="absolute inset-0 bg-[#161F38] flex flex-col items-center justify-center p-2 sm:p-3 text-center text-white z-10 select-none">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-coralAccent text-base sm:text-xl font-black mb-1 shadow-xs">
                {resolvedParticipantName[0] || 'П'}
              </div>
              <h4 className="text-white font-black text-[11px] sm:text-xs leading-tight">
                {resolvedParticipantName}
              </h4>
              <p className="text-[9px] sm:text-[10px] text-[#EADBCC] mt-0.5 font-medium">
                {isTeacher ? 'Ожидание ученика...' : 'Ожидание педагога...'}
              </p>
            </div>
          )}

          {/* Time Pill */}
          <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold shadow-xs z-20">
            <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${hasRemoteStream ? 'bg-[#5C8519] animate-pulse' : 'bg-amber-400'}`} />
            <span>{hasRemoteStream ? formatTime(callDuration) : '00:00 (Ожидание)'}</span>
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
    );
  }

  // Full Video Workspace (100% spacious, responsive on mobile & desktop)
  return (
    <div className="flex flex-col gap-3 sm:gap-4 w-full">
      {/* 1. Main Video Workspace Card */}
      <div className="relative flex flex-col bg-[#FFF8F1] rounded-2xl sm:rounded-[32px] overflow-hidden border border-[#F4E3D2] shadow-sm">
        {/* Top Header Info Bar */}
        <div className="p-2.5 sm:p-3.5 bg-white/95 backdrop-blur-md border-b border-[#F4E3D2] flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-[#FFF7EE] px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-[#EADBCC] text-[#161F38] text-[11px] sm:text-xs shadow-2xs min-w-0 max-w-[70%] sm:max-w-none">
            <span
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${
                hasRemoteStream ? 'bg-[#5C8519] animate-pulse' : 'bg-amber-400 animate-ping'
              } shrink-0`}
            />
            <span className="font-mono font-black shrink-0">
              {hasRemoteStream ? formatTime(callDuration) : '00:00 (Ожидание)'}
            </span>
            <span className="text-[#EADBCC] shrink-0">|</span>
            <span className="text-[#6B758E] font-bold truncate">
              {topic || `Комната: ${roomToken}`}
            </span>
            <span className="text-[#EADBCC] hidden md:inline">|</span>
            <span
              className={`text-[10px] font-bold hidden md:inline-flex items-center gap-1 ${
                hasRemoteStream ? 'text-[#5C8519]' : 'text-amber-600'
              }`}
            >
              <Wifi className="w-3 h-3" />
              <span>{hasRemoteStream ? 'Связь P2P' : 'Ожидание подключения...'}</span>
            </span>
          </div>

          {/* Action Controls in Top Right */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Picture in Picture Button */}
            <button
              type="button"
              onClick={togglePictureInPicture}
              className="p-1.5 sm:px-3 sm:py-1.5 bg-[#FFF7EE] hover:bg-[#FDEEDC] border border-[#EADBCC] text-[#161F38] hover:border-coralAccent font-extrabold text-xs rounded-full shadow-2xs transition-colors cursor-pointer active:scale-95 flex items-center gap-1.5"
              title="Окно поверх всех приложений при выходе на рабочий стол (как в Telegram/VK)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-coralAccent" />
              <span className="hidden sm:inline">Поверх окон</span>
            </button>
          </div>
        </div>

        {/* Main Video Streams Grid (Responsive on phones & desktops) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4 p-2.5 sm:p-4">
          {/* Tile 1: Remote Participant (Real Live Video & Audio Stream) */}
          <div
            className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-[#161F38] border-2 border-[#F2E3D5] flex items-center justify-center shadow-xs transition-all duration-200 aspect-[4/3] sm:aspect-video min-h-[190px] sm:min-h-[260px]"
          >
          {/* Live Video from Remote Peer (unmuted so sound plays) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            controls={false}
            autoPictureInPicture
            {...({ 'webkit-playsinline': 'true' } as any)}
            className={`w-full h-full ${isRemoteScreenSharing ? 'object-contain bg-black' : 'object-cover'} ${
              hasRemoteStream && remoteCamActive ? 'block' : 'hidden'
            }`}
          />

          {/* Placeholder when remote peer turned camera off */}
          {hasRemoteStream && !remoteCamActive && (
            <div className="absolute inset-0 bg-[#161F38] flex flex-col items-center justify-center p-4 text-center z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-coralAccent text-2xl font-black mb-2 shadow-xs">
                {resolvedParticipantName[0] || 'П'}
              </div>
              <p className="text-white text-xs font-black">{resolvedParticipantName}</p>
              <p className="text-white/60 text-[10px] mt-0.5">Камера собеседника выключена</p>
            </div>
          )}

          {/* Waiting Placeholder when remote participant has not yet connected */}
          {!hasRemoteStream && (
            <div className="text-center p-3 sm:p-6 text-white animate-in fade-in select-none max-w-[90%]">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-white/10 border-2 border-white/20 flex items-center justify-center mx-auto mb-2 sm:mb-3 text-coralAccent text-2xl sm:text-3xl font-black shadow-xs">
                {resolvedParticipantName[0] || 'П'}
              </div>
              <h3 className="text-white font-black text-sm sm:text-base leading-tight">
                {resolvedParticipantName}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#EADBCC] mt-1 font-medium">
                {isTeacher
                  ? 'Ожидание подключения ученика...'
                  : 'Педагог центра «АйДаУмничка» • Ожидание подключения...'}
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold text-white/90">
                <span className="w-1.5 h-1.5 rounded-full bg-coralAccent animate-ping" />
                <span>Прямой WebRTC канал</span>
              </div>
            </div>
          )}
        </div>

        {/* Tile 2: Local User Camera Stream (Muted to prevent echo, Selfie Front Camera) */}
        <div
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-[#161F38] border-2 border-[#F2E3D5] flex items-center justify-center shadow-xs transition-all duration-200 aspect-[4/3] sm:aspect-video min-h-[190px] sm:min-h-[260px]"
        >
          {camActive ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              controls={false}
              autoPictureInPicture
              {...({ 'webkit-playsinline': 'true' } as any)}
              className={`w-full h-full ${isScreenSharing ? 'object-contain bg-black' : 'object-cover scale-x-[-1]'}`}
            />
          ) : (
            <div className="text-center p-4 sm:p-6 text-white/70">
              <VideoOff className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-60" />
              <p className="text-xs font-bold">Камера отключена</p>
            </div>
          )}
        </div>
      </div>

      {/* Integrated Bottom Control Bar */}
      <div className="p-2 sm:p-3 bg-white/95 backdrop-blur-md border-t border-[#F2DECE] flex items-center justify-center gap-1.5 sm:gap-2.5 flex-wrap">
        {/* Mic Toggle */}
        <button
          type="button"
          onClick={toggleMic}
          className={`p-2 sm:p-3 rounded-full transition-transform active:scale-90 cursor-pointer ${
            micActive
              ? 'bg-[#FFF7EE] hover:bg-[#FDEEDC] text-[#161F38]'
              : 'bg-rose-100 text-rose-700 border border-rose-300'
          }`}
          title={micActive ? 'Выключить микрофон' : 'Включить микрофон'}
        >
          {micActive ? (
            <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-[#161F38]" />
          ) : (
            <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>

        {/* Cam Toggle */}
        <button
          type="button"
          onClick={toggleCam}
          className={`p-2 sm:p-3 rounded-full transition-transform active:scale-90 cursor-pointer ${
            camActive
              ? 'bg-[#FFF7EE] hover:bg-[#FDEEDC] text-[#161F38]'
              : 'bg-rose-100 text-rose-700 border border-rose-300'
          }`}
          title={camActive ? 'Выключить камеру' : 'Включить камеру'}
        >
          {camActive ? (
            <Video className="w-4 h-4 sm:w-5 sm:h-5 text-[#161F38]" />
          ) : (
            <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>

        {/* Speakers Deafen Toggle (Заглушить динамики как в ВК) */}
        <button
          type="button"
          onClick={toggleDeafen}
          className={`p-2 sm:p-3 rounded-full transition-transform active:scale-90 cursor-pointer ${
            isDeafened
              ? 'bg-rose-100 text-rose-700 border border-rose-300'
              : 'bg-[#FFF7EE] hover:bg-[#FDEEDC] text-[#161F38]'
          }`}
          title={isDeafened ? 'Включить динамики' : 'Заглушить динамики (отключить звук собеседника)'}
        >
          {isDeafened ? (
            <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
          ) : (
            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#161F38]" />
          )}
        </button>

        {/* Screen Share — hidden on iOS / iPhone */}
        {!isIPhone && (
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`p-2 sm:p-3 rounded-full transition-transform active:scale-90 cursor-pointer ${
              isScreenSharing
                ? 'bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2]'
                : 'bg-[#FFF7EE] hover:bg-[#FDEEDC] text-[#161F38]'
            }`}
            title="Демонстрация экрана"
          >
            <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Whiteboard Switch */}
        {onToggleWhiteboard && (
          <button
            type="button"
            onClick={onToggleWhiteboard}
            className="bg-[#EAF7CF] hover:bg-[#DDF4B2] text-[#5C8519] border border-[#CCE8A2] rounded-full transition-transform active:scale-95 flex items-center gap-1.5 font-black text-xs px-3 sm:px-4 py-2 sm:py-2.5 shadow-2xs cursor-pointer"
            title="Интерактивная доска"
          >
            <Layout className="w-4 h-4 text-[#5C8519]" />
            <span className="hidden sm:inline">Интерактивная доска</span>
          </button>
        )}

        {/* End Call — ONLY visible for teacher! */}
        {isTeacher && (
          <button
            type="button"
            onClick={handleEnd}
            className="bg-coralAccent hover:bg-coralAccent-hover text-white rounded-full transition-transform active:scale-95 flex items-center gap-1.5 font-black text-xs px-3.5 sm:px-5 py-2 sm:py-2.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
            title="Завершить занятие"
          >
            <PhoneOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Завершить урок</span>
          </button>
        )}
      </div>
    </div>

    {/* 2. In-Call Chat Section — Situated directly BELOW the cameras! */}
    <div
      id="lesson-chat-section"
      className="w-full bg-white rounded-2xl sm:rounded-3xl border border-[#F2DECE] shadow-sm overflow-hidden flex flex-col scroll-mt-4"
    >
      {/* Chat Header */}
      <div className="p-3 sm:p-3.5 bg-[#FFF7EE] border-b border-[#F4E3D2] flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <div className="w-7 h-7 rounded-xl bg-white border border-[#F4E3D2] flex items-center justify-center text-coralAccent shrink-0 shadow-2xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-black text-[#161F38]">Чат урока</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  hasRemoteStream ? 'bg-[#5C8519] animate-pulse' : 'bg-amber-400'
                }`}
                title={hasRemoteStream ? 'Собеседник на связи' : 'Ожидание собеседника'}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="p-1.5 text-[#8A95A8] hover:text-[#161F38] hover:bg-white rounded-xl transition-colors cursor-pointer shrink-0 flex items-center gap-1 text-xs font-bold"
          title={isChatOpen ? 'Свернуть чат' : 'Развернуть чат'}
        >
          <span className="text-[11px] hidden sm:inline">{isChatOpen ? 'Свернуть' : 'Развернуть'}</span>
          {isChatOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isChatOpen && (
        <>
          {/* Messages List */}
          <div className="h-56 sm:h-64 p-3 sm:p-4 overflow-y-auto space-y-2.5 text-xs bg-[#FFFDFB]">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#8A95A8] p-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF7EE] border border-[#F4E3D2] flex items-center justify-center text-coralAccent/60 mb-2">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-xs font-black text-[#161F38]">Сообщений пока нет</p>
                <p className="text-[11px] text-[#8A95A8] max-w-xs mt-0.5">
                  Здесь можно обмениваться быстрыми сообщениями, фото и файлами во время занятия
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
                    <div className="flex items-center gap-1 text-[10px] text-[#8A95A8] mb-0.5">
                      <span className="font-bold">{isMe ? 'Вы' : msg.senderName}</span>
                      <span>• {msg.time}</span>
                    </div>
                    <div
                      className={`px-3.5 py-2 rounded-2xl max-w-[85%] break-words ${
                        isMe
                          ? 'bg-coralAccent text-white rounded-br-xs shadow-2xs'
                          : 'bg-[#FFF7EE] text-[#161F38] border border-[#F4E3D2] rounded-bl-xs'
                      }`}
                    >
                      {/* Attached media / document if present */}
                      {msg.attachment && (
                        <div className="mb-1.5">
                          {msg.attachment.isImage ? (
                            <a
                              href={msg.attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block overflow-hidden rounded-xl border border-black/10 hover:opacity-95 transition-opacity"
                            >
                              <img
                                src={msg.attachment.url}
                                alt={msg.attachment.name}
                                className="max-h-48 w-auto object-cover rounded-xl"
                                loading="lazy"
                              />
                            </a>
                          ) : (
                            <a
                              href={msg.attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              download={msg.attachment.name}
                              className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition-colors ${
                                isMe
                                  ? 'bg-white/20 text-white hover:bg-white/30'
                                  : 'bg-[#FFF0E2] text-coralAccent hover:bg-[#FFE6D0]'
                              }`}
                            >
                              <FileText className="w-4 h-4 shrink-0" />
                              <span className="truncate max-w-[150px]">{msg.attachment.name}</span>
                              <Download className="w-3.5 h-3.5 ml-auto shrink-0 opacity-70" />
                            </a>
                          )}
                        </div>
                      )}
                      {msg.text && <div>{msg.text}</div>}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Attached file preview chip prior to sending */}
          {attachedFile && (
            <div className="px-3 py-1.5 bg-[#FFF0E2] border-t border-[#F2DECE] flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                {attachedFile.isImage ? (
                  <img
                    src={attachedFile.url}
                    alt=""
                    className="w-7 h-7 object-cover rounded-md border border-[#F4E3D2]"
                  />
                ) : (
                  <FileText className="w-4 h-4 text-coralAccent shrink-0" />
                )}
                <span className="font-bold text-[#161F38] truncate">{attachedFile.name}</span>
                <span className="text-[10px] text-[#8A95A8]">
                  ({Math.round(attachedFile.size / 1024)} КБ)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="p-1 text-[#8A95A8] hover:text-rose-500 rounded-lg cursor-pointer transition-colors"
                title="Удалить прикрепленный файл"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} className="p-2.5 sm:p-3 bg-white border-t border-[#F2DECE] flex items-center gap-1.5">
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
              className="p-2 sm:p-2.5 text-[#6B758E] hover:text-coralAccent hover:bg-[#FFF7EE] rounded-full transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              title="Прикрепить файл или фото (автоматически сжимается)"
            >
              {isUploadingAttachment ? (
                <Loader2 className="w-4 h-4 animate-spin text-coralAccent" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>
            <input
              ref={chatInputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Напишите сообщение в чат урока..."
              className="flex-1 bg-[#FFF8F1] border border-[#EADBCC] focus:border-coralAccent rounded-full px-4 py-2 text-xs text-[#161F38] outline-none"
            />
            <button
              type="submit"
              disabled={(!chatInput.trim() && !attachedFile) || isUploadingAttachment}
              className="bg-coralAccent hover:bg-coralAccent-hover disabled:opacity-40 text-white p-2.5 rounded-full transition-transform active:scale-95 cursor-pointer shadow-2xs shrink-0"
              title="Отправить"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </>
      )}
    </div>
  </div>
  );
}
