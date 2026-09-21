# Ruhestands-Check

Lokale Browseranwendung zur Planung von Einkommen, Bedarf und verfügbarem Kapital im Ruhestand. Der produktive Einstieg ist `index.html` und führt auf `v2.html`. `v3.html` ist ein separater Entwurf und ersetzt V2 noch nicht.

## Start

`index.html` im Browser öffnen. Für die Cypress-Tests einen lokalen Server an der Projektwurzel auf Port 8000 starten.

Die App speichert bestätigte V2-Angaben im Browser auf diesem Gerät. V3 verwendet einen getrennten Speicherstand. Die historische Datei `Rentenberechnung.xlsx` ist keine Eingabe der aktuellen Oberfläche.

## Aufbau

- `v2.html`, `js/v2-ui.js`, `css/v2-ui.css`: aktuelle Oberfläche und Navigation.
- `v3.html`, `js/v3-ui.js`, `css/v3*.css`: eigenständige V3 mit PK-Vorschauen, bis zu drei gespeicherten Varianten und eigenen Informationsseiten.
- `js/v3-state.js`: eigener V3-Varianten-, Migrations- und Speicheradapter; nutzt den vorhandenen reinen Eingabeadapter `js/v2-state.js` unverändert. V2-Dateien und V2-Browserdaten bleiben unverändert.
- `js/retirement-calculator.js`, `js/retirement-engine.js`, `js/tax-model.js`: gemeinsamer Rechenkern und Steuerberechnung.
- `docs/MASTER_SPEC.md`, `docs/PRODUCT_RULES.md`: verbindlicher Sollzustand und Produktregeln.
- `docs/USE_CASES.md`, `docs/TEST_CASES.md`: aktuelle Use Cases und Testzuordnung.
- `docs/archive/`, `archive/`: historische Dokumente und frühere Prototypen; keine Implementierungsanforderungen.

## Prüfungen

Node-Tests liegen unter `js/*.test.js`. Browser-Tests liegen unter `tests/*.cy.js`; die Cypress-Konfiguration ist `js/cypress.config.js` und erwartet `http://localhost:8000`. Vor Änderungen die Hinweise in [AGENTS.md](AGENTS.md) und die betroffenen Kapitel von [MASTER_SPEC.md](docs/MASTER_SPEC.md) und [PRODUCT_RULES.md](docs/PRODUCT_RULES.md) lesen.
