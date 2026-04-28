'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SwipeRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/aiuta'); }, [router]);
  return null;
}
