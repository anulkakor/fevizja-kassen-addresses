## v0.2.66 — 2026-11-18

- Wydzielono słownik `CATEGORY_NOTICES` do `src/constants.js` i współdzieloną funkcję `noticeForCategory` do `src/policy.js`; routing i publiczne rekordy korzystają z jednej implementacji.
- Dodano do README tabelę kodów `notice` wraz z komunikatem przeznaczonym do wyświetlenia użytkownikowi.
- Przygotowano CI do przejścia na `npm ci`, ale pozostawiono `npm install` do czasu wygenerowania i sprawdzenia `package-lock.json` na komputerze z dostępem do rejestru npm.
- Nie wykonano wdrożenia ani importu danych do Cloudflare.

## v0.2.65 — 2026-11-18

- Dodano stałe pole API `notice: "check_bescheid_rechtsbehelfsbelehrung"` dla kategorii `widerspruch` w endpointach resolve, odczytu kategorii i pełnego rekordu.
- Uzupełniono dokumentację o wymagany komunikat frontendowy: przed wysłaniem sprzeciwu użytkownik ma sprawdzić pouczenie Rechtsbehelfsbelehrung w swoim Bescheid.
- Dodano test kontraktowy sprawdzający obecność pola `notice` we wszystkich trzech odpowiedziach API oraz brak komunikatu dla pozostałych kategorii.
- Ujednolicono format wpisu changelog: prefiks `v`, język polski i odstęp między sekcjami.
- Zaplanowano pełny audyt źródeł 92 kas najpóźniej na 1 kwietnia 2027 r.; kontrola automatyczna nie zastępuje ręcznej weryfikacji treści oficjalnych instrukcji.
- Nie wykonano deployu ani importu danych do Cloudflare.

## v0.2.64 — 2026-11-18

- Ponownie zweryfikowano oficjalne instrukcje i formularze Widerspruch dla BKK-Würth, energie-BKK, IKK gesund plus, KKH, KNAPPSCHAFT, novitas bkk, SVLFG, BKK Pfalz i SECURVITA BKK.
- Ujednolicono metadane dziewięciu kategorii Widerspruch: `checkedAt`, `sourceVerifiedAt` i `checkedAtMeaning` jednoznacznie wskazują ponowną weryfikację źródła 18.11.2026.
- Zachowano rozróżnienie między adresami Widerspruch a ogólnymi Postanschriften; dla konkretnej sprawy nadrzędne pozostaje pouczenie Rechtsbehelfsbelehrung z Bescheid.

## v0.2.63 — 2026-11-18

- Przeprowadzono pełny audyt routingu adresowego dla 92 kas i pięciu kategorii dokumentów. 72 rekordy ponownie sprawdzono 18.11.2026; pozostałe 20 miały świeże daty źródeł z audytu 17.11.2026.
- Liczba kategorii z adresem dopuszczonym do automatycznego podstawienia wzrosła z 36 do 169. Każda z 460 kategorii ma decyzję: adres potwierdzony, link oficjalny, warunek regionalny albo wymóg indywidualnego sprawdzenia.
- Dodano pełny ślad audytu `data/address-audit-batch-2026-11-18.csv/.json` oraz podsumowanie `data/ADDRESS-AUDIT-2026-11-18.md`; zaktualizowano `research-register` i `research-staging`.
- Rozdzielono adresy zależne od rodzaju pisma, w tym BKK PwC, TK, VIACTIV, Mobil Krankenkasse i inne kasy. Widerspruch korzysta z adresu specyficznego tylko tam, gdzie potwierdza go oficjalna instrukcja; w przeciwnym razie wymagane jest sprawdzenie Rechtsbehelfsbelehrung z Bescheid.
- AOK i Pronova pozostają warunkowe z uwagi na PLZ; DAK wymaga rozróżnienia Bundesland i rodzaju pisma. Worker nie zgaduje adresu i w tych przypadkach zwraca oficjalny link.
- Trzy sprawy pozostawiono do ręcznej kontroli: BKK Faber-Castell, BKK Freudenberg i BKK24. Nie podstawiać niejednoznacznych adresów.
- Testy: 70/70; walidacja stagingu: 92 rekordy, 0 błędów, 169 kategorii gotowych do automatycznego użycia adresu; kontrola składni: 12 modułów.
- Nie wykonano deployu ani importu do Cloudflare. `package-lock.json` nie został wygenerowany, ponieważ środowisko nie ma dostępu do cache/registry npm (`ENOTCACHED`); CI pozostaje przy `npm install`, bez niebezpiecznego przełączania na `npm ci` bez lockfile.

## v0.2.62 — 2026-11-18

- Ustawiono docelowy produkcyjny Custom Domain `api.fevizja.com`; staging pozostaje na `workers.dev`, a CORS production dopuszcza przyszły frontend `https://app.fevizja.com`.
- Wpisano sześć oddzielnych identyfikatorów KV utworzonych dla development, staging i production.
- Naprawiono generator `wrangler.ci.toml`: zawsze maskuje wszystkie sześć ID KV syntetycznymi wartościami i odmawia zapisu, jeśli liczba identyfikatorów jest inna niż oczekiwana. Dry-run CI nie korzysta z prawdziwych namespace'ów.
- Jawnie ustawiono `LOCAL_DEV_ALLOW_MISSING_IP = "false"` w staging i production, zachowując wyjątek wyłącznie w lokalnym development.
- Zaktualizowano Wrangler do `4.164.0` i poprawiono dokumentację konfiguracji środowisk oraz domen.
- Nie wykonano deployu, nie skonfigurowano DNS i nie importowano danych do Cloudflare KV.

## v0.2.61 — 2026-11-18

- Zawinięto długie linie w `utils.js`, `constants.js` i `storage.js` bez zmiany zachowania modułów.
- Rozszerzono test czytelności: limit 200 znaków jest teraz sprawdzany dla każdego pliku `src/*.js`, a nie tylko krytycznych modułów.
- Dane adresowe, endpointy, konfiguracja środowisk i logika Workera pozostały bez zmian.
- Nie wykonano deployu ani importu do Cloudflare KV.

## v0.2.60 — 2026-11-18

- Wydzielono handlery `handleAudit`, `handlePut` i `handleAdminRead` w `src/routes.js`; dodatkowo wydzielono handlery listy adresów, historii, odczytu adresu i resolve.
- Rozbito długie instrukcje i obiekty odpowiedzi na czytelne bloki w `routes.js`, `validation.js` i `policy.js`.
- Zachowano dotychczasowe ścieżki API, statusy HTTP, kontrakty odpowiedzi, kolejność walidacji i eksporty Workera.
- Dodano testy pilnujące istnienia wydzielonych handlerów i limitu długości linii w krytycznych modułach.
- Testy: 69/69; walidacja stagingu: 92 rekordy, 0 błędów; kontrola składni: 12 modułów.
- Próba wygenerowania `package-lock.json` zakończyła się timeoutem npm registry. CI pozostaje przy `npm install --ignore-scripts`; nie dodano niekompletnego lockfile i nie przełączono CI na `npm ci`.
- Nie wykonano deployu ani importu do Cloudflare KV.

## v0.2.59 — 2026-11-18

- Rozdzielono kod Workera na moduły: routes, validation, policy, auth, coordinator, storage, constants i utils.
- `src/index.js` jest teraz cienkim punktem wejścia, zachowującym dotychczasowe eksporty używane przez testy i Worker.
- Dodano test granic modułów oraz skrypt kontroli składni wszystkich plików źródłowych i skryptów.
- Zaktualizowano README i numer wersji pakietu.
- Dane stagingowe i rekordy adresowe nie zostały zmienione.
- Nie wykonano deployu ani importu do Cloudflare KV.

## v0.2.58 — 2026-11-18

- Corrected the README importer description: conflicts set bit `4`, pending KV projections set bit `2`, and both conditions produce exit code `6`. Verified that the dedicated “Importer exit codes” section documents the same bitmask.
- A valid `package-lock.json` could not be generated because npm registry access timed out / was unavailable (`EAI_AGAIN` / `ENOTCACHED`). CI remains on `npm install`; switching to `npm ci` without a complete lockfile would make CI fail.
- No Worker deployment or Cloudflare KV import was performed.

## v0.2.57 — 2026-11-18

- Fixed IPv6 loopback detection for `[::1]` in local development.
- Combined importer exit conditions with a bitmask: `2` for pending KV projection and `4` for conflicts; both produce exit code `6`.
- Added regression tests for IPv6 and simultaneous importer outcomes.

# Changelog

## 0.2.56 — 2026-11-18

- Changed the root Wrangler Worker name to `fevizja-kassen-addresses-dev` to prevent an unqualified deploy from targeting production.
- Added a loopback-only development escape hatch for missing `cf-connecting-ip`; staging and production explicitly set their deployment environment and do not enable it.
- Split importer counters into `skippedOnlyNew` and `conflictsToReview`; preserved differing records now produce exit code 3 and `IMPORT_REVIEW_REQUIRED`.
- Added importer regression tests for differing existing records and `--only-new`.
- Added tests proving the missing-IP bypass is limited to local development.


## v0.2.54 — 2026-11-18

- Dodano migracje Durable Object `FeVizjaUpdateCoordinator` osobno dla staging i production.
- Durable Object zapisuje kanoniczny rekord i wersję jednym `storage.put`; ADDRESS_KV jest projekcją, a alarm ponawia projekcję po awarii.
- Dodano administracyjny GET surowego rekordu z ETagiem; odczyt uwzględnia kanoniczny stan Durable Object i wersje starszych rekordów.
- Dodano `scripts/import-staging.mjs` z `--dry-run`, odczytem ETagów i ochroną przed przypadkowym importem na produkcję.
- Rate limiting odrzuca żądania bez `cf-connecting-ip`, zamiast współdzielić bucket `unknown`.
- `npm test` uruchamia teraz również walidację stagingu.
- Ujednolicono nagłówki CHANGELOG.
- Nie wykonano wdrożenia ani importu danych. Testy na prawdziwym `wrangler dev` pozostają wymagane przed wdrożeniem.

## v0.2.53 — 2026-11-18

