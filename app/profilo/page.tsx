'use client';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Medal,
  Award,
  Sprout,
  Sparkles,
  Search,
  Link2,
  CheckCircle2,
  Gift,
  Ticket,
  Lock,
  FlaskConical,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import {
  getCurrentUser,
  updateUser,
  getMatchesForUser,
  clearCurrentUser,
  signIn,
  uploadAvatar,
  getSeedUsers,
} from '../_lib/db';
import { Utente, Match } from '../_lib/types';
import TagInput from '../_components/TagInput';
import Avatar from '../_components/Avatar';

const SEED_PASSWORD = 'StudyMatch2024!';

const DISCOUNT_TIERS = [
  { pts: 50,  pct: 5,  label: '5% sconto' },
  { pts: 150, pct: 10, label: '10% sconto' },
  { pts: 300, pct: 20, label: '20% sconto' },
];

function levelInfo(pts: number): { label: string; Icon: LucideIcon; iconColor: string; next: string | null; nextPts: number } {
  if (pts >= 500) return { label: 'Mentore',       Icon: Trophy, iconColor: 'text-amber-500',  next: null,            nextPts: 0   };
  if (pts >= 200) return { label: 'Esperto',       Icon: Medal,  iconColor: 'text-slate-400',  next: 'Mentore',       nextPts: 500 };
  if (pts >= 50)  return { label: 'Collaboratore', Icon: Award,  iconColor: 'text-orange-500', next: 'Esperto',       nextPts: 200 };
  return            { label: 'Novizio',       Icon: Sprout, iconColor: 'text-emerald-500', next: 'Collaboratore', nextPts: 50  };
}

