# FeVizja Kassen Addresses Worker — v0.2.66

Worker przechowuje i udostępnia adresy korespondencyjne niemieckich kas chorych. Nie tworzy identyfikatorów kas — źródłem identyfikatorów pozostaje Worker 1 (`fevizja-kassen-api`).

## Zasada bezpieczeństwa adresów

- Adres jest zwracany do automatycznego użycia wyłącznie, gdy `status = verified`, istnieje `sourceVerifiedAt`, źródło jest konkretne (nie strona główna), a weryfikacja ma maksymalnie 180 dni.
- `verified` bez `sourceVerifiedAt` jest odrzucane przez walidację PUT.
- `official_general`, `conditional`, `individual_required`, `unverified`, `not_published` i `outdated` nie są automatycznie używane jako adres do wysyłki. API zwraca osobne pole `officialUrl` jako link dla użytkownika; `sourceUrl` pozostaje źródłem audytowym. Gdy brak konkretnego, oficjalnego adresu HTTPS, tryb to `manual_check`.
- `usableForMailing` jest wyliczane przy odczycie i nie jest zapisywane w KV.
- Dla kategorii `widerspruch` odpowiedzi `GET /api/resolve`, `GET /api/addresses/:insurerId/:category` oraz pełny rekord w `GET /api/addresses/:insurerId` zawierają stałe pole `notice: "check_bescheid_rechtsbehelfsbelehrung"`. Frontend musi wyświetlić komunikat, że w konkretnej sprawie pierwszeństwo ma aktualna `Rechtsbehelfsbelehrung` z otrzymanego Bescheid. Pole nie zastępuje analizy pouczenia ani nie zmienia adresu.
- `sourceVerifiedAt` nie może być późniejsze niż `checkedAt`.
- `conditional` może mieć `address: null`; jest to jawny, wspierany przypadek.

## Architektura kodu

Kod jest podzielony na moduły odpowiedzialne za odrębne obszary:

- `src/routes.js` — routing HTTP i składanie odpowiedzi; handlery `handleAudit`, `handlePut` i `handleAdminRead` są wydzielone jako osobne funkcje, a pozostałe odczyty mają własne handlery.
- `src/validation.js` — walidacja rekordów wejściowych.
- `src/policy.js` — reguły dopuszczania adresów i maskowania danych publicznych.
- `src/auth.js` — autoryzacja tokenem i rate limiting.
- `src/coordinator.js` — Durable Object i kontrola współbieżności.
- `src/storage.js` — odczyty KV, katalog Worker 1, paginacja i czyszczenie cache.
- `src/constants.js` — stałe, limity i nazwy kluczy.
- `src/utils.js` — współdzielone funkcje pomocnicze.
- `src/index.js` — publiczny punkt wejścia i eksporty modułów.

## Architektura i bindingi

- `KASSEN_API` — Service Binding do Workera 1.
- `ADDRESS_KV` — aktualne rekordy adresowe.
- `ADDRESS_HISTORY_KV` — historia zmian.
- `UPDATE_COORDINATOR` — Durable Object `FeVizjaUpdateCoordinator`, serializuje zapisy i egzekwuje kontrolę wersji.
- `ADMIN_RATE_LIMITER` — Cloudflare Rate Limiting binding, wymagany dla `/api/admin/*` i `/api/history/*`. Worker odmawia obsługi tych ścieżek (503), jeżeli binding nie istnieje. Brak `cf-connecting-ip` zwraca `400 CLIENT_IP_MISSING`, a nie 429. Wyłącznie lokalny host loopback w konfiguracji domyślnej development może pominąć ten nagłówek przez `LOCAL_DEV_ALLOW_MISSING_IP=true`; staging i production ustawiają `DEPLOY_ENV` jawnie i nie mają tego wyjątku. Główna konfiguracja ma nazwę `fevizja-kassen-addresses-dev`, aby zwykły `wrangler deploy` nie wskazywał Workera produkcyjnego.
- `ADDRESS_ADMIN_TOKEN` — sekret Bearer do endpointów administracyjnych i historii.
- `FRONTEND_ORIGINS` — dokładna lista dozwolonych originów, oddzielona przecinkami.

