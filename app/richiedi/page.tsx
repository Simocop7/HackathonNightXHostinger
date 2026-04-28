'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Calendar, CalendarDays, Lightbulb, Hourglass, ArrowRight } from 'lucide-react';
import {
  getCurrentUser,
  getRichiestaAttiva,
  createRichiesta,
  chiudiRichiesta,
} from '../_lib/db';
import { RichiestaAiuto, Utente } from '../_lib/types';

const SCADENZA_OPTIONS = [
  { value: 'oggi', label: 'Oggi', color: 'text-rose-600', active: 'bg-rose-500 text-white', inactive: 'bg-white text-rose-600 border border-rose-200' },
  { value: 'domani', label: 'Domani', color: 'text-amber-600', active: 'bg-amber-500 text-white', inactive: 'bg-white text-amber-600 border border-amber-200' },
  { value: 'settimana', label: 'Questa settimana', color: 'text-blue-600', active: 'bg-blue-500 text-white', inactive: 'bg-white text-blue-600 border border-blue-200' },
] as const;

export default function RichiediPage() {
  const router = useRouter();
  const [user, setUser] = useState<Utente | null>(null);
  const [richiesta, setRichiesta] = useState<RichiestaAiuto | undefined>(undefined);
  const [materia, setMateria] = useState('');
  const [materiaCustom, setMateriaCustom] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [scadenza, setScadenza] = useState<'oggi' | 'domani' | 'settimana' | undefined>(undefined);
  const [toast, setToast] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace('/'); return; }
      if (!u.profiloCompleto) { router.replace('/setup'); return; }
      setUser(u);
      setRichiesta(await getRichiestaAttiva(u.id));
      setReady(true);
    })();
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const finalMateria = materia === '__custom__' ? materiaCustom.trim() : materia;
    if (!finalMateria) { return; }
    if (!descrizione.trim()) { return; }
    await createRichiesta(user.id, finalMateria, descrizione.trim(), scadenza);
    setRichiesta(await getRichiestaAttiva(user.id));
    setMateria('');
    setMateriaCustom('');
    setDescrizione('');
    setScadenza(undefined);
    setToast('Richiesta pubblicata! Gli helper nelle tue materie la vedranno subito.');
    setTimeout(() => setToast(''), 4000);
  };

  const handleRemove = async () => {
    if (!richiesta) return;
    await chiudiRichiesta(richiesta.id);
    setRichiesta(undefined);
  };

  if (!ready || !user) return null;

  const materiaOptions = user.cercaAiutoIn;
  const finalMateria = materia === '__custom__' ? materiaCustom.trim() : materia;
  const canSubmit = finalMateria.length > 0 && descrizione.trim().length > 0;

  return (
    <div className="page-root bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg font-semibold text-sm max-w-sm text-center">
          {toast}
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Richiedi aiuto</h1>
          <p className="text-gray-500 text-sm mt-1">
            Pubblica la tua richiesta — gli studenti con le competenze giuste la vedranno subito
          </p>
        </div>

        {/* Richiesta attiva */}
        {richiesta && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-violet-600 bg-violet-100 px-2.5 py-1 rounded-full">
                    Richiesta attiva
                  </span>
                  {richiesta.scadenza && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      {richiesta.scadenza === 'oggi' && <><Clock className="w-3 h-3" strokeWidth={2.25} /> Oggi</>}
                      {richiesta.scadenza === 'domani' && <><Calendar className="w-3 h-3" strokeWidth={2.25} /> Domani</>}
                      {richiesta.scadenza === 'settimana' && <><CalendarDays className="w-3 h-3" strokeWidth={2.25} /> Questa settimana</>}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-gray-800 text-sm">{richiesta.materia}</p>
                <p className="text-gray-600 text-sm mt-1 leading-relaxed">{richiesta.descrizione}</p>
              </div>
              <button
                onClick={handleRemove}
                className="shrink-0 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-rose-500 hover:border-rose-200 transition-colors"
                title="Rimuovi richiesta"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-4 h-4">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        {!richiesta && (
          <div className="bg-white rounded-3xl shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Materia */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Di cosa hai bisogno? *
                </label>
                {materiaOptions.length > 0 ? (
                  <select
                    value={materia}
                    onChange={(e) => setMateria(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
                    required
                  >
                    <option value="">Seleziona una materia</option>
                    {materiaOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    <option value="__custom__">Altra materia...</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={materia}
                    onChange={(e) => setMateria(e.target.value)}
                    placeholder="es. Analisi 2, Diritto Privato..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
                    required
                  />
                )}
                {materia === '__custom__' && (
                  <input
                    type="text"
                    value={materiaCustom}
                    onChange={(e) => setMateriaCustom(e.target.value)}
                    placeholder="Scrivi la materia..."
                    className="w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
                    required
                  />
                )}
              </div>

              {/* Descrizione */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Descrivi il problema *
                </label>
                <textarea
                  value={descrizione}
                  onChange={(e) => setDescrizione(e.target.value.slice(0, 200))}
                  placeholder="Cosa non riesci a capire? Più contesto dai, più è facile trovare aiuto."
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 resize-none"
                  required
                />
                <p className="text-right text-xs text-gray-400 mt-1">
                  {descrizione.length}/200
                </p>
              </div>

              {/* Scadenza */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Quando hai bisogno? <span className="font-normal text-gray-400">(opzionale)</span>
                </label>
                <div className="flex gap-2">
                  {SCADENZA_OPTIONS.map(({ value, label, active, inactive }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setScadenza(scadenza === value ? undefined : value)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        scadenza === value ? active : inactive
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-violet-800 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold rounded-xl shadow-md hover:opacity-90 disabled:opacity-100 transition-opacity text-sm"
              >
                Pubblica richiesta
              </button>
            </form>
          </div>
        )}

        {richiesta && (
          <div className="text-center py-8 text-gray-500">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 text-violet-600 mb-3">
              <Hourglass className="w-7 h-7" strokeWidth={1.75} />
            </div>
            <p className="font-medium text-gray-700">Richiesta pubblicata!</p>
            <p className="text-sm mt-1">Aspetta che qualcuno ti offra aiuto — lo vedrai nella sezione Match.</p>
            <button
              onClick={() => router.push('/match')}
              className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              Vai ai Match
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Info box */}
        <div className="mt-6 bg-violet-50 rounded-2xl p-4 flex gap-3 items-start">
          <Lightbulb className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-xs text-violet-700 leading-relaxed">
            Puoi avere <strong>una sola richiesta attiva</strong> alla volta. Puoi rimuoverla in qualsiasi momento.
            Chi ti aiuta guadagna punti UniversityBOX.
          </p>
        </div>
      </div>
    </div>
  );
}
