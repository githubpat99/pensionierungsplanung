# Ruhestands-Check

Lokale Browseranwendung zur Planung von Einkommen, Bedarf und verfügbarem Kapital im Ruhestand. Der produktive Einstieg ist `index.html` (bzw. `/pensionierungsplanung/`) und lädt die aktuelle Produktivversion **V4** (`v4.html`); die Zeile `PRODUCTION_ENTRY` in `index.html` ist die einzige Stelle, die bei einem Versionswechsel angepasst wird. `v2.html` und `v3.html` bleiben als Historie direkt aufrufbar, sind aber nicht mehr verlinkt.

## Start

`index.html` im Browser öffnen (bzw. das Verzeichnis der App aufrufen). Für die Cypress-Tests einen lokalen Server an der Projektwurzel auf Port 8000 starten.

Als **installierbare App (PWA)** startet derselbe Einstieg: `site.webmanifest` verweist mit `start_url: "./index.html"` und `scope: "./"` nie auf eine Versionsdatei; Icons (192/512/maskable, aus `RC_Icon.png` abgeleitet) liegen in `public/icons/`. Der Service Worker `sw.js` (registriert über `js/pwa-register.js` in allen Einstiegen) lädt die Hülle vor, räumt beim Aktivieren jeden anderen Cache (auch alte V2/V3-Caches) und liefert Offline die Hülle `index.html`.

Die App speichert den Plan im Browser auf diesem Gerät (`retirement-v3-plan`). Ein allfälliger V2-Stand unter `retirement-v2-plan` wird nicht mehr gelesen oder verändert. Die historische Datei `Rentenberechnung.xlsx` ist keine Eingabe der aktuellen Oberfläche.

## Aufbau

- `css/v2-ui.css`: Basisschicht, die `v3.html` mitlädt. Abgelöste V2-Oberfläche: `v2.html`, `js/v2-ui.js` (nur noch Historie).
- `v3.html`, `js/v3-ui.js`, `css/v3*.css`: Oberfläche, Navigation und Jahresansicht mit PK-Varianten und dem Schnelleinstieg in vier Fragen.
- `js/v3-state.js`: Varianten-, Migrations- und Speicheradapter; `js/v2-state.js` ist der reine Eingabeadapter, `js/estimates.js` hält die Schätzwerte (AHV-Pauschale CHF 3'000, PK-Umwandlungssatz 5,2 %).
- `v4.html`, `js/v4-ui.js`, `css/v4.css`: V4-Oberfläche (radikal vereinfachte Mobile-UX) mit `js/v4-pagetitle.js` (Titelzeile) und `js/v4-hero.js` (Hintergrundbild). Ihre Navigation und Ebenen sind in [`docs/information-architecture-v4.md`](docs/information-architecture-v4.md) verbindlich beschrieben.
- `js/retirement-calculator.js`, `js/retirement-engine.js`, `js/tax-model.js`: gemeinsamer Rechenkern und Steuerberechnung.
- `docs/MASTER_SPEC.md`, `docs/PRODUCT_RULES.md`: verbindlicher Sollzustand und Produktregeln.
- `docs/information-architecture-v4.md`: Informationsarchitektur der V4-Oberfläche (Home, Planen, Plan verstehen, Menü, Crosslinks, Architekturregel für neue Features).
- `docs/USE_CASES.md`, `docs/TEST_CASES.md`: aktuelle Use Cases und Testzuordnung.
- `docs/archive/`, `archive/`: historische Dokumente und frühere Prototypen; keine Implementierungsanforderungen.

## Prüfungen

Node-Tests liegen unter `js/*.test.js`. Browser-Tests liegen unter `tests/*.cy.js`; die Cypress-Konfiguration ist `js/cypress.config.js` und erwartet `http://localhost:8000`. Vor Änderungen die Hinweise in [AGENTS.md](AGENTS.md) und die betroffenen Kapitel von [MASTER_SPEC.md](docs/MASTER_SPEC.md) und [PRODUCT_RULES.md](docs/PRODUCT_RULES.md) lesen.