Cloudflare Rate Limiting jest limitem przybliżonym i rozdzielanym per lokalizacja Cloudflare. Obecna konfiguracja przewiduje 30 żądań/minutę na IP i klasę trasy. Nie jest to globalny, ścisły limit. Zapisy są dodatkowo serializowane przez Durable Object.

## Adresy środowisk

- Development: lokalny Wrangler, `http://localhost:5173` jako dozwolony origin.
- Staging: Worker `fevizja-kassen-addresses-staging` na `workers.dev`; dozwolony origin `http://localhost:5173`.
- Production: Custom Domain `https://api.fevizja.com`; docelowy frontend origin `https://app.fevizja.com`.

`app.fevizja.com` może zostać utworzona później. Wartość CORS jest już ustawiona na docelowy origin, ale sama nie tworzy DNS ani hostingu frontendu. Custom Domain API jest deklaracją konfiguracji Workera; DNS i certyfikat zostaną skonfigurowane przez Cloudflare podczas zatwierdzonego wdrożenia. Nie twórz równolegle ręcznego rekordu DNS dla `api.fevizja.com`.

## Izolacja konfiguracji CI

`wrangler.ci.toml` jest generowany z `wrangler.toml`, ale generator maskuje wszystkie sześć identyfikatorów KV syntetycznymi wartościami. Dzięki temu dry-run nie wskazuje prawdziwych namespace'ów development, staging ani production. `namespace_id` Rate Limiting nie jest identyfikatorem KV i pozostaje odrębny. Nie używaj pliku CI do deploy, importu ani operacji zapisu.

## Słownik komunikatów API (`notice`)

| Kod | Kategoria | Co pokazać użytkownikowi |
|---|---|---|
| `check_bescheid_rechtsbehelfsbelehrung` | `widerspruch` | „Przed wysłaniem sprawdź Rechtsbehelfsbelehrung w swoim Bescheid. Wskazany tam adres, organ i sposób wniesienia sprzeciwu mają pierwszeństwo w Twojej sprawie.” |

Kod jest zwracany wyłącznie dla kategorii `widerspruch`; dla pozostałych kategorii pole `notice` ma wartość `null`. Słownik kodów jest zdefiniowany centralnie w `src/constants.js`, a funkcja `noticeForCategory` w `src/policy.js` jest używana przez wszystkie odpowiedzi API. Frontend powinien mapować kod na komunikat dla użytkownika. Nie należy traktować ogólnego adresu z katalogu jako nadrzędnego wobec indywidualnego pouczenia.

## Harmonogram ponownej weryfikacji źródeł

Każde źródło ma maksymalny okres świeżości 180 dni, ale data wygaśnięcia nie oznacza, że Worker sam potrafi potwierdzić poprawność adresu. Automatyczny przegląd techniczny może wykryć źródła przeterminowane, niedostępne lub zmienione; potwierdzenie, że adres nadal jest właściwy dla konkretnego rodzaju pisma, wymaga sprawdzenia treści oficjalnej instrukcji. Pełny audyt wszystkich 92 kas należy wykonać najpóźniej 1 kwietnia 2027 r., przed wygaśnięciem najstarszych weryfikacji.

## Endpointy

- `GET /api/health`
- `GET /api/addresses`
- `GET /api/addresses/:insurerId`
- `GET /api/addresses/:insurerId/:category`
- `GET /api/resolve?insurerId=...&purpose=...`
- `GET /api/history/:insurerId` — token administracyjny + rate limit
- `GET /api/admin/audit` — token administracyjny + rate limit
- `GET /api/admin/addresses/:insurerId` — surowy rekord administracyjny z ETagiem; odczyt kanoniczny z Durable Object
- `PUT /api/admin/addresses/:insurerId` — token administracyjny + rate limit + `Content-Type: application/json` + `If-Match`

Wyłącznie `GET /api/admin/addresses/:insurerId` zwraca kanoniczny `ETag` z Durable Object. Do `If-Match` wolno używać tylko tej wartości (bez cudzysłowów). Publiczne GET-y korzystają z projekcji KV i celowo nie zwracają ETag, ponieważ KV może być opóźnione. Dla nowego rekordu używa się `If-Match: 0`. Konflikt wersji zwraca `409 VERSION_CONFLICT`; brak nagłówka zwraca `428 PRECONDITION_REQUIRED`.

