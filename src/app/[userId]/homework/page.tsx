'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentUserHomeworkRedirect({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const router = useRouter();
  const { userId } = use(params);

  useEffect(() => {
    if (userId) {
      router.replace(`/student/homework?studentId=${encodeURIComponent(userId)}`);
    } else {
      router.replace('/student/homework');
    }
  }, [userId, router]);

  return null;
}
