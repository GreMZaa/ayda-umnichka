import { getSupabase } from "@/lib/supabase";

/**
 * Оповещает все вкладки и устройства об изменении расписания (создание, удаление, редактирование уроков)
 */
export function broadcastLessonsUpdated() {
  if (typeof window === "undefined") return;

  // 1. Локальный CustomEvent в текущей вкладке
  window.dispatchEvent(new CustomEvent("ayda:lessons-updated"));

  // 2. LocalStorage storage-event для мгновенного оповещения всех других вкладок в том же браузере
  try {
    localStorage.setItem("ayda_lessons_updated_at", String(Date.now()));
  } catch {}

  // 3. BroadcastChannel API для современных браузеров (cross-tab)
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("ayda-sync-channel");
      bc.postMessage({ event: "lessons-updated", timestamp: Date.now() });
      bc.close();
    }
  } catch {}

  // 4. Supabase WebSocket Broadcast для мгновенной доставки на ВСЕ устройства (телефон <-> ПК)
  try {
    const client = getSupabase();
    if (client) {
      const ch = client.channel("ayda-sync-room");
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          ch.send({
            type: "broadcast",
            event: "lessons-updated",
            payload: { timestamp: Date.now() },
          }).finally(() => {
            setTimeout(() => {
              try {
                client.removeChannel(ch);
              } catch {}
            }, 1000);
          });
        }
      });
    }
  } catch (err) {
    console.warn("Supabase broadcast error:", err);
  }
}

/**
 * Подписывается на обновление уроков со всех источников (WebSocket, BroadcastChannel, Storage, CustomEvent)
 * Возвращает функцию отписки (cleanup).
 */
export function subscribeToLessonsUpdates(onUpdate: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  // 1. Слушатель CustomEvent
  const handleCustom = () => onUpdate();
  window.addEventListener("ayda:lessons-updated", handleCustom);

  // 2. Слушатель StorageEvent (другие вкладки)
  const handleStorage = (e: StorageEvent) => {
    if (e.key === "ayda_lessons_updated_at" || e.key === "ayda_latest_lessons") {
      onUpdate();
    }
  };
  window.addEventListener("storage", handleStorage);

  // 3. BroadcastChannel (другие вкладки)
  let bc: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel("ayda-sync-channel");
      bc.onmessage = (msg) => {
        if (msg.data?.event === "lessons-updated") {
          onUpdate();
        }
      };
    }
  } catch {}

  // 4. Supabase WebSocket Broadcast (другие устройства: телефон, ноутбук)
  let sbChannel: any = null;
  const client = getSupabase();
  try {
    if (client) {
      sbChannel = client.channel("ayda-sync-room", {
        config: { broadcast: { self: false } },
      });
      sbChannel.on("broadcast", { event: "lessons-updated" }, () => {
        onUpdate();
      });
      sbChannel.subscribe();
    }
  } catch {}

  return () => {
    window.removeEventListener("ayda:lessons-updated", handleCustom);
    window.removeEventListener("storage", handleStorage);
    if (bc) {
      try {
        bc.close();
      } catch {}
    }
    if (sbChannel && client) {
      try {
        client.removeChannel(sbChannel);
      } catch {}
    }
  };
}
