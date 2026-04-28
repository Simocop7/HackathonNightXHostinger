'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ChatRedirect() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;
  useEffect(() => {
    router.replace(`/match?id=${matchId}`);
  }, [router, matchId]);
  return null;
}
