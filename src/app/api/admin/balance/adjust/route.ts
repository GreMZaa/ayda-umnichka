import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const roleCookie = request.cookies.get('aida_active_role')?.value;
    const authHeader = request.headers.get('authorization');
    const isAdmin = roleCookie === 'admin' || (authHeader && authHeader === `Bearer ${process.env.ADMIN_SECRET_KEY || 'admin_secret'}`);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Доступ запрещен. Требуются права администратора.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { student_id, amount, description } = body;

    if (!amount) {
      return NextResponse.json({ error: 'Параметр amount обязателен' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      transaction_id: `tx-${Date.now()}`,
      student_id: student_id || null,
      amount_adjusted: amount,
      description: description || 'Корректировка баланса администратором',
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 400 });
  }
}

