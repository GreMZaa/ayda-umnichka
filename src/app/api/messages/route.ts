import { NextResponse } from "next/server";
import { db, ChatMessage } from "@/lib/db";
import { authenticateRequest } from "@/lib/server-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return NextResponse.json({ error: "Параметр chatId обязателен" }, { status: 400 });
  }

  try {
    // 1. Попытка прочитать из Supabase (если таблица chat_messages создана)
    const client = getSupabase();
    if (client) {
      try {
        const { data: sbMsgs, error } = await client
          .from("chat_messages")
          .select("*")
          .eq("chat_id", chatId)
          .order("created_at", { ascending: true });

        if (!error && sbMsgs && sbMsgs.length > 0) {
          const mapped: ChatMessage[] = sbMsgs.map((m: any) => ({
            id: m.id,
            chatId: m.chat_id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            senderAvatar: m.sender_avatar,
            text: m.text,
            time: new Date(m.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
            date: "Сегодня",
            type: m.type || "text",
            fileUrl: m.file_url,
            fileName: m.file_name,
            fileSize: m.file_size,
            createdAt: m.created_at,
          }));
          return NextResponse.json({ messages: mapped });
        }
      } catch (sbErr) {
        // Fallback to local DB
      }
    }

    // 2. Fallback на серверный db.json
    const messages = db.getMessages(chatId);
    return NextResponse.json({ messages });
  } catch (err: any) {
    console.error("GET /api/messages error:", err);
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(request: Request) {
  // 1. Rate limiting
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`messages:${clientIp}`, 60, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Слишком частая отправка сообщений. Пожалуйста, подождите немного." },
      { status: 429 }
    );
  }

  try {
    const auth = await authenticateRequest(request);
    const body = await request.json();

    const chatId = (body.chatId || "").trim();
    const text = (body.text || "").trim();
    const senderId = auth.user?.id || body.senderId || "anonymous";
    const senderName = auth.user?.name || body.senderName || "Пользователь";
    const senderAvatar = body.senderAvatar || null;

    if (!chatId) {
      return NextResponse.json({ error: "Параметр chatId обязателен" }, { status: 400 });
    }

    if (!text && !body.fileUrl) {
      return NextResponse.json({ error: "Текст сообщения или файл обязателен" }, { status: 400 });
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

    const messageData = {
      chatId,
      senderId,
      senderName,
      senderAvatar,
      text: text || "Прикреплённый файл",
      time: timeStr,
      date: "Сегодня",
      type: body.type || (body.fileUrl ? "file" : "text"),
      fileUrl: body.fileUrl || undefined,
      fileName: body.fileName || undefined,
      fileSize: body.fileSize || undefined,
      createdAt: now.toISOString(),
      read: false,
    };

    // 2. Попытка сохранить в Supabase
    const client = getSupabase();
    if (client) {
      try {
        const isUuid = (str: string) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        if (isUuid(senderId)) {
          await client.from("chat_messages").insert({
            chat_id: chatId,
            sender_id: senderId,
            sender_name: senderName,
            sender_avatar: senderAvatar,
            text: messageData.text,
            type: messageData.type,
            file_url: messageData.fileUrl,
            file_name: messageData.fileName,
            file_size: messageData.fileSize,
          });
        }
      } catch (sbErr) {
        console.warn("Supabase chat_messages insert fallback:", sbErr);
      }
    }

    // 3. Сохранение в постоянный серверный db.json
    const saved = db.saveMessage(messageData);

    return NextResponse.json({ message: saved }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/messages error:", err);
    return NextResponse.json(
      { error: err?.message || "Ошибка сервера при отправке сообщения" },
      { status: 500 }
    );
  }
}