Wszystkie odpowiedzi z danymi adresowymi mają `Cache-Control: no-store`. To celowe: nie chcemy, aby wycofany adres pozostał w publicznym cache.

## Reguły automatycznego podstawiania adresów

- Adres jest podstawiany automatycznie wyłącznie wtedy, gdy kategoria ma status `verified`, zawiera `sourceVerifiedAt` i źródło nie przekracza 180 dni.
- Statusy `conditional`, `individual_required`, `official_general`, `unverified` i `not_published` nie uprawniają do automatycznego użycia adresu. W takich przypadkach API zwraca oficjalny link lub instrukcję indywidualną.
- `sourceVerifiedAt` oznacza faktyczne potwierdzenie adresu lub reguły źródłowej; samo `checkedAt` nie daje prawa do użycia adresu.
- AOK i Pronova BKK wymagają ustalenia wariantu na podstawie PLZ. DAK ma routing Postzentrum zależny od Bundesland i rodzaju pisma. Dopóki API/front nie przekazuje i nie rozwiązuje tych danych, system pokazuje oficjalny link zamiast zgadywać.
- Dla Widerspruch pierwszeństwo ma adres i pouczenie z konkretnego Bescheid. Adres jest automatycznie używany tylko wtedy, gdy oficjalna instrukcja kasy wskazuje konkretny adres dla tej procedury.
- Szczegóły audytu 92 kas znajdują się w `data/ADDRESS-AUDIT-2026-11-18.md` i `data/address-audit-batch-2026-11-18.csv`.

## Walidacja danych

Walidacja odrzuca nieznane kategorie i pola kategorii, ogranicza typy i długości pól adresowych, notatek i nazwy kasy, wymaga HTTPS w źródłach i linkach użytkowych (`officialUrl`), odrzuca strony główne jako docelowe linki oraz sprawdza daty. Pola pochodne (np. `usableForMailing`) nie są utrwalane. Nie dopisujemy dat weryfikacji automatycznie.

`listAll` obsługuje paginację KV powyżej 1000 kluczy i ma limit bezpieczeństwa 50 000 rekordów.

## Instalacja i konfiguracja

1. `npm ci` instaluje zależności dokładnie według zatwierdzonego `package-lock.json` (Wrangler jest przypięty do wersji `4.164.0`). Przy zmianie `package.json` aktualizuj lockfile poleceniem `npm install --package-lock-only --ignore-scripts`, a następnie sprawdź `npm ci --ignore-scripts` i zatwierdź oba pliki razem.
2. Konfiguracja zawiera osobne namespace'y KV dla development, staging i production. Nie zamieniaj ich identyfikatorów na wspólne namespace'y i nie kopiuj danych między środowiskami bez osobnej procedury.
3. Sprawdź nazwy Service Bindingów Worker 1 dla staging i production.
4. Dla importu jawnie podaj `--env=staging` albo `--env=production`. Ustaw `FEVIZJA_ADDRESSES_API_URL`, `ADDRESS_ADMIN_TOKEN` oraz dokładną listę dozwolonych baz URL: `FEVIZJA_STAGING_ALLOWED_URLS` lub `FEVIZJA_PRODUCTION_ALLOWED_URLS` (wiele URL-i oddzielonych średnikiem). URL docelowy musi być dokładnym członkiem listy. Uruchom najpierw `node scripts/import-staging.mjs --env=staging --dry-run`. Skrypt pomija rekordy identyczne; rekordy istniejące, ale różniące się od stagingu, zachowuje bez zmian. Nadpisanie wymaga jawnego `--update-existing`; `--only-new` pomija wszystkie istniejące rekordy. Dla produkcji wymagane jest dodatkowe `--confirm-production`.
5. Ustaw sekret: `npx wrangler secret put ADDRESS_ADMIN_TOKEN --env staging` (osobno dla production po zatwierdzeniu wdrożenia).
6. Sprawdź, czy namespace IDs Rate Limiting (`25050`, `25051`, `25052`) nie są już używane na koncie Cloudflare. W razie potrzeby zmień je na unikalne dodatnie liczby całkowite.
7. `FRONTEND_ORIGINS` jest ustawione docelowo: staging dopuszcza `http://localhost:5173`, a production `https://app.fevizja.com`. Produkcyjny Worker ma Custom Domain `api.fevizja.com`; przypisanie domeny nastąpi dopiero przy zatwierdzonym wdrożeniu. Staging pozostaje na `workers.dev`.
8. Uruchom `npm test` i `npm run check`. Do sprawdzenia konfiguracji uruchom `npm run ci:wrangler-config`, a następnie `npm run dry-run:staging` i `npm run dry-run:production`. Generator zawsze zastępuje wszystkie sześć ID KV syntetycznymi wartościami testowymi, nawet gdy `wrangler.toml` zawiera prawdziwe ID. `wrangler.ci.toml` służy wyłącznie do dry-run; nie wolno go używać do deploy ani operacji KV.
9. `npm run dev` uruchamia lokalny Worker. `npm run deploy:staging` wdraża staging, a `npm run deploy:production` wdraża production i przypisuje `api.fevizja.com` — żadnego z tych poleceń nie uruchamiać bez osobnej zgody.

