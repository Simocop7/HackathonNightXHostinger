import { createClient } from '@supabase/supabase-js';

const SEED_PROFILES = [
  { id: 'a1000000-0000-0000-0000-000000000001', nome: 'Luca',       cognome: 'Ferrari',  username: 'lucafer',      email: 'seed-lucafer@studymatch.demo',      universita: 'Politecnico di Milano',       facolta: 'Ingegneria Informatica',      cerca_aiuto_in: ['Analisi 2','Fisica 1'],                                puo_aiutare_in: ['Programmazione Python','Algoritmi','Basi di Dati'],       biografia: 'Appassionato di coding e AI. Cerco qualcuno che mi salvi con Analisi 2!',        linkedin: 'https://linkedin.com/in/luca-ferrari-polimi',    punti: 120 },
  { id: 'a1000000-0000-0000-0000-000000000002', nome: 'Sofia',      cognome: 'Martini',  username: 'sofiamartini', email: 'seed-sofiamartini@studymatch.demo', universita: 'Università Bocconi',          facolta: 'Economia e Management',       cerca_aiuto_in: ['Statistica','Matematica Applicata'],                    puo_aiutare_in: ['Diritto Privato','Macroeconomia','Marketing'],            biografia: 'Studio economia ma la statistica è il mio nemico giurato.',               linkedin: 'https://linkedin.com/in/sofia-martini-bocconi',  punti: 75  },
  { id: 'a1000000-0000-0000-0000-000000000003', nome: 'Marco',      cognome: 'Russo',    username: 'marcorusso',   email: 'seed-marcorusso@studymatch.demo',   universita: 'Sapienza Università di Roma', facolta: 'Medicina e Chirurgia',        cerca_aiuto_in: ['Biochimica','Anatomia'],                                puo_aiutare_in: ['Biologia','Chimica Organica','Fisiologia'],               biografia: 'Futuro medico in formazione. Studio 10 ore al giorno.',                    linkedin: null,                                             punti: 200 },
  { id: 'a1000000-0000-0000-0000-000000000004', nome: 'Giulia',     cognome: 'Bianchi',  username: 'giuliab',      email: 'seed-giuliab@studymatch.demo',      universita: 'Politecnico di Milano',       facolta: 'Design della Comunicazione',  cerca_aiuto_in: ['Programmazione Python','Algoritmi'],                    puo_aiutare_in: ["Storia dell'Arte",'Grafica Vettoriale','UI Design'],      biografia: "Designer creativa che ama l'estetica ma soffre con il codice.",            linkedin: 'https://linkedin.com/in/giulia-bianchi-design',  punti: 50  },
  { id: 'a1000000-0000-0000-0000-000000000005', nome: 'Alessandro', cognome: 'Chen',     username: 'alexchen',     email: 'seed-alexchen@studymatch.demo',     universita: 'Università di Bologna',       facolta: 'Ingegneria Civile',           cerca_aiuto_in: ['Diritto Privato','Macroeconomia'],                       puo_aiutare_in: ['Fisica 1','Matematica Applicata','Analisi 2'],            biografia: 'Ingegnere civile forte in matematica e fisica classica.',                  linkedin: 'https://linkedin.com/in/alessandro-chen-ing',    punti: 90  },
  { id: 'a1000000-0000-0000-0000-000000000006', nome: 'Valentina',  cognome: 'Romano',   username: 'vale_rom',     email: 'seed-vale_rom@studymatch.demo',     universita: 'Milano-Bicocca',              facolta: 'Psicologia',                  cerca_aiuto_in: ['Statistica','Biologia'],                                puo_aiutare_in: ['Psicologia dello Sviluppo','Metodologia della Ricerca','Sociologia'], biografia: 'Appassionata di mente umana e neuroscienze.',                              linkedin: null,                                             punti: 160 },
  { id: 'a1000000-0000-0000-0000-000000000007', nome: 'Matteo',     cognome: 'Esposito', username: 'matteoexp',    email: 'seed-matteoexp@studymatch.demo',    universita: 'Politecnico di Torino',       facolta: 'Ingegneria Elettronica',      cerca_aiuto_in: ['Chimica Organica','Biochimica'],                        puo_aiutare_in: ['Elettrotecnica','Fisica 1','Calcolo Numerico'],           biografia: "Nerd dell'elettronica. Posso aiutarti con fisica e circuiti.",             linkedin: 'https://linkedin.com/in/matteo-esposito-ee',     punti: 30  },
  { id: 'a1000000-0000-0000-0000-000000000008', nome: 'Francesco',  cognome: 'Conti',    username: 'fconti',       email: 'seed-fconti@studymatch.demo',       universita: 'Università Bocconi',          facolta: 'Finanza',                     cerca_aiuto_in: ['Matematica Applicata','Statistica'],                    puo_aiutare_in: ['Economia Aziendale','Diritto Commerciale','Macroeconomia'],           biografia: 'Appassionato di mercati finanziari.',                                      linkedin: null,                                             punti: 40  },
  { id: 'a1000000-0000-0000-0000-000000000009', nome: 'Chiara',     cognome: 'De Luca',  username: 'chiaradeluca', email: 'seed-chiaradeluca@studymatch.demo', universita: 'Università Bocconi',          facolta: 'Economia e Finanza',          cerca_aiuto_in: ['Programmazione Python','Analisi 2'],                    puo_aiutare_in: ['Contabilità','Microeconomia','Macroeconomia'],            biografia: 'Economista in erba. Ho paura del codice ma non della contabilità.',        linkedin: 'https://linkedin.com/in/chiara-deluca-finance',  punti: 60  },
];

