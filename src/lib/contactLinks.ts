/** `tel:` link from a free-form phone string — keeps only digits and a leading "+". */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

/**
 * `https://wa.me/<digits>` link, optionally with a prefilled message. The
 * number comes from `CompanySettings.whatsapp`, so anything non-numeric
 * typed there is stripped first.
 */
export function whatsappHref(whatsapp: string, message?: string): string {
  const base = `https://wa.me/${whatsapp.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Bangladesh mobile numbers are typed as 01XXXXXXXXX; wa.me needs the country code in front. `null` when it is not a usable number. */
export function bdWhatsAppNumber(phone: string | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `88${digits}`;
  return digits;
}

/** Google Maps search for a place name — used instead of an embedded (and therefore faked) map. */
export function mapsSearchHref(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