- Dodano osobne pole kategorii `officialUrl` dla linku pokazywanego użytkownikowi; `sourceUrl` pozostaje źródłem audytowym.
- API wybiera link w kolejności: `officialUrl`, konkretne `sourceUrl`, następnie `documentGenerationNotice.officialUrl`.
- Linki muszą używać HTTPS i wskazywać konkretną stronę, nie stronę główną. Brak odpowiedniego linku daje `manual_check`.
- Uzupełniono `officialUrl` w stagingu dla 455 kategorii na podstawie istniejących, konkretnych oficjalnych URL-i. Po odjęciu 36 kategorii z potwierdzonym adresem, API udostępnia 419 linków dla niepotwierdzonych adresów; pięć kategorii bez konkretnego źródła pozostawiono w trybie `manual_check`.
- Dodano testy pierwszeństwa `officialUrl` i odrzucania strony głównej.

## v0.2.52 — 2026-11-17

- Ponownie sprawdzono 15 kategorii `official_general` na oficjalnych stronach Audi BKK (bez formalnego Widerspruch), BKK GILDEMEISTER SEIDENSTICKER, BKK Groz-Beckert i mkk.
- Wpisy promowano do `verified` wyłącznie tam, gdzie oficjalna strona jednoznacznie wskazuje Postanschrift / adres do korespondencji.
- Zaktualizowano źródła, notatki oraz instrukcje generowania dokumentów; nie zmieniano pozostałych statusów ani nie dopisywano dat do nieweryfikowanych wpisów.

## v0.2.51 — 2026-11-17

- Po ponownym sprawdzeniu oficjalnych stron 16 rekordów `verified` w kategorii `widerspruch` otrzymało `sourceVerifiedAt: 2026-11-17`.
- Dla BKK Miele, BKK Pfalz i BKK PwC podmieniono ogólne URL-e na bezpośrednie oficjalne instrukcje Widerspruch.
- Nie zmieniano statusów innych kategorii ani nie dopisywano dat na podstawie samego `checkedAt`.
- Nie wykonano wdrożenia ani importu do Cloudflare.


## v0.2.50 — bezpieczeństwo i integralność zapisów

- Autoryzacja porównuje skróty SHA-256 o stałej długości zamiast ujawniać długość tokena.
- `/api/admin/*` i `/api/history/*` wymagają Cloudflare Rate Limiting binding; brak bindingu blokuje dostęp.
- PUT wymaga `If-Match`; Durable Object serializuje zapisy, zwraca 409 przy konflikcie i zwiększa wersję rekordu.
- GET rekordu i resolve zwracają ETag; odpowiedzi z adresami mają `Cache-Control: no-store`.
- Walidacja wymaga `sourceVerifiedAt` dla `verified`, sprawdza relację dat, długości i typy pól oraz odrzuca nieznane kategorie/pola.
- `usableForMailing` nie jest zapisywane w KV; jest obliczane przy odczycie.
- Dodano 60-sekundowy cache katalogu Workera 1 i poprawioną paginację KV z limitem bezpieczeństwa.
- Obsługa historii loguje błąd znacznika committed; CORS uwzględnia `Access-Control-Request-Headers`; PUT wymaga JSON.
- README uproszczono, historię wersji przeniesiono do CHANGELOG.md; dodano konfigurację staging/production i skrypty npm.
- Testy: 43/43 zaliczone. Walidacja stagingu nadal blokuje 16 rekordów z kategorią `widerspruch` oznaczoną `verified`, ale bez daty źródłowej; nie dopisano dat automatycznie.
- Nie wykonano wdrożenia ani importu do Cloudflare.

## v0.2.1 — audit i rejestr 92 kas
- `GET /api/admin/audit` (Bearer `ADDRESS_ADMIN_TOKEN`) porównuje Worker 1 z rekordami KV i raportuje braki, obce ID, niekompletne kategorie, nieaktualne źródła (>180 dni), nieprawidłowe URL-e oraz duplikaty.
- `data/research-register.json` i `.csv` zawierają dokładnie 92 ID/nazwy skopiowane z rzeczywistego snapshotu katalogu Worker 1 z 16.11.2026. Wszystkie wpisy mają `needs_reconciliation`; nie przypisano automatycznie dawnych notatek researchowych.
- Endpoint PUT wymaga zgodności ID z URL i treścią JSON. Odczyt kategorii brakującej w zapisanym rekordzie zwraca 404.
- CORS domyślnie ograniczony do localhost; skonfiguruj wyłącznie preview origin przed testem. Nie ustawiaj fevizja.com bez osobnej zgody.
- Nadal brak wdrożenia i brak testu Service Binding/KV na Cloudflare.


## v0.2.2 — migracja wcześniejszego researchu

`data/research-staging.json` zawiera 48 rekordów dopasowanych do rzeczywistych `insurerId` z Workera 1. Są to dane stagingowe wymagające ponownej kontroli źródeł; nie należy ich automatycznie importować do KV. Trzy wcześniejsze rekordy bez potwierdzonego ID zachowano w `unmatchedRecords`. Rejestr 92 kas aktualizuje statusy dla 48 rekordów, pozostałe 44 nadal mają `needs_reconciliation`.


## v0.2.3 — audyt partii AOK + DAK

- AOK: wycofano niepotwierdzone adresy miejscowości; oficjalna strona wymaga PLZ do ustalenia Postanschrift. AOK Rheinland-Pfalz/Saarland ma jawnie opublikowany adres 56040 Koblenz.
- DAK: zaktualizowano mapę Postzentrum na podstawie oficjalnej publikacji fit 1/2026. Bayern = 22777 Hamburg; 22778 dotyczy Berlin, Brandenburg, Sachsen i Thüringen.
- Nadal staging only; bez zapisu do Cloudflare KV i bez wdrożenia.


## v0.2.4 — ponowna weryfikacja adresów z partii 6

Dodano 10 rekordów z potwierdzonymi identyfikatorami katalogu Workera 1:
- BKK Linde (`bkk-linde`): historyczny Postfach z zewnętrznego rejestru ma datę ważności od 2013 r.; status `outdated`.
- BKK Pfalz (`bkk-pfalz`), BKK24 (`bkk24`), Bosch BKK (`bosch-bkk`), BKK Herkules (`bkk-herkules`), BKK MAHLE (`bkk-mahle`), BKK MTU (`bkk-mtu`), BKK Rieker.RICOSTA.Weisser (`bkk-rieker-ricosta-weisser`) i BKK_DürkoppAdler (`bkk-durkoppadler`): oficjalne źródła podają adresy siedziby/kontaktu, ale nie potwierdzają ich jednoznacznie jako Postanschrift; status `unverified`.
- BKK Schwarzwald-Baar-Heuberg (`bkk-schwarzwald-baar-heuberg`): oficjalny Impressum mówi, że sprawy można wysyłać bezpośrednio na podane adresy; główna administracja Löhrstraße 45, 78647 Trossingen, status `official_general`.

Dla wszystkich 10 kas Widerspruch ma status `individual_required`. Nie użyto adresów Datenschutzbeauftragter jako adresów korespondencji ogólnej.
Wersja staging only – bez importu do Cloudflare KV i bez wdrożenia.


## v0.2.5 — kolejna partia 15 kas

Dodano: BARMER, BERGISCHE KRANKENKASSE, Bertelsmann BKK, BKK Pfaff, BKK EWE, BKK Miele, Mobil Krankenkasse, BKK PwC, BKK Technoform, BIG direkt gesund, BKK Akzo Nobel Bayern, BKK B. Braun Aesculap, BKK Deutsche Bank AG, BKK Diakonie, BKK EUREGIO.

Jednoznacznie potwierdzone Postanschrift/Postweg:
- BARMER – 73524 Schwäbisch Gmünd
- BERGISCHE KRANKENKASSE – 42715 Solingen
- Bertelsmann BKK – Postfach 170, 33311 Gütersloh
- Mobil Krankenkasse – 20091 Hamburg
- BKK Technoform – Beleglesezentrum, 30645 Hannover
- BKK Deutsche Bank AG – Königsallee 60c, 40212 Düsseldorf

Pozostałe dziewięć adresów to oficjalne adresy kontaktowe/siedziby lub wpis rejestru zewnętrznego, ale bez jednoznacznego potwierdzenia ogólnej Postanschrift; pozostają `unverified`.
Widerspruch dla wszystkich 15: `individual_required`.
Wersja staging only – bez importu do Cloudflare KV i bez wdrożenia.


## v0.2.6 — AOK Baden-Württemberg i komunikat przed generowaniem

- AOK Baden-Württemberg: oficjalny Posteingangsservice, 70147 Stuttgart, dla wniosków i dokumentów. `general` i `pflegekasse` = `official_general`; `kuendigung` = `conditional`; `contributions` = `not_published`; `widerspruch` = `individual_required`.
- AOK Niedersachsen i AOK Hessen: dodano pole `documentGenerationNotice` z komunikatem, że Postanschrift należy ustalić po PLZ. Ma być wyświetlane przed wygenerowaniem dokumentu.
- Ważne: samo zapisanie pola w Workerze nie wystarczy do wyświetlenia komunikatu. Frontend generatora dokumentów musi odczytać `documentGenerationNotice` i pokazać je przed generowaniem.
- Staging only; bez importu do Cloudflare KV i bez wdrożenia.

## v0.2.7 — AOK batch (2026-11-16)

- AOK Bayern: no universal static Postanschrift confirmed; official lookup requires the insured person's postal code. Added a pre-generation notice (`documentGenerationNotice`). The Munich registered-office address is not used as a mailing address.
- AOK Bremen/Bremerhaven: official AOK regional page explicitly labels Bürgermeister-Smidt-Straße 95, 28195 Bremen as `Postanschrift`.
- AOK Nordost: official AOK regional page explicitly lists `AOK Nordost – Die Gesundheitskasse, 14456 Potsdam` as the `Postanschrift`; the street address of the Potsdam service center is kept separate and not used for mail.
- For all three insurers, `Widerspruch` remains `individual_required` (use the notice in the individual Bescheid). No Cloudflare deployment and no KV import were performed.


## v0.2.8 — AOK batch (2026-11-16)

