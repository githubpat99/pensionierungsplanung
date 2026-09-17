# AGENTS.md

## Project

This repository contains the pension planning application.

Before making substantial changes, first understand the existing project context and current implementation.

## Read project documentation

Read the relevant documentation before changing behavior, UX, calculations, or architecture:

- `README.md` – general project overview
- `docs/USE_CASES.md` – current user and business use cases
- `docs/TEST_CASES.md` – test traceability
- `docs/PRODUCT_RULES.md` – verbindliche Berechnungs-, Steuer-, UX-, Text- und Darstellungsregeln
- `docs/MASTER_SPEC.md` – zentrale fachliche und funktionale Spezifikation des Sollzustands

Do not duplicate this documentation in this file.

## Source of truth

Current product documentation, in priority order:

1. `docs/MASTER_SPEC.md`
2. `docs/PRODUCT_RULES.md`
3. `docs/USE_CASES.md`
4. `docs/TEST_CASES.md`

Files below `docs/archive/` are historical references only. They MUST NOT be used as implementation requirements. `MASTER_SPEC.md` and `PRODUCT_RULES.md` take precedence over older documents.

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

- Produktiver Einstieg: `index.html` → `v2.html`. `v3.html` ist ein separater Entwurf; eine Umschaltung braucht die in `docs/MASTER_SPEC.md` beschriebene fachliche und technische Prüfung.
- `v2-ui.js` steuert die V2-Navigation, `v3-ui.js` die V3-Navigation. Keine konkurrierende Navigation innerhalb derselben Oberfläche.
- Alle Prognosen verwenden `retirement-calculator.js` und denselben Rechenkern, keine unabhängigen Nebenrechnungen.
- Risikoprofile zentral in `risk-profiles.js` pflegen. Renditereihen und Profilvergleich ausschliesslich über den gemeinsamen Rechenkern.

## Tests

- Bei Änderungen am gemeinsamen Rechenkern: `node js/retirement-calculator.test.js`.
- V2-Bedienabläufe: `tests/v2-check.cy.js`, `tests/v2-inline.cy.js`, `tests/v2-details.cy.js`.
- V2-Navigation: `tests/v2-navigation.cy.js`; V3-Navigation und Varianten: `tests/v3-navigation.cy.js`.
- Profiländerungen: `node js/risk-profiles.test.js` und die betroffenen Browserprüfungen.
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
