'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { getCurrentUser, subscribeToMatchUpdates } from '../_lib/db';
import { usePathname } from 'next/navigation';

export default function PtsIndicator() {
  const [punti, setPunti] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getCurrentUser();
      if (cancelled) return;
      if (user) {
        setPunti(user.punti);
        setUserId(user.id);
      } else {
        setPunti(null);
        setUserId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [pathname]);

  // Re-fetch points when a match update occurs (e.g. session confirmed)
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToMatchUpdates(userId, async () => {
      const user = await getCurrentUser();
      if (user) setPunti(user.punti);
    });
    return unsub;
  }, [userId]);

  if (punti === null) return null;

  return (
    <Link
      href="/profilo"
      className="flex items-center gap-1 text-xs font-bold text-violet-700 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-full hover:bg-violet-100 transition-colors shrink-0"
    >
      <Sparkles className="w-3 h-3" strokeWidth={2.5} />
      {punti} pts
    </Link>
  );
}
