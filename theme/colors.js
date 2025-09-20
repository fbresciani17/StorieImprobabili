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

  text: '#1F2937',           // grigio-blu profondo (ottima leggibilità)
  textOnButton: '#1F2937',   // testo scuro su bottoni gialli per migliore leggibilità
  textOnSecondary: '#0F172A',// testo su bottoni secondari (su azzurro chiaro)

  border: '#D7E3F4',         // bordi delicati coerenti con la palette
  tabActive: '#3A86FF',
  tabInactive: '#94A3B8',
};

export const darkColors = {
  mode: 'dark',

  // 🌙 Palette Notte (come da tua preferenza)
  background: '#2D1B1B',      // Marrone scuro per la modalità notte
  card: '#3A2F2A',            // Marrone molto chiaro per le card in modalità notte
  primary: '#A8E6CF',         // Verde pastello per il pulsante genera (anche in modalità notte)
  secondary: '#FFD3A5',       // Giallo pastello per il pulsante "scrivi la tua storia" (anche in modalità notte)
  accent: '#FFA8A8',          // Rosa pastello per il pulsante pulisci (anche in modalità notte)
  accent2: '#A8D8EA',        // azzurro pastello per il pulsante "sblocca tutto" (anche in modalità notte)

  text: '#FFFFFF',            // Testo primario
  textOnButton: '#1A2238',    // Testo scuro su bottoni gialli per migliore leggibilità
  textOnSecondary: '#1A2238',

  border: '#3B4A7A',
  tabActive: '#87CEEB',
  tabInactive: '#B0C4DE',
};
