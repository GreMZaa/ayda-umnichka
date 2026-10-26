import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export interface TeacherRecord {
  id: string;
  publicId: string;
  fullName: string;
  cleanName: string;
  specialization: string;
  role: 'teacher' | 'admin';
  email: string | null;
  phone: string | null;
  status: 'online' | 'offline' | 'available';
  statusText: string;
  avatarLetter: string;
  createdAt: string;
}

function getPresenceInfo(metadata?: any) {
  const lastSeenAt = metadata?.last_seen_at;
  const isOnline = Boolean(
    lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < 90_000
  );

  let statusText = 'Не в сети';
  if (isOnline) {
    statusText = 'В сети • Готов к занятиям';
  } else if (lastSeenAt) {
    const diffMs = Date.now() - new Date(lastSeenAt).getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 60) {
      statusText = `Был(а) ${mins} мин. назад`;
    } else if (mins < 24 * 60) {
      const d = new Date(lastSeenAt);
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      statusText = `Был(а) сегодня в ${timeStr}`;
    } else {
      statusText = 'Не в сети';
    }
  }

  return {
    status: (isOnline ? 'online' : 'offline') as 'online' | 'offline',
    statusText,
  };
}

export async function GET() {
  try {
    // 1. Fetch from user_bindings (primary active accounts)
    const { data: bindings, error: bindError } = await supabase
      .from('user_bindings')
      .select('*')
      .in('role', ['teacher', 'admin'])
      .order('created_at', { ascending: true });

    if (bindError) {
      console.warn('user_bindings query warning:', bindError.message);
    }

    // 2. Fetch from profiles table (profile sync)
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['teacher', 'admin'])
      .order('created_at', { ascending: true });

    if (profError) {
      console.warn('profiles query warning:', profError.message);
    }

    const map = new Map<string, TeacherRecord>();

    // Process bindings first
    (bindings || []).forEach((b) => {
      const key = b.public_id || b.id;
      const rawName = b.full_name || 'Педагог центра';
      
      // Clean name and extract specialization if present in parentheses
      let cleanName = rawName;
      let specialization = b.role === 'admin' ? 'Администрация и методическое руководство' : 'Логопедия и развитие интеллекта';
      
      const parenMatch = rawName.match(/^(.*?)\s*\((.*?)\)$/);
      if (parenMatch) {
        cleanName = parenMatch[1].trim();
        const specPart = parenMatch[2].replace(/^ребёнок:\s*/i, '').replace(/^специализация:\s*/i, '').trim();
        if (specPart) {
          specialization = specPart;
        }
      }

      const presence = getPresenceInfo(b.metadata);

      map.set(key, {
        id: b.id,
        publicId: b.public_id || 'id_teacher',
        fullName: rawName,
        cleanName,
        specialization,
        role: b.role as 'teacher' | 'admin',
        email: b.email || null,
        phone: b.phone || null,
        status: presence.status,
        statusText: presence.statusText,
        avatarLetter: cleanName[0] || 'П',
        createdAt: b.created_at,
      });
    });

    // Merge profiles as well
    (profiles || []).forEach((p) => {
      const key = p.public_id || p.id;
      if (!map.has(key)) {
        const rawName = p.full_name || 'Педагог центра';
        let cleanName = rawName;
        let specialization = p.role === 'admin' ? 'Администрация и методическое руководство' : 'Логопедия и развитие интеллекта';
        
        const parenMatch = rawName.match(/^(.*?)\s*\((.*?)\)$/);
        if (parenMatch) {
          cleanName = parenMatch[1].trim();
          const specPart = parenMatch[2].replace(/^ребёнок:\s*/i, '').replace(/^специализация:\s*/i, '').trim();
          if (specPart) {
            specialization = specPart;
          }
        }

        map.set(key, {
          id: p.id,
          publicId: p.public_id || 'id_teacher',
          fullName: rawName,
          cleanName,
          specialization,
          role: p.role as 'teacher' | 'admin',
          email: null,
          phone: p.phone || null,
          status: 'offline',
          statusText: 'Не в сети',
          avatarLetter: cleanName[0] || 'П',
          createdAt: p.created_at,
        });
      }
    });

    const teachers = Array.from(map.values());

    return NextResponse.json({
      success: true,
      count: teachers.length,
      teachers,
    });
  } catch (err: any) {
    console.error('API /api/teachers error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch teachers from Supabase' },
      { status: 500 }
    );
  }
}
