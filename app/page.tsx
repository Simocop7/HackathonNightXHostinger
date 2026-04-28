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
          <h1 className="text-4xl font-black mb-3 leading-tight">All In One Consulting</h1>
          <p className="text-xl text-violet-100 font-medium mb-2">
            All your business consultants,<br />in one platform.
          </p>
          <p className="text-violet-200 text-sm leading-relaxed mb-10">
            Open a ticket and get a response from a verified specialist
            across legal, tax, safety, finance, and tech — within 24 hours.
          </p>

          <div className="space-y-3 text-left">
            {[
              { Icon: Shield, title: 'Verified specialists',   sub: '14 consulting areas covered' },
              { Icon: Clock,  title: 'Response within 24h',    sub: 'Automatic assignment, no waiting' },
              { Icon: Scale,  title: 'Flexible plans',         sub: 'Pro, Max and Enterprise' },
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
          <h1 className="text-2xl font-bold text-violet-700 mt-2">All In One Consulting</h1>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-gray-500 text-sm mb-8">
            {mode === 'login'
              ? 'Sign in to manage your consulting tickets'
              : 'Start getting professional consulting support'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Ruolo (solo in registrazione) */}
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">I am a</label>
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
                        {r === 'cliente' ? '👤 Client' : '💼 Consultant'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">First name</label>
                    <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                      placeholder="John"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Last name</label>
                    <input type="text" value={cognome} onChange={(e) => setCognome(e.target.value)}
                      placeholder="Smith"
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
                placeholder="john@company.com"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50" />
            </div>

            {error && <p className="text-rose-500 text-xs text-center">{error}</p>}

            <button type="submit" disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-violet-800 text-white font-semibold rounded-xl shadow-md hover:opacity-90 transition-opacity text-sm mt-2 disabled:opacity-60"
            >
              {submitting
                ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
                : (mode === 'login' ? 'Sign in →' : 'Create account →')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-violet-600 font-semibold hover:underline"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
