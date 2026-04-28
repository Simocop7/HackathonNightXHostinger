import { createClient } from '@supabase/supabase-js';

// ── Professionisti seed (avvocati / notai) ────────────────────────────────────

const SEED_PROFESSIONISTI = [
  {
    id:       'p1000000-0000-0000-0000-000000000001',
    nome:     'Lorenzo',
    cognome:  'Vitali',
    username: 'avv.vitali',
    email:    'seed-vitali@legalmatch.demo',
    ruolo:    'professionista',
    qualifica:            'Avvocato',
    ordine_professionale: "Ordine degli Avvocati di Milano",
    aree_legali: ['Diritto del Lavoro', 'Diritto Civile'],
    biografia:   'Avvocato civilista con 15 anni di esperienza in diritto del lavoro e controversie civili. Patrocinante in Cassazione.',
    linkedin:    'https://linkedin.com/in/lorenzo-vitali-avvocato',
    punti:       320,
  },
  {
    id:       'p1000000-0000-0000-0000-000000000002',
    nome:     'Alessia',
    cognome:  'Conte',
    username: 'avv.conte',
    email:    'seed-conte@legalmatch.demo',
    ruolo:    'professionista',
    qualifica:            'Avvocato',
    ordine_professionale: "Ordine degli Avvocati di Roma",
    aree_legali: ['Diritto Commerciale', 'Contrattualistica', 'Diritto Societario'],
    biografia:   'Specializzata in diritto societario e M&A. Ho assistito oltre 200 startup e PMI nella strutturazione di accordi commerciali.',
    linkedin:    'https://linkedin.com/in/alessia-conte-law',
    punti:       510,
  },
  {
    id:       'p1000000-0000-0000-0000-000000000003',
    nome:     'Riccardo',
    cognome:  'Pavan',
    username: 'not.pavan',
    email:    'seed-pavan@legalmatch.demo',
    ruolo:    'professionista',
    qualifica:            'Notaio',
    ordine_professionale: 'Consiglio Notarile di Venezia',
    aree_legali: ['Diritto Immobiliare', 'Diritto di Famiglia'],
    biografia:   'Notaio con sede a Venezia. Mi occupo di rogiti immobiliari, successioni e atti relativi al diritto di famiglia.',
    linkedin:    null,
    punti:       180,
  },
  {
    id:       'p1000000-0000-0000-0000-000000000004',
    nome:     'Francesca',
    cognome:  'Moretti',
    username: 'avv.moretti',
    email:    'seed-moretti@legalmatch.demo',
    ruolo:    'professionista',
    qualifica:            'Avvocato',
    ordine_professionale: "Ordine degli Avvocati di Milano",
    aree_legali: ['Diritto Tributario / Fiscale', 'Privacy / GDPR'],
    biografia:   'Avvocato tributarista e DPO certificata. Supporto aziende nella compliance fiscale e nella gestione dei dati personali.',
    linkedin:    'https://linkedin.com/in/francesca-moretti-dpo',
    punti:       420,
  },
  {
    id:       'p1000000-0000-0000-0000-000000000005',
    nome:     'Davide',
    cognome:  'Santoro',
    username: 'avv.santoro',
    email:    'seed-santoro@legalmatch.demo',
    ruolo:    'professionista',
    qualifica:            'Avvocato',
    ordine_professionale: "Ordine degli Avvocati di Napoli",
    aree_legali: ['Diritto Penale', 'Diritto Civile'],
    biografia:   'Penalista con esperienza in reati informatici e white-collar crime. Difensore d\'ufficio presso il Tribunale di Napoli.',
    linkedin:    null,
    punti:       250,
  },
];

// ── Clienti seed (aziende e privati) ─────────────────────────────────────────

