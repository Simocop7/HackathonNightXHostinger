'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Search, MessageSquareText, Building2, BookMarked, ArrowRight } from 'lucide-react';
import { getCurrentUser, updateUser, uploadAvatar } from '../_lib/db';
import TagInput from '../_components/TagInput';
import Avatar from '../_components/Avatar';
import { Utente } from '../_lib/types';

export default function SetupPage() {
  const router = useRouter();
  const [baseUser, setBaseUser] = useState<Utente | null>(null);
  const [facolta, setFacolta] = useState('');
  const [cercaAiutoIn, setCercaAiutoIn] = useState<string[]>([]);
  const [puoAiutareIn, setPuoAiutareIn] = useState<string[]>([]);
  const [biografia, setBiografia] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [foto, setFoto] = useState<string | undefined>();
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace('/'); return; }
        if (user.profiloCompleto) { router.replace('/aiuta'); return; }
        setBaseUser(user);
      } catch {
        router.replace('/');
        return;
      }
      setReady(true);
    })();
  }, [router]);

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    // Mostra preview locale immediata
    const reader = new FileReader();
    reader.onload = (ev) => setFoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!facolta.trim()) { setError('Inserisci la tua facoltà.'); return; }
    if (puoAiutareIn.length === 0) { setError('Aggiungi almeno una materia in cui puoi aiutare.'); return; }

    setSubmitting(true);
    setError('');

    const user = await getCurrentUser();
    if (!user) { router.replace('/'); return; }

    let fotoUrl = user.foto;
    if (fotoFile) {
      try {
        fotoUrl = await uploadAvatar(user.id, fotoFile);
      } catch {
        // foto upload non bloccante
      }
    }

    await updateUser({
      ...user,
      facolta: facolta.trim(),
      cercaAiutoIn,
      puoAiutareIn,
      biografia: biografia.trim(),
      foto: fotoUrl,
      linkedin: linkedin.trim() || undefined,
      profiloCompleto: true,
    });
    router.push('/aiuta');
  };

  if (!ready || !baseUser) return null;

  const preview: Utente = {
    ...baseUser,
    facolta: facolta || 'La tua facoltà',
    cercaAiutoIn,
    puoAiutareIn,
    biografia,
    foto,
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT — form */}
        <div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Completa il profilo</h1>
            <p className="text-gray-500 text-sm mt-1">
              Dicci in cosa sei forte e cosa vuoi imparare
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Foto */}
              <div className="flex items-center gap-4">
                <label className="relative cursor-pointer group shrink-0">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-violet-100 flex items-center justify-center shadow">
                    {foto
                      ? <img src={foto} className="w-full h-full object-cover" alt="" />
                      : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 text-violet-400">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                    }
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center border-2 border-white">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 text-white">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <input type="file" accept="image/*" className="sr-only" onChange={handleFotoChange} />
                </label>
                <div>
                  <p className="text-sm font-medium text-gray-700">Foto profilo</p>
                  <p className="text-xs text-gray-400">{foto ? 'Clicca per cambiare' : 'Opzionale'}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Facoltà / Corso di laurea *</label>
                <input
                  type="text"
                  value={facolta}
                  onChange={(e) => setFacolta(e.target.value)}
                  placeholder="es. Ingegneria Informatica"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} />
                  In cosa puoi aiutare? *
                </label>
                <TagInput tags={puoAiutareIn} onChange={setPuoAiutareIn} placeholder="es. Python, Storia dell'Arte..." />
                <p className="text-xs text-gray-400 mt-1">Le richieste di aiuto che vedi saranno basate su queste materie</p>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
                  <Search className="w-3.5 h-3.5 text-rose-500" strokeWidth={2.5} />
                  In cosa cerchi aiuto? <span className="font-normal text-gray-400">(opzionale)</span>
                </label>
                <TagInput tags={cercaAiutoIn} onChange={setCercaAiutoIn} placeholder="es. Analisi 2, Fisica..." />
                <p className="text-xs text-gray-400 mt-1">Usato per pre-compilare le tue richieste future</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Bio <span className="font-normal text-gray-400">(opzionale)</span>
                </label>
                <textarea
                  value={biografia}
                  onChange={(e) => setBiografia(e.target.value.slice(0, 300))}
                  placeholder="Presentati in poche parole..."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 resize-none"
                />
                <p className="text-right text-xs text-gray-400 mt-1">{biografia.length}/300</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  LinkedIn <span className="font-normal text-gray-400">(opzionale)</span>
                </label>
                <input
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/tuoprofilo"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
                />
              </div>

              {error && <p className="text-rose-500 text-xs text-center">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-violet-800 text-white font-semibold rounded-xl shadow-md hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? 'Salvataggio…' : 'Inizia'}
                {!submitting && <ArrowRight className="w-4 h-4" strokeWidth={2.5} />}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT — live preview */}
        <div className="hidden lg:block">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Anteprima profilo</h2>
            <p className="text-xs text-gray-400 mt-1">Così ti vedranno gli altri studenti</p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-violet-50 to-violet-100 flex flex-col items-center py-8 px-4">
              <Avatar user={preview} className="w-20 h-20 shadow-lg" textClassName="text-2xl font-bold" />
              <h3 className="mt-3 text-lg font-bold text-gray-800">
                {preview.nome} {preview.cognome}
              </h3>
              <p className="text-sm text-gray-500">@{preview.username}</p>
              <div className="mt-2 flex flex-wrap gap-2 justify-center">
                <span className="inline-flex items-center gap-1 text-xs bg-white px-2.5 py-1 rounded-full text-gray-600 shadow-sm">
                  <Building2 className="w-3 h-3" strokeWidth={2.25} />
                  {preview.universita}
                </span>
                {facolta && (
                  <span className="inline-flex items-center gap-1 text-xs bg-white px-2.5 py-1 rounded-full text-gray-600 shadow-sm">
                    <BookMarked className="w-3 h-3" strokeWidth={2.25} />
                    {facolta}
                  </span>
                )}
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              {puoAiutareIn.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    <Sparkles className="w-3 h-3 text-emerald-500" strokeWidth={2.5} />
                    Può aiutare in
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {puoAiutareIn.map((s) => (
                      <span key={s} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {cercaAiutoIn.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    <Search className="w-3 h-3 text-rose-500" strokeWidth={2.5} />
                    Cerca aiuto in
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cercaAiutoIn.map((s) => (
                      <span key={s} className="text-xs bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {biografia && (
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    <MessageSquareText className="w-3 h-3" strokeWidth={2.5} />
                    Bio
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">{biografia}</p>
                </div>
              )}

              {!puoAiutareIn.length && !cercaAiutoIn.length && !biografia && (
                <p className="text-sm text-gray-400 text-center py-4">Compila il form per vedere l&apos;anteprima</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