- AOK Rheinland/Hamburg: official regional page explicitly lists 40466 Düsseldorf as `Postanschrift`; Hamburg branch addresses are not used for mail.
- AOK NordWest: official AOK imprint lists 58079 Hagen as `Postadresse`, distinct from the registered office in Dortmund.
- AOK PLUS: official regional pages show different postal addresses depending on the local region (examples: Dresden 01058, Leipzig 04087, Suhl 98523). No single universal address was assumed; added a mandatory pre-generation notice requiring lookup by the insured person's postal code.
- For all three insurers, `Widerspruch` remains `individual_required`; no separate public insured-person `Beitragsabteilung` address was confirmed.
- Staging only: no Cloudflare deployment and no KV import.


## v0.2.9 — AOK Rheinland-Pfalz/Saarland, Hessen i Sachsen-Anhalt (2026-11-16)

- AOK Rheinland-Pfalz/Saarland: ponownie potwierdzono oficjalną Postanschrift 56040 Koblenz. Nie używa się adresu siedziby Virchowstraße 30, 67304 Eisenberg jako adresu korespondencyjnego. Dla Beitragsabteilung i Pflegekasse nie znaleziono osobnego adresu; używany jest wyłącznie oficjalny adres ogólny. Widerspruch pozostaje `individual_required`.
- AOK Hessen i AOK Sachsen-Anhalt: nie znaleziono wystarczającego potwierdzenia stałej, uniwersalnej Postanschrift. Oficjalna wyszukiwarka AOK wymaga ustalenia adresu według PLZ. Dodano `documentGenerationNotice` wymagający sprawdzenia adresu przed wygenerowaniem dokumentu. Adresy z Impressum (Bad Homburg/Magdeburg) nie są automatycznie adresami pocztowymi.
- Rejestr JSON/CSV zsynchronizowano z wynikami audytu.
- Staging only: bez importu do Cloudflare KV i bez wdrożenia.


## v0.2.10 — ponowny audyt trzech AOK (16.11.2026)

- AOK Niedersachsen: użyto dedykowanej oficjalnej strony Postanschrift; adres wymaga ustalenia po PLZ.
- AOK Bayern: użyto dedykowanej oficjalnej strony Postanschrift; adres wymaga ustalenia po PLZ; nie używać adresu centrali jako zamiennika.
- AOK Baden-Württemberg: zakres adresu 70147 Stuttgart ograniczono do wniosków i formularzy; general i Pflegekasse oznaczono jako conditional, a komunikat przed generowaniem wymaga sprawdzenia dla innej korespondencji.
- Widerspruch nadal wymaga adresu z indywidualnego Bescheid.
- Bez wdrożenia i bez importu do Cloudflare KV.


## v0.2.11 — trzy kolejne kasy (2026-11-16)

- BAHN-BKK: oficjalna Postadresse `BAHN-BKK, PostCenter, 48123 Münster`; oficjalna instrukcja Widerspruch potwierdza ten sam adres i wymóg podpisu.
- BKK evm: Impressum jednoznacznie oznacza `Schützenstraße 80-82, 56068 Koblenz` jako Postanschrift. Brak osobno potwierdzonych adresów Beitragsabteilung/Pflegekasse; Widerspruch indywidualny.
- BKK firmus: oficjalny Transparenzbericht wymienia `Gottlieb-Daimler-Straße 11, 28237 Bremen` w sekcji Post; zgodne z aktualnym Impressum. Adres pracodawcy/rozliczeń składek nie został pomylony z korespondencją ubezpieczonych. Widerspruch indywidualny.
- 76 rekordów stagingowych; brak wdrożenia i brak importu do Cloudflare KV.


## v0.2.12 — trzy kolejne kasy (2026-11-16)

- BKK ProVita (`bkk-provita`): oficjalna Postanschrift Münchner Weg 5, 85232 Bergkirchen. Oficjalna procedura Widerspruch potwierdza ten sam adres, miesięczny termin oraz dopuszczalne kanały; zwykły e-mail i telefon są niedopuszczalne.
- BKK WERRA-MEISSNER (`bkk-werra-meissner`): oficjalna strona kontaktowa jawnie wskazuje Postanschrift Sudetenlandstraße 2a, 37269 Eschwege. Adres placówki w Witzenhausen nie jest używany do wysyłki.
- BKK WIRTSCHAFT UND FINANZEN (`bkk-wirtschaft-und-finanzen`): oficjalna strona kontaktowa wskazuje Postanschrift Bahnhofstraße 19, 34212 Melsungen. Niederlassung Kassel to adres dla odwiedzających. Oddzielny fax Pflegeversicherung nie jest osobnym adresem pocztowym.
- Dla wszystkich trzech kas dodano komplet pięciu kategorii. `Widerspruch` BKK ProVita ma status `verified`; w dwóch pozostałych kasach pozostaje `individual_required`.
- 79 rekordów stagingowych; rejestr JSON/CSV zsynchronizowany. Bez wdrożenia i bez importu do Cloudflare KV.


## v0.2.13 — BKK exklusiv, BKK Faber-Castell & Partner, BKK Freudenberg (2026-11-16)

- **BKK exklusiv**: centralna Postadresse `BKK exklusiv, 31273 Lehrte` potwierdzona; oficjalna procedura Widerspruch wskazuje ten sam adres i zasadniczy termin jednego miesiąca. Adres odwiedzin w Lehrte nie jest adresem pocztowym.
- **BKK Faber-Castell & Partner**: aktualne Impressum podaje Bahnhofstraße 45, 94209 Regen jako adres podmiotu, ale nie potwierdza Postanschrift. Wcześniejszy Postfach 1265, 94202 Regen nie został ponownie potwierdzony i nie jest używany. Procedura Widerspruch opublikowana; brak konkretnego adresu pocztowego.
- **BKK Freudenberg**: oficjalna strona publikuje dwie Postanschriften (Weinheim i Neuenburg), bez jasnej reguły przypisania. Kategorie wymagające adresu mają status `conditional` i komunikat o konieczności potwierdzenia właściwej lokalizacji przed generowaniem dokumentu.
- Zaktualizowano 3 istniejące rekordy; staging pozostaje na poziomie 79 rekordów. Rejestr JSON/CSV zsynchronizowany.
- Brak wdrożenia i brak importu do Cloudflare KV.

## v0.2.14 — BKK GILDEMEISTER SEIDENSTICKER, BKK Groz-Beckert, BKK Herkules (2026-11-16)

- BKK GILDEMEISTER SEIDENSTICKER: potwierdzono ogólną Postanschrift `Postfach 14 01 60, 33621 Bielefeld` dla korespondencji papierowej. Adres `Winterstraße 49, 33649 Bielefeld` jest adresem siedziby/placówki. Beitragsabteilung bez osobnego adresu; formalny Widerspruch kierować według Rechtsbehelfsbelehrung z konkretnego Bescheid.
- BKK Groz-Beckert: potwierdzono Postanschrift `Postfach 10 00 27, 72421 Albstadt`; odrębna Hausanschrift to `Unter dem Malesfelsen 72, 72458 Albstadt`. Beitragsabteilung bez osobnego adresu; Widerspruch według indywidualnego Bescheid.
- BKK Herkules: `Jordanstraße 6, 34117 Kassel` pozostaje wyłącznie adresem Geschäftsstelle, nie potwierdzono Postanschrift. Usunięto ten adres z pól używanych do generowania kopert. Alternatywny kanał: Onlinefiliale z bezpieczną skrzynką wiadomości; dział składek i Pflege mają opublikowane kontakty telefoniczne/e-mail, ale nie adres pocztowy.
- Zaktualizowano `research-staging.json`, `research-register.json`, `research-register.csv` i wersję pakietu. Bez wdrożenia i bez importu KV.


## v0.2.15 — ponowna weryfikacja trzech kas (16.11.2026)

- **BKK MAHLE** (`bkk-mahle`): oficjalne Impressum potwierdza wyłącznie Kassensitz Pragstraße 26–46, 70376 Stuttgart; brak potwierdzenia Postanschrift. Adres z formularza ePA dotyczy tylko sprzeciwu ePA, nie ogólnego Widerspruch.
- **bkk melitta hmr** (`bkk-melitta-hmr`): potwierdzona zentrale Postanschrift Postfach 1224, 32372 Minden. Widerspruch w ciągu miesiąca do organu, który wydał Bescheid; zwykły e-mail niedopuszczalny; Onlinegeschäftsstelle akceptuje formularz bez odręcznego podpisu. Pflegekasse ma osobny kontakt, bez osobnej Postanschrift.
- **mkk – meine krankenkasse** (`bkk-mkk-meine-krankenkasse`): potwierdzona Postanschrift 10857 Berlin; Hauptverwaltung Prenzlauer Allee 96, 10409 Berlin jest odrębna. Pflegekasse publikuje ten sam adres 10857 Berlin. Widerspruch zasadniczo w ciągu miesiąca; kanały i wymóg podpisu opisane na stronie mkk.
- Zaktualizowano staging, register JSON/CSV i wersję pakietu. Bez wdrożenia i bez importu KV.


## v0.2.16 — BKK MTU, BKK Pfalz, BKK ProVita (2026-11-16)

- **BKK MTU** (`bkk-mtu`): odnaleziono oficjalny materiał BKK MTU, który wyraźnie rozdziela Hausanschrift i Postanschrift. Do korespondencji: `BKK MTU, 88045 Friedrichshafen` (bez ulicy). Hochstraße 40 to adres Hausanschrift/kontaktu, nie należy go dopisywać do Postanschrift. Nie znaleziono uniwersalnej instrukcji Widerspruch; pozostaje `individual_required`.
- **BKK Pfalz** (`bkk-pfalz`): oficjalna strona Ansprechpartner jawnie oznacza `Lichtenbergerstraße 16, 67059 Ludwigshafen` jako zentrale Postanschrift. Osobna oficjalna instrukcja Widerspruch wskazuje ten sam adres i termin jednego miesiąca. Kundenzentrum przy Ludwigstraße 30a nie jest adresem pocztowym.
- **BKK ProVita** (`bkk-provita`): ponownie potwierdzono Postanschrift `Münchner Weg 5, 85232 Bergkirchen` i formalną procedurę Widerspruch (miesiąc; pisemnie, kwalifikowany podpis elektroniczny albo do protokołu; zwykły e-mail i telefon niedopuszczalne).
- Zaktualizowano trzy istniejące rekordy; staging pozostaje na poziomie 79 rekordów. Rejestr JSON/CSV zsynchronizowany.
- Staging only: bez importu do Cloudflare KV i bez wdrożenia.


