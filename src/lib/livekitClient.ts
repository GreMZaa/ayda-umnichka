import { fetchLiveKitToken, LiveKitTokenResponse } from './livekit';

export interface LiveKitSession {
  room: any;
  account: 'account1' | 'account2';
  accountName: string;
  serverUrl: string;
}

export interface ConnectLiveKitOptions {
  roomToken: string;
  identity: string;
  name: string;
  isTeacher: boolean;
  accountOverride?: 'account1' | 'account2' | 'auto';
  localVideoEl?: HTMLVideoElement | null;
  remoteVideoEl?: HTMLVideoElement | null;
  remoteAudioEl?: HTMLAudioElement | null;
  onConnected?: (account: 'account1' | 'account2', accountName: string) => void;
  onDisconnected?: (reason?: string) => void;
  onLocalTracks?: (stream: MediaStream) => void;
  onRemoteTrackReceived?: (kind: 'video' | 'audio' | 'screen', stream: MediaStream) => void;
  onScreenShareEnded?: () => void;
  onPeerJoined?: (name: string, role?: string) => void;
  onPeerLeft?: () => void;
  onDataReceived?: (data: any) => void;
  onMediaError?: (type: 'camera' | 'microphone', error: string) => void;
  onLog?: (level: 'info' | 'warn' | 'error' | 'success', message: string, detail?: any) => void;
}

