function fallbackReference(order: any): string {
  const id = String(order?._id ?? order?.id ?? "").trim();
  return id ? `INV-${id.slice(-6).toUpperCase()}` : "Invoice";
}

/**
 * Normalize known legacy FishTokri order references for display without
 * changing the stored order or its internal MongoDB identifier.
 */
export function normalizeOrderReference(rawOrderId: unknown, order: any): string {
  const raw = String(rawOrderId ?? "").trim();
  if (!raw) return fallbackReference(order);

  // Recover the date and sequential suffix from the old malformed template:
  // #FTSundefinedundefinedYYYYMMDDNNN.
  const malformedLegacy = raw.replace(/^#/, "").match(/^FTSundefinedundefined(\d{8})(\d+)$/i);
  if (malformedLegacy) {
    const [, yyyymmdd, sequence] = malformedLegacy;
    const dayMonthYear = `${yyyymmdd.slice(6, 8)}${yyyymmdd.slice(4, 6)}${yyyymmdd.slice(0, 4)}`;
    return `#FTS${dayMonthYear}${sequence.padStart(2, "0")}`;
  }

  if (/undefined|null|NaN/i.test(raw)) return fallbackReference(order);

  // Normalize the older YYYYMMDD sequence format to the current DDMMYYYY format.
  const legacy = raw.replace(/^#/, "").match(/^FTS((?:19|20)\d{6})(\d+)$/i);
  if (legacy) {
    const [, yyyymmdd, sequence] = legacy;
    const dayMonthYear = `${yyyymmdd.slice(6, 8)}${yyyymmdd.slice(4, 6)}${yyyymmdd.slice(0, 4)}`;
    return `#FTS${dayMonthYear}${sequence.padStart(2, "0")}`;
  }

  return raw;
}