## v0.2.19 — BKK Public, BKK Salzgitter, BKK Scheufelen (2026-11-16)

- **BKK Public** (`bkk-public`): oficjalna Postanschrift `BKK Public, 30645 Hannover`. Procedura Widerspruch obejmuje decyzje BKK i Pflegekasse, zasadniczo miesiąc. Brak osobnego adresu Beitragsabteilung. Widerspruch kierowany warunkowo na centralną Postanschrift; indywidualny Bescheid ma pierwszeństwo.
- **BKK Salzgitter** (`bkk-salzgitter`): oficjalna Postanschrift `BKK Salzgitter, 30645 Hannover`. Adresy oddziałów, w tym Thiestraße 15 w Salzgitter, nie są adresem pocztowym. Procedura Widerspruch obejmuje Pflegekasse; centralny adres warunkowy, z pierwszeństwem indywidualnego Bescheid.
- **BKK Scheufelen** (`bkk-scheufelen`): oficjalna Postanschrift `BKK Scheufelen, 73228 Kirchheim/Teck` — bez ulicy. Schöllkopfstraße 65, 73230 Kirchheim/Teck to adres głównej Geschäftsstelle i siedziba Widerspruchsausschuss; nie podstawiać automatycznie jako adresu pocztowego. Widerspruch pozostaje `individual_required`. Postfach ARGE GSV PLUS dotyczy pracodawców.
- Zaktualizowano trzy istniejące rekordy; staging pozostaje na poziomie 79 rekordów. Rejestr JSON/CSV zsynchronizowany.
- Staging only: bez importu do Cloudflare KV i bez wdrożenia.


## History note 2 (legacy v0.2.19) – audyt kolejnych trzech kas (2026-11-16)

- BKK Schwarzwald-Baar-Heuberg: ponownie potwierdzono centralny adres Löhrstraße 45, 78647 Trossingen; oficjalna strona określa go jako Zentrale Postanschrift w kontekście Entlassmanagement. Widerspruch pozostaje zależny od indywidualnego Bescheid; znaleziony formularz dotyczy konkretnego rodzaju sprzeciwu.
- BKK VDN: oficjalna strona wyraźnie rozróżnia Hausanschrift Rosenweg 15, 58239 Schwerte i Postanschrift Postfach 1160, 58206 Schwerte. Widerspruch: indywidualny Bescheid.
- BKK VerbundPlus: potwierdzono Zentrale Postanschrift Zeppelinring 13, 88400 Biberach oraz pisemną procedurę Widerspruch pod tym adresem (termin miesiąc; wymagany podpis odręczny; e-mail i fax niedopuszczalne).

Wersja stagingowa. Bez wdrożenia i bez importu do Cloudflare KV.


## History note 3 (legacy v0.2.19) – ponowna weryfikacja BKK-Würth, BKK24 i BKK_DürkoppAdler (2026-11-16)

- BKK-Würth: potwierdzono rozdział Postanschrift (Postfach, 74650 Künzelsau) i Hausanschrift (Gartenstraße 11, 74653 Künzelsau). Oficjalna procedura Widerspruch kieruje pismo na Hausanschrift; termin miesiąca, zwykły e-mail niedopuszczalny.
- BKK24: oficjalna instrukcja Widerspruch potwierdza wysyłkę pocztą na Sülbecker Brand 1, 31683 Obernkirchen; termin miesiąca, podpis odręczny lub wskazane kanały elektroniczne. Adres kontaktowy nie jest formalnie opisany jako Postanschrift.
- BKK_DürkoppAdler: Stieghorster Straße 66, 33605 Bielefeld jest adresem siedziby/kontaktu, ale nie potwierdzono go jako Postanschrift. Zwykłe dokumenty nie otrzymują automatycznie adresu kopertowego; dostępny jest formularz kontaktowy, e-mail i telefon.

Wersja stagingowa. Bez wdrożenia i bez importu do Cloudflare KV.


## v0.2.20 — BMW BKK, Bosch BKK, Continentale Betriebskrankenkasse (2026-11-16)

- **BMW BKK** (`bmw-bkk`): ponownie potwierdzono ogólną Postanschrift `Postfach 15 33, 84126 Dingolfing`; oficjalna strona prosi o wysyłanie tam wszystkich listów. Oficjalna instrukcja Widerspruch wskazuje ten sam adres, termin miesiąca, wymóg danych decyzji i odręcznego podpisu; skan podpisanego pisma można przesłać przez aplikację. Zwykły e-mail nie wystarcza.
- **Bosch BKK** (`bosch-bkk`): `Kruppstraße 19, 70469 Stuttgart` potwierdzono wyłącznie jako adres z Impressum, nie jako Postanschrift. Nie jest używany jako potwierdzony adres kopertowy. `Postfach 30 02 80, 70442 Stuttgart` dotyczy wyłącznie Datenschutzbeauftragter. Oficjalna procedura Widerspruch: zasadniczo miesiąc; pismo, osobiste złożenie w Geschäftsstelle lub portal klienta; strona nie podaje adresu pocztowego, więc pozostaje `individual_required`.
- **Continentale Betriebskrankenkasse** (`continentale-betriebskrankenkasse`): dodano brakujący rekord pod dokładnym ID z katalogu Workera 1. Potwierdzona Postanschrift: `Continentale Betriebskrankenkasse, Zentraler Posteingang, 30645 Hannover`. `Sengelmannstraße 120, 22335 Hamburg` to adres siedziby, nie pocztowy. Oficjalna procedura Widerspruch obejmuje Kranken- i Pflegekasse oraz Beitragsbescheide; termin miesiąca, pismo z własnoręcznym podpisem, do protokołu lub Service-App. Zwykły e-mail i telefon nie są prawnie skuteczne.
- Zaktualizowano trzy rekordy (BMW BKK i Bosch BKK) oraz dodano brakujący rekord Continentale BKK. Staging wzrósł z 79 do 80 rekordów; register JSON/CSV zsynchronizowany.
- Staging only: bez wdrożenia i bez importu do Cloudflare KV.


## Audyt v0.2.21 (2026-11-16)
Debeka BKK: Postanschrift 56048 Koblenz, Widerspruch ogólną Postanschrift; energie-BKK: ogólna 30134 Hannover, Widerspruch Oldenburger Allee 24, 30659 Hannover; EY BKK: Beleglesezentrum 30645 Hannover, Widerspruch według indywidualnego Bescheid. Wszystkie ID z katalogu Workera 1. Staging only; bez wdrożenia.


## Audyt v0.2.22 (2026-11-16)

- EY Betriebskrankenkasse: potwierdzona Postanschrift `EY BKK, Beleglesezentrum, 30645 Hannover`; Kassensitz w Melsungen i Rechtssitz w Monachium nie są adresami korespondencyjnymi. Nie znaleziono ogólnego adresu Widerspruch; wyjątek ePA nie jest uogólniany.
- Handelskrankenkasse (hkk): potwierdzona wyłączna centralna Postadresse `hkk Krankenkasse, 28185 Bremen`; bez ulicy. Widerspruch pocztą w terminie miesiąca, podpis odręczny; e-mail i fax nie są dopuszczalne, aplikacja/QES są akceptowane.
- Heimat Krankenkasse: potwierdzona centralna Postanschrift `Herforder Straße 23, 33602 Bielefeld`; Widerspruch pocztą, osobiście, przez ServiceApp lub beBPo; termin zasadniczo miesiąc.
- Staging: trzy rekordy sprawdzone; hkk dodana jako brakujący rekord, EY BKK i Heimat zaktualizowane.
- Wersja staging only; bez importu do Cloudflare KV i bez wdrożenia.


## Audyt v0.2.23 (2026-11-16)

- **IKK classic** (`ikk-classic`): potwierdzona centralna Postanschrift `IKK classic, 04063 Leipzig`; oficjalna strona mówi, że obowiązuje bundesweit dla wszystkich spraw pocztowych. Osobna procedura potwierdza możliwość Widerspruch pocztą, cyfrowo przez aplikację/Onlinefiliale, osobiście w Servicecenter lub przez beBPo. Nie używać Hauptsitz Tannenstraße 4 b, 01099 Dresden jako adresu pocztowego.
- **IKK gesund plus** (`ikk-gesund-plus`): potwierdzona Postadresse `IKK gesund plus, 39092 Magdeburg`; oficjalna instrukcja Widerspruch wskazuje ten sam adres, termin jednego miesiąca i wymóg odręcznego podpisu. Zwykły e-mail bez podpisu nie jest prawidłowy. Besucheradresse w Magdeburgu i adres wydawniczy w Poczdamie są odrębne.
- **IKK Südwest** (`ikk-sudwest`): potwierdzona zentrale Postadresse `IKK Südwest, 66098 Saarbrücken`; oficjalna instrukcja Widerspruch wskazuje ten sam adres, zasadniczy termin jednego miesiąca i alternatywne kanały: QES, Online-Geschäftsstelle/aplikacja lub złożenie do protokołu. Dla sprzeciwów z zagranicy stosować pouczenie z Bescheid.
- Dla żadnej z trzech kas nie opublikowano odrębnej Postanschrift Beitragsabteilung ani Pflegekasse; wykorzystano centralny adres ogólny, bez tworzenia fikcyjnych adresów działów.
- Zaktualizowano trzy istniejące rekordy; staging pozostaje na poziomie 82 rekordów (zaktualizowano trzy istniejące rekordy). Rejestr JSON/CSV zsynchronizowany z rzeczywistymi ID katalogu Workera 1.
- **Staging only**: bez importu do Cloudflare KV i bez wdrożenia.


## v0.2.25 — uzupełnienie kolejki i partia KARL MAYER BKK, KKH, KNAPPSCHAFT

- HEK: potwierdzona Postanschrift `22039 Hamburg` w aktualnym oficjalnym materiale (stan 10/2026); nie używać adresu siedziby 22041 Hamburg. Widerspruch do zwykłych decyzji: `individual_required`; instrukcja Ombudsstelle dotyczy wyłącznie ePA.
- IKK – Die Innovationskasse: oficjalna Postanschrift `23591 Lübeck`; oficjalna procedura potwierdza pocztowe Widerspruch, termin miesiąca, podpis odręczny i alternatywy EBO/De-Mail/QES. Zwykły e-mail i upload w aplikacji nie są dopuszczalne.
- KARL MAYER BKK: oficjalna Postanschrift `Postfach 11 20, 63166 Obertshausen`; adres Industriestraße 3, 63179 Obertshausen jest adresem placówki. Widerspruch poza szczególnym przypadkiem ePA: `individual_required`.
- Zaktualizowano pięć istniejących wpisów bez tworzenia duplikatów. Staging: 84 rekordy; katalog Workera 1: 92 ID.
- Nadal staging only: bez importu do Cloudflare KV i bez wdrożenia.


