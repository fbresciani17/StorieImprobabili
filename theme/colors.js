// theme/colors.js
export const lightColors = {
  mode: 'light',

  // 🌤️ Palette Giorno (blu/azzurri funzionali)
  background: '#F4F9FF',     // azzurro chiarissimo per lo sfondo generale
  card: '#FFFFFF',           // carte, superfici principali
  primary: '#3A86FF',        // blu azione principale (ottimo contrasto con bianco)
  secondary: '#D6E8FF',      // azzurro molto chiaro per header/tab/card secondarie
  accent: '#38BDF8',         // azzurro sky per azioni secondarie / stati
  accent2: '#B6E0FE',        // azzurro pastello per highlight/badge

  text: '#1F2937',           // grigio-blu profondo (ottima leggibilità)
  textOnButton: '#FFFFFF',   // testo su bottoni primari
  textOnSecondary: '#0F172A',// testo su bottoni secondari (su azzurro chiaro)

  border: '#D7E3F4',         // bordi delicati coerenti con la palette
  tabActive: '#3A86FF',
  tabInactive: '#94A3B8',
};

export const darkColors = {
  mode: 'dark',

  // 🌙 Palette Notte (come da tua preferenza)
  background: '#1A2238',      // Blu notte profondo
  card: '#2E3268',            // Blu lavanda scuro (card / sfondi secondari)
  primary: '#87CEEB',         // Azzurro tenue (primario notte)
  secondary: '#40E0D0',       // Turchese morbido (secondario)
  accent: '#40E0D0',          // Turchese (accento)
  accent2: '#40E0D0',

  text: '#FFFFFF',            // Testo primario
  textOnButton: '#1A2238',    // Testo su bottoni chiari (primario/secondario in dark)
  textOnSecondary: '#1A2238',

  border: '#3B4A7A',
  tabActive: '#87CEEB',
  tabInactive: '#B0C4DE',
};