export default function ProfiloPage() {
  const router = useRouter();
  const [user, setUser] = useState<Utente | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [editing, setEditing] = useState(false);
  const [cercaAiutoIn, setCercaAiutoIn] = useState<string[]>([]);
  const [puoAiutareIn, setPuoAiutareIn] = useState<string[]>([]);
  const [linkedin, setLinkedin] = useState('');
  const [ready, setReady] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [seedUsers, setSeedUsers] = useState<Utente[]>([]);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace('/'); return; }
      if (!u.profiloCompleto) { router.replace('/setup'); return; }
      setUser(u);
      setCercaAiutoIn(u.cercaAiutoIn);
      setPuoAiutareIn(u.puoAiutareIn);
      setLinkedin(u.linkedin ?? '');
      const m = await getMatchesForUser(u.id);
      setMatches(m);
      const seeds = await getSeedUsers();
      setSeedUsers(seeds.filter((s) => s.id !== u.id));
      setReady(true);
    })();
  }, [router]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const updated = { ...user, cercaAiutoIn, puoAiutareIn, linkedin: linkedin.trim() || undefined };
    await updateUser(updated);
    setUser(updated);
    setEditing(false);
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const fotoUrl = await uploadAvatar(user.id, file);
      const updated = { ...user, foto: fotoUrl };
      await updateUser(updated);
      setUser(updated);
    } catch {
      // non bloccante
    }
  };

  const handleDemoSwitch = async (seedUser: Utente) => {
    setSwitchingTo(seedUser.id);
    const seedEmail = `seed-${seedUser.username}@studymatch.demo`;
    await clearCurrentUser();
    const { error } = await signIn(seedEmail, SEED_PASSWORD);
    if (error) {
      setSwitchingTo(null);
      return;
    }
    router.push('/aiuta');
  };

  if (!ready || !user) return null;

  const sessioniConfermate = matches.filter((m) => m.confermaHelper && m.confermaSeeker);
  const { label: levelLabel, Icon: LevelIcon, iconColor: levelIconColor, next: nextLevel, nextPts } = levelInfo(user.punti);
  const progress = nextPts > 0 ? Math.min((user.punti / nextPts) * 100, 100) : 100;

  const unlockedTier = [...DISCOUNT_TIERS].reverse().find((t) => user.punti >= t.pts);

  return (
    <div className="page-root bg-gray-50">
      {/* Logout modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full text-center">
            <p className="text-lg font-bold text-gray-800 mb-2">Esci da StudyMatch?</p>
            <p className="text-gray-500 text-sm mb-6">Dovrai registrarti di nuovo per accedere.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={async () => { await clearCurrentUser(); router.replace('/'); }}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600"
              >
                Esci
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-3xl p-6 mb-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-5">
            <label className="relative cursor-pointer shrink-0 group">
              <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg">
                {user.foto
                  ? <img src={user.foto} className="w-full h-full object-cover" alt="" />
                  : <Avatar user={user} className="w-full h-full" textClassName="text-2xl font-bold" />
                }
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-white">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <input ref={fotoInputRef} type="file" accept="image/*" className="sr-only" onChange={handleFotoChange} />
            </label>
            <div>
              <h1 className="text-2xl font-black">{user.nome} {user.cognome}</h1>
              <p className="text-violet-200 text-sm">@{user.username}</p>
              <p className="text-violet-200 text-sm mt-0.5">{user.universita}</p>
              {user.facolta && <p className="text-violet-300 text-xs">{user.facolta}</p>}
            </div>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="text-violet-200 hover:text-white text-sm transition-colors shrink-0"
          >
            Esci
          </button>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT column */}
          <div className="space-y-6">
            {/* Points card */}
            <div className="bg-white rounded-3xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Punti UniversityBOX</p>
                  <p className="text-5xl font-black text-violet-600 mt-1">{user.punti}</p>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mt-1">
                    <LevelIcon className={`w-4 h-4 ${levelIconColor}`} strokeWidth={2.25} />
                    {levelLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Sessioni</p>
                  <p className="text-5xl font-black text-violet-600 mt-1">{sessioniConfermate.length}</p>
                  <p className="text-xs text-gray-400 mt-1">confermate</p>
                </div>
              </div>
              {nextLevel && (
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>Verso {nextLevel}</span>
                    <span>{Math.min(user.punti, nextPts)}/{nextPts} pt</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-violet-700 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Skills card */}
            <div className="bg-white rounded-3xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-800">Le mie materie</h2>
                <button
                  onClick={() => setEditing(!editing)}
                  className="text-xs text-violet-600 font-semibold hover:text-violet-800"
                >
                  {editing ? 'Annulla' : 'Modifica'}
                </button>
              </div>

              {editing ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
                      <Sparkles className="w-3 h-3 text-emerald-500" strokeWidth={2.5} />
                      Posso aiutare in
                    </p>
                    <TagInput tags={puoAiutareIn} onChange={setPuoAiutareIn} placeholder="Aggiungi materia..." />
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
                      <Search className="w-3 h-3 text-rose-500" strokeWidth={2.5} />
                      Cerco aiuto in
                    </p>
                    <TagInput tags={cercaAiutoIn} onChange={setCercaAiutoIn} placeholder="Aggiungi materia..." />
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
                      <Link2 className="w-3 h-3" strokeWidth={2.5} />
                      LinkedIn
                    </p>
                    <input
                      type="url"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      placeholder="https://linkedin.com/in/tuousername"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-violet-600 text-white font-semibold rounded-xl text-sm hover:bg-violet-700 transition-colors">
                    Salva
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      <Sparkles className="w-3 h-3 text-emerald-500" strokeWidth={2.5} />
                      Posso aiutare in
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {user.puoAiutareIn.length === 0
                        ? <span className="text-xs text-gray-400">Nessuna materia</span>
                        : user.puoAiutareIn.map((s) => (
                          <span key={s} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">{s}</span>
                        ))}
                    </div>
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      <Search className="w-3 h-3 text-rose-500" strokeWidth={2.5} />
                      Cerco aiuto in
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {user.cercaAiutoIn.length === 0
                        ? <span className="text-xs text-gray-400">Nessuna materia</span>
                        : user.cercaAiutoIn.map((s) => (
                          <span key={s} className="text-xs bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full font-medium">{s}</span>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Session history */}
            {sessioniConfermate.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm p-6">
                <h2 className="font-bold text-gray-800 mb-4">Storico sessioni</h2>
                <div className="space-y-2">
                  {sessioniConfermate.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" strokeWidth={2.25} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Sessione completata</p>
                        <p className="text-xs text-gray-400">
                          {m.helperId === user.id ? '+50 punti guadagnati' : 'Hai ricevuto aiuto'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT column */}
          <div className="space-y-6">
            {/* UniversityBOX coupon */}
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-violet-600 to-violet-800 px-6 py-4 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5 text-white" strokeWidth={2} />
                </span>
                <div>
                  <p className="font-bold text-white">UniversityBOX</p>
                  <p className="text-violet-200 text-xs">I tuoi punti si convertono in sconti reali</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {DISCOUNT_TIERS.map((tier) => {
                  const unlocked = user.punti >= tier.pts;
                  const isHighest = unlockedTier?.pts === tier.pts;
                  return (
                    <div
                      key={tier.pts}
                      className={`flex items-center gap-4 p-3 rounded-2xl border-2 transition-all ${
                        isHighest
                          ? 'border-violet-400 bg-violet-50'
                          : unlocked
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-dashed border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        unlocked ? 'bg-white shadow-sm text-violet-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {unlocked
                          ? <Ticket className="w-5 h-5" strokeWidth={2} />
                          : <Lock className="w-4 h-4" strokeWidth={2.25} />}
                      </div>
                      <div className="flex-1">
                        <p className={`font-bold text-sm ${unlocked ? 'text-gray-800' : 'text-gray-400'}`}>
                          {tier.label}
                        </p>
                        <p className={`text-xs ${unlocked ? 'text-gray-500' : 'text-gray-400'}`}>
                          {tier.pts} punti richiesti
                        </p>
                      </div>
                      {isHighest && (
                        <span className="text-xs font-bold bg-violet-600 text-white px-2.5 py-1 rounded-full shrink-0">
                          Attivo
                        </span>
                      )}
                      {!unlocked && (
                        <span className="text-xs text-gray-400 font-medium shrink-0">
                          -{tier.pts - user.punti} pt
                        </span>
                      )}
                    </div>
                  );
                })}
                {unlockedTier && (
                  <div className="mt-3 p-3 bg-violet-600 rounded-2xl text-center">
                    <p className="text-white font-bold text-sm">Hai sbloccato il {unlockedTier.pct}% di sconto!</p>
                    <p className="text-violet-200 text-xs mt-1">Mostra questo schermo su UniversityBOX per riscattarlo</p>
                  </div>
                )}
                {!unlockedTier && (
                  <p className="text-center text-xs text-gray-400 mt-2">
                    Hai bisogno di {50 - user.punti} punti per sbloccare il primo sconto
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