const SEED_RICHIESTE = [
  { id: 'b1000000-0000-0000-0000-000000000001', user_id: 'a1000000-0000-0000-0000-000000000004', materia: 'Programmazione Python',  descrizione: 'Non capisco i cicli e le funzioni. Ho un esame tra una settimana e sono completamente bloccata.',            scadenza: 'settimana' },
  { id: 'b1000000-0000-0000-0000-000000000002', user_id: 'a1000000-0000-0000-0000-000000000002', materia: 'Statistica',              descrizione: "Distribuzioni di probabilità e test di ipotesi mi mandano in tilt.",                                          scadenza: 'domani'    },
  { id: 'b1000000-0000-0000-0000-000000000003', user_id: 'a1000000-0000-0000-0000-000000000006', materia: 'Biologia',                descrizione: 'Ho bisogno di aiuto sulle leggi di Mendel e la genetica classica. Esame venerdì!',                             scadenza: 'oggi'      },
  { id: 'b1000000-0000-0000-0000-000000000004', user_id: 'a1000000-0000-0000-0000-000000000005', materia: 'Diritto Privato',         descrizione: 'Contratti e responsabilità civile sono ostici per me.',                                                        scadenza: 'settimana' },
  { id: 'b1000000-0000-0000-0000-000000000005', user_id: 'a1000000-0000-0000-0000-000000000008', materia: 'Matematica Applicata',    descrizione: 'Integrali multipli e serie, tutto da rivedere prima della sessione invernale.',                                 scadenza: 'settimana' },
  { id: 'b1000000-0000-0000-0000-000000000006', user_id: 'a1000000-0000-0000-0000-000000000009', materia: 'Programmazione Python',  descrizione: 'Prima volta con Python. Non riesco neanche a scrivere una funzione base. Lezione urgente!',                    scadenza: 'oggi'      },
  { id: 'b1000000-0000-0000-0000-000000000007', user_id: 'a1000000-0000-0000-0000-000000000003', materia: 'Biochimica',              descrizione: 'Il metabolismo energetico (ciclo di Krebs, catena respiratoria) mi sfugge completamente.',                     scadenza: 'oggi'      },
];

const SEED_PASSWORD = 'StudyMatch2024!';

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

  // Crea gli auth.users seed e i rispettivi profili
  for (const p of SEED_PROFILES) {
    // Crea account auth (ignora errori se già esiste)
    const { data: authData } = await admin.auth.admin.createUser({
      email:          p.email,
      password:       SEED_PASSWORD,
      email_confirm:  true,
      user_metadata:  { nome: p.nome, cognome: p.cognome, username: p.username, universita: p.universita },
    });

    const userId = authData?.user?.id ?? p.id;

    // Upsert profilo con i dati completi
    await admin.from('profiles').upsert({
      id:               userId,
      nome:             p.nome,
      cognome:          p.cognome,
      username:         p.username,
      universita:       p.universita,
      facolta:          p.facolta,
      cerca_aiuto_in:   p.cerca_aiuto_in,
      puo_aiutare_in:   p.puo_aiutare_in,
      biografia:        p.biografia,
      linkedin:         p.linkedin,
      punti:            p.punti,
      profilo_completo: true,
      is_seed:          true,
    }, { onConflict: 'username' });

    // Aggiorna l'ID nel mapping per le richieste
    SEED_RICHIESTE.forEach((r) => {
      if (r.user_id === p.id && userId !== p.id) r.user_id = userId;
    });
  }

  // Inserisci richieste di aiuto seed
  await admin.from('richieste_aiuto').upsert(
    SEED_RICHIESTE.map((r) => ({
      user_id:     r.user_id,
      materia:     r.materia,
      descrizione: r.descrizione,
      scadenza:    r.scadenza,
      stato:       'aperta',
    })),
  );
}
