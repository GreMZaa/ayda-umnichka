import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    user: null,
    center: {
      name: 'АйДаУмничка',
      city: 'Тольятти',
      director: 'Администрация центра',
    },
  });
}
