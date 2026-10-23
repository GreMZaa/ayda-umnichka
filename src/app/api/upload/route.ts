import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSupabase } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Rate limiting
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`upload:${clientIp}`, 30, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Слишком много загрузок. Пожалуйста, подождите минуту." },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Файл не передан." }, { status: 400 });
    }

    // 2. Ограничение размера (макс 20 МБ)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Размер файла превышает 20 МБ. Пожалуйста, выберите файл меньшего размера." },
        { status: 400 }
      );
    }

    // 3. Формирование безопасного имени файла
    const originalName = file.name || "file";
    const extMatch = originalName.match(/\.([a-zA-Z0-9_-]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : "bin";
    const baseClean = originalName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, "_")
      .slice(0, 40);
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fileName = `${baseClean}_${uniqueSuffix}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // 4. Попытка загрузить в Supabase Storage (если доступен бакет)
    let publicUrl: string | null = null;
    try {
      const client = getSupabase();
      if (client) {
        const { data: uploadData, error: sbErr } = await client.storage
          .from("materials")
          .upload(`homework/${fileName}`, buffer, {
            contentType: file.type || "application/octet-stream",
            upsert: true,
          });

        if (!sbErr && uploadData) {
          const { data: urlData } = client.storage
            .from("materials")
            .getPublicUrl(`homework/${fileName}`);
          if (urlData?.publicUrl) {
            publicUrl = urlData.publicUrl;
          }
        }
      }
    } catch (e) {
      // Игнорируем и сохраняем локально
    }

    // 5. Попытка сохранить локально в public/uploads (если файловая система доступна для записи)
    if (!publicUrl) {
      try {
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filePath = path.join(uploadsDir, fileName);
        await fs.promises.writeFile(filePath, buffer);
        publicUrl = `/uploads/${fileName}`;
      } catch (fsErr: any) {
        console.warn(
          "Файловая система доступна только для чтения (Vercel serverless / read-only). Используем Data URL fallback:",
          fsErr?.message
        );
        // 6. Гарантированный надёжный фоллбэк для Vercel: кодируем в Base64 Data URL
        const mimeType = file.type || "application/octet-stream";
        publicUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
      }
    }

    // Форматирование размера для отображения
    const sizeFormatted =
      file.size < 1024
        ? `${file.size} Б`
        : file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} КБ`
        : `${(file.size / (1024 * 1024)).toFixed(1)} МБ`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: originalName,
      fileSize: sizeFormatted,
      fileType: file.type,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err?.message || "Ошибка сервера при загрузке файла." },
      { status: 500 }
    );
  }
}
