'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Calendar, CalendarDays, Sparkles, GraduationCap, HandHeart } from 'lucide-react';
import {
  getCurrentUser,
  getRichiesteVisibili,
  createMatch,
  chiudiRichiesta,
  getUser,
  signOut,
} from '../_lib/db';
import { RichiestaAiuto, Utente } from '../_lib/types';
import Avatar from '../_components/Avatar';

function ScadenzaBadge({ value, className }: { value: 'oggi' | 'domani' | 'settimana'; className?: string }) {
  const map = {
    oggi:      { Icon: Clock,        label: 'Entro oggi' },
    domani:    { Icon: Calendar,     label: 'Entro domani' },
    settimana: { Icon: CalendarDays, label: 'Questa settimana' },
  } as const;
  const { Icon, label } = map[value];
  return (
    <span className={className}>
      <Icon className="w-3 h-3" strokeWidth={2.5} />
      {label}
    </span>
  );
}

const SCADENZA_COLOR: Record<string, string> = {
  oggi: 'bg-rose-100 text-rose-700',
  domani: 'bg-amber-100 text-amber-700',
  settimana: 'bg-blue-100 text-blue-700',
};

const MATERIA_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
];

function materiaColor(materia: string) {
  let hash = 0;
  for (let i = 0; i < materia.length; i++) hash = materia.charCodeAt(i) + ((hash << 5) - hash);
  return MATERIA_COLORS[Math.abs(hash) % MATERIA_COLORS.length];
}

interface RichiestaCardProps {
  richiesta: RichiestaAiuto;
  richiedente: Utente;
  onSwipe: (dir: 'left' | 'right') => void;
  onExit?: () => void;
  isTop: boolean;
  triggerDir?: 'left' | 'right' | null;
  onTriggerConsumed?: () => void;
}

