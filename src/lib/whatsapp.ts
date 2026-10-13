/**
 * Utilitaire de normalisation et de génération de liens WhatsApp
 * 
 * Explication du problème rencontré :
 * Sur iOS / Android, lorsque WhatsApp reçoit une URL du type `https://wa.me/0562275287`
 * (numéro commençant par 0 ou sans indicatif international), l'application WhatsApp
 * interprète le paramètre comme un nom d'utilisateur / identifiant (@0562275287).
 * WhatsApp affiche alors l'erreur :
 * "Le nom de profil @0562275287 n'existe pas sur WhatsApp."
 * 
 * En convertissant automatiquement le numéro en format international E.164 sans symbole '+'
 * (ex: 0562275287 -> 213562275287), l'URL devient `https://wa.me/213562275287`.
 * WhatsApp reconnaît immédiatement l'indicatif algérien (+213) et ouvre directement
 * la discussion avec le numéro de téléphone sans aucune erreur.
 */

/**
 * Normalise n'importe quel numéro saisi vers le format international pour l'API WhatsApp
 * Exemples gérés pour l'Algérie :
 * - "0562275287" -> "213562275287"
 * - "0661234567" -> "213661234567"
 * - "0770123456" -> "213770123456"
 * - "562275287" -> "213562275287"
 * - "+213562275287" -> "213562275287"
 * - "00213562275287" -> "213562275287"
 * - "2130562275287" -> "213562275287" (correction erreur fréquente)
 * - "+213 56 22 75 28 7" -> "213562275287"
 * - "@0562275287" -> "213562275287"
 */
export function formatWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return '';

  // Supprime les espaces, tirets, parenthèses, points et le signe @
  let cleaned = String(phone).trim().replace(/[@\s\-_.()/]/g, '');

  // Supprime le '+' au début
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  // Supprime le préfixe international '00' (ex: 00213...)
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }

  // Supprime l'erreur courante "2130..." (ex: 2130562275287 -> 213562275287)
  if (cleaned.startsWith('2130') && cleaned.length >= 12) {
    cleaned = '213' + cleaned.slice(4);
  }

  // Numéros algériens avec 0 initial (05, 06, 07 pour mobile, 02, 03, 04 pour fixe)
  // Format local : 10 chiffres (ex: 0562275287) ou 9 chiffres
  if (cleaned.startsWith('0') && cleaned.length >= 9 && cleaned.length <= 11) {
    cleaned = '213' + cleaned.slice(1);
  }

  // Numéros algériens saisis sans le 0 et sans indicatif (9 chiffres commençant par 5, 6 ou 7)
  if (cleaned.length === 9 && /^[567]/.test(cleaned)) {
    cleaned = '213' + cleaned;
  }

  return cleaned;
}

/**
 * Construit l'URL universelle `https://wa.me/<number>?text=<message>`
 * Fonctionne parfaitement sur iOS, Android, macOS et WhatsApp Web.
 */
export function buildWhatsAppChatUrl(phone: string | null | undefined, message?: string): string {
  const formatted = formatWhatsAppNumber(phone);
  if (!formatted) return '#';

  const baseUrl = `https://wa.me/${formatted}`;
  if (message && message.trim()) {
    return `${baseUrl}?text=${encodeURIComponent(message.trim())}`;
  }
  return baseUrl;
}

/**
 * Formate un numéro pour un affichage humain élégant (ex: +213 562 27 52 87)
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  const formatted = formatWhatsAppNumber(phone);
  if (!formatted) return '';

  if (formatted.startsWith('213') && formatted.length === 12) {
    const operator = formatted.slice(3, 5); // 56, 66, 77...
    const part1 = formatted.slice(5, 7);
    const part2 = formatted.slice(7, 9);
    const part3 = formatted.slice(9, 12);
    return `+213 (0)${operator} ${part1} ${part2} ${part3}`;
  }

  return `+${formatted}`;
}

/**
 * Valide si le numéro saisi semble être un numéro de téléphone valide
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  const formatted = formatWhatsAppNumber(phone);
  // Un numéro valide pour WhatsApp contient entre 8 et 15 chiffres internationaux
  return formatted.length >= 8 && formatted.length <= 15 && /^[0-9]+$/.test(formatted);
}