## v0.2.25 — audyt kolejnej partii

- Koenig & Bauer BKK: potwierdzono dwa punkty obsługi, ale nie uniwersalną Postanschrift; blokada automatycznego adresowania.
- Krones Betriebskrankenkasse: potwierdzono adresy placówek i kanał Service-App/e-mail dla skanów dokumentów; nie potwierdzono Postanschrift ani uniwersalnego adresu Widerspruch.
- Mercedes-Benz BKK: ponownie potwierdzono jednolitą Postanschrift 28178 Bremen oraz adres i formę Widerspruch.
- Staging only; brak wdrożenia i importu do KV.


## v0.2.26 — Merck BKK, mhplus i novitas bkk

- **Merck BKK** (`merck-bkk`): dodano rekord zgodny z katalogiem Workera 1. Oficjalna strona podaje Frankfurter Straße 129, 64293 Darmstadt jako „Unsere Anschrift”, ale nie potwierdza Postanschrift. Wszystkie kategorie pocztowe pozostają zablokowane przed automatycznym generowaniem; Widerspruch ePA nie jest ogólną procedurą sprzeciwu.
- **mhplus Betriebskrankenkasse** (`mhplus-betriebskrankenkasse`): potwierdzono Postanschrift `71632 Ludwigsburg`; nie dopisywać ulicy. Oficjalny Transparenzbericht opisuje procedurę Widerspruch (miesiąc, pisemnie/elektronicznie/do protokołu), ale nie podaje odrębnego uniwersalnego adresu – użyć indywidualnego Bescheid.
- **novitas bkk** (`novitas-bkk`): potwierdzono rozdzielenie adresów: centralna Postanschrift `47050 Duisburg`; Widerspruch do miejsca wydania Bescheid: `Zum Portsmouthplatz 24, 47051 Duisburg`. Oficjalna procedura obejmuje również Pflegekasse i Beitragsbescheide.
- Staging: 87 rekordów; katalog Workera 1: 92 ID.
- Zmiany wyłącznie w plikach staging/rejestrze; brak wdrożenia i importu do KV.


## v0.2.27 — R+V Betriebskrankenkasse, Salus BKK i SECURVITA BKK

- **R+V Betriebskrankenkasse** (`r-v-betriebskrankenkasse`): ponownie potwierdzono Postanschrift `65215 Wiesbaden`; oficjalna procedura Widerspruch wskazuje ten sam adres. Kreuzberger Ring 21, 65205 Wiesbaden to Geschäftsstelle. Widerspruch: termin miesiąca, podpis własnoręczny; możliwe także Meine R+V BKK, e-mail/fax i złożenie do protokołu.
- **Salus BKK** (`salus-bkk`): potwierdzono Zentrale Postanschrift `Barfußgäßchen 15, 04109 Leipzig`. Oficjalna procedura obejmuje decyzje Krankenversicherung, Pflegeversicherung i Beitragsforderungen; termin miesiąca, wymagany podpis własnoręczny lub elektroniczny. Procedura nie publikuje osobnego adresu Widerspruch, więc używana jest centralna Postanschrift.
- **SECURVITA BKK** (`securvita-bkk`): dodano brakujący rekord zgodny z katalogiem Workera 1. Postanschrift `Postfach 10 58 29, 20039 Hamburg`; Widerspruch wysyłać na `Lübeckertordamm 1-3, 20099 Hamburg` zgodnie z oficjalnym dokumentem z 20.11.2025. Dla osób z Wohnsitz za granicą dokument wskazuje termin trzech miesięcy.
- Staging: 88 rekordów; katalog Workera 1: 92 ID. JSON/CSV zsynchronizowane.
- **Staging only**: bez importu do Cloudflare KV i bez wdrożenia.


## v0.2.28 — Siemens-Betriebskrankenkasse (SBK), SKD BKK i SVLFG

- **SBK** (`siemens-betriebskrankenkasse-sbk`): potwierdzona centralna Postadresse `SBK, 80227 München`. Oficjalna procedura Widerspruch obejmuje decyzje SBK, Pflegekasse i Beitragsbescheide; termin zasadniczo miesiąc, podpisane pismo, Meine SBK lub QES. Procedura nie podaje osobnego adresu sprzeciwu, dlatego stosować centralną Postadresse.
- **SKD BKK** (`skd-bkk`): oficjalny adres `Schultesstraße 19 A, 97421 Schweinfurt`; procedura Widerspruch wprost wskazuje ten adres dla SKD BKK i Pflegekasse, termin miesiąc, wymagany podpis. Postfach `c/o ARGE GSV plus` dotyczy poboru składek od pracodawców, nie korespondencji ubezpieczonych.
- **SVLFG** (`sozialversicherung-fur-landwirtschaft-forsten-und-gartenbau-svlfg`): pozycja branżowa w katalogu, nie standardowa otwarta Krankenkasse. Centralna Postanschrift `SVLFG, 34105 Kassel`; sprawy składkowe `SVLFG, Versicherung Beitrag, 34105 Kassel`; Widerspruch od decyzji SVLFG/LKK/LPK na `Frankfurter Straße 126, 34121 Kassel`. Termin miesiąc; Meine SVLFG, QES, De-Mail i beBPo; zwykły e-mail nie wystarcza.
- Staging: 90 rekordów; katalog Workera 1: 92 ID. JSON/CSV zsynchronizowane.
- **Staging only**: bez importu do Cloudflare KV i bez wdrożenia.


## v0.2.29 — Südzucker BKK, Techniker Krankenkasse i TUI BKK (2026-11-17)

- **Südzucker BKK** (`sudzucker-bkk`): oficjalna strona kontaktowa wskazuje `Joseph-Meyer-Straße 13-15, 68167 Mannheim` jako adres do korespondencji pocztowej i fax. Procedura Widerspruch obejmuje również Pflegekasse i decyzje składkowe; termin miesiąca, podpis odręczny/elektroniczny, App/Online-Geschäftsstelle lub do protokołu. Procedura nie publikuje osobnego adresu sprzeciwu, dlatego używany jest centralny adres pocztowy.
- **Techniker Krankenkasse** (`techniker-krankenkasse`): skorygowano stary adres `20905 Hamburg`. Oficjalny adres dla spraw osobistych ubezpieczonych to `20910 Hamburg`; oficjalny adres Widerspruch to `20901 Hamburg`. Dla wybranych formularzy SEPA i spraw składkowych osób samodzielnie opłacających składki potwierdzono `20901 Hamburg`; nie uogólniać na wszystkie sprawy Beitragsabteilung. Widerspruch: miesiąc; pismo z podpisem, do protokołu, MJP/beA lub QES; zwykły e-mail i fax nie są akceptowane.
- **TUI BKK** (`tui-bkk`): dodano brakujący rekord. Oficjalna Postanschrift `30645 Hannover`; adres `Karl-Wiechert-Allee 23, 30625 Hannover` z Impressum nie jest adresem pocztowym. Procedura Widerspruch obejmuje BKK i Pflegekasse, także decyzje składkowe; termin miesiąca, trzy miesiące przy doręczeniu za granicą. Brak osobnego adresu Widerspruch – użyć centralnej Postanschrift.
- Staging: 92 rekordów; katalog Workera 1: 92 ID. JSON/CSV zsynchronizowane.
- **Staging only**: bez importu do Cloudflare KV i bez wdrożenia.


## v0.2.30 — Audi BKK, Pronova BKK i vivida bkk (2026-11-17)

- **Audi BKK** (`audi-bkk`): ponownie potwierdzono centralną Postanschrift `Postfach 10 01 60, 85001 Ingolstadt`. Oficjalna procedura Widerspruch: pismo, e-mail z QES lub do protokołu; termin miesiąca. Brak odrębnego adresu Widerspruch, stosować Postanschrift i indywidualne pouczenie z Bescheid. Dla Beitragsabteilung nie opublikowano odrębnej Postanschrift.
- **Pronova BKK** (`pronova-bkk`): potwierdzono regionalne adresy Postanschrift: `67058 Ludwigshafen` standardowo oraz `67082 Ludwigshafen` dla miejsca zamieszkania z PLZ 4/5. Adres wybierać na podstawie PLZ ubezpieczonego; dla PLZ 4/5 stosować 67082. Nie używać adresu siedziby `Rheinallee 13, 67061 Ludwigshafen`. Widerspruch: list z podpisem, do protokołu lub kanały elektroniczne; miesiąc, trzy miesiące przy doręczeniu za granicą. Brak osobnego adresu Widerspruch.
- **vivida bkk** (`vivida-bkk`): potwierdzono centralną Postanschrift `78044 Villingen-Schwenningen`; siedziba `Spittelstraße 50, 78056 Villingen-Schwenningen` nie jest adresem pocztowym. Procedura Widerspruch obejmuje także decyzje składkowe i Pflegekasse; pismo, do protokołu, App/OGS lub QES; termin zasadniczo miesiąc.
- Staging: 92 rekordy; katalog Workera 1: 92 ID. JSON/CSV zsynchronizowane.
- **Staging only**: bez importu do Cloudflare KV i bez wdrożenia.


## v0.2.31 — VIACTIV Krankenkasse, WMF BKK i ZF BKK (2026-11-17)

