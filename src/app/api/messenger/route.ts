import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get('userId')?.trim();
    const queryRole = searchParams.get('role')?.trim();

    // 1. Identify current user from query or cookies
    const cookieUserId = req.cookies.get('aida_user_id')?.value?.trim();
    const cookieRole = req.cookies.get('aida_role')?.value?.trim();

    const activePublicId = queryUserId || cookieUserId || 'id179017';
    const activeRole = queryRole || cookieRole || (activePublicId === 'id179017' ? 'teacher' : 'student');

    // 2. Fetch current user from user_bindings
    const { data: currentBinding } = await supabaseServer
      .from('user_bindings')
      .select('*')
      .eq('public_id', activePublicId)
      .maybeSingle();

    const currentUserId = currentBinding?.auth_user_id || currentBinding?.id || 'c51ef5b0-3bc0-456f-bd31-7dbba439846c';
    const currentFullName = currentBinding?.full_name?.split('(')[0]?.trim() || (activeRole === 'teacher' ? 'Василина Владимировна' : 'СЕРГЕЙ');

    // 3. Determine real platform contacts ("убери лишние чаты" - only genuine teachers/students & support)
    const contacts: Array<{
      id: string;
      publicId: string;
      role: 'teacher' | 'student' | 'support' | 'admin';
      fullName: string;
      subtitle: string;
      avatarText: string;
      online: boolean;
      roomToken?: string;
    }> = [];

    if (activeRole === 'teacher') {
      // Find students linked to this teacher
      const { data: linkedStudents } = await supabaseServer
        .from('teacher_students')
        .select('*')
        .or(`teacher_public_id.eq.${activePublicId},teacher_id.eq.${currentUserId}`);

      if (linkedStudents && linkedStudents.length > 0) {
        for (const st of linkedStudents) {
          const sPublicId = st.student_public_id || 'id571210';
          const sName = st.student_name?.split('(')[0]?.trim() || 'СЕРГЕЙ';
          
          // Get auth_user_id if possible
          const { data: stBinding } = await supabaseServer
            .from('user_bindings')
            .select('auth_user_id, id')
            .eq('public_id', sPublicId)
            .maybeSingle();

          contacts.push({
            id: stBinding?.auth_user_id || stBinding?.id || '6fb2d0a9-0f80-428d-8539-3272303360a0',
            publicId: sPublicId,
            role: 'student',
            fullName: sName,
            subtitle: 'Ученик • Занятия по расписанию',
            avatarText: sName[0] || 'С',
            online: true,
            roomToken: 'room-4599',
          });
        }
      } else {
        // Fallback to student from user_bindings
        const { data: anyStudent } = await supabaseServer
          .from('user_bindings')
          .select('*')
          .eq('role', 'student')
          .maybeSingle();

        const sId = anyStudent?.auth_user_id || '6fb2d0a9-0f80-428d-8539-3272303360a0';
        const sPublic = anyStudent?.public_id || 'id571210';
        const sName = anyStudent?.full_name?.split('(')[0]?.trim() || 'СЕРГЕЙ';

        contacts.push({
          id: sId,
          publicId: sPublic,
          role: 'student',
          fullName: sName,
          subtitle: 'Ученик • Занятия по расписанию',
          avatarText: sName[0] || 'С',
          online: true,
          roomToken: 'room-4599',
        });
      }
    } else {
      // Student view: Link with assigned teacher
      const { data: teacherBinding } = await supabaseServer
        .from('user_bindings')
        .select('*')
        .eq('public_id', 'id179017')
        .maybeSingle();

      const tId = teacherBinding?.auth_user_id || 'c51ef5b0-3bc0-456f-bd31-7dbba439846c';
      const tName = teacherBinding?.full_name?.split('(')[0]?.trim() || 'Василина Владимировна';

      contacts.push({
        id: tId,
        publicId: 'id179017',
        role: 'teacher',
        fullName: tName,
        subtitle: 'Ведущий логопед-методист',
        avatarText: tName[0] || 'В',
        online: true,
        roomToken: 'room-4599',
      });
    }

    // Always include Platform Support channel/dialog
    contacts.push({
      id: '00000000-0000-0000-0000-000000000001',
      publicId: 'support',
      role: 'support',
      fullName: 'АйДаУмничка • Поддержка',
      subtitle: 'Методический отдел и служба заботы',
      avatarText: '⭐',
      online: true,
    });

    // 4. Ensure conversations exist in Supabase for each contact
    const conversationList: any[] = [];
    for (const contact of contacts) {
      let conversationId: string | null = null;

      if (contact.role !== 'support') {
        const studentUuid = activeRole === 'teacher' ? contact.id : currentUserId;
        const teacherUuid = activeRole === 'teacher' ? currentUserId : contact.id;

        const { data: existingConv } = await supabaseServer
          .from('conversations')
          .select('*')
          .eq('student_id', studentUuid)
          .eq('teacher_id', teacherUuid)
          .maybeSingle();

        if (existingConv) {
          conversationId = existingConv.id;
        } else {
          const { data: createdConv } = await supabaseServer
            .from('conversations')
            .insert({
              student_id: studentUuid,
              teacher_id: teacherUuid,
            })
            .select()
            .maybeSingle();
          if (createdConv) conversationId = createdConv.id;
        }
      } else {
        // Support conversation
        const { data: existingSupportConv } = await supabaseServer
          .from('conversations')
          .select('*')
          .eq('student_id', currentUserId)
          .eq('teacher_id', '00000000-0000-0000-0000-000000000001')
          .maybeSingle();

        if (existingSupportConv) {
          conversationId = existingSupportConv.id;
        } else {
          const { data: createdSupportConv } = await supabaseServer
            .from('conversations')
            .insert({
              student_id: currentUserId,
              teacher_id: '00000000-0000-0000-0000-000000000001',
            })
            .select()
            .maybeSingle();
          if (createdSupportConv) conversationId = createdSupportConv.id;
        }
      }

      // Fetch messages for this conversation
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

    const { data: newMsg, error: insertError } = await supabaseServer
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId || 'c51ef5b0-3bc0-456f-bd31-7dbba439846c',
        text: text ? text.trim() : null,
        file_url: fileUrl || null,
        file_type: fileType || null,
        is_read: false,
      })
      .select()
      .maybeSingle();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update conversation timestamp
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
