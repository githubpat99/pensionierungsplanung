# AGENTS.md

## Project

This repository contains the pension planning application.

Before making substantial changes, first understand the existing project context and current implementation.

## Read project documentation

Read the relevant documentation before changing behavior, UX, calculations, or architecture:

- `README.md` – general project overview
- `USE_CASES.md` – user and business use cases
- `DIALOG_FLOW.md` – dialog and user flow
- `FEATURE_LAYOUT.md` – feature and screen structure
- `PROTOTYPE_FLOW.md` – prototype flow and current UX concept
- `docs/PRODUCT_RULES.md` – verbindliche Berechnungs-, Steuer-, UX-, Text- und Darstellungsregeln
- `docs/MASTER_SPEC.md` – zentrale fachliche und funktionale Spezifikation des Sollzustands

Do not duplicate this documentation in this file.

## Working principles

- Preserve existing behavior unless the task explicitly requires a change.
- Do not redesign UX or business logic implicitly.
- Prefer small, focused and reviewable changes.
- Reuse existing code before introducing new abstractions.
- Do not add libraries or frameworks unless there is a clear benefit.
- Keep the application mobile-first.
- Keep user-facing language understandable for non-experts.
- Do not expose secrets, API keys or credentials in source code or commits.
- Neue Anforderungen, die einer bestehenden Produktregel widersprechen, vor der Umsetzung ausdrücklich nennen.

## Before implementation

For significant changes:

1. Inspect the relevant existing code and documentation.
2. Explain important assumptions or ambiguities.
3. Determine the smallest coherent implementation.
4. Avoid changing unrelated files.
5. `docs/PRODUCT_RULES.md` vollständig lesen.
6. Betroffene Kapitel in `docs/MASTER_SPEC.md` lesen; Konflikte mit dem dokumentierten Sollzustand vor der Umsetzung nennen.

## Master specification

- `docs/MASTER_SPEC.md` ist die zentrale fachliche und funktionale Spezifikation des aktuellen Sollzustands, keine Historie und kein Changelog.
- Nach jeder erfolgreich implementierten fachlichen oder funktionalen Änderung die betroffenen Kapitel aktualisieren. Ersetzte Konzepte dort ersetzen, keine widersprüchlichen Änderungswünsche am Ende anhängen.
- `docs/PRODUCT_RULES.md` konsistent halten.
- Eindeutig vorhandene, aber fachlich nicht abschliessend dokumentierte Logik als `IMPLEMENTIERT` beschreiben; offene Grundlagen mit `ZU VERIFIZIEREN` kennzeichnen.
- Keine neuen Berechnungsregeln aus Dokumentationslücken ableiten.

## Implementation and verification

- Navigation: Start → Deine Angaben → Dein Plan. Details direkt vom Plan öffnen. Eine Angabenübersicht mit Gruppeneditoren; eindeutige Parents gemäss Master-Spezifikation Kapitel 4/5.
- Neue Oberfläche in `check-ui.js`/`check-ui.css`, unabhängiges Planungsmodell in `retirement-calculator.js`. Alle Prognosen verwenden denselben Rechenkern, keine unabhängigen Nebenrechnungen.
- `check-ui.js` ist alleiniger Navigation Owner. Erhaltene Fachkomponenten dürfen keine zweite Wizard-Navigation zeigen.
- Risikoprofile zentral in `risk-profiles.js` pflegen. Renditereihen und Profilvergleich ausschliesslich über den gemeinsamen Rechenkern.

## Tests

- Bei Änderungen am gemeinsamen Rechenkern: `node retirement-calculator.test.js`.
- Neue Bedienabläufe: `tests/new-check.cy.js`.
- Navigationsänderungen: `tests/navigation.cy.js`.
- Profiländerungen: `node risk-profiles.test.js` und `tests/risk-profiles.cy.js`.
- Berechnungsänderungen mit Regressionstests absichern. Beide Wege (vor/nach Pensionierung), Persistenz, Desktop und Mobile prüfen.
- Gezielte Checks statt unnötiger kompletter Testläufe.

## After implementation

- Verify the affected user flow.
- Check for regressions in related screens or calculations.
- Update existing documentation when the implementation changes documented behavior.
- Do not create additional documentation files unless they add information that does not already belong in an existing document.
- Dokumentation und zugehörige Codeänderungen gemeinsam committen, wenn ein Commit beauftragt ist.
- Historische Entwürfe erhalten; neue verbindliche Regeln und Abweichungen ausdrücklich dokumentieren.
- Persönliche Browserdaten, Sicherungsdateien und erzeugte Screenshots nicht ungefragt committen.

## Reviews

When asked for a code or architecture review:

- Look for functional errors and regressions first.
- Check architecture and unnecessary complexity.
- Check maintainability and duplication.
- Check security and handling of sensitive data.
- Check mobile usability where UI is affected.
- Clearly separate critical issues from optional improvements.