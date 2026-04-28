'use client';
import Link from 'next/link';
import { Scale, Check, ChevronLeft, Zap, Shield, Video, FileText, MessageSquare, Clock, BookOpen } from 'lucide-react';

const PLANS = [
  {
    id: 'pro',
    name: 'Pro',
    price: '€999',
    period: '/year',
    tagline: 'For freelancers & small businesses',
    color: 'border-violet-200',
    headerColor: 'bg-violet-50',
    badge: null,
    ctaLabel: 'Get started',
    ctaStyle: 'bg-violet-600 hover:bg-violet-700 text-white',
    features: [
      { icon: Shield,       text: 'Generalist consulting team' },
      { icon: Clock,        text: 'Response within 24 hours' },
      { icon: MessageSquare,text: 'Async chat support' },
      { icon: BookOpen,     text: 'FAQ knowledge base' },
      { icon: Video,        text: 'Video call up to 30 min/session' },
      { icon: FileText,     text: 'Document review up to 50 pages/month' },
      { icon: Shield,       text: 'Legal Vault — Template Archive' },
    ],
  },
  {
    id: 'max',
    name: 'Max',
    price: '€1,499',
    period: '/year',
    tagline: 'For growing companies',
    color: 'border-amber-300',
    headerColor: 'bg-amber-50',
    badge: 'Most popular',
    ctaLabel: 'Get started',
    ctaStyle: 'bg-amber-500 hover:bg-amber-600 text-white',
    features: [
      { icon: Shield,       text: 'Specialist consulting team' },
      { icon: Clock,        text: 'Response within 12 hours' },
      { icon: MessageSquare,text: 'Async chat support' },
      { icon: Video,        text: 'Video call up to 1 hour/session' },
      { icon: FileText,     text: 'Document review up to 100 pages/month' },
      { icon: Shield,       text: 'Legal Vault — Template Archive' },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '€2,999',
    period: '/year',
    tagline: 'For large organisations',
    color: 'border-purple-300',
    headerColor: 'bg-purple-50',
    badge: 'Full access',
    ctaLabel: 'Book a free consultation',
    ctaStyle: 'bg-purple-600 hover:bg-purple-700 text-white',
    features: [
      { icon: Shield,       text: '360° dedicated consultant team' },
      { icon: Clock,        text: 'Response within 3 hours' },
      { icon: MessageSquare,text: 'Async chat support' },
      { icon: Video,        text: 'Video call up to 2 hours/session' },
      { icon: FileText,     text: 'Document review up to 300 pages/month' },
      { icon: Shield,       text: 'Legal Vault — Template Archive' },
      { icon: Shield,       text: 'Custom SLA agreement' },
    ],
  },
];

const ADDONS = [
  {
    name: '+10 Extra Document Pages',
    desc: 'Need more review capacity this month? Add 10 pages on top of your plan limit.',
    price: '€29/month',
    tag: 'Pro & Max',
  },
  {
    name: '+30 Extra Call Minutes',
    desc: 'Extend your video session by 30 minutes without upgrading your plan.',
    price: '€39/month',
    tag: 'Pro & Max',
  },
  {
    name: '+50 Extra Document Pages',
    desc: 'Bulk page top-up for high-volume review months.',
    price: '€99/month',
    tag: 'Pro & Max',
  },
];

const VAULT_TEMPLATES = [
  'Non-Disclosure Agreement (NDA)',
  'Cease & Desist Letter',
  'Cookie Policy',
  'Terms & Conditions',
  'Privacy Policy',
  'Commercial Contract',
];

export default function PianiPage() {
  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-500" strokeWidth={2} />
          </Link>
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-violet-600" strokeWidth={2} />
            <span className="font-semibold text-gray-800 text-sm">Plans & Pricing</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Choose your plan</h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            All plans include the Legal Vault template library, async chat, and access to verified consultants.
            Annual billing — no setup fees.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`bg-white rounded-2xl border-2 ${plan.color} shadow-sm flex flex-col overflow-hidden`}>
              <div className={`${plan.headerColor} px-5 py-5`}>
                {plan.badge && (
                  <span className="inline-block text-xs font-bold text-amber-700 bg-amber-200 px-2.5 py-0.5 rounded-full mb-2">
                    {plan.badge}
                  </span>
                )}
                <h2 className="text-xl font-black text-gray-800">{plan.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{plan.tagline}</p>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-3xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-sm text-gray-400 mb-1">{plan.period}</span>
                </div>
              </div>
              <div className="px-5 py-5 flex-1 flex flex-col">
                <ul className="space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                      {f.text}
                    </li>
                  ))}
                </ul>
                <button className={`mt-6 w-full py-3 font-semibold rounded-xl text-sm transition-colors ${plan.ctaStyle}`}>
                  {plan.ctaLabel}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Legal Vault callout */}
        <div className="bg-gradient-to-r from-violet-600 to-violet-800 rounded-2xl p-6 text-white mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            <div className="shrink-0">
              <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black mb-1">Legal Vault — included in every plan</h3>
              <p className="text-sm text-violet-200 mb-3">
                Instant access to a library of standard documents, already reviewed and approved by our legal team.
                Zero extra cost, zero waiting time — just download and use.
              </p>
              <div className="flex flex-wrap gap-2">
                {VAULT_TEMPLATES.map((t) => (
                  <span key={t} className="text-xs bg-white/15 text-violet-100 px-2.5 py-1 rounded-full font-medium">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Add-ons */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-violet-600" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Add-on Tokens</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Hit a limit this month but don't want to upgrade? Buy only what you need, when you need it.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ADDONS.map((a) => (
              <div key={a.name} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-1.5 hover:border-violet-200 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-gray-800 leading-snug">{a.name}</p>
                  <span className="text-xs font-bold text-violet-600 shrink-0 whitespace-nowrap">{a.price}</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{a.desc}</p>
                <span className="text-xs text-gray-300 font-medium mt-1">{a.tag}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
