import { NextResponse } from 'next/server';
import { INITIAL_PROFILES } from '@/lib/store';

export async function GET() {
  return NextResponse.json({
    user: INITIAL_PROFILES[0],
    center: {
      name: 'АйДаУмничка',
      city: 'Тольятти',
      director: 'Ольга Николаевна',
    },
  });
}

