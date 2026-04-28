'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, FileText, Clock, CheckCircle2, AlertCircle, HelpCircle,
  Scale, Paperclip, Download, Upload, X, ChevronRight, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import {
  getCurrentUser, getTicketsCliente, getAssegnazioneByTicket,
  getProfilo, uploadAllegato, getSignedUrl,
  subscribeToAssegnazioneUpdates, subscribeToTicketUpdates,
} from '../_lib/db';
import { STATO_LABEL, PRIORITA_LABEL, TIPO_LABEL } from '../_lib/constants';
import type { Profilo, Ticket, Assegnazione } from '../_lib/types';
import Avatar from '../_components/Avatar';

// ── Badge helpers ─────────────────────────────────────────────────────────────

const STATO_STYLE: Record<string, { bg: string; text: string; dot: string; Icon: React.ElementType }> = {
  aperto:         { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    Icon: Clock       },
  in_lavorazione: { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500',   Icon: FileText    },
  risolto:        { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', Icon: CheckCircle2 },
  richiede_info:  { bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500',    Icon: HelpCircle  },
};

const PRIORITA_DOT: Record<string, string> = {
  urgente: 'bg-rose-500',
  normale: 'bg-blue-400',
  bassa:   'bg-gray-300',
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

type FiltroStato = 'tutti' | 'aperto' | 'in_lavorazione' | 'richiede_info' | 'risolto';

const FILTRI: { key: FiltroStato; label: string }[] = [
  { key: 'tutti',         label: 'Tutti'         },
  { key: 'aperto',        label: 'Aperti'        },
  { key: 'in_lavorazione',label: 'In lavorazione'},
  { key: 'richiede_info', label: 'Richiede info' },
  { key: 'risolto',       label: 'Risolti'       },
];

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function filename(path: string) {
  return path.split('/').pop() ?? path;
}

// ── Componente principale ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser]         = useState<Profilo | null>(null);
  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [filtro, setFiltro]     = useState<FiltroStato>('tutti');
  const [loading, setLoading]   = useState(true);

  // Dati del ticket selezionato
  const [assegnazione, setAssegnazione] = useState<Assegnazione | null>(null);
  const [professionista, setProfessionista] = useState<Profilo | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading]   = useState(false);
  const [uploadErr, setUploadErr]   = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTickets = useCallback(async (uid: string) => {
    const t = await getTicketsCliente(uid);
    setTickets(t);
    return t;
  }, []);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace('/'); return; }
      if (!u.profiloCompleto) { router.replace('/setup'); return; }
      if (u.ruolo === 'professionista') { router.replace('/bacheca'); return; }
      setUser(u);
      await loadTickets(u.id);
      setLoading(false);
    })();
  }, [router, loadTickets]);

  // Realtime: ricalcola lista ticket su ogni aggiornamento assegnazione
  useEffect(() => {
    if (!user?.id) return;
    return subscribeToAssegnazioneUpdates(user.id, () => loadTickets(user.id));
  }, [user?.id, loadTickets]);

  // Realtime: aggiorna ticket selezionato in real-time
  useEffect(() => {
    if (!selected?.id) return;
    return subscribeToTicketUpdates(selected.id, (updated) => {
      setSelected(updated);
      setTickets((prev) => prev.map((t) => t.id === updated.id ? updated : t));
    });
  }, [selected?.id]);

  // Carica assegnazione + professionista quando cambia il ticket selezionato
  useEffect(() => {
    if (!selected) { setAssegnazione(null); setProfessionista(null); return; }
    (async () => {
      const a = await getAssegnazioneByTicket(selected.id);
      setAssegnazione(a ?? null);
      if (selected.professionistaId) {
        const p = await getProfilo(selected.professionistaId);
        setProfessionista(p ?? null);
      } else {
        setProfessionista(null);
      }
    })();
  }, [selected?.id]);

  // Genera signed URL per ogni allegato del ticket selezionato
  useEffect(() => {
    if (!selected?.allegati.length) { setSignedUrls({}); return; }
    (async () => {
      const map: Record<string, string> = {};
      await Promise.all(
        selected.allegati.map(async (path) => {
          try { map[path] = await getSignedUrl(path); } catch { /* ignora */ }
        }),
      );
      setSignedUrls(map);
    })();
  }, [selected?.allegati]);

  // Upload allegato
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected || !user) return;
    if (file.size > 10 * 1024 * 1024) { setUploadErr('File troppo grande (max 10 MB)'); return; }
    setUploading(true);
    setUploadErr('');
    try {
      await uploadAllegato(selected.id, user.id, file);
      const updated = await getTicketsCliente(user.id);
      setTickets(updated);
      const refreshed = updated.find((t) => t.id === selected.id) ?? selected;
      setSelected(refreshed);
    } catch (err) {
      setUploadErr('Errore durante il caricamento. Riprova.');
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const ticketsFiltrati = filtro === 'tutti'
    ? tickets
    : tickets.filter((t) => t.stato === filtro);

  const stats = {
    totale:        tickets.length,
    aperti:        tickets.filter((t) => t.stato === 'aperto').length,
    in_lavorazione: tickets.filter((t) => t.stato === 'in_lavorazione').length,
    risolti:       tickets.filter((t) => t.stato === 'risolto').length,
  };

  if (loading) {
    return (
      <div className="page-root flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-root-full flex overflow-hidden">

      {/* ── LEFT: lista ticket ──────────────────────────────────── */}
      <aside className={`w-full lg:w-[400px] shrink-0 border-r border-gray-100 bg-white flex flex-col ${selected ? 'hidden lg:flex' : 'flex'}`}>

        {/* Header lista */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold text-gray-800">I miei Ticket</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {stats.totale} {stats.totale === 1 ? 'richiesta' : 'richieste'} totali
              </p>
            </div>
            <Link href="/ticket/nuovo"
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold transition-colors">
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              Nuovo
            </Link>
          </div>

          {/* Statistiche rapide */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Aperti',         count: stats.aperti,         color: 'text-blue-600' },
              { label: 'In lavorazione', count: stats.in_lavorazione, color: 'text-amber-600' },
              { label: 'Risolti',        count: stats.risolti,        color: 'text-emerald-600' },
            ].map(({ label, count, color }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                <p className={`text-lg font-bold ${color}`}>{count}</p>
                <p className="text-xs text-gray-400 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* Filtri */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {FILTRI.map(({ key, label }) => (
              <button key={key} onClick={() => setFiltro(key)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filtro === key
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {ticketsFiltrati.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <Scale className="w-12 h-12 text-gray-200 mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-gray-500">
                {filtro === 'tutti' ? 'Nessun ticket ancora' : `Nessun ticket "${STATO_LABEL[filtro] ?? filtro}"`}
              </p>
              {filtro === 'tutti' && (
                <Link href="/ticket/nuovo"
                  className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
                  Apri il primo ticket
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {ticketsFiltrati.map((t) => {
                const isActive = selected?.id === t.id;
                const s = STATO_STYLE[t.stato] ?? STATO_STYLE.aperto;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setSelected(isActive ? null : t)}
                      className={`w-full text-left px-5 py-4 transition-colors hover:bg-gray-50 ${isActive ? 'bg-violet-50 border-l-2 border-violet-600' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className={`text-sm font-semibold leading-snug line-clamp-1 ${isActive ? 'text-violet-700' : 'text-gray-800'}`}>
                          {t.titolo}
                        </p>
                        <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 transition-transform ${isActive ? 'text-violet-500 rotate-90' : 'text-gray-300'}`} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatoBadge stato={t.stato} />
                        <span className="text-xs text-gray-400">{t.areaLegale}</span>
                        {t.priorita === 'urgente' && (
                          <span className="text-xs font-semibold text-rose-600 flex items-center gap-0.5">
                            <AlertCircle className="w-3 h-3" strokeWidth={2.5} /> Urgente
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">{formatDate(t.createdAt)}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ── RIGHT: dettaglio ticket ──────────────────────────────── */}
      <main className={`flex-1 overflow-y-auto bg-gray-50 ${selected ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'}`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-20 h-20 rounded-3xl bg-violet-100 flex items-center justify-center mb-4">
              <FileText className="w-9 h-9 text-violet-400" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-bold text-gray-700 mb-2">Seleziona un ticket</h2>
            <p className="text-sm text-gray-400 max-w-xs mb-6">
              Scegli un ticket dalla lista per vedere i dettagli, la risposta del professionista e i documenti allegati.
            </p>
            <Link href="/ticket/nuovo"
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Apri nuovo ticket
            </Link>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full px-4 sm:px-8 py-6">

            {/* Torna alla lista (mobile) */}
            <button
              onClick={() => setSelected(null)}
              className="lg:hidden flex items-center gap-1.5 text-sm text-violet-600 font-medium mb-4 hover:underline"
            >
              ← I miei ticket
            </button>

            {/* Header ticket */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${STATO_STYLE[selected.stato]?.bg ?? 'bg-gray-100'}`}>
                  {(() => { const Icon = STATO_STYLE[selected.stato]?.Icon ?? FileText; return <Icon className={`w-5 h-5 ${STATO_STYLE[selected.stato]?.text ?? 'text-gray-500'}`} strokeWidth={2} />; })()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-800 leading-snug">{selected.titolo}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Aperto il {formatDate(selected.createdAt)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatoBadge stato={selected.stato} />
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {selected.areaLegale}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  selected.priorita === 'urgente' ? 'bg-rose-100 text-rose-700'
                  : selected.priorita === 'bassa' ? 'bg-gray-100 text-gray-500'
                  : 'bg-blue-100 text-blue-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${PRIORITA_DOT[selected.priorita]}`} />
                  {PRIORITA_LABEL[selected.priorita]}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-500">
                  {TIPO_LABEL[selected.tipo]}
                </span>
              </div>
            </div>

            {/* Descrizione richiesta */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">La tua richiesta</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.descrizione}</p>
            </div>

            {/* Professionista assegnato */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Professionista assegnato</h3>
              {professionista ? (
                <div className="flex items-center gap-3">
                  <Avatar user={professionista} className="w-11 h-11" textClassName="text-sm font-bold" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {professionista.qualifica} {professionista.nome} {professionista.cognome}
                    </p>
                    <p className="text-xs text-gray-400">{professionista.ordineProfessionale}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {professionista.areeLegali.map((a) => (
                        <span key={a} className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">{a}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-gray-400">
                  <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
                    <Scale className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Assegnazione in corso…</p>
                    <p className="text-xs text-gray-400">Un professionista prenderà in carico il tuo ticket a breve</p>
                  </div>
                </div>
              )}
            </div>

            {/* Risposta del professionista */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Risposta del professionista</h3>
              {selected.rispostaProfessionista ? (
                <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selected.rispostaProfessionista}
                  </p>
                  {professionista && (
                    <p className="text-xs text-violet-500 font-medium mt-3 pt-3 border-t border-violet-100">
                      — {professionista.qualifica} {professionista.nome} {professionista.cognome}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 py-3 text-gray-400">
                  <Clock className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                  <p className="text-sm">
                    {selected.stato === 'risolto'
                      ? 'Nessuna risposta scritta allegata.'
                      : 'In attesa di risposta. Il professionista ti risponderà entro 24 ore.'}
                  </p>
                </div>
              )}
            </div>

            {/* Documenti allegati */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Documenti allegati ({selected.allegati.length})
                </h3>
                {selected.stato !== 'risolto' && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50 transition-colors"
                  >
                    {uploading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Caricamento…</>
                      : <><Upload className="w-3.5 h-3.5" strokeWidth={2.5} /> Carica documento</>}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  onChange={handleUpload}
                />
              </div>

              {uploadErr && (
                <div className="flex items-center gap-2 mb-3 p-3 bg-rose-50 rounded-xl text-xs text-rose-600">
                  <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2} />
                  {uploadErr}
                  <button onClick={() => setUploadErr('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}

              {selected.allegati.length === 0 ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || selected.stato === 'risolto'}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 text-sm text-gray-400 hover:border-violet-300 hover:text-violet-500 transition-colors flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-default"
                >
                  <Paperclip className="w-6 h-6" strokeWidth={1.5} />
                  Clicca per caricare un documento
                  <span className="text-xs">PDF, Word, immagini — max 10 MB</span>
                </button>
              ) : (
                <ul className="space-y-2">
                  {selected.allegati.map((path) => (
                    <li key={path} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <Paperclip className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2} />
                      <span className="text-sm text-gray-700 flex-1 truncate">{filename(path)}</span>
                      {signedUrls[path] ? (
                        <a
                          href={signedUrls[path]}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="flex items-center gap-1 text-xs text-violet-600 font-medium hover:text-violet-700 shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
                          Scarica
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">Caricamento URL…</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
