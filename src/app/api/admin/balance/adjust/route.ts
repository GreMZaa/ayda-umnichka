import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { student_id, amount, description } = body;

    if (!amount) {
      return NextResponse.json({ error: 'Параметр amount обязателен' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      transaction_id: `tx-${Date.now()}`,
      student_id: student_id || 'user-student-1',
      amount_adjusted: amount,
      description: description || 'Корректировка баланса администратором',
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 400 });
  }
}

