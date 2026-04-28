'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotificheRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/match'); }, [router]);
  return null;
}
