'use client';
import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Utente } from '../_lib/types';
import Avatar from './Avatar';

interface Props {
  user: Utente;
  onClose: () => void;
}

export default function UserProfileModal({ user, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-profile-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors z-10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-4 h-4 text-gray-500">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Header gradient */}
        <div className="bg-gradient-to-br from-violet-50 to-violet-100 px-6 pt-6 pb-5">
          <div className="flex items-center gap-4">
            <Avatar user={user} className="w-16 h-16 ring-4 ring-white shadow-md" textClassName="text-2xl font-bold" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-800 leading-tight">
                {user.nome} {user.cognome}
              </h2>
              <p className="text-sm text-gray-500">@{user.username}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" strokeWidth={2.5} />
                  {user.punti} pt
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-0.5">
            <p className="text-xs text-gray-600 font-medium">{user.universita}</p>
            <p className="text-xs text-gray-400">{user.facolta}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[55vh] overflow-y-auto">
          {/* Bio */}
          {user.biografia && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Bio</p>
              <p className="text-sm text-gray-700 leading-relaxed">{user.biografia}</p>
            </div>
          )}

          {/* Cerca aiuto in */}
          {user.cercaAiutoIn.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Cerca aiuto in
              </p>
              <div className="flex flex-wrap gap-1.5">
                {user.cercaAiutoIn.map((s) => (
                  <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium border border-blue-100">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Può aiutare in */}
          {user.puoAiutareIn.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Può aiutare in
              </p>
              <div className="flex flex-wrap gap-1.5">
                {user.puoAiutareIn.map((s) => (
                  <span key={s} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium border border-emerald-100">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* LinkedIn */}
          {user.linkedin && (
            <div>
              <a
                href={user.linkedin}
                target="_blank"
                rel="noopener noreferrer"
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

        {/* Bottom padding for mobile */}
        <div className="h-safe-bottom pb-4" />
      </div>
    </div>
  );
}
