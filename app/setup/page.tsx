'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, User, Scale } from 'lucide-react';
import { getCurrentUser, updateProfilo, uploadAvatar } from '../_lib/db';
import type { Profilo, TipoCliente, SubscriptionTier } from '../_lib/types';
import Avatar from '../_components/Avatar';

export default function SetupPage() {
  const router = useRouter();
  const [profilo, setProfilo] = useState<Profilo | null>(null);
  const [ready, setReady]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState('');

  // Campi comuni
  const [biografia, setBiografia] = useState('');
  const [linkedin, setLinkedin]   = useState('');
  const [foto, setFoto]           = useState<string | undefined>();
  const [fotoFile, setFotoFile]   = useState<File | null>(null);

  // Campi cliente
  const [tipoCliente, setTipoCliente]   = useState<TipoCliente>('privato');
  const [ragioneSociale, setRagioneSociale] = useState('');
  const [partitaIva, setPartitaIva]     = useState('');
  const [codiceFiscale, setCodiceFiscale] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('basic');

  // Campi professionista
  const [qualifica, setQualifica]             = useState('');
  const [ordineProfessionale, setOrdine]      = useState('');
  const [areeInput, setAreeInput]             = useState('');
  const [areeLegali, setAreeLegali]           = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        if (!u) { router.replace('/'); return; }
        if (u.profiloCompleto) { router.replace('/dashboard'); return; }
        setProfilo(u);
      } catch { router.replace('/'); return; }
      setReady(true);
    })();
  }, [router]);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setFoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const addArea = () => {
    const v = areeInput.trim();
    if (v && !areeLegali.includes(v)) setAreeLegali([...areeLegali, v]);
    setAreeInput('');
  };

  const removeArea = (a: string) => setAreeLegali(areeLegali.filter((x) => x !== a));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profilo) return;

    const isProf = profilo.ruolo === 'professionista';

    if (isProf) {
      if (!qualifica.trim()) { setError('Inserisci la tua qualifica.'); return; }
      if (!ordineProfessionale.trim()) { setError("Inserisci l'ordine professionale."); return; }
      if (areeLegali.length === 0) { setError('Aggiungi almeno un\'area legale di competenza.'); return; }
    } else {
      if (tipoCliente === 'azienda' && !ragioneSociale.trim()) {
        setError('Inserisci la ragione sociale.'); return;
      }
    }

    setSubmitting(true);
    setError('');

    let fotoUrl = profilo.foto;
    if (fotoFile) {
      try { fotoUrl = await uploadAvatar(profilo.id, fotoFile); } catch { /* non bloccante */ }
    }

    await updateProfilo({
      ...profilo,
      biografia:           biografia.trim(),
      foto:                fotoUrl,
      linkedin:            linkedin.trim() || undefined,
      profiloCompleto:     true,
      // Clienti
      tipoCliente:         isProf ? undefined : tipoCliente,
      ragioneSociale:      isProf || tipoCliente !== 'azienda' ? undefined : ragioneSociale.trim() || undefined,
      partitaIva:          isProf || tipoCliente !== 'azienda' ? undefined : partitaIva.trim()     || undefined,
      codiceFiscale:       isProf || tipoCliente !== 'privato' ? undefined : codiceFiscale.trim()  || undefined,
      subscriptionTier:    isProf ? undefined : subscriptionTier,
      // Professionisti
      qualifica:           isProf ? qualifica.trim() : undefined,
      ordineProfessionale: isProf ? ordineProfessionale.trim() : undefined,
      areeLegali:          isProf ? areeLegali : [],
    });

    router.push('/dashboard');
  };

  if (!ready || !profilo) return null;

  const isProf = profilo.ruolo === 'professionista';
  const previewUser = { ...profilo, foto };

  return (
    <main className="min-h-screen bg-gray-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">

        {/* LEFT — form */}
        <div>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Scale className="w-5 h-5 text-violet-600" strokeWidth={2} />
              <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">LegalMatch</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isProf ? 'Completa il profilo professionale' : 'Completa il tuo profilo'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {isProf
                ? 'Inserisci le tue credenziali professionali per iniziare a gestire i ticket'
                : 'Inserisci i dati per iniziare a ricevere consulenza legale'}
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Foto profilo */}
              <div className="flex items-center gap-4">
                <label className="relative cursor-pointer group shrink-0">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-violet-100 flex items-center justify-center shadow">
                    {foto
                      ? <img src={foto} className="w-full h-full object-cover" alt="" />
                      : <User className="w-7 h-7 text-violet-400" strokeWidth={1.5} />}
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

              {/* ── SEZIONE CLIENTE ─────────────────────────────────────── */}
              {!isProf && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Tipo di cliente</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'privato' as TipoCliente, label: 'Persona fisica', Icon: User },
                        { value: 'azienda' as TipoCliente, label: 'Azienda / Studio', Icon: Building2 },
                      ].map(({ value, label, Icon }) => (
                        <button key={value} type="button" onClick={() => setTipoCliente(value)}
                          className={`flex items-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                            tipoCliente === value
                              ? 'border-violet-600 bg-violet-50 text-violet-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" strokeWidth={2} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {tipoCliente === 'azienda' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Ragione Sociale *</label>
                        <input type="text" value={ragioneSociale} onChange={(e) => setRagioneSociale(e.target.value)}
                          placeholder="es. Acme Srl"
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Partita IVA <span className="font-normal text-gray-400">(opzionale)</span>
                        </label>
                        <input type="text" value={partitaIva} onChange={(e) => setPartitaIva(e.target.value)}
                          placeholder="12345678901"
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50" />
                      </div>
                    </>
                  )}

                  {tipoCliente === 'privato' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Codice Fiscale <span className="font-normal text-gray-400">(opzionale)</span>
                      </label>
                      <input type="text" value={codiceFiscale} onChange={(e) => setCodiceFiscale(e.target.value)}
                        placeholder="RSSMRA80A01H501Z"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50" />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Piano di abbonamento</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'basic'   as SubscriptionTier, label: 'Basic',   sub: '1 ticket / giorno' },
                        { value: 'premium' as SubscriptionTier, label: 'Premium', sub: '5 ticket / giorno' },
                      ].map(({ value, label, sub }) => (
                        <button key={value} type="button" onClick={() => setSubscriptionTier(value)}
                          className={`py-3 px-4 rounded-xl border-2 text-sm transition-all text-left ${
                            subscriptionTier === value
                              ? 'border-violet-600 bg-violet-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <p className={`font-semibold ${subscriptionTier === value ? 'text-violet-700' : 'text-gray-700'}`}>{label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── SEZIONE PROFESSIONISTA ──────────────────────────────── */}
              {isProf && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Qualifica *</label>
                    <select value={qualifica} onChange={(e) => setQualifica(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50">
                      <option value="">Seleziona qualifica</option>
                      <option>Avvocato</option>
                      <option>Notaio</option>
                      <option>Commercialista</option>
                      <option>Consulente del Lavoro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Ordine professionale *</label>
                    <input type="text" value={ordineProfessionale} onChange={(e) => setOrdine(e.target.value)}
                      placeholder="es. Ordine degli Avvocati di Milano"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Aree legali di competenza *</label>
                    <div className="flex gap-2 mb-2">
                      <select value={areeInput} onChange={(e) => setAreeInput(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50">
                        <option value="">Seleziona area…</option>
                        {['Diritto del Lavoro','Diritto Civile','Diritto Commerciale','Diritto Penale',
                          'Diritto Tributario / Fiscale','Diritto di Famiglia','Diritto Societario',
                          'Contrattualistica','Privacy / GDPR','Diritto Immobiliare','Proprietà Intellettuale',
                        ].map((a) => <option key={a}>{a}</option>)}
                      </select>
                      <button type="button" onClick={addArea}
                        className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
                        +
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {areeLegali.map((a) => (
                        <span key={a} className="inline-flex items-center gap-1.5 bg-violet-100 text-violet-700 px-3 py-1.5 rounded-full text-xs font-medium">
                          {a}
                          <button type="button" onClick={() => removeArea(a)} className="hover:text-violet-900 font-bold">×</button>
                        </span>
                      ))}
                      {areeLegali.length === 0 && (
                        <p className="text-xs text-gray-400">Nessuna area aggiunta</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ── CAMPI COMUNI ─────────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Biografia <span className="font-normal text-gray-400">(opzionale)</span>
                </label>
                <textarea value={biografia} onChange={(e) => setBiografia(e.target.value.slice(0, 400))}
                  placeholder={isProf
                    ? "Descrivi la tua esperienza professionale…"
                    : "Descrivi brevemente la tua situazione o il tipo di assistenza che cerchi…"}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 resize-none" />
                <p className="text-right text-xs text-gray-400 mt-1">{biografia.length}/400</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  LinkedIn <span className="font-normal text-gray-400">(opzionale)</span>
                </label>
                <input type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/tuoprofilo"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50" />
              </div>

              {error && <p className="text-rose-500 text-xs text-center">{error}</p>}

              <button type="submit" disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-violet-800 text-white font-semibold rounded-xl shadow-md hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? 'Salvataggio…' : 'Inizia →'}
                {!submitting && <ArrowRight className="w-4 h-4" strokeWidth={2.5} />}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT — preview */}
        <div className="hidden lg:block">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Anteprima profilo</p>
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden sticky top-8">
            <div className="bg-gradient-to-br from-violet-50 to-violet-100 flex flex-col items-center py-8 px-4">
              <Avatar user={previewUser} className="w-20 h-20 shadow-lg" textClassName="text-2xl font-bold" />
              <h3 className="mt-3 text-lg font-bold text-gray-800">{profilo.nome} {profilo.cognome}</h3>
              <p className="text-sm text-gray-500">@{profilo.username}</p>
              {isProf && qualifica && (
                <span className="mt-2 text-xs bg-violet-600 text-white px-3 py-1 rounded-full font-medium">{qualifica}</span>
              )}
              {!isProf && (
                <span className={`mt-2 text-xs px-3 py-1 rounded-full font-medium ${
                  tipoCliente === 'azienda' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {tipoCliente === 'azienda' ? '🏢 Azienda' : '👤 Privato'}
                </span>
              )}
            </div>

            <div className="px-5 py-4 space-y-3 text-sm">
              {!isProf && subscriptionTier && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-xs">Piano</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    subscriptionTier === 'premium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {subscriptionTier === 'premium' ? '⭐ Premium' : 'Basic'}
                  </span>
                </div>
              )}
              {isProf && areeLegali.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Competenze</p>
                  <div className="flex flex-wrap gap-1.5">
                    {areeLegali.map((a) => (
                      <span key={a} className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {biografia && (
                <p className="text-xs text-gray-500 leading-relaxed pt-1">{biografia}</p>
              )}
              {!isProf && !areeLegali.length && !biografia && (
                <p className="text-xs text-gray-400 text-center py-2">Compila il form per vedere l&apos;anteprima</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
