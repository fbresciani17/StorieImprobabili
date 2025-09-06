// theme/typography.js
import { Dimensions } from 'react-native';

/**
 * Tipografia scalabile:
 * - telefoni standard: 1.00x
 * - telefoni grandi:   1.05x
 * - tablet/landscape:  1.15x
 */
export function ts(base) {
  const { width, height } = Dimensions.get('window');
  const shortest = Math.min(width, height);

  let factor = 1;
  if (shortest >= 768) factor = 1.15;      // tablet, landscape ampio
  else if (shortest >= 400) factor = 1.05; // telefoni grandi

  return Math.round(base * factor);
}
