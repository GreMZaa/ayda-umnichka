import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { parentName, phone, childName, selectedSubject } = body || {};

    // 1. Validation
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

    const leadData = {
      parentName: parentName.trim().slice(0, 100),
      phone: phone.trim().slice(0, 30),
      childName: childName ? String(childName).trim().slice(0, 100) : '',
      selectedSubject: selectedSubject ? String(selectedSubject).trim().slice(0, 100) : 'Логопедия и развитие речи',
      createdAt: new Date().toISOString(),
      userAgent: req.headers.get('user-agent') || 'unknown',
      source: 'web-landing-trial',
    };

    // 2. Structured server log for operations/CRM ingest
    console.log('[TRIAL_LEAD_RECEIVED]', JSON.stringify(leadData));

    // 3. Return clean JSON response
    return NextResponse.json(
      {
        success: true,
        message: 'Заявка успешно зарегистрирована. Педагог свяжется с вами в течение 15 минут.',
        lead: {
          parentName: leadData.parentName,
          childName: leadData.childName,
          selectedSubject: leadData.selectedSubject,
          createdAt: leadData.createdAt,
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
