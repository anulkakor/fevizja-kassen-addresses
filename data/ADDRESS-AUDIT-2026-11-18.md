# Address audit — 2026-11-18

This audit covers all 92 insurers and all five document categories (460 category records). 72 insurer records were rechecked against official Krankenkasse sources on 2026-11-18; the other 20 had all five category source dates refreshed in the preceding audit on 2026-11-17. Every category has a `checkedAt` date.

- `research-staging.json` is the current category-level source of truth.
- `research-register.csv` and `.json` summarize the insurer-level research state.
- `address-audit-batch-2026-11-18.csv` and `.json` contain the audit evidence and routing decisions.
- A category is eligible for automatic address substitution only when its status is `verified` and its `sourceVerifiedAt` is fresh (maximum 180 days).
- Status counts across the 460 category records:
  - `verified`: 169 — eligible for automatic address substitution.
  - `conditional`: 82 — address may depend on PLZ, Bundesland, document type or a notice.
  - `individual_required`: 40 — use the individual Bescheid or other case-specific instructions.
  - `official_general`: 97 — an official general/contact address exists, but it is not approved as a mailing address for automatic use.
  - `unverified`: 50 — address not confirmed as a postal address.
  - `not_published`: 22 — no official address published for this category.
- The validation output's `undatedSources: 171` is not 171 unreviewed items. These are categories intentionally lacking `sourceVerifiedAt` because they are not approved for automatic mailing use: 58 `conditional`, 37 `individual_required`, 22 `not_published`, 50 `unverified`, and 4 `official_general`. There are **zero** `verified` categories missing `sourceVerifiedAt`.
- AOK and Pronova BKK require PLZ-based routing. DAK has Postzentrum routing by Bundesland and document type. These remain conditional/link cases until the application supplies and resolves the required input; the Worker must not guess.
- Three cases remain manual review: BKK Faber-Castell (Postfach not clearly designated as universal Postanschrift), BKK Freudenberg (two different Postanschriften), and BKK24 (official sources show 31683 vs 31681 Obernkirchen).
- Widerspruch addresses are category-specific. If the Bescheid's Rechtsbehelfsbelehrung gives another address, it takes precedence.

Validation after the batch: 92 catalog records, 92 staging records, 0 validation failures, 169 categories currently eligible for automatic mailing-address substitution.
