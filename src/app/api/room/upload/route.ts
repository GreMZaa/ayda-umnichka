import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    // Limit to 15MB
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'Размер файла превышает 15 МБ' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize file name
    const sanitizedName = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `room-files/${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${sanitizedName}`;

    const { error: uploadError } = await supabaseServer.storage
      .from('chat-attachments')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicData } = supabaseServer.storage
      .from('chat-attachments')
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      url: publicData.publicUrl,
      name: file.name,
      type: file.type,
      size: file.size,
      isImage: file.type.startsWith('image/'),
    });
  } catch (err: any) {
    console.error('Room file upload error:', err);
    return NextResponse.json({ error: err.message || 'Ошибка загрузки файла' }, { status: 500 });
  }
}
