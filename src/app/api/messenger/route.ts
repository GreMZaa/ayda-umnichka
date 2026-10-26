import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get('userId')?.trim() || searchParams.get('id')?.trim();
    const queryRole = searchParams.get('role')?.trim();

    // 1. Identify current user from query or cookies
    const cookieUserId =
      req.cookies.get('aida_auth_user_id')?.value?.trim() ||
      req.cookies.get('aida_user_id')?.value?.trim();
    const cookieRole =
      req.cookies.get('aida_active_role')?.value?.trim() ||
      req.cookies.get('aida_role')?.value?.trim();

    const activePublicId = queryUserId || cookieUserId || 'id179017';

    // 2. Fetch current user from Supabase user_bindings or profiles
    const { data: binding } = await supabaseServer
      .from('user_bindings')
      .select('*')
      .or(`public_id.eq.${activePublicId},id.eq.${activePublicId},auth_user_id.eq.${activePublicId}`)
      .maybeSingle();

    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('*')
      .or(`public_id.eq.${activePublicId},id.eq.${activePublicId}`)
      .maybeSingle();

    const currentUserId =
      binding?.auth_user_id ||
      profile?.id ||
      binding?.id ||
      'c51ef5b0-3bc0-456f-bd31-7dbba439846c';

    const activeRole =
      binding?.role ||
      profile?.role ||
      queryRole ||
      cookieRole ||
      (activePublicId.startsWith('id17') || activePublicId.startsWith('id18') ? 'teacher' : 'student');

    const rawFullName = binding?.full_name || profile?.full_name || '';
    const currentFullName =
      rawFullName.replace(/\s*\(.*?\)$/, '').trim() ||
      (activeRole === 'teacher' ? 'Преподаватель центра' : activeRole === 'admin' ? 'Администратор' : 'Ученик');

    // 3. Fetch all active users from Supabase user_bindings & profiles to build genuine contacts
    const { data: allBindings } = await supabaseServer
      .from('user_bindings')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: allProfiles } = await supabaseServer
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: boundStudents } = await supabaseServer
      .from('teacher_students')
      .select('*')
      .order('created_at', { ascending: false });

    // Find admin user for official platform support dialog
    const adminUser =
      allBindings?.find((b) => b.role === 'admin') ||
      allProfiles?.find((p) => p.role === 'admin') || {
        id: '03106a99-4793-4fce-bd94-0e8ddaeed4f5',
        auth_user_id: '03106a99-4793-4fce-bd94-0e8ddaeed4f5',
        public_id: 'admin_head',
        full_name: 'Руководитель центра',
      };

    const adminUuid = adminUser.auth_user_id || adminUser.id || '03106a99-4793-4fce-bd94-0e8ddaeed4f5';

    // Build contacts list dynamically based on role
    const contactsMap = new Map<string, {
      id: string;
      publicId: string;
      role: 'teacher' | 'student' | 'support' | 'admin';
      fullName: string;
      subtitle: string;
      avatarText: string;
      online: boolean;
      roomToken?: string;
    }>();

    if (activeRole === 'teacher') {
      // Teachers see:
      // a) Their assigned/bound students from teacher_students
      (boundStudents || []).forEach((st) => {
        const sPubId = st.student_public_id || 'id571210';
        const rawName = st.student_name || 'Ученик';
        const cleanName = rawName.replace(/\s*\(.*?\)$/, '').trim();
        const studentBinding = allBindings?.find((b) => b.public_id === sPubId);
        const sUuid = studentBinding?.auth_user_id || studentBinding?.id || '6fb2d0a9-0f80-428d-8539-3272303360a0';

        contactsMap.set(sPubId, {
          id: sUuid,
          publicId: sPubId,
          role: 'student',
          fullName: cleanName,
          subtitle: st.notes ? `Ученик • ${st.notes}` : 'Ученик • Индивидуальное сопровождение',
          avatarText: cleanName[0] || 'У',
          online: true,
          roomToken: 'room-4599',
        });
      });

      // b) Any other registered students in user_bindings
      (allBindings || []).forEach((b) => {
        if (b.role === 'student' && !contactsMap.has(b.public_id)) {
          const cleanName = (b.full_name || 'Ученик').replace(/\s*\(.*?\)$/, '').trim();
          contactsMap.set(b.public_id, {
            id: b.auth_user_id || b.id,
            publicId: b.public_id,
            role: 'student',
            fullName: cleanName,
            subtitle: 'Ученик центра • Занятия по расписанию',
            avatarText: cleanName[0] || 'У',
            online: true,
            roomToken: 'room-4599',
          });
        }
      });

      // c) Other colleague teachers
      (allBindings || []).forEach((b) => {
        if (b.role === 'teacher' && b.public_id !== activePublicId && !contactsMap.has(b.public_id)) {
          const cleanName = (b.full_name || 'Педагог').replace(/\s*\(.*?\)$/, '').trim();
          contactsMap.set(b.public_id, {
            id: b.auth_user_id || b.id,
            publicId: b.public_id,
            role: 'teacher',
            fullName: cleanName,
            subtitle: 'Педагог центра • Коллега',
            avatarText: cleanName[0] || 'П',
            online: true,
            roomToken: 'room-4599',
          });
        }
      });
    } else if (activeRole === 'student') {
      // Students see:
      // a) Registered teachers
      (allBindings || []).forEach((b) => {
        if (b.role === 'teacher' && !contactsMap.has(b.public_id)) {
          const cleanName = (b.full_name || 'Педагог').replace(/\s*\(.*?\)$/, '').trim();
          contactsMap.set(b.public_id, {
            id: b.auth_user_id || b.id,
            publicId: b.public_id,
            role: 'teacher',
            fullName: cleanName,
            subtitle: 'Ведущий логопед-методист',
            avatarText: cleanName[0] || 'П',
            online: true,
            roomToken: 'room-4599',
          });
        }
      });
    } else {
      // Admin sees everyone
      (allBindings || []).forEach((b) => {
        if (b.public_id !== activePublicId && !contactsMap.has(b.public_id)) {
          const cleanName = (b.full_name || 'Пользователь').replace(/\s*\(.*?\)$/, '').trim();
          contactsMap.set(b.public_id, {
            id: b.auth_user_id || b.id,
            publicId: b.public_id,
            role: b.role as any,
            fullName: cleanName,
            subtitle: b.role === 'teacher' ? 'Педагог центра' : 'Ученик центра',
            avatarText: cleanName[0] || 'П',
            online: true,
            roomToken: 'room-4599',
          });
        }
      });
    }

    // Support dialog removed as requested
    const contacts = Array.from(contactsMap.values());

    // 4. Load or create real conversations and messages from Supabase
    const conversationList: any[] = [];
    for (const contact of contacts) {
      let conversationId: string | null = null;

      const userA = currentUserId;
      const userB = contact.id;

      // Query existing conversation between userA and userB in Supabase
      const { data: existingConv } = await supabaseServer
        .from('conversations')
        .select('*')
        .or(`and(student_id.eq.${userA},teacher_id.eq.${userB}),and(student_id.eq.${userB},teacher_id.eq.${userA})`)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        // Create conversation record in Supabase
        const isStudentA = activeRole === 'student';
        const studentId = isStudentA ? userA : userB;
        const teacherId = isStudentA ? userB : userA;

        try {
          const { data: createdConv } = await supabaseServer
            .from('conversations')
            .insert({
              student_id: studentId,
              teacher_id: teacherId,
              last_message_at: new Date().toISOString(),
            })
            .select()
            .maybeSingle();

          if (createdConv) conversationId = createdConv.id;
        } catch (convErr) {
          console.warn('Could not insert conversation:', convErr);
        }
      }

      // Fetch messages from Supabase for this conversation
      let messages: any[] = [];
      if (conversationId) {
        const { data: msgs } = await supabaseServer
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (msgs) messages = msgs;
      }

      conversationList.push({
        id: conversationId || `conv_${contact.publicId}`,
        contact,
        messages,
        lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
        unreadCount: messages.filter((m) => !m.is_read && m.sender_id !== currentUserId).length,
      });
    }

    return NextResponse.json({
      success: true,
      currentUser: {
        id: currentUserId,
        publicId: activePublicId,
        role: activeRole,
        fullName: currentFullName,
      },
      conversations: conversationList,
    });
  } catch (err: any) {
    console.error('Messenger GET error:', err);
    return NextResponse.json({ error: err.message || 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, text, senderId, fileUrl, fileType } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId обязателен' }, { status: 400 });
    }

    if (!text && !fileUrl) {
      return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
    }

    const effectiveSenderId = senderId || 'c51ef5b0-3bc0-456f-bd31-7dbba439846c';

    const { data: newMsg, error: insertError } = await supabaseServer
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: effectiveSenderId,
        text: text ? text.trim() : null,
        file_url: fileUrl || null,
        file_type: fileType || null,
        is_read: false,
      })
      .select()
      .maybeSingle();

    if (insertError) {
      console.error('Error inserting message into Supabase:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update conversation timestamp in Supabase
    await supabaseServer
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    return NextResponse.json({
      success: true,
      message: newMsg,
    });
  } catch (err: any) {
    console.error('Messenger POST error:', err);
    return NextResponse.json({ error: err.message || 'Ошибка отправки' }, { status: 500 });
  }
}