export async function initLiveKitCall(options: ConnectLiveKitOptions): Promise<LiveKitSession | null> {
  const {
    roomToken,
    identity,
    name,
    accountOverride,
    onConnected,
    onDisconnected,
    onRemoteTrackReceived,
    onPeerJoined,
    onPeerLeft,
    onDataReceived,
    onLog,
  } = options;

  try {
    onLog?.('info', 'Запрос доступа к LiveKit Cloud SFU (проверка двух аккаунтов)...');

    const tokenRes = await fetchLiveKitToken({
      room: roomToken,
      identity,
      name,
      accountOverride,
    });

    const cleanUrl = (tokenRes.serverUrl || '').replace(/^["'\uFEFF\u200B\s]+|["'\uFEFF\u200B\s]+$/g, '').trim();
    if (!tokenRes.success || !tokenRes.token || !cleanUrl) {
      onLog?.('info', 'LiveKit Cloud не настроен или выключен, используется резервный P2P WebRTC канал');
      return null;
    }

    const hostPreview = cleanUrl.replace(/^wss?:\/\//, '').split('.')[0] || 'livekit';
    onLog?.(
      'info',
      `Подключение к LiveKit SFU: ${tokenRes.accountName || tokenRes.account} (${hostPreview}...)`
    );

    // Dynamically load livekit-client in browser environment
    const { Room, RoomEvent, Track, VideoPresets, AudioPresets } = await import('livekit-client');

    const isMobile =
      typeof window !== 'undefined' &&
      (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768);

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      },
      videoCaptureDefaults: {
        facingMode: 'user',
        ...(isMobile ? {} : { resolution: VideoPresets.h540.resolution }),
      },
      publishDefaults: {
        simulcast: true,
        videoCodec: 'vp8',
        videoEncoding: VideoPresets.h540.encoding,
        audioPreset: AudioPresets.speech,
        dtx: true,
        red: true,
      },
    });

    room.on(RoomEvent.Connected, () => {
      onLog?.('success', `Успешно подключено к SFU серверу LiveKit (${tokenRes.accountName})`);
      onConnected?.(tokenRes.account || 'account1', tokenRes.accountName || 'Основной аккаунт');
      room.startAudio().catch(() => {});
    });

    room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      if (!room.canPlaybackAudio) {
        room.startAudio().catch(() => {});
      }
    });

    room.on(RoomEvent.Disconnected, (reason) => {
      onLog?.('warn', `Отключено от LiveKit SFU: ${reason || 'завершение сессии'}`);
      onDisconnected?.(String(reason));
    });

    room.on(RoomEvent.Reconnecting, () => {
      onLog?.('info', 'LiveKit SFU: переподключение из-за смены сети...');
    });

    room.on(RoomEvent.Reconnected, () => {
      onLog?.('success', 'LiveKit SFU: связь успешно восстановлена');
      room.startAudio().catch(() => {});
    });

    room.on(RoomEvent.ParticipantConnected, (participant) => {
      onLog?.('success', `Собеседник вошел в комнату: ${participant.name || participant.identity}`);
      onPeerJoined?.(participant.name || participant.identity);
    });

    room.on(RoomEvent.ParticipantDisconnected, () => {
      onLog?.('info', 'Собеседник покинул комнату');
      onPeerLeft?.();
    });

    const handleSubscribedTrack = (track: any, participant?: any) => {
      const isScreen = track.source === Track.Source.ScreenShare;
      onLog?.(
        'success',
        `Получен удаленный медиа-поток (${isScreen ? 'демонстрация экрана' : track.kind}) от ${
          participant?.name || participant?.identity || 'собеседника'
        }`
      );

      if (track.kind === Track.Kind.Video) {
        if (options.remoteVideoEl && !isScreen) {
          track.attach(options.remoteVideoEl);
        }
        if (track.mediaStreamTrack) {
          onRemoteTrackReceived?.(isScreen ? 'screen' : 'video', new MediaStream([track.mediaStreamTrack]));
        }
      } else if (track.kind === Track.Kind.Audio) {
        // Dedicated audio playback to avoid duplicate sound and echo
        if (options.remoteAudioEl) {
          try {
            track.attach(options.remoteAudioEl);
            options.remoteAudioEl.muted = false;
            options.remoteAudioEl.play().catch(() => {});
          } catch (_) {}
        } else {
          try {
            track.attach();
          } catch (_) {}
        }
        if (track.mediaStreamTrack) {
          onRemoteTrackReceived?.('audio', new MediaStream([track.mediaStreamTrack]));
        }
      }
    };

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      handleSubscribedTrack(track, participant);
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      if (track.source === Track.Source.ScreenShare) {
        onLog?.('info', `Демонстрация экрана завершена: ${participant?.name || 'собеседник'}`);
        options.onScreenShareEnded?.();
      }
    });

    room.on(RoomEvent.TrackSubscriptionFailed, (trackSid, participant) => {
      onLog?.('warn', `Сбой подписки на трек ${trackSid} от ${participant.name || participant.identity}`);
    });

    room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);
        onDataReceived?.(data);
      } catch (_) {}
    });

    await room.connect(cleanUrl, tokenRes.token.trim());

    // Check participants already in room AFTER connection is established
    for (const [, participant] of room.remoteParticipants) {
      onLog?.('success', `Собеседник уже подключен к LiveKit: ${participant.name || participant.identity}`);
      onPeerJoined?.(participant.name || participant.identity);
      for (const [, pub] of participant.trackPublications) {
        if (pub.track) {
          handleSubscribedTrack(pub.track, participant);
        } else if (typeof pub.setSubscribed === 'function' && !pub.isSubscribed) {
          try {
            pub.setSubscribed(true);
          } catch (_) {}
        }
      }
    }

    // User gesture audio auto-unlock
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        room.startAudio().catch(() => {});
      };
      window.addEventListener('click', unlockAudio, { once: true });
      window.addEventListener('touchstart', unlockAudio, { once: true });
    }

    // Publish microphone and camera independently with robust error isolation
    try {
      await room.localParticipant.setMicrophoneEnabled(true, {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
      onLog?.('success', 'Локальный микрофон успешно активирован в LiveKit');
    } catch (micErr: any) {
      onLog?.('warn', 'LiveKit: сбой активации микрофона', micErr?.message);
      options.onMediaError?.('microphone', micErr?.message || String(micErr));
    }

    try {
      await room.localParticipant.setCameraEnabled(true, {
        facingMode: 'user',
        ...(isMobile ? {} : { resolution: VideoPresets.h540.resolution }),
      });
      const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (camPub?.videoTrack && options.localVideoEl) {
        camPub.videoTrack.attach(options.localVideoEl);
      }
      onLog?.('success', 'Локальная камера успешно активирована в LiveKit');
    } catch (camErr: any) {
      onLog?.('warn', 'LiveKit: сбой активации камеры', camErr?.message);
      options.onMediaError?.('camera', camErr?.message || String(camErr));
    }

    // Expose local tracks to caller for diagnostics & controls
    try {
      const localTracks: MediaStreamTrack[] = [];
      const camTrack = room.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack?.mediaStreamTrack;
      const micTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.audioTrack?.mediaStreamTrack;
      if (camTrack) localTracks.push(camTrack);
      if (micTrack) localTracks.push(micTrack);
      if (localTracks.length > 0) {
        options.onLocalTracks?.(new MediaStream(localTracks));
      }
    } catch (_) {}

    return {
      room,
      account: tokenRes.account || 'account1',
      accountName: tokenRes.accountName || 'Основной аккаунт',
      serverUrl: cleanUrl,
    };
  } catch (err: any) {
    onLog?.('error', 'Сбой инициализации LiveKit SFU', err?.message || String(err));
    return null;
  }
}
