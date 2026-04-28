'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, Shield, Clock } from 'lucide-react';
import { getCurrentUser, signUp, signIn, initSeedIfNeeded } from './_lib/db';
import type { RuoloUtente } from './_lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode]       = useState<'login' | 'register'>('login');
  const [ruolo, setRuolo]     = useState<RuoloUtente>('cliente');
  const [nome, setNome]       = useState('');
  const [cognome, setCognome] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    (async () => {
      try {
        await initSeedIfNeeded();
        const user = await getCurrentUser();
        if (user) {
          router.replace(user.profiloCompleto ? '/dashboard' : '/setup');
          return;
        }
      } catch { /* mostra form */ }
      setLoading(false);
    })();
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'login') {
      if (!email.trim() || !password.trim()) { setError('Compila email e password.'); return; }
      setSubmitting(true);
      const { user, error: err } = await signIn(email.trim().toLowerCase(), password);
      if (err || !user) { setError(err ?? 'Credenziali non valide.'); setSubmitting(false); return; }
      router.push(user.profiloCompleto ? '/dashboard' : '/setup');
      return;
    }

    if (!nome.trim() || !cognome.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setError('Compila tutti i campi.'); return;
    }
    if (password.length < 6) { setError('La password deve essere di almeno 6 caratteri.'); return; }

    setSubmitting(true);
    const { error: err } = await signUp(email.trim().toLowerCase(), password, {
      nome:    nome.trim(),
      cognome: cognome.trim(),
      username: username.trim().toLowerCase(),
      ruolo,
    });
    if (err) { setError(err); setSubmitting(false); return; }
    router.push('/setup');
  };

  if (loading) return null;

  return (
    <main className="min-h-screen flex">

      {/* LEFT — hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 to-violet-900 flex-col items-center justify-center p-12 text-white">
        <div className="max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-3xl mb-6">
            <Scale className="w-10 h-10 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-4xl font-black mb-3 leading-tight">LegalMatch</h1>
          <p className="text-xl text-violet-100 font-medium mb-2">
            Consulenza legale professionale,<br />semplice e veloce.
          </p>
          <p className="text-violet-200 text-sm leading-relaxed mb-10">
            Apri un ticket legale e ricevi una risposta da un avvocato o notaio
            specializzato entro 24 ore.
          </p>

          <div className="space-y-3 text-left">
            {[
              { Icon: Shield, title: 'Professionisti verificati', sub: 'Avvocati e notai iscritti all\'albo' },
              { Icon: Clock,  title: 'Risposta in 24 ore',        sub: 'Assegnazione automatica immediata' },
              { Icon: Scale,  title: 'Piani flessibili',          sub: 'Basic e Premium per ogni esigenza' },
            ].map(({ Icon, title, sub }) => (
              <div key={title} className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3">
                <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                </span>
                <div>
                  <p className="font-bold text-white text-sm">{title}</p>
                  <p className="text-xs text-violet-200">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600">
            <Scale className="w-7 h-7 text-white" strokeWidth={2.25} />
          </span>
          <h1 className="text-2xl font-bold text-violet-700 mt-2">LegalMatch</h1>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            {mode === 'login' ? 'Bentornato' : 'Crea il tuo account'}
          </h2>
          <p className="text-gray-500 text-sm mb-8">
            {mode === 'login'
              ? 'Accedi per gestire i tuoi ticket legali'
              : 'Inizia a ricevere consulenza legale professionale'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Ruolo (solo in registrazione) */}
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Sei un</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['cliente', 'professionista'] as RuoloUtente[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRuolo(r)}
                        className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                          ruolo === r
                            ? 'border-violet-600 bg-violet-50 text-violet-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {r === 'cliente' ? '👤 Cliente' : '⚖️ Professionista'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Nome</label>
                    <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                      placeholder="Mario"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Cognome</label>
                    <input type="text" value={cognome} onChange={(e) => setCognome(e.target.value)}
                      placeholder="Rossi"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                      placeholder="marioros"
                      className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50" />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="mario@esempio.com"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caratteri"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50" />
            </div>

            {error && <p className="text-rose-500 text-xs text-center">{error}</p>}

            <button type="submit" disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-violet-800 text-white font-semibold rounded-xl shadow-md hover:opacity-90 transition-opacity text-sm mt-2 disabled:opacity-60"
            >
              {submitting
                ? (mode === 'login' ? 'Accesso…' : 'Creazione account…')
                : (mode === 'login' ? 'Accedi →' : 'Crea account →')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {mode === 'login' ? 'Non hai un account?' : 'Hai già un account?'}{' '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-violet-600 font-semibold hover:underline"
            >
              {mode === 'login' ? 'Registrati' : 'Accedi'}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
