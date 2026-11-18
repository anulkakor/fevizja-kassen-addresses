import { CATEGORIES, STATUSES, ITEM_FIELDS, NOTICE_FIELDS } from "./constants.js";
import { clean } from "./utils.js";
import { validDateOnly, isHomepage } from "./policy.js";
function validateRecord(record, knownIds) {
  const errors = [];
  if (!record || typeof record !== "object" || Array.isArray(record)) return ["record_not_object"];
  if (!clean(record.insurerId)) errors.push("insurerId_required"); else if (!knownIds.has(record.insurerId)) errors.push("insurerId_not_in_worker1_catalog");
  if (typeof record.insurerName === "string" && record.insurerName.length > 160) errors.push("insurerName_too_long");
  if (!record.categories || typeof record.categories !== "object" || Array.isArray(record.categories)) errors.push("categories_required");
  else {
    for (const key of Object.keys(record.categories)) if (!CATEGORIES.includes(key)) errors.push(`unknown_category:${key}`);
  }
  for (const category of CATEGORIES) {
    const item = record.categories?.[category];
    if (!item || typeof item !== "object" || Array.isArray(item)) { errors.push(`category_missing:${category}`); continue; }
    for (const key of Object.keys(item)) if (!ITEM_FIELDS.has(key)) errors.push(`unknown_category_field:${category}:${key}`);
    if (!STATUSES.includes(item.status)) errors.push(`invalid_status:${category}`);
    if (["verified", "official_general"].includes(item.status) && !clean(item.address)) errors.push(`address_required:${category}`);
    if (["verified", "official_general", "conditional"].includes(item.status) && !clean(item.sourceUrl)) errors.push(`source_required:${category}`);
    if (item.address != null && (typeof item.address !== "string" || item.address.length > 500)) errors.push(`address_invalid_or_too_long:${category}`);
    if (item.notes != null && (typeof item.notes !== "string" || item.notes.length > 2000)) errors.push(`notes_invalid_or_too_long:${category}`);
    if (item.sourceUrl != null && (typeof item.sourceUrl !== "string" || item.sourceUrl.length > 2048)) errors.push(`sourceUrl_invalid_or_too_long:${category}`);
    if (item.officialUrl != null && (typeof item.officialUrl !== "string" || item.officialUrl.length > 2048)) errors.push(`officialUrl_invalid_or_too_long:${category}`);
    if (item.checkedAtMeaning != null && (typeof item.checkedAtMeaning !== "string" || item.checkedAtMeaning.length > 100)) errors.push(`checkedAtMeaning_invalid:${category}`);
    if (!validDateOnly(item.checkedAt)) errors.push(`checkedAt_invalid_or_future:${category}`);
    if (item.status === "verified" && !item.sourceVerifiedAt) errors.push(`sourceVerifiedAt_required_for_verified:${category}`);
    if (item.sourceVerifiedAt != null && !validDateOnly(item.sourceVerifiedAt)) errors.push(`sourceVerifiedAt_invalid_or_future:${category}`);
    if (item.sourceVerifiedAt && item.checkedAt && item.sourceVerifiedAt > item.checkedAt) errors.push(`sourceVerifiedAt_after_checkedAt:${category}`);
    if (item.sourceUrl) {
      try {
        const source = new URL(item.sourceUrl);
        if (source.protocol !== "https:") {
          errors.push(`source_must_be_https:${category}`);
        }
        const requiresEvidence = ["verified", "official_general"].includes(item.status);
        if (requiresEvidence && isHomepage(item.sourceUrl)) {
          errors.push(`homepage_not_evidence:${category}`);
        }
      } catch {
        errors.push(`source_invalid:${category}`);
      }
    }
    if (item.officialUrl) {
      try {
        const official = new URL(item.officialUrl);
        if (official.protocol !== "https:") {
          errors.push(`official_url_must_be_https:${category}`);
        }
        if (isHomepage(item.officialUrl)) {
          errors.push(`official_url_must_be_specific_page:${category}`);
        }
      } catch {
        errors.push(`official_url_invalid:${category}`);
      }
    }
  }
  const notice = record.documentGenerationNotice;
  if (!notice || typeof notice !== "object" || Array.isArray(notice) || notice.showBeforeGeneration !== true || !clean(notice.message)) errors.push("document_generation_notice_required");
  if (notice && typeof notice === "object") {
    for (const key of Object.keys(notice)) if (!NOTICE_FIELDS.has(key)) errors.push(`unknown_document_notice_field:${key}`);
    if (typeof notice.message !== "string" || notice.message.length > 4000) errors.push("document_notice_message_invalid");
    if (notice.officialUrl) {
      try {
        const official = new URL(notice.officialUrl);
        if (official.protocol !== "https:") {
          errors.push("document_notice_url_must_be_https");
        }
      } catch {
        errors.push("document_notice_url_invalid");
      }
    } else {
      errors.push("document_notice_url_required");
    }
    if (
      notice.categoryInstructions != null &&
      (typeof notice.categoryInstructions !== "object" ||
        Array.isArray(notice.categoryInstructions))
    ) {
      errors.push("document_notice_category_instructions_invalid");
    }
  }
  return errors;
}

export { validateRecord };
