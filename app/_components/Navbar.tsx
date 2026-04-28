'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GraduationCap, Sparkles } from 'lucide-react';
import { getCurrentUser, getMatchesForUser, subscribeToMatchUpdates } from '../_lib/db';
import { Utente } from '../_lib/types';
import Avatar from './Avatar';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<Utente | null>(null);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const u = await getCurrentUser();
      if (cancelled) return;
      setUser(u);
      if (!u) { setNotifCount(0); return; }
      const matches = await getMatchesForUser(u.id);
      if (cancelled) return;
      setNotifCount(matches.filter((m) => m.seekerId === u.id && m.stato === 'richiesta').length);
    };

    loadData();
    return () => { cancelled = true; };
  }, [pathname]);

  // Separate effect for realtime subscription — depends on user id
  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeToMatchUpdates(user.id, async () => {
      const matches = await getMatchesForUser(user.id);
      setNotifCount(matches.filter((m) => m.seekerId === user.id && m.stato === 'richiesta').length);
    });
    return unsub;
  }, [user?.id]);

  const tabs = [
    { href: '/aiuta', label: 'Aiuta qualcuno' },
    { href: '/match', label: 'Match', badge: notifCount },
    { href: '/richiedi', label: 'Richiedi aiuto' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-50 h-16">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center gap-6">
        {/* Logo */}
        <Link href="/aiuta" className="flex items-center gap-2 shrink-0">
          <span className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" strokeWidth={2.25} />
          </span>
          <span className="font-bold text-violet-700 text-lg">StudyMatch</span>
        </Link>

        {/* Tabs */}
        <div className="flex items-center gap-1 flex-1">
          {tabs.map(({ href, label, badge }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {label}
                {badge != null && badge > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Profile */}
        {user && (
          <Link
            href="/profilo"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors shrink-0"
          >
            <Avatar user={user} className="w-8 h-8" textClassName="text-xs font-bold" />
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-700 leading-none">{user.nome}</p>
              <p className="text-xs text-violet-600 font-medium mt-0.5 flex items-center justify-end gap-1">
                <Sparkles className="w-3 h-3" strokeWidth={2.5} />
                {user.punti} pt
              </p>
            </div>
          </Link>
        )}
      </div>
    </nav>
  );
}
