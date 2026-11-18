export const CATEGORIES = ["kuendigung", "general", "contributions", "widerspruch", "pflegekasse"];
export const STATUSES = ["verified", "official_general", "conditional", "individual_required", "unverified", "not_published", "outdated"];
export const RECORD_PREFIX = "address:v1:";
export const HISTORY_PREFIX = "history:v2:";
export const PENDING_PREFIX = "pending:";
export const MAX_BODY_BYTES = 256 * 1024;
export const MAX_HISTORY_ITEMS = 100;
export const SOURCE_MAX_AGE_DAYS = 180;
export const MAX_RECORDS = 50000;
export const ITEM_FIELDS = new Set([
  "status",
  "address",
  "sourceUrl",
  "officialUrl",
  "checkedAt",
  "notes",
  "checkedAtMeaning",
  "sourceVerifiedAt",
  "researchStatus",
  "researchNote",
  "usableForMailing",
]);
export const NOTICE_FIELDS = new Set(["showBeforeGeneration", "severity", "code", "message", "officialUrl", "categoryInstructions"]);

// Public API notice codes keyed by document category.
export const CATEGORY_NOTICES = Object.freeze({
  widerspruch: "check_bescheid_rechtsbehelfsbelehrung",
});