- **VIACTIV Krankenkasse** (`viactiv-krankenkasse`): ponownie potwierdzono centralny Posteingang `44775 Bochum`; oficjalna procedura Widerspruch wskazuje dokładnie ten adres. Dopuszczone kanały obejmują Service-App, cyfrową obsługę klienta, pocztę, podpisany skan e-mailem, do protokołu i beBPo. Nie używać siedziby `Suttner-Nobel-Allee 3–5, 44803 Bochum` jako adresu pocztowego.
- **WMF BKK** (`wmf-bkk`): potwierdzono `Zentraler Posteingang, 30645 Hannover` jako adres do listów; przesyłki są skanowane i przekazywane pracownikom. Widerspruch można składać elektronicznie, pisemnie lub do protokołu; termin zasadniczo miesiąc. Brak osobnego adresu sprzeciwu. Nie używać `Fabrikstraße 48, 73312 Geislingen an der Steige` jako Postanschrift.
- **ZF BKK** (`zf-bkk`): potwierdzono centralną Postanschrift `ZF BKK, 88043 Friedrichshafen`, również na osobnej stronie Pflegekasse. Procedura Widerspruch obejmuje decyzje ZF BKK i Pflegekasse; termin miesiąc. Nie używać `Otto-Lilienthal-Straße 10, 88046 Friedrichshafen` – to Geschäftsstelle.
- Staging: 92 rekordy; katalog Workera 1: 92 ID. JSON/CSV zsynchronizowane.
- **Staging only**: bez importu do Cloudflare KV i bez wdrożenia.


## v0.2.32 — BKK PFAFF, BKK EWE i BKK Miele (2026-11-17)

- **BKK PFAFF** (`betriebskrankenkasse-der-g-m-pfaff-ag`): oficjalna broszura BKK PFAFF 2026 rozdziela `Postweg: Postfach 11 20, 67601 Kaiserslautern` od adresu osobistej obsługi `Pirmasenser Straße 132, 67655 Kaiserslautern`. Kategorie zwykłej korespondencji korzystają z Postfach. Widerspruch pozostaje `individual_required`; nie znaleziono ogólnej instrukcji adresowej.
- **BKK EWE** (`betriebskrankenkasse-ewe`): oficjalna strona kontaktowa publikuje `Postfach 5334, 26043 Oldenburg` obok adresu placówki `Donnerschweer Straße 20, 26123 Oldenburg`. Do korespondencji pocztowej używać Postfach. Dla Widerspruch brak osobnej instrukcji adresowej; stosować indywidualny Bescheid.
- **BKK Miele** (`betriebskrankenkasse-miele`): oficjalna strona podaje zentrale Anschrift `Carl-Miele-Straße 29, 33332 Gütersloh`; osobna oficjalna procedura Widerspruch wprost dopuszcza wysłanie sprzeciwu pocztą na ten adres, termin miesiąca i podpis odręczny.
- Zaktualizowano staging, rejestr JSON i CSV. Staging pozostaje na poziomie 92 rekordów; katalog Workera 1: 92 ID.
- **Staging only**: bez importu do Cloudflare KV i bez wdrożenia.


## Research update v0.2.33 (2026-11-17)
- Revalidated BKK PwC: general Postfach 1226, 34202 Melsungen; Widerspruch address Burgstraße 1–3, 34212 Melsungen.
- Revalidated BIG direkt gesund: Widerspruch address Hörder-Bach-Allee 1–3, 44263 Dortmund; general Postanschrift remains unconfirmed and is blocked from envelope generation.
- Revalidated BKK Akzo Nobel Bayern: no general Postanschrift published; Glanzstoffstraße 1, 63906 Erlenbach is Kassensitz/office and the ePA Ombudsstelle address only, not a general Widerspruch address.
- All three IDs were matched to the Worker 1 catalog. Staging remains 92 records; no deployment or KV import was performed.


## Research update v0.2.37 – batch 1

- First 15 Worker 1 catalog entries reviewed against official insurer sources.
- AOK records use the official postcode-based Postanschrift lookup; no branch address is substituted.
- Audi BKK, BAHN-BKK, BARMER and BERGISCHE KRANKENKASSE official postal channels refreshed.
- Widerspruch remains individually guided where the insurer decision notice is controlling.
- No deployment and no KV import performed.


## Research batch 2 (catalog positions 16–30)
Checked official contact pages and Postanschrift instructions on 2026-11-17. Unconfirmed Impressum/Kassensitz addresses remain blocked for automatic letter generation. BIG direkt gesund has conflicting official Widerspruch address publications; users must follow the current Bescheid.


## Research batch 31–45 (2026-11-17)
Updated official contact and postal-address evidence for 15 insurers. No deployment or KV import performed.


## Partia 46–60 (2026-11-17)

Zaktualizowano 15 rekordów: BKK Salzgitter, BKK Scheufelen, BKK Schwarzwald-Baar-Heuberg, BKK VDN, BKK VerbundPlus, BKK Werra-Meissner, BKK Wirtschaft und Finanzen, BKK Würth, BKK24, BKK DürkoppAdler, BMW BKK, Bosch BKK, Continentale BKK, DAK-Gesundheit i Debeka BKK. Adresy wpisano wyłącznie tam, gdzie oficjalne źródło potwierdza adres pocztowy; w pozostałych przypadkach wskazano oficjalny kanał kontaktu. Widerspruch pozostaje odrębną kategorią i ma pierwszeństwo pouczenia z Bescheid.


## v0.2.38 — audyt partii 61–75 (2026-11-17)

- Ponownie sprawdzono oficjalne kanały kontaktu i Postanschriften dla 15 kas: energie-BKK, EY BKK, hkk, Heimat Krankenkasse, HEK, IKK Die Innovationskasse, IKK classic, IKK gesund plus, IKK Südwest, KARL MAYER BKK, KKH, KNAPPSCHAFT, Koenig & Bauer BKK, Krones BKK i Mercedes-Benz BKK.
- Rozdzielono adresy pocztowe od siedzib, Rechtssitz i adresów placówek.
- Dla Koenig & Bauer BKK i Krones BKK pozostawiono brak potwierdzonej uniwersalnej Postanschrift oraz wymóg ustalenia adresu przed generowaniem koperty.
- Dla EY BKK Widerspruch pozostaje indywidualny – należy korzystać z pouczenia w Bescheid.
- Nie wykonano wdrożenia ani importu do Cloudflare KV.


## Batch 76–90 (2026-11-17)

- Merck BKK: brak potwierdzonej Postanschrift; adres Frankfurter Straße 129, 64293 Darmstadt jest opisany jako „Unsere Anschrift”, nie jako Postanschrift. Nie generować koperty; przed generowaniem pokazać ostrzeżenie i oficjalny kontakt.
- mhplus: Postanschrift 71632 Ludwigsburg; Widerspruch według indywidualnego Bescheid.
- novitas bkk: Postanschrift 47050 Duisburg; Widerspruch na Zum Portsmouthplatz 24, 47051 Duisburg zgodnie z oficjalną procedurą.
- Pronova BKK: adres zależny od PLZ; 67058 Ludwigshafen standardowo, 67082 Ludwigshafen dla kodów PLZ 4/5.
- R+V BKK: Postanschrift 65215 Wiesbaden; ten sam adres wskazany dla Widerspruch.
- Salus BKK: centralna Postanschrift Barfußgäßchen 15, 04109 Leipzig.
- SECURVITA: Postfach 10 58 29, 20039 Hamburg; Widerspruch na Lübeckertordamm 1-3, 20099 Hamburg.
- SBK: centralna Postadresse 80227 München.
- SKD BKK: Schultesstraße 19 A, 97421 Schweinfurt; adres wskazany również w procedurze Widerspruch.
- SVLFG: Postanschrift 34105 Kassel; Widerspruch Frankfurter Straße 126, 34121 Kassel. To instytucja branżowa, nie zwykła otwarta kasa.
- Südzucker BKK: Joseph-Meyer-Straße 13-15, 68167 Mannheim.
- TK: sprawy ogólne 20910 Hamburg; Widerspruch 20901 Hamburg. Dla składek 20901 tylko w zakresie potwierdzonych procedur.
- TUI BKK: Postanschrift 30645 Hannover.
- VIACTIV: Zentraler Posteingang 44775 Bochum; pakiety wysyłać na inny adres zgodnie ze stroną kontaktową.
- vivida bkk: Postanschrift 78044 Villingen-Schwenningen.

Nie oznaczono automatycznie wszystkich pięciu kategorii jako zweryfikowanych. Statusy kategorii pozostają rozdzielone.


## Partia 7/7 – rekordy 91–92 (2026-11-17)

- WMF BKK: oficjalny centralny Posteingang: WMF BKK, Zentraler Posteingang, 30645 Hannover. Adres Fabrikstraße 48 w Geislingen to siedziba, nie adres do wysyłki. Osobna Postanschrift Beitragsabteilung nie została opublikowana. Widerspruch można składać elektronicznie, pisemnie lub do protokołu. Źródła: https://www.wmf-bkk.de/kontakt oraz https://www.wmf-bkk.de/service/feedback-hinweise.
- ZF BKK: oficjalna centralna Postanschrift: ZF BKK, 88043 Friedrichshafen. Poczta jest digitalizowana w centrali; osobna strona opisuje procedurę Widerspruch ZF BKK i Pflegekasse. Źródła: https://www.zfbkk.de/service/fuer-sie-vor-ort oraz https://www.zfbkk.de/widerspruchsverfahren.

Partia 7/7 zamyka przejście przez katalog 92 kas. Nie oznacza to automatycznego potwierdzenia wszystkich pięciu kategorii adresowych dla każdej kasy. Nadal wymagany jest audyt kompletności, w tym 3 historycznych unmatchedRecords w stagingu.


## v0.2.41 — audyt końcowy i naprawa kompletności adresów (2026-11-17)

- Każdy z 92 rekordów ma komplet pięciu kategorii, link do oficjalnego źródła oraz `documentGenerationNotice` wyświetlany przed generowaniem dokumentu. Komunikat zawiera poziom ostrzeżenia, kod przypadku i instrukcje kategorii z adresami, statusami, źródłami i notatkami.
- Uzupełniono brakujące, potwierdzone Postanschriften: AOK Rheinland-Pfalz/Saarland (56040 Koblenz), BKK MTU (88045 Friedrichshafen – bez ulicy), BKK Pfalz (Lichtenbergerstraße 16, 67059 Ludwigshafen), mkk (10857 Berlin), BKK firmus (Gottlieb-Daimler-Straße 11, 28237 Bremen).
- BKK Freudenberg: zapisano obie oficjalne Postanschriften (Weinheim i Neuenburg), bez arbitralnego wyboru; generowanie koperty wymaga potwierdzenia właściwego adresu.
- Naprawiono staging dla BKK GILDEMEISTER SEIDENSTICKER, BKK Groz-Beckert, bkk melitta hmr, BKK ProVita i BKK Public zgodnie z udokumentowanymi oficjalnymi Postanschriften.
- BKK Technoform: adres z Impressum przestał być traktowany jako potwierdzona Postanschrift; koperta zablokowana do czasu potwierdzenia.
- Ujednolicono register JSON/CSV ze stagingiem. `researchStatus` i `addressRecordStatus` wyliczane są z pięciu statusów kategorii.
- Usunięto trzy stare unmatchedRecords (KARL MAYER BKK, SECURVITA BKK, ZF BKK) po potwierdzeniu istnienia kanonicznych rekordów z insurerId.
- Wersja nie została wdrożona. Nie wykonano importu do Cloudflare KV.

