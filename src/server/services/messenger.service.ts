import { supabaseServer } from '../config/database';
import { AppError } from '../middleware/apiErrors';

function isUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function checkIsOnline(metadata?: any): boolean {
  if (!metadata?.last_seen_at) return false;
  const lastSeenMs = new Date(metadata.last_seen_at).getTime();
  if (isNaN(lastSeenMs)) return false;
  return Date.now() - lastSeenMs < 90_000;
}

function formatContactSubtitle(role: string, metadata?: any, defaultSub = ''): string {
  const isOnline = checkIsOnline(metadata);
  if (isOnline) {
    if (role === 'teacher') return 'Педагог центра • В сети';
    if (role === 'student') return 'Ученик • В сети';
    if (role === 'admin') return 'Руководитель • В сети';
    return 'В сети';
  }
  if (metadata?.last_seen_at) {
    const diffMs = Date.now() - new Date(metadata.last_seen_at).getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 60) return `Был(а) ${mins} мин. назад`;
    if (mins < 24 * 60) {
      const d = new Date(metadata.last_seen_at);
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return `Был(а) сегодня в ${timeStr}`;
    }
    return 'Не в сети';
  }
  return defaultSub || (role === 'teacher' ? 'Педагог центра' : role === 'student' ? 'Ученик центра' : 'Не в сети');
}

export class MessengerService {
  static async getMessengerData(params: {
    queryUserId?: string;
    queryRole?: string;
    cookieUserId?: string;
    cookieRole?: string;
  }) {
    const activePublicId = params.queryUserId || params.cookieUserId || '';
    if (!activePublicId) {
      return {
        currentUser: null,
        contacts: [],
        messages: [],
      };
    }
    const isIdUuid = isUuid(activePublicId);

    let bindingQuery = supabaseServer.from('user_bindings').select('*');
    if (isIdUuid) {
      bindingQuery = bindingQuery.or(`id.eq.${activePublicId},auth_user_id.eq.${activePublicId}`);
    } else {
      bindingQuery = bindingQuery.eq('public_id', activePublicId);
    }
    const { data: binding } = await bindingQuery.maybeSingle();

    let profileQuery = supabaseServer.from('profiles').select('*');
    if (isIdUuid) {
      profileQuery = profileQuery.eq('id', activePublicId);
    } else {
      profileQuery = profileQuery.eq('public_id', activePublicId);
    }
    const { data: profile } = await profileQuery.maybeSingle();

    const currentUserId =
      binding?.auth_user_id ||
      profile?.id ||
      binding?.id ||
      null;

    const activeRole =
      binding?.role ||
      profile?.role ||
      params.queryRole ||
      params.cookieRole ||
      'student';

    const rawFullName = binding?.full_name || profile?.full_name || '';
    const currentFullName =
      rawFullName.replace(/\s*\(.*?\)$/, '').trim() ||
      (activeRole === 'teacher'
        ? 'Преподаватель центра'
        : activeRole === 'admin'
        ? 'Администратор'
        : 'Ученик');

    const { data: allBindings } = await supabaseServer
      .from('user_bindings')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: boundStudents } = await supabaseServer
      .from('teacher_students')
      .select('*')
      .order('created_at', { ascending: false });

    const adminBinding = allBindings?.find((b) => b.role === 'admin');
    const adminUuid =
      adminBinding?.auth_user_id ||
      adminBinding?.id ||
      '03106a99-4793-4fce-bd94-0e8ddaeed4f5';
    const adminPubId = adminBinding?.public_id || 'admin_head';

    const contactsMap = new Map<string, any>();

