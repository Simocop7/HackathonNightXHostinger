'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2, Clock, FileText,
  Loader2, Scale, AlertCircle, Sparkles,
} from 'lucide-react';
import { getCurrentUser, getTicketsProfessionista } from '../_lib/db';
import { STATO_LABEL } from '../_lib/constants';
import type { Profilo, Ticket } from '../_lib/types';

// ── Badge + helpers ───────────────────────────────────────────────────────────

const STATO_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  aperto:         { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  in_lavorazione: { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  risolto:        { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  richiede_info:  { bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500'    },
};

function StatoBadge({ stato }: { stato: string }) {
  const s = STATO_STYLE[stato] ?? STATO_STYLE.aperto;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {STATO_LABEL[stato] ?? stato}
    </span>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Componente principale ─────────────────────────────────────────────────────

export default function AssegnazioniPage() {
  const router = useRouter();
  const [user, setUser]       = useState<Profilo | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace('/'); return; }
      if (!u.profiloCompleto) { router.replace('/setup'); return; }
      if (u.ruolo !== 'professionista') { router.replace('/dashboard'); return; }
      setUser(u);
      const all = await getTicketsProfessionista(u);
      setTickets(all.filter((t) => t.professionistaId === u.id));
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="page-root flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  const stats = {
    totale:   tickets.length,
    risolti:  tickets.filter((t) => t.stato === 'risolto').length,
    attivi:   tickets.filter((t) => t.stato !== 'risolto').length,
    urgenti:  tickets.filter((t) => t.priorita === 'urgente' && t.stato !== 'risolto').length,
  };

  const puntiTotali = user?.punti ?? 0;

  // Separa attivi da risolti per la lista
  const attivi  = tickets.filter((t) => t.stato !== 'risolto');
  const risolti = tickets.filter((t) => t.stato === 'risolto');

  return (
    <div className="page-root bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* Punti hero ────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-3xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-7 h-7" strokeWidth={2} />
            </div>
            <div>
              <p className="text-violet-200 text-sm">Punti LegalMatch accumulati</p>
              <p className="text-5xl font-bold leading-none mt-0.5">{puntiTotali}</p>
            </div>
          </div>
          <p className="text-xs text-violet-300 mt-4">
            +50 punti per ogni ticket risolto · {stats.risolti} {stats.risolti === 1 ? 'ticket completato' : 'ticket completati'}
          </p>
        </div>

        {/* Stats grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Totali',   count: stats.totale,   color: 'text-gray-700',    bg: 'bg-white',       icon: FileText      },
            { label: 'Attivi',   count: stats.attivi,   color: 'text-blue-600',    bg: 'bg-blue-50',     icon: Clock         },
            { label: 'Urgenti',  count: stats.urgenti,  color: 'text-rose-600',    bg: 'bg-rose-50',     icon: AlertCircle   },
            { label: 'Risolti',  count: stats.risolti,  color: 'text-emerald-600', bg: 'bg-emerald-50',  icon: CheckCircle2  },
          ].map(({ label, count, color, bg, icon: Icon }) => (
            <div key={label} className={`${bg} rounded-2xl p-4 shadow-sm`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${color}`} strokeWidth={2} />
                <p className="text-xs text-gray-400">{label}</p>
              </div>
              <p className={`text-2xl font-bold ${color}`}>{count}</p>
            </div>
          ))}
        </div>

        {/* Ticket attivi ───────────────────────────────────────────── */}
        {attivi.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700">In corso</h2>
              <span className="text-xs text-gray-400">{attivi.length} ticket</span>
            </div>
            <ul className="divide-y divide-gray-50">
              {attivi.map((t) => (
                <li key={t.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <p className="text-sm font-semibold text-gray-800 line-clamp-1 flex-1">{t.titolo}</p>
                    <StatoBadge stato={t.stato} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{t.areaLegale}</span>
                    <span>·</span>
                    <span>{formatDate(t.createdAt)}</span>
                    {t.priorita === 'urgente' && (
                      <>
                        <span>·</span>
                        <span className="text-rose-600 font-semibold flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3" strokeWidth={2.5} />
                          Urgente
                        </span>
                      </>
                    )}
                  </div>
                  {t.rispostaProfessionista && (
                    <p className="text-xs text-violet-600 font-medium mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} />
                      Parere inviato
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ticket risolti ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">Storico risolti</h2>
            <span className="text-xs text-gray-400">{risolti.length} ticket · {risolti.length * 50} punti</span>
          </div>
          {risolti.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-6">
              <Scale className="w-10 h-10 text-gray-200 mb-3" strokeWidth={1.5} />
              <p className="text-sm text-gray-400">Nessun ticket risolto ancora.</p>
              <p className="text-xs text-gray-300 mt-1">
                Risolvi i ticket dalla <span className="font-medium">Bacheca</span> per accumulare punti.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {risolti.map((t) => (
                <li key={t.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="text-sm font-semibold text-gray-700 line-clamp-1 flex-1">{t.titolo}</p>
                    <span className="text-xs font-bold text-emerald-600 shrink-0">+50 pt</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{t.areaLegale}</span>
                    <span>·</span>
                    <span>{formatDate(t.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Empty state globale */}
        {tickets.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-10 flex flex-col items-center text-center">
            <Scale className="w-12 h-12 text-gray-200 mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-gray-500">Nessuna assegnazione ancora</p>
            <p className="text-xs text-gray-400 mt-1">
              I ticket ti verranno assegnati automaticamente in base alle tue aree di competenza.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
