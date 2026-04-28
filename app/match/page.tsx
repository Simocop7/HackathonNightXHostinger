'use client';
import { useState, useEffect, useRef, FormEvent, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BookOpen,
  GraduationCap,
  Check,
  CheckCircle2,
  MessageCircle,
  Trophy,
  Hand,
  Hourglass,
} from 'lucide-react';
import {
  getCurrentUser,
  getMatchesForUser,
  getUser,
  updateMatch,
  getChat,
  sendMessage,
  confirmSession,
  seedOffersForUser,
  subscribeToMessages,
  subscribeToMatchUpdates,
} from '../_lib/db';
import { Match, Utente, Messaggio } from '../_lib/types';
import Avatar from '../_components/Avatar';
import UserProfileModal from '../_components/UserProfileModal';

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function MatchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState<Utente | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [userCache, setUserCache] = useState<Map<string, Utente>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Messaggio[]>([]);
  const [input, setInput] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [ready, setReady] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [videoState, setVideoState] = useState<'idle' | 'calling' | 'in-call'>('idle');
  const [profileUser, setProfileUser] = useState<Utente | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMatches = useCallback(async (uid: string): Promise<Match[]> => {
    const m = await getMatchesForUser(uid);
    setMatches(m);
    // Aggiorna la cache utenti per tutti i nuovi ID
    const ids = [...new Set(m.flatMap((mx) => [mx.helperId, mx.seekerId]))];
    setUserCache((prev) => {
      const missing = ids.filter((id) => !prev.has(id));
      if (missing.length === 0) return prev;
      // Carica in background e aggiorna lo stato
      Promise.all(missing.map((id) => getUser(id))).then((profiles) => {
        setUserCache((cache) => {
          const next = new Map(cache);
          missing.forEach((id, i) => { if (profiles[i]) next.set(id, profiles[i]!); });
          return next;
        });
      });
      return prev;
    });
    return m;
  }, []);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (!user) { router.replace('/'); return; }
      if (!user.profiloCompleto) { router.replace('/setup'); return; }
      setCurrentUser(user);
      await seedOffersForUser(user);
      const ms = await loadMatches(user.id);

      const idParam = searchParams.get('id');
      if (idParam && ms.some((m) => m.id === idParam)) setSelectedId(idParam);

      setReady(true);
    })();
  }, [router, loadMatches, searchParams]);

  // Realtime: aggiorna match list quando arrivano cambiamenti
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToMatchUpdates(currentUser.id, () => {
      loadMatches(currentUser.id);
    });
    return unsub;
  }, [currentUser, loadMatches]);

  // Carica chat quando si seleziona un match
  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      const chat = await getChat(selectedId);
      setMessages([...chat.messaggi]);
    })();
    setConfirmed(false);
    setCelebrating(false);
    setVideoState('idle');
    if (videoTimerRef.current) clearTimeout(videoTimerRef.current);
  }, [selectedId]);

  // Realtime: messaggi in tempo reale
  useEffect(() => {
    if (!selectedId) return;
    const unsub = subscribeToMessages(selectedId, (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return unsub;
  }, [selectedId]);

  useEffect(() => {
    if (videoState === 'calling') {
      videoTimerRef.current = setTimeout(() => setVideoState('in-call'), 4000);
    }
    return () => { if (videoTimerRef.current) clearTimeout(videoTimerRef.current); };
  }, [videoState]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAccept = async (match: Match) => {
    await updateMatch({ ...match, stato: 'accettato' });
    if (currentUser) await loadMatches(currentUser.id);
  };

  const handleReject = async (match: Match) => {
    await updateMatch({ ...match, stato: 'rifiutato' });
    if (currentUser) await loadMatches(currentUser.id);
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentUser || !selectedId) return;
    const msg = await sendMessage(selectedId, currentUser.id, input.trim());
    setInput('');
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleConfirm = async () => {
    if (!currentUser || !selectedId) return;
    const match = matches.find((m) => m.id === selectedId);
    if (!match || match.confermaSeeker) return;

    await confirmSession(selectedId);

    setConfirmed(true);
    setCelebrating(true);
    window.dispatchEvent(new Event('points-updated'));
    await loadMatches(currentUser.id);
  };

  if (!ready || !currentUser) return null;

  const pending = matches.filter((m) => m.stato === 'richiesta' && m.seekerId === currentUser.id);
  const pendingHelping = matches.filter((m) => m.stato === 'richiesta' && m.helperId === currentUser.id);
  const seekingMatches = matches.filter((m) => m.stato === 'accettato' && m.seekerId === currentUser.id);
  const helpingMatches = matches.filter((m) => m.stato === 'accettato' && m.helperId === currentUser.id);
  const rejected = matches.filter((m) => m.stato === 'rifiutato' && m.seekerId === currentUser.id);

  const selectedMatch = matches.find((m) => m.id === selectedId) ?? null;
  const isSelectedHelper = selectedMatch ? selectedMatch.helperId === currentUser.id : false;
  const otherUser = selectedMatch
    ? userCache.get(isSelectedHelper ? selectedMatch.seekerId : selectedMatch.helperId) ?? null
    : null;
  const sessionDone = selectedMatch ? selectedMatch.confermaSeeker : false;

  return (
    <div className="page-root-full flex bg-gray-50">
      {profileUser && (
        <UserProfileModal user={profileUser} onClose={() => setProfileUser(null)} />
      )}

      {/* LEFT PANEL — conversation list */}
      <div className="w-80 shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-100 shrink-0">
          <h1 className="font-bold text-gray-800 text-lg">Match</h1>
          {pending.length > 0 && (
            <p className="text-xs text-rose-500 font-medium mt-0.5">
              {pending.length} {pending.length === 1 ? 'offerta in attesa' : 'offerte in attesa'}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Ricevo aiuto */}
          {seekingMatches.length > 0 && (
            <div className="px-3 pt-3">
              <div className="flex items-center gap-1.5 px-1 mb-2">
                <BookOpen className="w-3 h-3 text-blue-400" strokeWidth={2.5} />
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Sto ricevendo aiuto</p>
              </div>
              {seekingMatches.map((m) => {
                const other = userCache.get(m.helperId);
                if (!other) return null;
                const done = m.confermaSeeker;
                const isActive = selectedId === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    role="button" tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedId(m.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl mb-1 transition-colors cursor-pointer ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <button type="button" onClick={(e) => { e.stopPropagation(); setProfileUser(other); }}
                      className="shrink-0 rounded-full focus:outline-none hover:ring-2 hover:ring-violet-300 transition-all">
                      <Avatar user={other} className="w-10 h-10" textClassName="text-sm font-bold" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setProfileUser(other); }}
                        className="text-sm font-semibold text-gray-800 truncate hover:text-violet-600 transition-colors text-left">
                        {other.nome} {other.cognome}
                      </button>
                      <p className="text-xs text-gray-400 truncate">{other.universita}</p>
                    </div>
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-600'}`}>
                      {done ? <Check className="w-3 h-3" strokeWidth={3} /> : <BookOpen className="w-3 h-3" strokeWidth={2.5} />}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sto aiutando */}
          {(pendingHelping.length > 0 || helpingMatches.length > 0) && (
            <div className="px-3 pt-3">
              <div className="flex items-center gap-1.5 px-1 mb-2">
                <GraduationCap className="w-3 h-3 text-emerald-500" strokeWidth={2.5} />
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Sto aiutando</p>
              </div>
              {pendingHelping.map((m) => {
                const other = userCache.get(m.seekerId);
                if (!other) return null;
                return (
                  <div key={m.id} className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl mb-1 bg-gray-50">
                    <button type="button" onClick={() => setProfileUser(other)}
                      className="shrink-0 rounded-full opacity-70 hover:opacity-100 focus:outline-none hover:ring-2 hover:ring-violet-300 transition-all">
                      <Avatar user={other} className="w-10 h-10" textClassName="text-sm font-bold" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <button type="button" onClick={() => setProfileUser(other)}
                        className="text-sm font-semibold text-gray-700 truncate hover:text-violet-600 transition-colors text-left">
                        {other.nome} {other.cognome}
                      </button>
                      <p className="text-xs text-gray-400 truncate">In attesa di risposta…</p>
                    </div>
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0 bg-amber-50 text-amber-600">
                      <Hourglass className="w-3 h-3" strokeWidth={2.5} />
                    </span>
                  </div>
                );
              })}
              {helpingMatches.map((m) => {
                const other = userCache.get(m.seekerId);
                if (!other) return null;
                const done = m.confermaSeeker;
                const isActive = selectedId === m.id;
                return (
                  <div key={m.id} onClick={() => setSelectedId(m.id)} role="button" tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedId(m.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl mb-1 transition-colors cursor-pointer ${isActive ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setProfileUser(other); }}
                      className="shrink-0 rounded-full focus:outline-none hover:ring-2 hover:ring-violet-300 transition-all">
                      <Avatar user={other} className="w-10 h-10" textClassName="text-sm font-bold" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setProfileUser(other); }}
                        className="text-sm font-semibold text-gray-800 truncate hover:text-violet-600 transition-colors text-left">
                        {other.nome} {other.cognome}
                      </button>
                      <p className="text-xs text-gray-400 truncate">{other.universita}</p>
                    </div>
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-50 text-emerald-600'}`}>
                      {done ? <Check className="w-3 h-3" strokeWidth={3} /> : <GraduationCap className="w-3 h-3" strokeWidth={2.5} />}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Offerte ricevute */}
          {pending.length > 0 && (
            <div className="px-3 pt-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">Offerte ricevute</p>
              {pending.map((m) => {
                const helper = userCache.get(m.helperId);
                if (!helper) return null;
                const materia = m.materia ?? helper.puoAiutareIn[0];
                return (
                  <div key={m.id} className="bg-violet-50 rounded-2xl p-3 mb-2">
                    <div className="flex items-center gap-2.5 mb-2">
                      <button type="button" onClick={() => setProfileUser(helper)}
                        className="shrink-0 rounded-full focus:outline-none hover:ring-2 hover:ring-violet-400 transition-all">
                        <Avatar user={helper} className="w-9 h-9" textClassName="text-xs font-bold" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <button type="button" onClick={() => setProfileUser(helper)}
                          className="text-sm font-semibold text-gray-800 truncate hover:text-violet-700 transition-colors text-left">
                          {helper.nome} {helper.cognome}
                        </button>
                        <p className="text-xs text-violet-600 font-medium leading-snug">
                          vuole aiutarti in <span className="font-bold text-violet-700">{materia}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleReject(m)}
                        className="flex-1 py-1.5 rounded-xl text-xs font-semibold bg-white text-gray-500 border border-gray-200 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-colors">
                        Rifiuta
                      </button>
                      <button onClick={() => { handleAccept(m); setSelectedId(m.id); }}
                        className="flex-1 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
                        Accetta
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rifiutati */}
          {rejected.length > 0 && (
            <div className="px-3 pt-3 pb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">Non disponibili</p>
              {rejected.map((m) => {
                const helper = userCache.get(m.helperId);
                if (!helper) return null;
                return (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 opacity-50">
                    <Avatar user={helper} className="w-9 h-9 shrink-0" textClassName="text-xs font-bold" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 truncate">{helper.nome} {helper.cognome}</p>
                      <p className="text-xs text-gray-400">Non disponibile</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pending.length === 0 && pendingHelping.length === 0 && seekingMatches.length === 0 && helpingMatches.length === 0 && rejected.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-center px-4">
              <MessageCircle className="w-10 h-10 mb-3 text-gray-300" strokeWidth={1.5} />
              <p className="text-sm font-medium">Nessun match ancora</p>
              <p className="text-xs mt-1">Cerca uno studente per iniziare!</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL — chat */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {!selectedMatch || !otherUser ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-center px-8">
            <MessageCircle className="w-14 h-14 mb-4 text-gray-300" strokeWidth={1.5} />
            <p className="text-lg font-semibold text-gray-600">Seleziona una conversazione</p>
            <p className="text-sm mt-1">Scegli un match dalla lista a sinistra per iniziare</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3 shrink-0">
              <button type="button" onClick={() => setProfileUser(otherUser)}
                className="rounded-full focus:outline-none hover:ring-2 hover:ring-violet-300 transition-all shrink-0">
                <Avatar user={otherUser} className="w-10 h-10" textClassName="text-sm font-bold" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button type="button" onClick={() => setProfileUser(otherUser)}
                    className="font-semibold text-gray-800 hover:text-violet-600 transition-colors">
                    {otherUser.nome} {otherUser.cognome}
                  </button>
                  {selectedMatch.materia && (
                    <span className="text-xs font-semibold bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full shrink-0">
                      {selectedMatch.materia}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{otherUser.universita} · {otherUser.facolta}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${isSelectedHelper ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                {isSelectedHelper
                  ? <><GraduationCap className="w-3.5 h-3.5" strokeWidth={2.5} /> Stai aiutando</>
                  : <><BookOpen className="w-3.5 h-3.5" strokeWidth={2.5} /> Ricevi aiuto</>}
              </span>
            </div>

            {/* Session banner */}
            {(sessionDone || celebrating) && (
              <div className={`bg-emerald-50 border-b border-emerald-200 px-6 py-3 text-center ${celebrating ? 'celebrate' : ''}`}>
                <p className="inline-flex items-center justify-center gap-2 text-emerald-700 font-semibold text-sm">
                  <Trophy className="w-4 h-4" strokeWidth={2.5} />
                  {isSelectedHelper
                    ? 'Sessione completata! Hai guadagnato +50 punti UniversityBOX'
                    : `Sessione confermata! +50 punti assegnati a ${otherUser.nome}`}
                </p>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Hand className="w-8 h-8 mx-auto mb-2 text-gray-300" strokeWidth={1.5} />
                  <p className="text-sm">Inizia la conversazione!</p>
                </div>
              )}
              {messages.map((msg) => {
                const isMine = msg.mittenteId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex msg-in ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {!isMine && (
                      <Avatar user={otherUser} className="w-7 h-7 mr-2 mt-auto shrink-0" textClassName="text-xs font-bold" />
                    )}
                    <div className={`max-w-[60%] px-4 py-2.5 rounded-2xl text-sm ${isMine ? 'bg-violet-600 text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'}`}>
                      <p className="leading-relaxed">{msg.testo}</p>
                      <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-violet-200' : 'text-gray-400'}`}>
                        {formatTime(msg.ts)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Confirm session */}
            {!sessionDone && !celebrating && (
              <div className="bg-white border-t border-gray-100 px-6 py-3 shrink-0">
                {confirmed ? (
                  <p className="flex items-center justify-center gap-1.5 text-center text-sm text-emerald-600 font-medium">
                    <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                    Sessione confermata!
                  </p>
                ) : (
                  <button onClick={handleConfirm}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                    {isSelectedHelper
                      ? `Ho aiutato ${otherUser.nome} — conferma sessione`
                      : 'Conferma sessione svolta — hai ricevuto aiuto?'}
                  </button>
                )}
              </div>
            )}

            {/* Input */}
            <div className="bg-white border-t border-gray-100 px-6 py-4 shrink-0">
              <form onSubmit={handleSend} className="flex gap-3 items-center">
                {selectedMatch?.stato === 'accettato' && (
                  <button type="button" onClick={() => setVideoState('calling')} title="Avvia videochiamata"
                    className="w-11 h-11 bg-gray-100 hover:bg-violet-50 text-gray-500 hover:text-violet-600 rounded-full flex items-center justify-center shrink-0 transition-colors">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                    </svg>
                  </button>
                )}
                <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="Scrivi un messaggio..."
                  className="flex-1 px-4 py-2.5 bg-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                <button type="submit" disabled={!input.trim()}
                  className="w-11 h-11 bg-violet-600 disabled:bg-gray-200 text-white rounded-full flex items-center justify-center shrink-0 transition-colors hover:bg-violet-700">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </form>
            </div>

            {/* Video call overlay */}
            {videoState !== 'idle' && (
              <div className="absolute inset-0 bg-gray-900 flex flex-col z-20">
                {videoState === 'calling' ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-6">
                    <div className="relative flex items-center justify-center">
                      <span className="absolute w-32 h-32 rounded-full bg-violet-500/20 animate-ping" />
                      <span className="absolute w-40 h-40 rounded-full bg-violet-500/10 animate-pulse" />
                      <Avatar user={otherUser} className="w-24 h-24 relative z-10 ring-4 ring-violet-400" textClassName="text-3xl font-bold" />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold text-xl">{otherUser.nome} {otherUser.cognome}</p>
                      <p className="text-gray-400 text-sm mt-1 animate-pulse">In attesa che accetti…</p>
                    </div>
                    <button onClick={() => setVideoState('idle')}
                      className="mt-6 w-16 h-16 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 rounded-full flex items-center justify-center transition-colors shadow-lg">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white rotate-[135deg]">
                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col relative">
                    <div className="flex-1 bg-gray-800 flex items-center justify-center relative">
                      <Avatar user={otherUser} className="w-24 h-24 opacity-60" textClassName="text-4xl font-bold" />
                      <p className="absolute bottom-4 left-4 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-lg">
                        {otherUser.nome} {otherUser.cognome}
                      </p>
                    </div>
                    {currentUser && (
                      <div className="absolute top-4 right-4 w-24 h-32 bg-gray-700 rounded-2xl border-2 border-gray-600 flex items-center justify-center shadow-xl">
                        <Avatar user={currentUser} className="w-12 h-12 opacity-70" textClassName="text-lg font-bold" />
                      </div>
                    )}
                    <div className="bg-gray-900 px-6 py-5 flex items-center justify-center gap-6 shrink-0">
                      <button className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                        </svg>
                      </button>
                      <button onClick={() => setVideoState('idle')}
                        className="w-16 h-16 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 rounded-full flex items-center justify-center transition-colors shadow-lg">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white rotate-[135deg]">
                          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                        </svg>
                      </button>
                      <button className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                          <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MatchPage() {
  return (
    <Suspense fallback={null}>
      <MatchPageInner />
    </Suspense>
  );
}