### Zasady prezentacji w aplikacji

1. Wyłącznie `verified` z aktualnym `sourceVerifiedAt` (maks. 180 dni), adresem i źródłem kategorii pozwala pokazać adres.
2. `official_general`, `conditional`, `individual_required`, `unverified`, `not_published`, `outdated` nie pozwalają pokazać adresu jako gotowego do wysyłki.
3. Dla każdej niepotwierdzonej lub nieaktualnej kategorii pokazać oficjalny link (`officialUrl`) i instrukcję sprawdzenia adresu; nie generować koperty z niepewnym adresem.
5. Adres siedziby, oddziału, Hausanschrift lub adres pracodawcy nie może być używany jako Postanschrift bez jednoznacznego źródła.


### API – komunikaty przed generowaniem

- `GET /api/addresses/:insurerId` zwraca pełny rekord wraz z `documentGenerationNotice`.
- `GET /api/addresses/:insurerId/:category` oraz `GET /api/resolve?insurerId=...&purpose=...` również zwracają `documentGenerationNotice`, aby frontend nie zgubił ostrzeżenia przy pobieraniu pojedynczej kategorii.
- Worker dostarcza i waliduje komunikat; frontend FeVizji nadal musi go wyświetlić użytkownikowi przed utworzeniem dokumentu.

## v0.2.42 — hardening update (2026-11-17)

- PUT persists `documentGenerationNotice`; route-level regression test covers PUT → KV → resolve.
- Global exception boundary returns JSON errors; malformed percent-encoding returns HTTP 400.
- History uses one immutable KV key per snapshot (`history:v2:{insurerId}:{timestamp}-{uuid}`), avoiding read-modify-write races and unbounded single-value growth.
- `/api/addresses` and audit use KV bulk reads in batches of at most 100 keys. Audit validates each stored record once.
- `/api/resolve` returns 404 when a category is absent, matching the category endpoint.
- Public address responses expose `usableForMailing`; non-verified statuses are not returned as mailing addresses.
- `checkedAt` is a valid non-future YYYY-MM-DD record date. `sourceVerifiedAt` is separate; absent values are reported as undated, not treated as freshly verified.
- Homepage URLs cannot be used as evidence for `verified` or `official_general` mailing addresses.
- PUT request body is capped at 256 KiB. `updatedBy` comes from `ADDRESS_ADMIN_ID`, falling back to `admin-token`.

### Cloudflare limits checked 2026-11-17

Cloudflare documents Workers Free at 50 external subrequests per invocation and Workers Paid at 10,000 by default; internal Worker service bindings have a separate allowance. KV bulk `get(keys)` supports up to 100 keys per call. Workers KV value size is 25 MiB, with Free plan daily limits of 100,000 reads and 1,000 writes to different keys; same-key writes are limited to one per second. This version batches bulk reads at 100 keys and no longer stores history in a single growing value. See the official Cloudflare limits and KV read documentation.



### Kontrola próbki `official_general`

Wykonano ręczną kontrolę 15 różnych rekordów/kategorii względem oficjalnych stron. 14 z 15 próbek miało źródło wskazujące adres pocztowy lub Postanschrift. W próbce SKD BKK strona kontaktowa potwierdzała adres głównej siedziby/placówki, ale nie określała go jako Postanschrift; te kategorie zmieniono na `unverified`, a adres wyłączono z wysyłki automatycznej. Datę `sourceVerifiedAt=2026-11-17` zapisano wyłącznie dla 14 sprawdzonych próbek, nie dla pozostałych kategorii.

Historia zachowuje odczyt starych wpisów `history:v1:{insurerId}`; nowe snapshoty są zapisywane oddzielnie pod `history:v2:{insurerId}:{timestamp}-{uuid}`.


## v0.2.43 — świeżość źródła, bezpieczeństwo API i diagnostyka (2026-11-17)

### Zmiany w Workerze

- `usableForMailing` wymaga `sourceVerifiedAt`; brak daty, data nieprawidłowa/przyszła lub weryfikacja starsza niż 180 dni blokuje wysyłkę. `checkedAt` nie zastępuje daty weryfikacji źródła.
- API nadal zwraca `sourceVerifiedAt` w obiektach kategorii; pole jest zachowane przez `withMailingPolicy`.
- PUT ignoruje wejściowe `usableForMailing` i zawsze wylicza je po stronie Workera.
- Odpowiedzi błędów z głównego handlera zachowują dozwolone nagłówki CORS.
- PUT i audyt zwracają `503 WORKER1_CATALOG_UNAVAILABLE` wraz z diagnostyką, jeśli Worker 1 nie odpowiada.
- Historia (`GET /api/history/:id`) wymaga tokenu administratora.
- Snapshot historii jest zapisywany przed aktualnym rekordem; awaria zapisu rekordu nie usuwa śladu próby aktualizacji.
- Publiczna lista nie maskuje brakujących kategorii jako `usableForMailing:false`; zwraca błąd integralności danych.
- Usunięto martwy warunek w PUT.
- Publiczne GET-y otrzymują nagłówki cache (`max-age=60`, `s-maxage=300`) w celu ograniczenia powtarzanych odczytów. Nie jest to limit zapytań po stronie serwera; do twardego rate limitingu potrzebne jest skonfigurowane binding Cloudflare Rate Limiting.

### Przegląd 48 kategorii `official_general` wskazanych jako oparte na Impressum

Przejrzano wszystkie 48 wpisów stagingowych, grupując je według ubezpieczyciela (15 podmiotów). W większości notatek badawczych zapisano jawne rozróżnienie Postanschrift/Postadresse od siedziby, adresu placówki lub adresu wydawcy. Samo pochodzenie z Impressum nie jest automatycznie błędem — liczy się to, czy strona wyraźnie oznacza adres jako pocztowy.

| Ubezpieczyciel | Liczba kategorii | Kategorie |
|---|---:|---|
| DAK-Gesundheit | 4 | kuendigung, general, contributions, pflegekasse |
| IKK – Die Innovationskasse | 5 | kuendigung, general, contributions, widerspruch, pflegekasse |
| IKK gesund plus | 4 | kuendigung, general, contributions, pflegekasse |
| KKH | 4 | kuendigung, general, contributions, pflegekasse |
| Mercedes-Benz BKK | 1 | general |
| mhplus | 4 | kuendigung, general, contributions, pflegekasse |
| Salus BKK | 1 | general |
| VIACTIV | 1 | kuendigung |
| BERGISCHE KRANKENKASSE | 4 | kuendigung, general, contributions, pflegekasse |
| BKK evm | 4 | kuendigung, general, contributions, pflegekasse |
| BKK firmus | 4 | kuendigung, general, contributions, pflegekasse |
| Continentale BKK | 3 | kuendigung, general, pflegekasse |
| EY BKK | 4 | kuendigung, general, contributions, pflegekasse |
| HEK | 4 | kuendigung, general, contributions, pflegekasse |
| TUI BKK | 1 | kuendigung |

Uwaga: lista powyżej obejmuje 48 kategorii w 15 grupach ubezpieczycieli. Dwa wpisy wymagają ponownego sprawdzenia dokładnego brzmienia źródła przed traktowaniem samej notatki jako wystarczającego dowodu: BKK firmus (4 kategorie) i VIACTIV (1 kategoria). W ich notatkach nie zachowano jednoznacznego cytatu/oznaczenia Postanschrift. Nie zmieniono adresów ani statusów stagingowych na podstawie samej tej kontroli dokumentacji. Należy ponownie otworzyć źródła pierwotne i potwierdzić oznaczenie adresu pocztowego.

### Zakres wdrożenia

- Zmiany wyłącznie w kodzie, testach i dokumentacji.
- Bez importu danych staging do KV.
- Bez wdrożenia Cloudflare.


## v0.2.44 — odporność odczytu, historia dwufazowa i higiena stagingu (2026-11-17)

- Testowe daty `checkedAt` i `sourceVerifiedAt` są wyliczane względem bieżącego czasu; testy granicy świeżości używają jawnego zegara. Eliminuje to fixture wygasający po 180 dniach.
- Nie uzupełniono masowo `sourceVerifiedAt`. W stagingu usunięto 460 pochodnych pól `usableForMailing`; Worker nadal wylicza je na podstawie statusu, adresu, źródła i świeżości. Stan danych pozostaje: 14 kategorii efektywnie dopuszczonych, 446 bez daty weryfikacji.
- `GET /api/addresses` i pełny rekord zwracają dostępne kategorie oraz `integrityErrors`; pojedynczy brakujący rekord/kategoria nie wyłącza całej listy. `/api/admin/audit` raportuje błędy integralności oddzielnie.
- Snapshot historii zaczyna ze statusem `attempted`; po udanym zapisie rekordu jest aktualizowany do `committed` z `committedAt`. Awaria zapisu rekordu pozostawia czytelny ślad próby.
- Walidacja dat dopuszcza jeden dzień tolerancji względem UTC, aby data lokalna wprowadzona po północy w Europe/Berlin nie była odrzucana. Limit świeżości 180 dni pozostaje bez zmian.
- Po PUT Worker próbuje unieważnić wpisy Cache API dla listy, rekordu, kategorii i resolve. Odpowiedź PUT zwraca `cachePurge.supported` i liczbę usuniętych kluczy. To unieważnia wpisy dostępne przez `caches.default`; nie zastępuje purge całej strefy CDN, jeśli cache jest zarządzany poza Cache API.
- Rate limiting nadal nie jest zaimplementowany. Cache nie stanowi zabezpieczenia przed nadużyciem publicznych endpointów.


## v0.2.45 — ponowna weryfikacja 48 kategorii official_general (2026-11-17)

