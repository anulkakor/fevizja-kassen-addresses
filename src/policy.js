import {
  CATEGORIES,
  CATEGORY_NOTICES,
  SOURCE_MAX_AGE_DAYS,
} from "./constants.js";
import { clean } from "./utils.js";

function noticeForCategory(category) {
  return CATEGORY_NOTICES[category] || null;
}
function validDateOnly(value, now = Date.now()) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  const latestAllowed = new Date(now + 86400000).toISOString().slice(0, 10);
  return value <= latestAllowed;
}
function isHomepage(value) {
  try { const u = new URL(value); return u.pathname === "/" && !u.search && !u.hash; } catch { return false; }
}
function sourceIsFresh(item, now = Date.now()) {
  if (!item || !validDateOnly(item.sourceVerifiedAt, now)) return false;
  const verifiedAt = Date.parse(`${item.sourceVerifiedAt}T00:00:00.000Z`);
  const today = new Date(now);
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const ageDays = Math.floor((todayUtc - verifiedAt) / 86400000);
  return ageDays >= -1 && ageDays <= SOURCE_MAX_AGE_DAYS;
}
function mailingAllowed(item) {
  return Boolean(item && item.status === "verified" && clean(item.address) && !isHomepage(item.sourceUrl) && sourceIsFresh(item));
}
function officialLink(item, fallbackUrl = null) {
  // officialUrl is the user-facing destination; sourceUrl remains the audit evidence.
  for (const value of [item?.officialUrl, item?.sourceUrl, fallbackUrl]) {
    try {
      const u = new URL(value);
      if (u.protocol === "https:" && !isHomepage(value)) return u.toString();
    } catch { /* try next trusted candidate */ }
  }
  return null;
}
function getIntegrityErrors(record) {
  const errors = [];
  for (const category of CATEGORIES) {
    const item = record?.categories?.[category];
    if (!item || typeof item !== "object") {
      errors.push({ code: "STORED_RECORD_CATEGORY_MISSING", category });
    }
  }
  return errors;
}
function withMailingPolicy(item, fallbackUrl = null) {
  const usableForMailing = mailingAllowed(item);
  const officialUrl = usableForMailing ? null : officialLink(item, fallbackUrl);
  return {
    ...item,
    usableForMailing,
    address: usableForMailing ? item.address : null,
    candidateAddressPresent: Boolean(clean(item.address)),
    addressDisplayMode: usableForMailing
      ? "confirmed_address"
      : officialUrl
        ? "official_link"
        : "manual_check",
    officialUrl,
  };
}
function publicRecord(record) {
  const categories = Object.fromEntries(
    CATEGORIES
      .filter((category) => {
        const item = record.categories?.[category];
        return item && typeof item === "object";
      })
      .map((category) => [
        category,
        {
          ...withMailingPolicy(
            record.categories[category],
            record.documentGenerationNotice?.officialUrl,
          ),
          notice: noticeForCategory(category),
        },
      ]),
  );
  return { ...record, categories, integrityErrors: getIntegrityErrors(record) };
}

export { CATEGORIES, validDateOnly, isHomepage, sourceIsFresh, mailingAllowed, officialLink, getIntegrityErrors, withMailingPolicy, publicRecord, noticeForCategory };