    if (activeRole === 'teacher') {
      (boundStudents || []).forEach((st) => {
        const sPubId = st.student_public_id || st.id || '';
        const rawName = st.student_name || 'Ученик';
        const cleanName = rawName.replace(/\s*\(.*?\)$/, '').trim();
        const studentBinding = allBindings?.find((b) => b.public_id === sPubId);
        const sUuid =
          studentBinding?.auth_user_id ||
          studentBinding?.id ||
          '6fb2d0a9-0f80-428d-8539-3272303360a0';
        const isOnline = checkIsOnline(studentBinding?.metadata);

        contactsMap.set(sPubId, {
          id: sUuid,
          publicId: sPubId,
          role: 'student',
          fullName: cleanName,
          subtitle: formatContactSubtitle(
            'student',
            studentBinding?.metadata,
            st.notes ? `Ученик • ${st.notes}` : 'Ученик • Индивидуальное сопровождение'
          ),
          avatarText: cleanName[0] || 'У',
          online: isOnline,
          roomToken: 'room-4599',
        });
      });

      (allBindings || []).forEach((b) => {
        if (b.role === 'student' && !contactsMap.has(b.public_id)) {
          const cleanName = (b.full_name || 'Ученик').replace(/\s*\(.*?\)$/, '').trim();
          const sUuid = b.auth_user_id || b.id || '6fb2d0a9-0f80-428d-8539-3272303360a0';
          const isOnline = checkIsOnline(b.metadata);

          contactsMap.set(b.public_id, {
            id: sUuid,
            publicId: b.public_id,
            role: 'student',
            fullName: cleanName,
            subtitle: formatContactSubtitle(
              'student',
              b.metadata,
              'Ученик центра • Занятия по расписанию'
            ),
            avatarText: cleanName[0] || 'У',
            online: isOnline,
            roomToken: 'room-4599',
          });
        }
      });

      (allBindings || []).forEach((b) => {
        const bUuid = b.auth_user_id || b.id;
        const isSelf = b.public_id === activePublicId || bUuid === currentUserId;
        if (b.role === 'teacher' && !isSelf && !contactsMap.has(b.public_id)) {
          const cleanName = (b.full_name || 'Педагог').replace(/\s*\(.*?\)$/, '').trim();
          const isOnline = checkIsOnline(b.metadata);

          contactsMap.set(b.public_id, {
            id: bUuid,
            publicId: b.public_id,
            role: 'teacher',
            fullName: cleanName,
            subtitle: formatContactSubtitle('teacher', b.metadata, 'Педагог центра • Коллега'),
            avatarText: cleanName[0] || 'П',
            online: isOnline,
            roomToken: 'room-4599',
          });
        }
      });

      if (adminPubId !== activePublicId && adminUuid !== currentUserId && !contactsMap.has(adminPubId)) {
        const isOnline = checkIsOnline(adminBinding?.metadata);
        contactsMap.set(adminPubId, {
          id: adminUuid,
          publicId: adminPubId,
          role: 'admin',
          fullName: 'Руководитель центра',
          subtitle: formatContactSubtitle('admin', adminBinding?.metadata, 'Администрация центра'),
          avatarText: 'Р',
          online: isOnline,
          roomToken: 'room-4599',
        });
      }
    } else if (activeRole === 'student') {
      (allBindings || []).forEach((b) => {
        if (b.role === 'teacher' && !contactsMap.has(b.public_id)) {
          const cleanName = (b.full_name || 'Педагог').replace(/\s*\(.*?\)$/, '').trim();
          const bUuid = b.auth_user_id || b.id;
          const isOnline = checkIsOnline(b.metadata);

          contactsMap.set(b.public_id, {
            id: bUuid,
            publicId: b.public_id,
            role: 'teacher',
            fullName: cleanName,
            subtitle: formatContactSubtitle('teacher', b.metadata, 'Ведущий педагог-методист'),
            avatarText: cleanName[0] || 'П',
            online: isOnline,
            roomToken: 'room-4599',
          });
        }
      });

      if (adminPubId !== activePublicId && adminUuid !== currentUserId && !contactsMap.has(adminPubId)) {
        const isOnline = checkIsOnline(adminBinding?.metadata);
        contactsMap.set(adminPubId, {
          id: adminUuid,
          publicId: adminPubId,
          role: 'admin',
          fullName: 'Руководитель центра',
          subtitle: formatContactSubtitle('admin', adminBinding?.metadata, 'Администрация центра'),
          avatarText: 'Р',
          online: isOnline,
          roomToken: 'room-4599',
        });
      }
    } else {
      (allBindings || []).forEach((b) => {
        const bUuid = b.auth_user_id || b.id;
        const isSelf = b.public_id === activePublicId || bUuid === currentUserId;
        if (!isSelf && !contactsMap.has(b.public_id)) {
          const cleanName = (b.full_name || 'Пользователь').replace(/\s*\(.*?\)$/, '').trim();
          const isOnline = checkIsOnline(b.metadata);

          contactsMap.set(b.public_id, {
            id: bUuid,
            publicId: b.public_id,
            role: (b.role as any) || 'student',
            fullName: cleanName,
            subtitle: formatContactSubtitle(
              b.role,
              b.metadata,
              b.role === 'teacher' ? 'Педагог центра' : 'Ученик центра'
            ),
            avatarText: cleanName[0] || 'П',
            online: isOnline,
            roomToken: 'room-4599',
          });
        }
      });
    }

    const contacts = Array.from(contactsMap.values());
    const conversationList: any[] = [];

    // Batch fetch all conversations for current user in ONE query (eliminates N+1 queries)
    const userA = currentUserId;
    const isUserAUuid = isUuid(userA);
    const convMapByPeer = new Map<string, any>();
    const convIds: string[] = [];