const SEED_CLIENTI = [
  {
    id:       'c1000000-0000-0000-0000-000000000001',
    nome:     'Mario',
    cognome:  'Rossi',
    username: 'mrossi',
    email:    'seed-mrossi@legalmatch.demo',
    ruolo:    'cliente',
    tipo_cliente:      'privato',
    codice_fiscale:    'RSSMRA80A01H501Z',
    partita_iva:       null,
    ragione_sociale:   null,
    subscription_tier: 'basic',
    biografia:         'Dipendente nel settore manifatturiero. Cerco assistenza per una disputa lavorativa con il mio ex datore.',
    punti:             0,
  },
  {
    id:       'c1000000-0000-0000-0000-000000000002',
    nome:     'Giulia',
    cognome:  'Ferretti',
    username: 'techcorp_admin',
    email:    'seed-techcorp@legalmatch.demo',
    ruolo:    'cliente',
    tipo_cliente:      'azienda',
    ragione_sociale:   'TechCorp Srl',
    partita_iva:       '12345678901',
    codice_fiscale:    null,
    subscription_tier: 'premium',
    biografia:         "Responsabile legale di TechCorp Srl. Gestisco contratti SaaS, NDA e compliance GDPR per una software house di 40 persone.",
    punti:             0,
  },
  {
    id:       'c1000000-0000-0000-0000-000000000003',
    nome:     'Roberto',
    cognome:  'Bianchi',
    username: 'studiobianchi',
    email:    'seed-bianchi@legalmatch.demo',
    ruolo:    'cliente',
    tipo_cliente:      'azienda',
    ragione_sociale:   'Studio Arch. Bianchi & Associati',
    partita_iva:       '98765432100',
    codice_fiscale:    null,
    subscription_tier: 'basic',
    biografia:         'Studio di architettura con 8 professionisti. Necessitiamo di supporto su contratti di appalto e GDPR.',
    punti:             0,
  },
  {
    id:       'c1000000-0000-0000-0000-000000000004',
    nome:     'Elena',
    cognome:  'Mancini',
    username: 'elenamancini',
    email:    'seed-mancini@legalmatch.demo',
    ruolo:    'cliente',
    tipo_cliente:      'privato',
    codice_fiscale:    'MNCLN90B41F205X',
    partita_iva:       null,
    ragione_sociale:   null,
    subscription_tier: 'premium',
    biografia:         'Libera professionista nel settore del design. Cerco assistenza su contratti con clienti e separazione consensuale.',
    punti:             0,
  },
];

// ── Ticket seed (con assegnazioni predefinite) ────────────────────────────────
//
//  I ticket seed vengono creati DOPO i profili, quindi usiamo gli indici
//  degli array sopra per i riferimenti cliente_id / professionista_id.
//  I placeholder {C0}, {P0} vengono rimpiazzati a runtime con i veri UUID.

const SEED_TICKETS_TEMPLATE = [
  {
    cliente_idx:       0, // Mario Rossi
    professionista_idx: 0, // avv. Vitali
    tipo:        'domanda',
    area_legale: 'Diritto del Lavoro',
    titolo:      'Licenziamento senza giusta causa',
    descrizione: "Sono stato licenziato dopo 8 anni senza preavviso né motivazione scritta. L'azienda sostiene 'giustificato motivo oggettivo' ma non è stato avviato alcun tentativo di mediazione. Voglio capire se ho diritto a impugnare il licenziamento e in che tempi.",
    stato:       'in_lavorazione',
    priorita:    'urgente',
  },
  {
    cliente_idx:       1, // TechCorp Srl
    professionista_idx: 1, // avv. Conte
    tipo:        'revisione_documento',
    area_legale: 'Contrattualistica',
    titolo:      'Revisione contratto SaaS B2B',
    descrizione: "Alleghiamo la bozza del nostro nuovo contratto SaaS per clienti enterprise. Chiediamo una revisione delle clausole di limitazione della responsabilità, SLA e risoluzione anticipata. Il cliente ha già proposto modifiche che non siamo sicuri di accettare.",
    stato:       'in_lavorazione',
    priorita:    'normale',
  },
  {
    cliente_idx:       2, // Studio Bianchi
    professionista_idx: 3, // avv. Moretti
    tipo:        'domanda',
    area_legale: 'Privacy / GDPR',
    titolo:      'Adeguamento GDPR per studio professionale',
    descrizione: "Il nostro studio tratta dati di centinaia di clienti per le pratiche edilizie. Non abbiamo mai formalizzato un registro dei trattamenti né nominato un DPO. Abbiamo ricevuto una richiesta di verifica dall'Autorità. Come dobbiamo procedere?",
    stato:       'aperto',
    priorita:    'urgente',
  },
  {
    cliente_idx:       3, // Elena Mancini
    professionista_idx: 2, // not. Pavan
    tipo:        'domanda',
    area_legale: 'Diritto di Famiglia',
    titolo:      'Separazione consensuale — iter e costi',
    descrizione: "Io e mio marito siamo d'accordo sulla separazione. Non abbiamo figli e i beni sono pochi e facilmente divisibili. Vorremmo capire se possiamo procedere direttamente con la separazione consensuale davanti al Sindaco oppure se è necessario l'intervento del giudice.",
    stato:       'in_lavorazione',
    priorita:    'bassa',
  },
];