Durable Object wymaga migracji `v1` zdefiniowanej osobno dla środowiska bazowego, staging i production w `wrangler.toml`. DO zapisuje rekord oraz znacznik `pending:<insurerId>` w jednym batchu; alarm naprawia wyłącznie projekcje oznaczone jako oczekujące i kasuje się, gdy nie ma już oczekujących wpisów. Rate limiter, KV i Service Binding muszą być poprawnie skonfigurowane dla każdego środowiska. `npm test` używa atrap KV/DO/Rate Limiting; nie zastępuje testu na Cloudflare.

## Polecenia

- `npm test` — testy jednostkowe i integracyjne z atrapami oraz walidacja stagingu. Ten sam zestaw uruchamia GitHub Actions przy push i pull request.
- `npm run check` — kontrola składni wszystkich modułów `src/` i skryptów.
- `npm run validate:staging` — walidacja danych stagingowych.
- `node scripts/import-staging.mjs --env=staging --dry-run` — sprawdzenie 92 rekordów bez sieci i zapisu.
- `node scripts/import-staging.mjs --env=staging` — bezpieczny import: identyczne rekordy są pomijane, różniące się rekordy istniejące są zachowywane. `--update-existing` jawnie zezwala na aktualizację, a `--only-new` ogranicza import do brakujących rekordów.
- Odpowiedź HTTP 202 oznacza, że zapis kanoniczny w DO się udał, ale projekcja KV oczekuje na naprawę. Skrypt wypisuje ostrzeżenie i kończy kodem 2, jeśli wystąpił choć jeden taki przypadek.
- `npm run dev` — lokalny Wrangler.
- `npm run deploy:staging` — wdrożenie staging.

## Ograniczenia i uwagi operacyjne

Durable Object jest źródłem prawdy i atomowo zapisuje rekord wraz z wersją w jednym obiekcie stanu. ADDRESS_KV jest projekcją do publicznego odczytu; po awarii projekcji endpoint PUT zwraca HTTP 202 z `projectionStatus: pending`, a alarm Durable Object ponawia projekcję. Historia pozostaje osobnym magazynem i nie uczestniczy w transakcji rekordu. Nie należy wykonywać ręcznych zapisów do `ADDRESS_KV` poza koordynatorem.

`sourceVerifiedAt` oznacza datę faktycznego sprawdzenia konkretnego oficjalnego źródła, a nie datę utworzenia rekordu, importu ani edycji.

## Dokumentacja historyczna

Szczegółowa historia wersji znajduje się w [CHANGELOG.md](CHANGELOG.md).


### Import stagingu

Importer rozdziela `skippedOnlyNew` od `conflictsToReview`. Istniejące rekordy różniące się od stagingu są zachowywane i powodują ustawienie bitu `4` (`IMPORT_REVIEW_REQUIRED`); nie są automatycznie nadpisywane. `--only-new` pomija istniejące rekordy bez sygnalizowania konfliktu. Kody są maską bitową: `0` — bez problemów, `2` — oczekująca projekcja KV, `4` — konflikty do ręcznej kontroli, `6` — oba problemy jednocześnie (`2 | 4`).


### Importer exit codes

- `0`: import completed without review conflicts or pending KV projections.
- `2`: one or more Durable Object commits are waiting for KV projection.
- `4`: one or more existing records differ from staging and require manual review.
- `6`: both conditions occurred (`2 | 4`).

The importer uses a bitmask so pending projections and record conflicts are both reported when they occur together.
