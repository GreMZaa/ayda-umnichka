import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentPublicId = searchParams.get('studentPublicId')?.trim();

    let query = supabase
      .from('homework')
      .select('*')
      .order('created_at', { ascending: false });

    if (studentPublicId) {
      // Find tasks assigned to this specific student or to everyone ('all' or null)
      query = query.or(`student_public_id.eq.${studentPublicId},student_public_id.is.null,student_public_id.eq.all`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching homework from Supabase:', error);
      return NextResponse.json({ homework: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ homework: data || [] });
  } catch (err: any) {
    console.error('Homework GET handler error:', err);
    return NextResponse.json({ homework: [], error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Solution submission action
    if (body.action === 'submit_solution') {
      const { id, student_solution_text, student_solution_file_url } = body;
      if (!id) {
        return NextResponse.json({ error: 'Missing homework id' }, { status: 400 });
      }

      const updateData: Record<string, any> = {
        status: 'submitted',
        updated_at: new Date().toISOString(),
      };

      if (student_solution_text !== undefined) {
        updateData.student_solution_text = student_solution_text;
      }
      if (student_solution_file_url !== undefined) {
        updateData.student_solution_file_url = student_solution_file_url;
      }

      const { data, error } = await supabase
        .from('homework')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, homework: data });
    }

    // 2. Homework assignment creation
    const {
      title,
      task_description,
      student_public_id,
      student_name,
      teacher_name,
      task_file_url,
      file_name,
    } = body;

    if (!title || !task_description) {
      return NextResponse.json(
        { error: 'Необходимо указать название и описание задания' },
        { status: 400 }
      );
    }

    const newRecord = {
      title: title.trim(),
      task_description: task_description.trim(),
      student_public_id: student_public_id?.trim() || null,
      student_name: student_name?.trim() || 'Всем ученикам',
      teacher_name: teacher_name?.trim() || 'Преподаватель',
      task_file_url: task_file_url || null,
      file_name: file_name || null,
      status: 'assigned',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('homework')
      .insert([newRecord])
      .select()
      .single();

    if (error) {
      console.error('Error inserting homework into Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, homework: data });
  } catch (err: any) {
    console.error('Homework POST handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Не передан ID домашнего задания' }, { status: 400 });
    }

    const { error } = await supabase
      .from('homework')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting homework:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Homework DELETE handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