    if (isUserAUuid) {
      const { data: convData } = await supabaseServer
        .from('conversations')
        .select('*')
        .or(`student_id.eq.${userA},teacher_id.eq.${userA}`);

      if (convData) {
        for (const c of convData) {
          const peer = c.student_id === userA ? c.teacher_id : c.student_id;
          convMapByPeer.set(peer, c);
          convIds.push(c.id);
        }
      }
    }

    // Batch fetch all messages for all conversations in ONE query
    const messagesByConv = new Map<string, any[]>();
    if (convIds.length > 0) {
      const { data: allMsgs } = await supabaseServer
        .from('messages')
        .select('*')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: true });

      if (allMsgs) {
        for (const m of allMsgs) {
          const list = messagesByConv.get(m.conversation_id) || [];
          list.push(m);
          messagesByConv.set(m.conversation_id, list);
        }
      }
    }

    // Assemble conversations in memory O(1)
    for (const contact of contacts) {
      const userB = contact.id;
      let conversationId: string | null = null;

      if (isUserAUuid && isUuid(userB) && userA !== userB) {
        const existingConv = convMapByPeer.get(userB);
        if (existingConv) {
          conversationId = existingConv.id;
        } else {
          try {
            const { data: createdConv } = await supabaseServer
              .from('conversations')
              .insert({
                student_id: userA,
                teacher_id: userB,
                last_message_at: new Date().toISOString(),
              })
              .select()
              .maybeSingle();

            if (createdConv) {
              conversationId = createdConv.id;
              convMapByPeer.set(userB, createdConv);
            }
          } catch (convErr) {
            console.warn('Could not insert conversation between', userA, userB, convErr);
          }
        }
      }

      const messages: any[] = conversationId ? (messagesByConv.get(conversationId) || []) : [];

      conversationList.push({
        id: conversationId || `conv_${contact.publicId}`,
        contact,
        messages,
        lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
        unreadCount: messages.filter((m) => !m.is_read && m.sender_id !== currentUserId).length,
      });
    }

    const totalUnreadCount = conversationList.reduce(
      (acc, c) => acc + (c.unreadCount || 0),
      0
    );

    return {
      success: true,
      currentUser: {
        id: currentUserId,
        publicId: activePublicId,
        role: activeRole,
        fullName: currentFullName,
      },
      conversations: conversationList,
      totalUnreadCount,
    };
  }

  static async markConversationRead(params: {
    conversationId: string;
    userId?: string;
    userPublicId?: string;
  }) {
    const { conversationId, userId, userPublicId } = params;
    if (!conversationId || !isUuid(conversationId)) {
      return { success: false, updatedCount: 0 };
    }

    let effectiveUserId = userId;
    if (!effectiveUserId || !isUuid(effectiveUserId)) {
      if (userPublicId) {
        const { data: b } = await supabaseServer
          .from('user_bindings')
          .select('auth_user_id, id')
          .eq('public_id', userPublicId)
          .maybeSingle();
        if (b) effectiveUserId = b.auth_user_id || b.id;
      }
    }

    let query = supabaseServer
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('is_read', false);

    if (effectiveUserId && isUuid(effectiveUserId)) {
      query = query.neq('sender_id', effectiveUserId);
    }

    const { error, count } = await query;
    if (error) {
      console.warn('Error marking messages as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true, updatedCount: count ?? 0 };
  }

  static async sendMessage(body: {
    conversationId: string;
    text?: string;
    senderId?: string;
    senderPublicId?: string;
    fileUrl?: string;
    fileType?: string;
  }) {
    const { conversationId, text, senderId, senderPublicId, fileUrl, fileType } = body;

    if (!conversationId) {
      throw new AppError('conversationId обязателен', 400);
    }

    if (!text && !fileUrl) {
      throw new AppError('Сообщение не может быть пустым', 400);
    }

    let effectiveSenderId = senderId;
    if (!effectiveSenderId || !isUuid(effectiveSenderId)) {
      if (senderPublicId) {
        const { data: b } = await supabaseServer
          .from('user_bindings')
          .select('auth_user_id, id')
          .eq('public_id', senderPublicId)
          .maybeSingle();
        if (b) effectiveSenderId = b.auth_user_id || b.id;
      }
    }

    if (!effectiveSenderId || !isUuid(effectiveSenderId)) {
      effectiveSenderId = 'c51ef5b0-3bc0-456f-bd31-7dbba439846c';
    }

    if (!isUuid(conversationId)) {
      throw new AppError('Неверный идентификатор диалога', 400);
    }

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
      throw new AppError(insertError.message, 500);
    }

    await supabaseServer
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    return {
      success: true,
      message: newMsg,
    };
  }
}
