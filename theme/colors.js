// theme/colors.js
export const lightColors = {
  mode: 'light',

  // 🌤️ Palette Giorno (blu/azzurri funzionali)
  background: '#F5F1EB',     // marroncino molto chiaro per lo sfondo generale
  card: '#F9F7F4',           // marrone molto chiaro per le card degli elementi
  primary: '#A8E6CF',        // verde pastello per il pulsante genera
  secondary: '#FFD3A5',      // giallo pastello per il pulsante "scrivi la tua storia"
  accent: '#FFA8A8',         // rosa pastello per il pulsante pulisci
  accent2: '#A8D8EA',        // azzurro pastello per il pulsante "sblocca tutto"
  counter: '#F5E1E8',        // rosa molto chiaro per il counter parole

  text: '#1F2937',           // grigio-blu profondo (ottima leggibilità)
  textOnButton: '#FFFFFF',   // testo bianco su bottoni colorati per migliore leggibilità
  textOnSecondary: '#0F172A',// testo su bottoni secondari (su azzurro chiaro)

  border: '#D7E3F4',         // bordi delicati coerenti con la palette
  tabActive: '#3A86FF',
  tabInactive: '#94A3B8',
};

export const darkColors = {
  mode: 'dark',

  // 🌙 Palette Notte (come da tua preferenza)
  background: '#1A1F2E',      // Blu scuro per la modalità notte
  card: '#2A3441',            // Blu più chiaro per le card in modalità notte
  primary: '#6EE7B7',         // Verde tenue per il pulsante genera (modalità notte)
  secondary: '#FDE68A',       // Giallo delicato per il pulsante "scrivi la tua storia" (modalità notte)
  accent: '#F9A8D4',          // Rosa dolce per il pulsante pulisci (modalità notte)
  accent2: '#93C5FD',        // Azzurro soft per il pulsante "sblocca tutto" (modalità notte)
  counter: '#F5E1E8',        // rosa molto chiaro per il counter parole (anche in modalità notte)

  text: '#FFFFFF',            // Testo primario
  textOnButton: '#FFFFFF',    // Testo bianco su bottoni colorati per migliore leggibilità
  textOnSecondary: '#1A2238',

  border: '#3A4A5C',
  tabActive: '#87CEEB',
  tabInactive: '#B0C4DE',
};