function RichiestaCard({ richiesta, richiedente, onSwipe, onExit, isTop, triggerDir, onTriggerConsumed }: RichiestaCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentDeltaRef = useRef(0);
  const isDragging = useRef(false);
  const velocityPts = useRef<{ x: number; t: number }[]>([]);
  const [delta, setDelta] = useState(0);
  const [status, setStatus] = useState<'idle' | 'exit-right' | 'exit-left' | 'snap'>('idle');
  const hasFired = useRef(false);
  const [forcedDir, setForcedDir] = useState<'left' | 'right' | null>(null);

  const triggerSwipe = useCallback(
    (dir: 'left' | 'right') => {
      if (hasFired.current) return;
      hasFired.current = true;
      onExit?.();
      setStatus(dir === 'right' ? 'exit-right' : 'exit-left');
      setTimeout(() => onSwipe(dir), 420);
    },
    [onSwipe, onExit],
  );

  useEffect(() => {
    if (!triggerDir || hasFired.current) return;
    hasFired.current = true;
    setForcedDir(triggerDir);
    onExit?.();
    setStatus(triggerDir === 'right' ? 'exit-right' : 'exit-left');
    const dir = triggerDir;
    setTimeout(() => {
      onSwipe(dir);
      onTriggerConsumed?.();
    }, 420);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerDir]);

  const snapBack = () => {
    currentDeltaRef.current = 0;
    velocityPts.current = [];
    setDelta(0);
    setStatus('snap');
    setTimeout(() => setStatus('idle'), 380);
  };

  const getVelocity = (): number => {
    const pts = velocityPts.current;
    if (pts.length < 2) return 0;
    const first = pts[0];
    const last = pts[pts.length - 1];
    const dt = last.t - first.t;
    return dt === 0 ? 0 : (last.x - first.x) / dt;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isTop) return;
    isDragging.current = true;
    startXRef.current = e.clientX;
    velocityPts.current = [{ x: e.clientX, t: Date.now() }];
    cardRef.current?.setPointerCapture(e.pointerId);
    setStatus('idle');
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const d = e.clientX - startXRef.current;
    currentDeltaRef.current = d;
    setDelta(d);
    velocityPts.current.push({ x: e.clientX, t: Date.now() });
    if (velocityPts.current.length > 6) velocityPts.current.shift();
  };

  const onPointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const d = currentDeltaRef.current;
    const v = getVelocity();
    velocityPts.current = [];
    if (d > 60 || (d > 20 && v > 0.5)) triggerSwipe('right');
    else if (d < -60 || (d < -20 && v < -0.5)) triggerSwipe('left');
    else snapBack();
  };

  const rotation = status === 'idle' || status === 'snap' ? delta * 0.06 : 0;
  const translateX = status === 'idle' || status === 'snap' ? delta : 0;
  const cardStyle =
    status === 'exit-right' || status === 'exit-left' || status === 'snap'
      ? undefined
      : { transform: `translateX(${translateX}px) rotate(${rotation}deg)` };

  const matchOpacity = forcedDir === 'right' ? 1 : Math.min(Math.max(delta / 120, 0), 1);
  const skipOpacity = forcedDir === 'left' ? 1 : Math.min(Math.max(-delta / 120, 0), 1);

  return (
    <div
      ref={cardRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`swipe-card absolute inset-0 bg-white rounded-3xl shadow-2xl ring-1 ring-gray-100 overflow-hidden select-none ${
        status === 'exit-right' ? 'exit-right' : ''
      } ${status === 'exit-left' ? 'exit-left' : ''} ${status === 'snap' ? 'snap-back' : ''}`}
      style={cardStyle}
    >
      {/* Color overlays */}
      <div className="absolute inset-0 pointer-events-none rounded-3xl" style={{ background: `rgba(52,211,153,${matchOpacity * 0.25})`, zIndex: 1 }} />
      <div className="absolute inset-0 pointer-events-none rounded-3xl" style={{ background: `rgba(244,63,94,${skipOpacity * 0.25})`, zIndex: 1 }} />

      {/* Stamps */}
      <div className="absolute top-6 left-6 border-4 border-emerald-400 text-emerald-400 font-black text-2xl px-3 py-1 rounded-xl rotate-[-15deg] pointer-events-none" style={{ opacity: matchOpacity, zIndex: 10 }}>
        AIUTO!
      </div>
      <div className="absolute top-6 right-6 border-4 border-rose-400 text-rose-400 font-black text-2xl px-3 py-1 rounded-xl rotate-[15deg] pointer-events-none" style={{ opacity: skipOpacity, zIndex: 10 }}>
        PASSA
      </div>

      {/* Content */}
      <div className="h-full overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-50 to-violet-100 px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <Avatar user={richiedente} className="w-12 h-12 shadow" textClassName="text-lg font-bold" />
            <div>
              <p className="font-bold text-gray-800">{richiedente.nome} {richiedente.cognome}</p>
              <p className="text-xs text-gray-500">{richiedente.universita}</p>
              <p className="text-xs text-gray-400">{richiedente.facolta}</p>
            </div>
          </div>

          {/* Materia */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-bold px-4 py-2 rounded-2xl ${materiaColor(richiesta.materia)}`}>
              {richiesta.materia}
            </span>
            {richiesta.scadenza && (
              <ScadenzaBadge
                value={richiesta.scadenza}
                className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl ${SCADENZA_COLOR[richiesta.scadenza]}`}
              />
            )}
          </div>
        </div>

        {/* Description */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Il problema</p>
          <p className="text-gray-700 leading-relaxed text-sm">{richiesta.descrizione}</p>
        </div>

        {/* Richiedente skills */}
        {richiedente.puoAiutareIn.length > 0 && (
          <div className="px-6 pb-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <Sparkles className="w-3 h-3 text-emerald-500" strokeWidth={2.5} />
              {richiedente.nome} può aiutarti in
            </p>
            <div className="flex flex-wrap gap-1.5">
              {richiedente.puoAiutareIn.map((s) => (
                <span key={s} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* LinkedIn */}
        {richiedente.linkedin && (
          <div className="px-6 pb-6">
            <a
              href={richiedente.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              onPointerDown={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 bg-[#0A66C2] hover:bg-[#004182] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              Vedi profilo LinkedIn
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiutaPage() {
  const router = useRouter();
  const [richieste, setRichieste] = useState<RichiestaAiuto[]>([]);
  const [userCache, setUserCache] = useState<Map<string, Utente>>(new Map());
  const [currentUser, setCurrentUser] = useState<Utente | null>(null);
  const [ready, setReady] = useState(false);
  const [matchedName, setMatchedName] = useState<string | null>(null);
  const [buttonTrigger, setButtonTrigger] = useState<'left' | 'right' | null>(null);
  const [topExiting, setTopExiting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          // Sessione orfana (profilo mancante) — sign-out per uscire dal loop
          await signOut();
          router.replace('/');
          return;
        }
        if (!user.profiloCompleto) { router.replace('/setup'); return; }
        setCurrentUser(user);

        let visible = await getRichiesteVisibili(user);
        if (visible.length === 0) visible = await getRichiesteVisibili(user, true);
        setRichieste(visible);

        const ids = [...new Set(visible.map((r) => r.userId))];
        const profiles = await Promise.all(ids.map((id) => getUser(id)));
        const cache = new Map<string, Utente>();
        ids.forEach((id, i) => { if (profiles[i]) cache.set(id, profiles[i]!); });
        setUserCache(cache);
      } catch {
        // errore di rete o Supabase
      } finally {
        setReady(true);
      }
    })();
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && !buttonTrigger) setButtonTrigger('right');
      if (e.key === 'ArrowLeft' && !buttonTrigger) setButtonTrigger('left');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [buttonTrigger]);

  const handleSwipe = useCallback(
    async (dir: 'left' | 'right', richiesta: RichiestaAiuto) => {
      if (dir === 'right' && currentUser) {
        await createMatch(currentUser.id, richiesta.userId, richiesta.materia);
        await chiudiRichiesta(richiesta.id);
        const richiedente = userCache.get(richiesta.userId);
        setMatchedName(richiedente?.nome ?? 'qualcuno');
        setTimeout(() => setMatchedName(null), 2000);
      }
      setTopExiting(false);
      setRichieste((prev) => {
        const next = prev.filter((r) => r.id !== richiesta.id);
        return next;
      });
      // Se la coda si svuota ricarica
      if (richieste.length <= 1 && currentUser) {
        const all = await getRichiesteVisibili(currentUser, true);
        const ids = [...new Set(all.map((r) => r.userId))];
        const profiles = await Promise.all(ids.map((id) => getUser(id)));
        const cache = new Map<string, Utente>(userCache);
        ids.forEach((id, i) => { if (profiles[i]) cache.set(id, profiles[i]!); });
        setUserCache(cache);
        setRichieste(all.filter((r) => r.id !== richiesta.id));
      }
    },
    [currentUser, userCache, richieste.length],
  );

  const FALLBACK_USER: Utente = {
    id: '', nome: '?', cognome: '', username: '', universita: '',
    facolta: '', cercaAiutoIn: [], puoAiutareIn: [], biografia: '', punti: 0, profiloCompleto: true,
  };

  if (!ready) return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );
  if (!currentUser) return null;

  const top = richieste[0];
  const second = richieste[1];

  return (
    <div className="page-root bg-gray-50 flex flex-col">
      {/* Match toast */}
      {matchedName && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg font-semibold text-sm animate-bounce flex items-center gap-2">
          <HandHeart className="w-4 h-4" strokeWidth={2.5} />
          Offerta inviata a {matchedName}!
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {richieste.length === 0 ? (
          <div className="text-center space-y-4 max-w-sm">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-violet-100 text-violet-600">
              <GraduationCap className="w-10 h-10" strokeWidth={1.75} />
            </div>
            <h2 className="text-xl font-bold text-gray-700">Nessuna richiesta disponibile</h2>
            <p className="text-gray-500 text-sm">
              Non ci sono richieste nelle tue materie al momento.
            </p>
            <button
              onClick={() => router.push('/profilo')}
              className="inline-block mt-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl font-medium text-sm hover:bg-violet-700 transition-colors"
            >
              Aggiorna le tue competenze
            </button>
          </div>
        ) : (
          <div className="w-full max-w-lg">
            <p className="text-center text-xs text-gray-400 mb-4 font-medium">
              {richieste.length} {richieste.length === 1 ? 'richiesta disponibile' : 'richieste disponibili'} · usa ← → o trascina
            </p>

            <div className="flex items-center gap-4">
              {/* Skip button */}
              <button
                onClick={() => { if (!buttonTrigger) setButtonTrigger('left'); }}
                className="w-16 h-16 bg-white rounded-full shadow-xl shadow-rose-100 border-2 border-rose-100 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all active:scale-90 shrink-0"
                title="Salta (←)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-7 h-7">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>

              {/* Card stack */}
              <div className="relative flex-1" style={{ height: 480 }}>
                {second && (
                  <div
                    className="absolute inset-0 bg-white rounded-3xl shadow-md pointer-events-none"
                    style={{
                      transform: topExiting ? 'scale(1) translateY(0)' : 'scale(0.97) translateY(8px)',
                      transition: 'transform 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    }}
                  />
                )}
                <RichiestaCard
                  key={top.id}
                  richiesta={top}
                  richiedente={userCache.get(top.userId) ?? { ...FALLBACK_USER, id: top.userId }}
                  onSwipe={(dir) => handleSwipe(dir, top)}
                  onExit={() => setTopExiting(true)}
                  isTop
                  triggerDir={buttonTrigger}
                  onTriggerConsumed={() => setButtonTrigger(null)}
                />
              </div>

              {/* Match button */}
              <button
                onClick={() => { if (!buttonTrigger) setButtonTrigger('right'); }}
                className="w-16 h-16 bg-white rounded-full shadow-xl shadow-emerald-100 border-2 border-emerald-100 flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all active:scale-90 shrink-0"
                title="Offri aiuto (→)"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                  <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
                </svg>
              </button>
            </div>

            <div className="flex justify-between mt-3 px-20">
              <span className="text-xs text-gray-400">Salta</span>
              <span className="text-xs text-gray-400">Offri aiuto</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
