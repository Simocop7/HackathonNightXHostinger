'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Scale, LogOut, Star, Building2, User, Link2, Shield,
  Loader2, ChevronRight, CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { getCurrentUser, updateProfilo, uploadAvatar, clearCurrentUser } from '../_lib/db';
import type { Profilo } from '../_lib/types';
import Avatar from '../_components/Avatar';

export default function ProfiloPage() {
  const router = useRouter();
  const [user, setUser]       = useState<Profilo | null>(null);
  const [ready, setReady]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  // Editing state
  const [editBio, setEditBio]         = useState('');
  const [editLinkedin, setEditLinkedin] = useState('');
  const [isEditing, setIsEditing]     = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace('/'); return; }
      setUser(u);
      setEditBio(u.biografia ?? '');
      setEditLinkedin(u.linkedin ?? '');
      setReady(true);
    })();
  }, [router]);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setFotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    let fotoUrl = user.foto;
    if (fotoFile) {
      try { fotoUrl = await uploadAvatar(user.id, fotoFile); } catch { /* non bloccante */ }
    }
    await updateProfilo({
      ...user,
      biografia: editBio.trim(),
      linkedin:  editLinkedin.trim() || undefined,
      foto:      fotoUrl,
    });
    setUser({ ...user, biografia: editBio.trim(), linkedin: editLinkedin.trim() || undefined, foto: fotoUrl });
    setIsEditing(false);
    setSaving(false);
  };

  const handleLogout = async () => {
    await clearCurrentUser();
    router.replace('/');
  };

  if (!ready || !user) {
    return <div className="page-root flex items-center justify-center"><Loader2 className="w-8 h-8 text-violet-600 animate-spin" /></div>;
  }

  const previewUser = { ...user, foto: fotoPreview ?? user.foto };
  const isProf = user.ruolo === 'professionista';

  return (
    <div className="page-root bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* Header profilo */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-violet-600 to-violet-800 px-6 pt-8 pb-6 text-white">
            <div className="flex items-end gap-4">
              <label className="relative cursor-pointer group shrink-0">
                <Avatar user={previewUser} className="w-20 h-20 shadow-xl ring-4 ring-white/30" textClassName="text-2xl font-bold" />
                <div className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full flex items-center justify-center border-2 border-violet-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-violet-600">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleFotoChange} />
              </label>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold leading-tight">{user.nome} {user.cognome}</h1>
                <p className="text-violet-200 text-sm">@{user.username}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {isProf && user.qualifica && (
                    <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">{user.qualifica}</span>
                  )}
                  {!isProf && user.tipoCliente && (
                    <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                      {user.tipoCliente === 'azienda' ? <Building2 className="w-3 h-3" strokeWidth={2} /> : <User className="w-3 h-3" strokeWidth={2} />}
                      {user.tipoCliente === 'azienda' ? (user.ragioneSociale ?? 'Azienda') : 'Privato'}
                    </span>
                  )}
                  {!isProf && user.subscriptionTier && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
                      user.subscriptionTier === 'enterprise' ? 'bg-purple-400/30 text-purple-100'
                      : user.subscriptionTier === 'max' ? 'bg-amber-400/30 text-amber-100'
                      : 'bg-white/10 text-violet-200'
                    }`}>
                      <Star className="w-3 h-3" strokeWidth={2} />
                      {user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1)}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowLogout(true)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors shrink-0"
                title="Logout"
              >
                <LogOut className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Bio + LinkedIn */}
          <div className="px-6 py-5">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Biografia</label>
                  <textarea value={editBio} onChange={(e) => setEditBio(e.target.value.slice(0, 400))}
                    rows={3} placeholder="Descrivi brevemente il tuo profilo…"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 resize-none" />
                  <p className="text-right text-xs text-gray-400">{editBio.length}/400</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">LinkedIn</label>
                  <input type="url" value={editLinkedin} onChange={(e) => setEditLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/tuoprofilo"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-60">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" strokeWidth={2} />}
                    {saving ? 'Salvataggio…' : 'Salva'}
                  </button>
                  <button onClick={() => { setIsEditing(false); setFotoFile(null); setFotoPreview(undefined); }}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {user.biografia
                  ? <p className="text-sm text-gray-600 leading-relaxed">{user.biografia}</p>
                  : <p className="text-sm text-gray-400 italic">Nessuna biografia impostata.</p>}
                {user.linkedin && (
                  <a href={user.linkedin} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs text-violet-600 hover:underline font-medium">
                    <Link2 className="w-3.5 h-3.5" strokeWidth={2} />
                    LinkedIn
                  </a>
                )}
                <button onClick={() => setIsEditing(true)}
                  className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  Modifica profilo <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info fiscali (solo clienti) */}
        {!isProf && (user.partitaIva || user.codiceFiscale || user.ragioneSociale) && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-500" strokeWidth={2} />
              Dati fiscali
            </h2>
            <dl className="space-y-2">
              {user.ragioneSociale && (
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-400">Ragione Sociale</dt>
                  <dd className="text-gray-700 font-medium">{user.ragioneSociale}</dd>
                </div>
              )}
              {user.partitaIva && (
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-400">Partita IVA</dt>
                  <dd className="text-gray-700 font-medium">{user.partitaIva}</dd>
                </div>
              )}
              {user.codiceFiscale && (
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-400">Codice Fiscale</dt>
                  <dd className="text-gray-700 font-medium">{user.codiceFiscale}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Credenziali professionali (solo professionisti) */}
        {isProf && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4 text-violet-500" strokeWidth={2} />
              Credenziali professionali
            </h2>
            <dl className="space-y-2 mb-4">
              {user.qualifica && (
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-400">Qualifica</dt>
                  <dd className="text-gray-700 font-medium">{user.qualifica}</dd>
                </div>
              )}
              {user.ordineProfessionale && (
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-400">Ordine</dt>
                  <dd className="text-gray-700 font-medium">{user.ordineProfessionale}</dd>
                </div>
              )}
            </dl>
            {user.areeLegali.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Aree di competenza</p>
                <div className="flex flex-wrap gap-2">
                  {user.areeLegali.map((a) => (
                    <span key={a} className="text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-full font-medium">{a}</span>
                  ))}
                </div>
              </>
            )}
            <div className="mt-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={2} />
              <p className="text-xs text-emerald-600 font-medium">
                {user.punti} punti accumulati
              </p>
            </div>
          </div>
        )}

        {/* Piano abbonamento (solo clienti) */}
        {!isProf && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" strokeWidth={2} />
              Subscription plan
            </h2>
            <div className={`rounded-xl p-4 flex items-center justify-between ${
              user.subscriptionTier === 'enterprise' ? 'bg-purple-50 border border-purple-200'
              : user.subscriptionTier === 'max' ? 'bg-amber-50 border border-amber-200'
              : 'bg-gray-50 border border-gray-200'
            }`}>
              <div>
                <p className={`font-bold text-sm ${
                  user.subscriptionTier === 'enterprise' ? 'text-purple-700'
                  : user.subscriptionTier === 'max' ? 'text-amber-700'
                  : 'text-gray-700'
                }`}>
                  {user.subscriptionTier === 'enterprise' ? '⭐ Enterprise Plan'
                    : user.subscriptionTier === 'max' ? '⭐ Max Plan'
                    : 'Pro Plan'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {user.subscriptionTier === 'enterprise' ? '50 tickets per 24h'
                    : user.subscriptionTier === 'max' ? '10 tickets per 24h'
                    : '3 tickets per 24h'}
                </p>
              </div>
              {user.subscriptionTier !== 'enterprise' && (
                <Link href="/piani" className="text-xs font-semibold text-violet-600 hover:text-violet-700 hover:underline transition-colors">
                  Upgrade plan →
                </Link>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Modal logout */}
      {showLogout && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setShowLogout(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Esci da LegalMatch?</h3>
            <p className="text-sm text-gray-500 mb-5">Verrai reindirizzato alla pagina di login.</p>
            <div className="flex gap-3">
              <button onClick={handleLogout}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-semibold transition-colors">
                Esci
              </button>
              <button onClick={() => setShowLogout(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors">
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
