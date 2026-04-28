'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Scale, Plus, LayoutDashboard, Briefcase } from 'lucide-react';
import { getCurrentUser, subscribeToAssegnazioneUpdates } from '../_lib/db';
import type { Profilo } from '../_lib/types';
import Avatar from './Avatar';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<Profilo | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getCurrentUser();
      if (!cancelled) setUser(u);
    })();
    return () => { cancelled = true; };
  }, [pathname]);

  // Aggiorna il profilo quando cambiano le assegnazioni (es. nuovi ticket)
  useEffect(() => {
    if (!user?.id) return;
    return subscribeToAssegnazioneUpdates(user.id, async () => {
      const u = await getCurrentUser();
      setUser(u);
    });
  }, [user?.id]);

  const isProf = user?.ruolo === 'professionista';

  // Tab per cliente
  const clienteTabs = [
    { href: '/dashboard', label: 'My Tickets', icon: LayoutDashboard },
  ];

  // Tab per professionista (attivate nello Step 6)
  const profTabs = [
    { href: '/bacheca',      label: 'Ticket Board',      icon: Briefcase },
    { href: '/assegnazioni', label: 'My Assignments', icon: LayoutDashboard },
  ];

  const tabs = isProf ? profTabs : clienteTabs;

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-50 h-16">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center gap-4">

        {/* Logo */}
        <Link
          href={isProf ? '/bacheca' : '/dashboard'}
          className="flex items-center gap-2 shrink-0 mr-2"
        >
          <span className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Scale className="w-4 h-4 text-white" strokeWidth={2.25} />
          </span>
          <span className="font-bold text-violet-700 text-lg hidden sm:block">All In One Consulting</span>
        </Link>

        {/* Nav tabs */}
        <div className="flex items-center gap-1 flex-1">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </div>

        {/* CTA "Nuovo Ticket" — solo clienti */}
        {!isProf && (
          <Link
            href="/ticket/nuovo"
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors shrink-0 ${
              pathname === '/ticket/nuovo'
                ? 'bg-violet-700 text-white'
                : 'bg-violet-600 hover:bg-violet-700 text-white'
            }`}
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span className="hidden sm:block">New Ticket</span>
            <span className="sm:hidden">New</span>
          </Link>
        )}

        {/* Avatar + nome utente */}
        {user && (
          <Link
            href="/profilo"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors shrink-0"
          >
            <Avatar user={user} className="w-8 h-8" textClassName="text-xs font-bold" />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-700 leading-none">{user.nome}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {user.ruolo === 'professionista'
                  ? (user.qualifica ?? 'Professionista')
                  : (user.ragioneSociale ?? (user.tipoCliente === 'azienda' ? 'Azienda' : 'Privato'))}
              </p>
            </div>
          </Link>
        )}
      </div>
    </nav>
  );
}
