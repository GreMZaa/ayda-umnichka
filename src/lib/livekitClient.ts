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
  onRemoteTrackReceived?: (kind: 'video' | 'audio', stream: MediaStream) => void;
  onPeerJoined?: (name: string, role?: string) => void;
  onPeerLeft?: () => void;
  onDataReceived?: (data: any) => void;
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

    const cleanUrl = (tokenRes.serverUrl || '').replace(/^["']|["']$/g, '').trim();
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

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h540.resolution, // 960x540 25-30fps ~800kbps (butter-smooth, no lag)
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

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      onLog?.('success', `Получен удаленный медиа-поток (${track.kind}) от ${participant.name || participant.identity}`);

      if (track.kind === Track.Kind.Video) {
        if (options.remoteVideoEl) {
          track.attach(options.remoteVideoEl);
        }
        if (track.mediaStreamTrack) {
          onRemoteTrackReceived?.('video', new MediaStream([track.mediaStreamTrack]));
        }
      } else if (track.kind === Track.Kind.Audio) {
        // Auto-attach audio element to DOM so playback is guaranteed
        try {
          track.attach();
        } catch (_) {}

        if (options.remoteAudioEl) {
          try {
            track.attach(options.remoteAudioEl);
            options.remoteAudioEl.muted = false;
            options.remoteAudioEl.play().catch(() => {});
          } catch (_) {}
        }
        if (track.mediaStreamTrack) {
          onRemoteTrackReceived?.('audio', new MediaStream([track.mediaStreamTrack]));
        }
      }
    });

    room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);
        onDataReceived?.(data);
      } catch (_) {}
    });

    // Check if peer is already in room upon our join
    for (const [, participant] of room.remoteParticipants) {
      onPeerJoined?.(participant.name || participant.identity);
      for (const [, pub] of participant.trackPublications) {
        if (pub.track) {
          if (pub.track.kind === Track.Kind.Video && options.remoteVideoEl) {
            pub.track.attach(options.remoteVideoEl);
            if (pub.track.mediaStreamTrack) {
              onRemoteTrackReceived?.('video', new MediaStream([pub.track.mediaStreamTrack]));
            }
          } else if (pub.track.kind === Track.Kind.Audio) {
            try {
              pub.track.attach();
            } catch (_) {}
            if (options.remoteAudioEl) {
              try {
                pub.track.attach(options.remoteAudioEl);
                options.remoteAudioEl.muted = false;
                options.remoteAudioEl.play().catch(() => {});
              } catch (_) {}
            }
            if (pub.track.mediaStreamTrack) {
              onRemoteTrackReceived?.('audio', new MediaStream([pub.track.mediaStreamTrack]));
            }
          }
        }
      }
    }

    await room.connect(cleanUrl, tokenRes.token.trim());

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
    }

    try {
      await room.localParticipant.setCameraEnabled(true);
      const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (camPub?.videoTrack && options.localVideoEl) {
        camPub.videoTrack.attach(options.localVideoEl);
      }
      onLog?.('success', 'Локальная камера успешно активирована в LiveKit');
    } catch (camErr: any) {
      onLog?.('warn', 'LiveKit: сбой активации камеры', camErr?.message);
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
