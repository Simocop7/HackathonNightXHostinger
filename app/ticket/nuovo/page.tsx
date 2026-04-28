'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Scale, MessageSquare, FileSearch, ArrowRight, AlertCircle, ChevronLeft, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { getCurrentUser } from '../../_lib/db';
import { AREE_LEGALI } from '../../_lib/constants';
import type { Profilo, TicketTipo, TicketPriorita, RateLimitError } from '../../_lib/types';

const TIPO_OPTIONS: { value: TicketTipo; label: string; desc: string; Icon: React.ElementType }[] = [
  {
    value: 'domanda',
    label: 'Domanda legale',
    desc:  'Hai un quesito legale specifico e vuoi un parere professionale.',
    Icon:  MessageSquare,
  },
  {
    value: 'revisione_documento',
    label: 'Revisione documento',
    desc:  'Vuoi che un professionista esamini un contratto o un atto.',
    Icon:  FileSearch,
  },
];

const PRIORITA_OPTIONS: { value: TicketPriorita; label: string; desc: string; color: string }[] = [
  { value: 'bassa',   label: 'Bassa',   desc: 'Nessuna urgenza',        color: 'border-gray-200 hover:border-gray-300 text-gray-600' },
  { value: 'normale', label: 'Normale', desc: 'Risposta entro 24 ore',  color: 'border-blue-200 text-blue-700 bg-blue-50' },
  { value: 'urgente', label: 'Urgente', desc: 'Risposta prioritaria',   color: 'border-rose-300 text-rose-700 bg-rose-50' },
];

export default function NuovoTicketPage() {
  const router = useRouter();
  const [user, setUser]           = useState<Profilo | null>(null);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitError | null>(null);

  // Campi form
  const [tipo, setTipo]             = useState<TicketTipo>('domanda');
  const [areaLegale, setAreaLegale] = useState('');
  const [titolo, setTitolo]         = useState('');
  const [descrizione, setDescr]     = useState('');
  const [priorita, setPriorita]     = useState<TicketPriorita>('normale');

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace('/'); return; }
      if (!u.profiloCompleto) { router.replace('/setup'); return; }
      if (u.ruolo === 'professionista') { router.replace('/bacheca'); return; }
      setUser(u);
      setLoading(false);
    })();
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setRateLimitInfo(null);

    if (!areaLegale) { setError('Seleziona l\'area legale.'); return; }
    if (!titolo.trim()) { setError('Inserisci un titolo per il ticket.'); return; }
    if (descrizione.trim().length < 30) { setError('La descrizione deve essere di almeno 30 caratteri.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/tickets', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tipo, area_legale: areaLegale, titolo: titolo.trim(), descrizione: descrizione.trim(), priorita }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setRateLimitInfo(data as RateLimitError);
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        setError(data.error ?? 'Si è verificato un errore. Riprova.');
        setSubmitting(false);
        return;
      }

      // Successo → torna alla dashboard
      router.push('/dashboard');
    } catch {
      setError('Errore di rete. Controlla la connessione e riprova.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header fisso (no Navbar in questa pagina) */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-500" strokeWidth={2} />
          </Link>
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-violet-600" strokeWidth={2} />
            <span className="font-semibold text-gray-800 text-sm">Nuovo Ticket</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {user && (
              <span className="text-xs text-gray-400">
                {user.nome} {user.cognome}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        {/* Rate limit warning */}
        {rateLimitInfo && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-sm font-semibold text-amber-800">{rateLimitInfo.error}</p>
                <p className="text-sm text-amber-700 mt-1">{rateLimitInfo.detail}</p>
                <p className="text-xs text-amber-600 mt-2">
                  Limite: {rateLimitInfo.limit} ticket/24h &bull; Usati: {rateLimitInfo.current} &bull;
                  Reset: {new Date(rateLimitInfo.resetsAt).toLocaleString('it-IT')}
                </p>
                <Link href="/profilo"
                  className="inline-block mt-3 text-xs font-semibold text-violet-600 hover:text-violet-700 underline">
                  Aggiorna il piano per aumentare il limite →
                </Link>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* 1. Tipo di richiesta */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Tipo di richiesta</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TIPO_OPTIONS.map(({ value, label, desc, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTipo(value)}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    tipo === value
                      ? 'border-violet-600 bg-violet-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tipo === value ? 'bg-violet-600' : 'bg-gray-100'}`}>
                    <Icon className={`w-4 h-4 ${tipo === value ? 'text-white' : 'text-gray-500'}`} strokeWidth={2} />
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${tipo === value ? 'text-violet-700' : 'text-gray-700'}`}>{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Area legale + Titolo + Priorità */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Dettagli</h2>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Area legale *</label>
              <select
                value={areaLegale}
                onChange={(e) => setAreaLegale(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
              >
                <option value="">Seleziona l'area legale pertinente…</option>
                {AREE_LEGALI.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                L'area determina quale professionista specializzato verrà assegnato automaticamente.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Titolo della richiesta *</label>
              <input
                type="text"
                value={titolo}
                onChange={(e) => setTitolo(e.target.value.slice(0, 100))}
                placeholder="es. Licenziamento senza giusta causa, Revisione contratto NDA…"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
              />
              <p className="text-right text-xs text-gray-400 mt-1">{titolo.length}/100</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Priorità</label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITA_OPTIONS.map(({ value, label, desc, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPriorita(value)}
                    className={`py-2.5 px-3 rounded-xl border-2 text-sm transition-all text-left ${
                      priorita === value ? color : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold text-xs">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Descrizione */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              {tipo === 'domanda' ? 'Descrivi il tuo quesito' : 'Descrivi il documento da revisionare'}
            </h2>
            <textarea
              value={descrizione}
              onChange={(e) => setDescr(e.target.value.slice(0, 3000))}
              placeholder={tipo === 'domanda'
                ? 'Descrivi la situazione con più dettagli possibile: cosa è successo, da quanto tempo, cosa hai già fatto...'
                : 'Descrivi il documento, le clausole che ti preoccupano, cosa vuoi verificare o modificare...'}
              rows={8}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-400">Minimo 30 caratteri</p>
              <p className={`text-xs ${descrizione.length < 30 ? 'text-rose-400' : 'text-gray-400'}`}>
                {descrizione.length}/3000
              </p>
            </div>

            {tipo === 'revisione_documento' && (
              <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-600 font-medium">
                  Puoi allegare il documento dalla dashboard dopo aver creato il ticket.
                </p>
              </div>
            )}
          </div>

          {/* Riepilogo auto-assignment */}
          {areaLegale && (
            <div className="bg-violet-50 rounded-2xl p-4 flex items-start gap-3">
              <Scale className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-sm font-semibold text-violet-800">Assegnazione automatica</p>
                <p className="text-xs text-violet-600 mt-0.5">
                  Il sistema selezionerà automaticamente il professionista specializzato in{' '}
                  <strong>{areaLegale}</strong> con il minor numero di ticket aperti.
                </p>
              </div>
            </div>
          )}

          {/* Errore generico */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-xl text-sm text-rose-600">
              <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2} />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-violet-800 text-white font-semibold rounded-xl shadow-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Invio in corso…</>
            ) : (
              <>Invia richiesta <ArrowRight className="w-4 h-4" strokeWidth={2.5} /></>
            )}
          </button>

          <p className="text-xs text-center text-gray-400 pb-4">
            Dopo l&apos;invio riceverai la risposta entro 24 ore. Potrai caricare documenti direttamente dal ticket.
          </p>
        </form>
      </div>
    </main>
  );
}