- Ponownie otwarto oficjalne źródła pierwotne dla 15 podmiotów i 48 kategorii wskazanych w audycie Impressum.
- 44 kategorie otrzymały `sourceVerifiedAt: 2026-11-17`, ponieważ oficjalne strony wyraźnie oznaczają adres jako Postanschrift/Postadresse/Zentraler Posteingang albo wprost nakazują wysyłanie listów na ten adres.
- 4 kategorie BKK firmus zmieniono na `unverified`, wyczyszczono `address` i pozostawiono `sourceVerifiedAt: null`. Oficjalne źródła są rozbieżne: Impressum podaje adres 28237 Bremen bez oznaczenia pocztowego, dokument dla pracodawców 2025 podaje Zentrale Postanschrift 28192 Bremen, a Transparenzbericht 2024 wskazuje adres 28237 Bremen w sekcji Post. Wymagane bezpośrednie potwierdzenie adresu ogólnego dla ubezpieczonych.
- Nie zmieniano pozostałych kategorii ani nie uzupełniano dat poza zakresem tych 48 wpisów.
- Szczegółowy audyt: `data/official-general-audit-2026-11-17.json` oraz `.csv`.
- Staging only: bez importu do Cloudflare KV i bez wdrożenia.


## v0.2.46 — audyt pozostałych oficjalnych źródeł (2026-11-17)

- Audi BKK: ponownie otwarta aktualna strona kontaktowa potwierdza Zentrale Postanschrift Postfach 10 01 60, 85001 Ingolstadt; FAQ potwierdza użycie dla wniosków i dokumentów, a instrukcja Widerspruch dopuszcza prosty list. Datę sourceVerifiedAt uzupełniono dla `kuendigung`, `general`, `widerspruch` i `pflegekasse`. `contributions` pozostaje `not_published`.
- BIG direkt gesund: dedykowana oficjalna instrukcja Widerspruch podaje adres Hörder-Bach-Allee 1-3, 44263 Dortmund. Datę sourceVerifiedAt uzupełniono wyłącznie dla `widerspruch`; ogólna Postanschrift pozostaje nierozstrzygnięta.
- WMF BKK: aktualna oficjalna strona kontaktowa potwierdza centralny Posteingang 30645 Hannover dla Briefpost; aktualna strona Feedback & Hinweise potwierdza pisemny Widerspruch. Datę sourceVerifiedAt uzupełniono dla `kuendigung`, `general`, `widerspruch` i `pflegekasse`. `contributions` pozostaje `not_published`.
- BKK Freudenberg: oficjalna strona potwierdza dwie Postanschriften (Weinheim i Neuenburg). `sourceVerifiedAt` uzupełniono wyłącznie dla `general`, ale status `conditional` pozostaje, ponieważ nie opublikowano reguły wyboru adresu dla konkretnego ubezpieczonego.
- Nie uzupełniono dat dla adresów, które są jedynie adresem siedziby, placówki, Impressum, ochrony danych lub adresu do szczególnego celu.
- Szczegółowy audyt partii: `data/remaining-sources-audit-2026-11-17.json` oraz `.csv`.
- Zmiany wyłącznie w stagingu i dokumentacji; bez importu do Cloudflare KV i bez wdrożenia.


## v0.2.47 — audyt pozostałych źródeł, partia 3 (2026-11-17)

- Ponownie przejrzano 40 rekordów oznaczonych wcześniej jako `researched_partial`, w tym regionalne strony AOK i źródła kategorii `official_general`, `contributions`, `pflegekasse` oraz `widerspruch`.
- Dodano lub odświeżono `sourceVerifiedAt` dla 48 kategorii wyłącznie tam, gdzie oficjalne źródło bezpośrednio potwierdzało Postanschrift/Postadresse/Zentraler Posteingang albo dokładną instrukcję wysłania dokumentu.
- Potwierdzone ponownie: BKK exklusiv (centralna poczta cyfryzowana), BKK VDN, BMW BKK, Debeka BKK, BKK Salzgitter, BKK Werra-Meissner, BKK VerbundPlus, Continentale BKK, DAK-Gesundheit (aktualne Impressum), TK (Widerspruch), VIACTIV (Briefpost), BKK SBH (jedna Postanschrift) oraz ograniczone instrukcje BKK Herkules.
- BKK SBH: dla `kuendigung`, `general`, `contributions`, `pflegekasse` potwierdzono Löhrstraße 45, 78647 Trossingen. `widerspruch` pozostaje `individual_required`.
- BKK Herkules: adres Jordanstraße 6, 34117 Kassel potwierdzono wyłącznie dla ogólnych dokumentów członkowskich i dokumentów do ustalenia składki; status pozostaje `conditional`, więc koperta nie jest automatycznie dopuszczona.
- Dla AOK oficjalne strony potwierdzają mechanizm wyszukiwania Postanschrift po PLZ, ale bez PLZ konkretnego ubezpieczonego nie da się ustalić adresu. Nie wpisano daty weryfikacji adresu ani nie zmieniono ich na gotowe do wysyłki.
- Nie zmieniono kategorii, dla których źródło wskazuje wyłącznie siedzibę/oddział/Impressum, albo istnieje kilka adresów bez reguły wyboru. Widerspruch pozostaje ograniczony pouczeniem w indywidualnym Bescheid.
- Raport partii: `data/remaining-sources-audit-2026-11-17-batch-3.json` oraz `.csv`.
- Zmiany dotyczą stagingu, rejestru i dokumentacji. Bez importu do Cloudflare KV i bez wdrożenia.

### Stan stagingu po partii 3

- Łącznie: 460 kategorii w 92 rekordach.
- `sourceVerifiedAt` obecne: 110 kategorii (w tym 11 nadal warunkowych i niedopuszczonych do automatycznej wysyłki).
- `sourceVerifiedAt` dodane w tej partii: 46; 2 istniejące daty ponownie sprawdzono.
- Efektywnie `usableForMailing`: 99 kategorii; bez daty weryfikacji: 350.
- Nie oznacza to, że 99 kategorii to 99 odrębnych adresów – kategorie mogą współdzielić adres jednej kasy.


## v0.2.48 — audyt oficjalnych Postanschriften, partia 4 (2026-11-17)

- Ponownie sprawdzono 24 kas i dodano 96 dat `sourceVerifiedAt` wyłącznie dla kategorii z potwierdzoną instrukcją pocztową.
- Zachowano statusy oraz category-specific sourceUrl/notes; nie promowano `conditional`, `unverified`, `not_published` ani `individual_required`.
- BARMER: poprawiono centralną Postanschrift z błędnego adresu placówki 73524 Schwäbisch Gmünd na `BARMER, 42266 Wuppertal`; Widerspruch nadal wymaga indywidualnej kontroli.
- Nierozstrzygnięte: AOK (PLZ), Pronova BKK (sprzeczne dane 67058/67082), BKK Freudenberg (dwie Postanschriften), BKK EWE (ulica i Postfach bez jednoznacznego wskazania), BKK24 (potwierdzenie tylko w starszym PDF).
- `sourceVerifiedAt` obecne: 206 kategorii; bez daty: 254.
- Kategorie efektywnie dopuszczone przez status i datę: 195; ostateczną decyzję nadal wylicza Worker.
- Komunikaty przed generowaniem zsynchronizowane z kategoriami. Brak wdrożenia Cloudflare i importu KV.


## v0.2.49 — zasada wyłącznie potwierdzonych adresów (2026-11-17)

- Automatyczna prezentacja adresu jest dozwolona wyłącznie dla `status: verified`, z niepustym adresem, konkretnym źródłem HTTPS i aktualnym `sourceVerifiedAt` (maksymalnie 180 dni).
- `official_general` nie jest już wystarczającym dowodem do automatycznego użycia adresu. Dotyczy to również wpisów z datą weryfikacji; sam adres ogólny lub z Impressum nie jest pewniakiem.
- Dla adresów zablokowanych Worker zwraca `address: null`, `usableForMailing: false`, `addressDisplayMode: official_link` oraz `officialUrl` do oficjalnej strony kasy. Jeśli nie ma poprawnego linku HTTPS, zwraca `addressDisplayMode: manual_check`.
- Dla potwierdzonych adresów Worker zwraca `addressDisplayMode: confirmed_address` i `officialUrl: null`.
- Nowa polityka dotyczy listy, pełnego rekordu, endpointu kategorii i `/api/resolve`. Frontend powinien renderować adres wyłącznie przy `usableForMailing === true`; w pozostałych przypadkach wyświetlać link oficjalny lub komunikat ręcznej weryfikacji.
- Staging zawiera 92 rekordy i przechodzi walidację. Po zaostrzeniu reguły efektywnie dopuszczonych jest 5 kategorii; pozostałe nie są automatycznie traktowane jako potwierdzone.
- Zmiana dotyczy kodu i dokumentacji. Nie wykonano wdrożenia Cloudflare ani importu do KV.


# v0.2.55 — naprawa alarmów projekcji, importu i diagnostyki (2026-11-18)

- Durable Object zapisuje rekord i `pending:<insurerId>` atomowo; alarm ponawia wyłącznie oczekujące projekcje KV. Po udanej projekcji znacznik jest usuwany, a alarm kasowany, gdy nie ma innych oczekujących wpisów.
- Import wymaga jawnego `--env=staging|production` oraz dokładnej listy dozwolonych HTTPS URL-i właściwego środowiska. Produkcja wymaga `--confirm-production`.
- Import jest idempotentny: rekordy identyczne są pomijane; istniejące rekordy różniące się od stagingu są chronione przed nadpisaniem, chyba że podano `--update-existing`. Dodano `--only-new`.
- HTTP 202 / `projectionStatus=pending` generuje wyraźne ostrzeżenie; import kończy się kodem 2, jeżeli projekcja pozostaje oczekująca.
- Brak `cf-connecting-ip` zwraca `400 CLIENT_IP_MISSING`, nie mylące 429.
- Publiczne endpointy GET nie zwracają ETag; tylko administracyjny GET kanoniczny z DO udostępnia ETag do `If-Match`.
- CI wykonuje testy bundlowania Wrangler dla staging oraz production. Instalacja nadal używa `npm install`, ponieważ w środowisku przygotowania paczki rejestr npm był niedostępny i nie udało się wygenerować wiarygodnego `package-lock.json`; `npm ci` pozostaje otwarte.
