export const SERVICE_AREAS = {
  'Administrative, Tax & Legal': [
    'Accounting & Tax',
    'Labor Law & Payroll',
    'Corporate Law',
    'Civil Law',
    'Commercial Law',
    'Contracts & Agreements',
    'Privacy / GDPR',
    'Intellectual Property',
    'Real Estate Law',
    'Statutory Audit',
  ],
  'Safety, Health & Environment': [
    'Workplace Safety (D.Lgs. 81/08)',
    'Occupational Health',
    'Environmental Compliance',
    'Waste Management (RENTRI)',
    'Data Protection (DPO)',
  ],
  'Finance & Development': [
    'Financial Planning & Credit',
    'Government Grants & Incentives',
    'Insurance & Risk Management',
  ],
  'Technical & Organizational': [
    'IT Infrastructure & Security',
    'Cybersecurity',
    'ISO 9001 – Quality Management',
    'ISO 14001 – Environmental Management',
    'ISO 45001 – Safety Management',
  ],
} as const;

export type ServiceAreaGroup = keyof typeof SERVICE_AREAS;
export type ServiceArea = typeof SERVICE_AREAS[ServiceAreaGroup][number];

export const ALL_SERVICE_AREAS: string[] = Object.values(SERVICE_AREAS).flat();

export const CONSULTANT_TYPES = [
  'Accountant',
  'Labor Consultant',
  'Lawyer – Corporate / Civil',
  'Notary',
  'Statutory Auditor',
  'Workplace Safety Consultant (RSPP)',
  'Occupational Doctor',
  'Environmental Consultant',
  'Privacy Consultant (DPO)',
  'Financial Consultant / Credit Broker',
  'Grants & Incentives Specialist',
  'Insurance Broker',
  'IT & Cybersecurity Consultant',
  'Quality Management Consultant (ISO)',
] as const;

export type ConsultantType = typeof CONSULTANT_TYPES[number];

export const STATO_LABEL: Record<string, string> = {
  aperto:         'Open',
  in_lavorazione: 'In progress',
  risolto:        'Resolved',
  richiede_info:  'Needs info',
};

export const PRIORITA_LABEL: Record<string, string> = {
  bassa:   'Low',
  normale: 'Normal',
  urgente: 'Urgent',
};

export const TIPO_LABEL: Record<string, string> = {
  domanda:             'Question',
  revisione_documento: 'Document review',
};

export const SUBSCRIPTION_LABEL: Record<string, string> = {
  pro:        'Pro',
  max:        'Max',
  enterprise: 'Enterprise',
};
