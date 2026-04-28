'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Clock, CheckCircle2, AlertCircle, HelpCircle,
  Scale, Paperclip, Download, Upload, Loader2, ChevronRight,
  X, Edit3, User, Building2, MessageSquare,
} from 'lucide-react';
import {
  getCurrentUser, getTicketsProfessionista, getAssegnazioneByTicket,
  getProfilo, getSignedUrl, uploadAllegatoProfessionista,
  aggiornaTicket, chiudiTicket,
  subscribeToAssegnazioneUpdates, subscribeToTicketUpdates,
} from '../_lib/db';
import { STATO_LABEL, PRIORITA_LABEL, TIPO_LABEL } from '../_lib/constants';
import type { Profilo, Ticket, Assegnazione, TicketStato } from '../_lib/types';
import Avatar from '../_components/Avatar';

const STATO_STYLE: Record<string, { bg: string; text: string; dot: string; Icon: React.ElementType }> = {
  aperto:         { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    Icon: Clock        },
  in_lavorazione: { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500',   Icon: FileText     },
  risolto:        { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', Icon: CheckCircle2 },
  richiede_info:  { bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500',    Icon: HelpCircle   },
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
  { key: 'tutti',          label: 'All'         },
  { key: 'aperto',         label: 'Open'        },
  { key: 'in_lavorazione', label: 'In progress' },
  { key: 'richiede_info',  label: 'Needs info'  },
  { key: 'risolto',        label: 'Resolved'    },
];

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function filename(path: string) {
  return path.split('/').pop() ?? path;
}

export default function BachecaPage() {
  const router = useRouter();

  const [user, setUser]         = useState<Profilo | null>(null);
  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [filtro, setFiltro]     = useState<FiltroStato>('tutti');
  const [loading, setLoading]   = useState(true);

  const [assegnazione, setAssegnazione] = useState<Assegnazione | null>(null);
  const [cliente, setCliente]           = useState<Profilo | null>(null);
  const [signedUrls, setSignedUrls]     = useState<Record<string, string>>({});

  const [editRisposta, setEditRisposta]           = useState('');
  const [isEditingRisposta, setIsEditingRisposta] = useState(false);
  const [savingRisposta, setSavingRisposta]       = useState(false);

  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadDocErr, setUploadDocErr] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [changingStato, setChangingStato] = useState(false);
  const [closing, setClosing]             = useState(false);
  const [closeErr, setCloseErr]           = useState('');

  const loadTickets = useCallback(async (prof: Profilo) => {
    const all = await getTicketsProfessionista(prof);
    const mine = all.filter((t) => t.professionistaId === prof.id);
    setTickets(mine);
    return mine;
  }, []);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace('/'); return; }
      if (!u.profiloCompleto) { router.replace('/setup'); return; }
      if (u.ruolo !== 'professionista') { router.replace('/dashboard'); return; }
      setUser(u);
      await loadTickets(u);
      setLoading(false);
    })();
  }, [router, loadTickets]);

  useEffect(() => {
    if (!user) return;
    return subscribeToAssegnazioneUpdates(user.id, () => loadTickets(user));
  }, [user, loadTickets]);

  useEffect(() => {
    if (!selected?.id) return;
    return subscribeToTicketUpdates(selected.id, (updated) => {
      setSelected(updated);
      setTickets((prev) => prev.map((t) => t.id === updated.id ? updated : t));
    });
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) {
      setAssegnazione(null); setCliente(null); setSignedUrls({});
      return;
    }
    setEditRisposta(selected.rispostaProfessionista ?? '');
    setIsEditingRisposta(!selected.rispostaProfessionista);
    setCloseErr(''); setUploadDocErr('');

    (async () => {
      const [a, c] = await Promise.all([
        getAssegnazioneByTicket(selected.id),
        getProfilo(selected.clienteId),
      ]);
      setAssegnazione(a ?? null);
      setCliente(c ?? null);
    })();
  }, [selected?.id]);

  useEffect(() => {
    if (!selected?.allegati.length) { setSignedUrls({}); return; }
    (async () => {
      const map: Record<string, string> = {};
      await Promise.all(
        selected.allegati.map(async (path) => {
          try { map[path] = await getSignedUrl(path); } catch { /* ignore */ }
        }),
      );
      setSignedUrls(map);
    })();
  }, [selected?.allegati]);

  const handleSalvaRisposta = async () => {
    if (!selected) return;
    setSavingRisposta(true);
    try {
      await aggiornaTicket(selected.id, { rispostaProfessionista: editRisposta.trim() });
      const patch = { ...selected, rispostaProfessionista: editRisposta.trim() };
      setSelected(patch);
      setTickets((prev) => prev.map((t) => t.id === selected.id ? patch : t));
      setIsEditingRisposta(false);
    } finally {
      setSavingRisposta(false);
    }
  };

  const handleCambiaStato = async (nuovoStato: TicketStato) => {
    if (!selected || selected.stato === nuovoStato) return;
    setChangingStato(true);
    try {
      await aggiornaTicket(selected.id, { stato: nuovoStato });
      const patch = { ...selected, stato: nuovoStato };
      setSelected(patch);
      setTickets((prev) => prev.map((t) => t.id === selected.id ? patch : t));
    } finally {
      setChangingStato(false);
    }
  };

  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected || !user) return;
    if (file.size > 10 * 1024 * 1024) { setUploadDocErr('File too large (max 10 MB)'); return; }
    setUploadingDoc(true); setUploadDocErr('');
    try {
      await uploadAllegatoProfessionista(selected.id, user.id, file);
      const refreshed = (await getTicketsProfessionista(user)).find((t) => t.id === selected.id);
      if (refreshed) {
        setSelected(refreshed);
        setTickets((prev) => prev.map((t) => t.id === refreshed.id ? refreshed : t));
      }
    } catch {
      setUploadDocErr('Upload failed. Please try again.');
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleChiudiTicket = async () => {
    if (!assegnazione) return;
    setClosing(true); setCloseErr('');
    try {
      await chiudiTicket(assegnazione.id);
      const patch = { ...selected!, stato: 'risolto' as TicketStato };
      setSelected(patch);
      setTickets((prev) => prev.map((t) => t.id === patch.id ? patch : t));
    } catch {
      setCloseErr('Error closing ticket. Please try again.');
    } finally {
      setClosing(false);
    }
  };

  const ticketsFiltrati = filtro === 'tutti'
    ? tickets
    : tickets.filter((t) => t.stato === filtro);

  const stats = {
    aperti:         tickets.filter((t) => t.stato === 'aperto').length,
    in_lavorazione: tickets.filter((t) => t.stato === 'in_lavorazione').length,
    risolti:        tickets.filter((t) => t.stato === 'risolto').length,
  };

  const clienteAllegati = selected?.allegati.filter((p) => !p.startsWith('prof/')) ?? [];
  const profAllegati    = selected?.allegati.filter((p) => p.startsWith('prof/'))  ?? [];

  if (loading) {
    return (
      <div className="page-root flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-root-full flex overflow-hidden">

      {/* LEFT: ticket queue */}
      <aside className={`w-full lg:w-[400px] shrink-0 border-r border-gray-100 bg-white flex flex-col ${selected ? 'hidden lg:flex' : 'flex'}`}>

        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="mb-4">
            <h1 className="text-lg font-bold text-gray-800">Ticket Board</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {tickets.filter((t) => t.stato !== 'risolto').length} active
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Open',        count: stats.aperti,         color: 'text-blue-600'    },
              { label: 'In progress', count: stats.in_lavorazione, color: 'text-amber-600'   },
              { label: 'Resolved',    count: stats.risolti,        color: 'text-emerald-600' },
            ].map(({ label, count, color }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                <p className={`text-lg font-bold ${color}`}>{count}</p>
                <p className="text-xs text-gray-400 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {FILTRI.map(({ key, label }) => (
              <button key={key} onClick={() => setFiltro(key)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filtro === key ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {ticketsFiltrati.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <Scale className="w-12 h-12 text-gray-200 mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-gray-500">
                {filtro === 'tutti' ? 'No assigned tickets' : `No "${STATO_LABEL[filtro] ?? filtro}" tickets`}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {ticketsFiltrati.map((t) => {
                const isActive = selected?.id === t.id;
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
                            <AlertCircle className="w-3 h-3" strokeWidth={2.5} /> Urgent
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

      {/* RIGHT: ticket detail */}
      <main className={`flex-1 overflow-y-auto bg-gray-50 ${selected ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'}`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-20 h-20 rounded-3xl bg-violet-100 flex items-center justify-center mb-4">
              <FileText className="w-9 h-9 text-violet-400" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-bold text-gray-700 mb-2">Select a ticket</h2>
            <p className="text-sm text-gray-400 max-w-xs">
              Choose a ticket from the board to read the client request, download documents, and send your response.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full px-4 sm:px-8 py-6 space-y-4">

            <button onClick={() => setSelected(null)}
              className="lg:hidden flex items-center gap-1.5 text-sm text-violet-600 font-medium hover:underline">
              ← Ticket Board
            </button>

            {/* 1. Header + status */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${STATO_STYLE[selected.stato]?.bg ?? 'bg-gray-100'}`}>
                  {(() => {
                    const Icon = STATO_STYLE[selected.stato]?.Icon ?? FileText;
                    return <Icon className={`w-5 h-5 ${STATO_STYLE[selected.stato]?.text ?? 'text-gray-500'}`} strokeWidth={2} />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-800 leading-snug">{selected.titolo}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Received on {formatDate(selected.createdAt)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <StatoBadge stato={selected.stato} />
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
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

              {selected.stato !== 'risolto' && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Change status</p>
                  <div className="flex flex-wrap gap-2">
                    {(['aperto', 'in_lavorazione', 'richiede_info'] as TicketStato[]).map((s) => (
                      <button key={s} onClick={() => handleCambiaStato(s)}
                        disabled={changingStato || selected.stato === s}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          selected.stato === s
                            ? `${STATO_STYLE[s]?.bg} ${STATO_STYLE[s]?.text} cursor-default`
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50'
                        }`}
                      >
                        {STATO_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Client request */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Client request</h3>

              {cliente && (
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                  <Avatar user={cliente} className="w-10 h-10" textClassName="text-sm font-bold" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {cliente.nome} {cliente.cognome}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      {cliente.tipoCliente === 'azienda'
                        ? <><Building2 className="w-3 h-3" strokeWidth={2} /> {cliente.ragioneSociale ?? 'Company'}</>
                        : <><User className="w-3 h-3" strokeWidth={2} /> Individual client</>}
                    </p>
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.descrizione}</p>
            </div>

            {/* 3. Client documents */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Client documents ({clienteAllegati.length})
              </h3>
              {clienteAllegati.length === 0 ? (
                <div className="flex items-center gap-3 py-2 text-gray-400">
                  <Paperclip className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  <p className="text-sm">No documents attached by the client.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {clienteAllegati.map((path) => (
                    <li key={path} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <Paperclip className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2} />
                      <span className="text-sm text-gray-700 flex-1 truncate">{filename(path)}</span>
                      {signedUrls[path] ? (
                        <a href={signedUrls[path]} target="_blank" rel="noopener noreferrer" download
                          className="flex items-center gap-1 text-xs text-violet-600 font-medium hover:text-violet-700 shrink-0">
                          <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
                          Download
                        </a>
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 text-gray-300 animate-spin shrink-0" />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 4. Your response */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Your professional response</h3>
                {selected.rispostaProfessionista && !isEditingRisposta && selected.stato !== 'risolto' && (
                  <button onClick={() => setIsEditingRisposta(true)}
                    className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium">
                    <Edit3 className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Edit
                  </button>
                )}
              </div>

              {isEditingRisposta ? (
                <div className="space-y-3">
                  <textarea
                    value={editRisposta}
                    onChange={(e) => setEditRisposta(e.target.value)}
                    rows={8}
                    placeholder="Write your professional opinion, recommendations, and conclusions here…"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSalvaRisposta}
                      disabled={savingRisposta || !editRisposta.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                      {savingRisposta
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                        : <><CheckCircle2 className="w-4 h-4" strokeWidth={2} /> Save response</>}
                    </button>
                    {selected.rispostaProfessionista && (
                      <button
                        onClick={() => { setIsEditingRisposta(false); setEditRisposta(selected.rispostaProfessionista ?? ''); }}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-medium transition-colors">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ) : selected.rispostaProfessionista ? (
                <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selected.rispostaProfessionista}
                  </p>
                  {user && (
                    <p className="text-xs text-violet-500 font-medium mt-3 pt-3 border-t border-violet-100">
                      — {user.qualifica} {user.nome} {user.cognome}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 py-3 text-gray-400">
                  <MessageSquare className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                  <p className="text-sm">No response written yet. Use the form to get started.</p>
                </div>
              )}
            </div>

            {/* 5. Response documents */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Response documents ({profAllegati.length})
                </h3>
                {selected.stato !== 'risolto' && (
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingDoc}
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50 transition-colors">
                    {uploadingDoc
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
                      : <><Upload className="w-3.5 h-3.5" strokeWidth={2.5} /> Attach document</>}
                  </button>
                )}
                <input ref={fileInputRef} type="file" className="sr-only"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  onChange={handleUploadDoc} />
              </div>

              {uploadDocErr && (
                <div className="flex items-center gap-2 mb-3 p-3 bg-rose-50 rounded-xl text-xs text-rose-600">
                  <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2} />
                  {uploadDocErr}
                  <button onClick={() => setUploadDocErr('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}

              {profAllegati.length === 0 ? (
                <button onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingDoc || selected.stato === 'risolto'}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-5 text-sm text-gray-400 hover:border-violet-300 hover:text-violet-500 transition-colors flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-default">
                  <Paperclip className="w-5 h-5" strokeWidth={1.5} />
                  Attach reviewed contracts or response documents
                  <span className="text-xs">PDF, Word, images — max 10 MB</span>
                </button>
              ) : (
                <ul className="space-y-2">
                  {profAllegati.map((path) => (
                    <li key={path} className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl border border-violet-100">
                      <Paperclip className="w-4 h-4 text-violet-400 shrink-0" strokeWidth={2} />
                      <span className="text-sm text-gray-700 flex-1 truncate">{filename(path)}</span>
                      {signedUrls[path] ? (
                        <a href={signedUrls[path]} target="_blank" rel="noopener noreferrer" download
                          className="flex items-center gap-1 text-xs text-violet-600 font-medium hover:text-violet-700 shrink-0">
                          <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
                          Download
                        </a>
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 text-gray-300 animate-spin shrink-0" />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 6. Close ticket */}
            {selected.stato !== 'risolto' ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-gray-800 mb-1">Close and resolve ticket</h3>
                    <p className="text-xs text-gray-500 mb-3">
                      The ticket will be marked as resolved and you will earn{' '}
                      <span className="font-semibold text-emerald-700">+50 points</span>.
                    </p>
                    {!selected.rispostaProfessionista && (
                      <p className="text-xs text-amber-600 font-medium mb-3">
                        ⚠ Recommended: save your response before closing.
                      </p>
                    )}
                    {closeErr && (
                      <div className="flex items-center gap-2 mb-3 p-3 bg-rose-50 rounded-xl text-xs text-rose-600">
                        <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2} />
                        {closeErr}
                      </div>
                    )}
                    <button onClick={handleChiudiTicket}
                      disabled={closing || !assegnazione}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                      {closing
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Closing…</>
                        : <><CheckCircle2 className="w-4 h-4" strokeWidth={2} /> Close & resolve</>}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" strokeWidth={2} />
                <div>
                  <p className="text-sm font-bold text-emerald-700">Ticket resolved</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    +50 points credited. Great work!
                  </p>
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