const SEED_PASSWORD = 'LegalMatch2024!';

export async function initSeedIfNeeded(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.warn('[seed] SUPABASE_SERVICE_ROLE_KEY non configurata — seed saltato');
    return;
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Idempotency check
  const { count } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_seed', true);

  if ((count ?? 0) > 0) return;

  // ── 1. Crea profili professionisti ────────────────────────────────────────

  const professionistiIds: string[] = [];

  for (const p of SEED_PROFESSIONISTI) {
    const { data: authData } = await admin.auth.admin.createUser({
      email:         p.email,
      password:      SEED_PASSWORD,
      email_confirm: true,
      user_metadata: { nome: p.nome, cognome: p.cognome, username: p.username, ruolo: p.ruolo },
    });

    const userId = authData?.user?.id ?? p.id;
    professionistiIds.push(userId);

    await admin.from('profiles').upsert({
      id:                   userId,
      nome:                 p.nome,
      cognome:              p.cognome,
      username:             p.username,
      ruolo:                p.ruolo,
      qualifica:            p.qualifica,
      ordine_professionale: p.ordine_professionale,
      aree_legali:          p.aree_legali,
      biografia:            p.biografia,
      linkedin:             p.linkedin,
      punti:                p.punti,
      profilo_completo:     true,
      is_seed:              true,
    }, { onConflict: 'username' });
  }

  // ── 2. Crea profili clienti ───────────────────────────────────────────────

  const clientiIds: string[] = [];

  for (const c of SEED_CLIENTI) {
    const { data: authData } = await admin.auth.admin.createUser({
      email:         c.email,
      password:      SEED_PASSWORD,
      email_confirm: true,
      user_metadata: { nome: c.nome, cognome: c.cognome, username: c.username, ruolo: c.ruolo },
    });

    const userId = authData?.user?.id ?? c.id;
    clientiIds.push(userId);

    await admin.from('profiles').upsert({
      id:                userId,
      nome:              c.nome,
      cognome:           c.cognome,
      username:          c.username,
      ruolo:             c.ruolo,
      tipo_cliente:      c.tipo_cliente,
      partita_iva:       c.partita_iva,
      codice_fiscale:    c.codice_fiscale,
      ragione_sociale:   c.ragione_sociale,
      subscription_tier: c.subscription_tier,
      biografia:         c.biografia,
      punti:             c.punti,
      profilo_completo:  true,
      is_seed:           true,
    }, { onConflict: 'username' });
  }

  // ── 3. Crea ticket seed con assegnazioni ─────────────────────────────────

  for (const tpl of SEED_TICKETS_TEMPLATE) {
    const clienteId       = clientiIds[tpl.cliente_idx];
    const professionistaId = professionistiIds[tpl.professionista_idx];

    if (!clienteId || !professionistaId) continue;

    const { data: ticket } = await admin
      .from('tickets')
      .insert({
        cliente_id:        clienteId,
        professionista_id: professionistaId,
        tipo:              tpl.tipo,
        area_legale:       tpl.area_legale,
        titolo:            tpl.titolo,
        descrizione:       tpl.descrizione,
        allegati:          [],
        stato:             tpl.stato,
        priorita:          tpl.priorita,
      })
      .select('id')
      .single();

    // Crea l'assegnazione corrispondente (solo per ticket non 'aperto')
    if (ticket && tpl.stato !== 'aperto') {
      await admin.from('assegnazioni').insert({
        professionista_id: professionistaId,
        cliente_id:        clienteId,
        ticket_id:         ticket.id,
        stato:             'accettata',
      });
    }
  }

  console.log('[seed] LegalMatch — dati demo inizializzati con successo');
}
