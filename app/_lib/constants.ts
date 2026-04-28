export const AREE_LEGALI = [
  'Diritto del Lavoro',
  'Diritto Civile',
  'Diritto Commerciale',
  'Diritto Penale',
  'Diritto Tributario / Fiscale',
  'Diritto di Famiglia',
  'Diritto Societario',
  'Contrattualistica',
  'Privacy / GDPR',
  'Diritto Immobiliare',
  'Proprietà Intellettuale',
] as const;

export type AreaLegale = typeof AREE_LEGALI[number];

export const STATO_LABEL: Record<string, string> = {
  aperto:         'Aperto',
  in_lavorazione: 'In lavorazione',
  risolto:        'Risolto',
  richiede_info:  'Richiede info',
};

export const PRIORITA_LABEL: Record<string, string> = {
  bassa:   'Bassa',
  normale: 'Normale',
  urgente: 'Urgente',
};

export const TIPO_LABEL: Record<string, string> = {
  domanda:              'Domanda legale',
  revisione_documento:  'Revisione documento',
};
