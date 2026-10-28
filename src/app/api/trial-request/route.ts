import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/server/config/database';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { parentName, phone, childName, selectedSubject, action } = body || {};

    // 1. Convert Lead to Student Action (Called from Admin Panel)
    if (action === 'convert_to_student') {
      const { leadId, assignedTeacherId, initialBalance } = body;
      if (!leadId) {
        return NextResponse.json({ error: 'Не указан ID заявки' }, { status: 400 });
      }

      // Fetch the lead
      const { data: lead, error: fetchErr } = await supabaseServer
        .from('user_bindings')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();

      if (fetchErr || !lead) {
        return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 });
      }

      // Generate clean student public ID
      const newStudentPublicId = `id${Math.floor(100000 + Math.random() * 900000)}`;
      const currentMeta = (lead.metadata as Record<string, any>) || {};

      // Update lead to active student
      const { data: updatedStudent, error: updateErr } = await supabaseServer
        .from('user_bindings')
        .update({
          public_id: newStudentPublicId,
          role: 'student',
          is_registered: true,
          balance_lessons: typeof initialBalance === 'number' ? initialBalance : 1,
          metadata: {
            ...currentMeta,
            converted_from_lead_at: new Date().toISOString(),
            status: 'registered',
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .select()
        .single();

      if (updateErr) {
        console.error('Error converting lead to student:', updateErr);
        return NextResponse.json({ error: 'Ошибка конвертации в ученика' }, { status: 500 });
      }

      // If a teacher was chosen, bind them in teacher_students
      if (assignedTeacherId) {
        try {
          await supabaseServer.from('teacher_students').insert([
            {
              teacher_public_id: assignedTeacherId,
              student_public_id: newStudentPublicId,
              student_name: updatedStudent.full_name,
              notes: `Заявка с сайта (${currentMeta.selected_subject || 'Пробное занятие'})`,
              created_at: new Date().toISOString(),
            },
          ]);
        } catch (bindErr) {
          console.warn('Teacher-student binding warning:', bindErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Ученик успешно создан и добавлен в систему',
        student: updatedStudent,
        studentPublicId: newStudentPublicId,
      });
    }

    // 2. Validation for new lead submission from Landing Page
    if (!parentName || typeof parentName !== 'string' || parentName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Укажите корректное имя родителя (не менее 2 символов)' },
        { status: 400 }
      );
    }

    const digitsOnly = String(phone || '').replace(/\D/g, '');
    if (!phone || digitsOnly.length < 10) {
      return NextResponse.json(
        { error: 'Укажите действующий номер телефона (не менее 10 цифр)' },
        { status: 400 }
      );
    }

    const cleanParent = parentName.trim().slice(0, 100);
    const cleanChild = childName ? String(childName).trim().slice(0, 100) : '';
    const cleanPhone = phone.trim().slice(0, 30);
    const cleanSubject = selectedSubject
      ? String(selectedSubject).trim().slice(0, 100)
      : 'Логопедия и развитие речи';
    const nowIso = new Date().toISOString();

    const publicId = `lead_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const fullDisplayName = `${cleanParent}${cleanChild ? ` (ребёнок: ${cleanChild})` : ''}`;

    const newLeadRecord = {
      public_id: publicId,
      role: 'lead',
      full_name: fullDisplayName,
      phone: cleanPhone,
      email: null,
      is_registered: false,
      balance_lessons: 0,
      metadata: {
        lead_type: 'trial_request',
        parent_name: cleanParent,
        child_name: cleanChild,
        selected_subject: cleanSubject,
        status: 'new', // 'new' | 'contacted' | 'registered' | 'cancelled'
        notes: '',
        source: 'web-landing-trial',
        user_agent: req.headers.get('user-agent') || 'unknown',
        created_at: nowIso,
      },
      created_at: nowIso,
      updated_at: nowIso,
    };

    // 3. Insert into Supabase
    const { data: inserted, error: insertError } = await supabaseServer
      .from('user_bindings')
      .insert([newLeadRecord])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting lead into Supabase:', insertError);
    }

    // 4. Broadcast live notification to Admin / Staff via Realtime
    try {
      const channel = supabaseServer.channel('platform_messenger_global');
      await channel.send({
        type: 'broadcast',
        event: 'new-trial-lead',
        payload: {
          id: inserted?.id || publicId,
          public_id: publicId,
          parentName: cleanParent,
          childName: cleanChild,
          phone: cleanPhone,
          selectedSubject: cleanSubject,
          createdAt: nowIso,
        },
      });
    } catch (_) {}

    return NextResponse.json(
      {
        success: true,
        message: 'Заявка успешно зарегистрирована. Педагог свяжется с вами в течение 15 минут.',
        lead: {
          id: inserted?.id || publicId,
          parentName: cleanParent,
          childName: cleanChild,
          selectedSubject: cleanSubject,
          phone: cleanPhone,
          createdAt: nowIso,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[TRIAL_LEAD_ERROR]', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка при обработке заявки. Пожалуйста, позвоните нам напрямую.' },
      { status: 500 }
    );
  }
}

// GET: Fetch all trial leads for Admin Panel
export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabaseServer
      .from('user_bindings')
      .select('*')
      .eq('role', 'lead')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching trial leads:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const leads = (data || []).map((row: any) => {
      const meta = (row.metadata as Record<string, any>) || {};
      const parenMatch = (row.full_name || '').match(/^(.*?)\s*\(ребёнок:\s*([^)]+)\)$/i);
      const parentName = meta.parent_name || (parenMatch ? parenMatch[1].trim() : row.full_name);
      const childName = meta.child_name || (parenMatch ? parenMatch[2].trim() : '');

      return {
        id: row.id,
        publicId: row.public_id,
        fullName: row.full_name,
        parentName,
        childName,
        phone: row.phone,
        email: row.email,
        selectedSubject: meta.selected_subject || 'Логопедия и развитие речи',
        status: meta.status || 'new', // 'new' | 'contacted' | 'registered' | 'cancelled'
        notes: meta.notes || '',
        source: meta.source || 'web-landing-trial',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    return NextResponse.json({ success: true, leads });
  } catch (error: any) {
    console.error('GET /api/trial-request error:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

// PATCH: Update lead status or admin notes
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID заявки обязателен' }, { status: 400 });
    }

    const { data: existing, error: fetchErr } = await supabaseServer
      .from('user_bindings')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 });
    }

    const currentMeta = (existing.metadata as Record<string, any>) || {};
    const updatedMeta = {
      ...currentMeta,
      ...(status !== undefined ? { status } : {}),
      ...(notes !== undefined ? { notes } : {}),
      status_updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateErr } = await supabaseServer
      .from('user_bindings')
      .update({
        metadata: updatedMeta,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      console.error('Error updating lead:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    console.error('PATCH /api/trial-request error:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

// DELETE: Remove lead
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID заявки обязателен' }, { status: 400 });
    }

    const { error } = await supabaseServer.from('user_bindings').delete().eq('id', id);

    if (error) {
      console.error('Error deleting lead:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Заявка успешно удалена' });
  } catch (error: any) {
    console.error('DELETE /api/trial-request error:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
