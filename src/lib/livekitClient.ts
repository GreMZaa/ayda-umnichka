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

    if (!tokenRes.success || !tokenRes.token || !tokenRes.serverUrl) {
      onLog?.('info', 'LiveKit Cloud не настроен или выключен, используется резервный P2P WebRTC канал');
      return null;
    }

    onLog?.(
      'info',
      `Подключение к LiveKit SFU: ${tokenRes.accountName || tokenRes.account} (${tokenRes.serverUrl.replace(/^wss?:\/\//, '').split('.')[0]}...)`
    );

    // Dynamically load livekit-client in browser environment
    const { Room, RoomEvent, Track, VideoPresets } = await import('livekit-client');

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
    });

    room.on(RoomEvent.Connected, () => {
      onLog?.('success', `Успешно подключено к SFU серверу LiveKit (${tokenRes.accountName})`);
      onConnected?.(tokenRes.account || 'account1', tokenRes.accountName || 'Основной аккаунт');
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
        if (options.remoteAudioEl) {
          track.attach(options.remoteAudioEl);
          options.remoteAudioEl.play().catch(() => {});
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
          } else if (pub.track.kind === Track.Kind.Audio && options.remoteAudioEl) {
            pub.track.attach(options.remoteAudioEl);
            options.remoteAudioEl.play().catch(() => {});
            if (pub.track.mediaStreamTrack) {
              onRemoteTrackReceived?.('audio', new MediaStream([pub.track.mediaStreamTrack]));
            }
          }
        }
      }
    }

    await room.connect(tokenRes.serverUrl, tokenRes.token);

    // Publish local media
    try {
      await room.localParticipant.enableCameraAndMicrophone();
      const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (camPub?.videoTrack && options.localVideoEl) {
        camPub.videoTrack.attach(options.localVideoEl);
      }
    } catch (mediaErr: any) {
      onLog?.('warn', 'LiveKit: сбой публикации микрофона или камеры при старте', mediaErr?.message);
    }

    return {
      room,
      account: tokenRes.account || 'account1',
      accountName: tokenRes.accountName || 'Основной аккаунт',
      serverUrl: tokenRes.serverUrl,
    };
  } catch (err: any) {
    onLog?.('error', 'Сбой инициализации LiveKit SFU', err?.message || String(err));
    return null;
  }
}
