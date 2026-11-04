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

/** Google Maps search for a place name — used instead of an embedded (and therefore faked) map. */
export function mapsSearchHref(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
