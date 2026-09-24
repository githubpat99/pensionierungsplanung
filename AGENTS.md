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

- Einstieg: `index.html` → `v3.html`. V2 (`v2.html`, `js/v2-ui.js`) ist abgelöst und bleibt nur als Historie erhalten; V3 nutzt weiterhin den reinen Eingabeadapter `js/v2-state.js` und den gemeinsamen Rechenkern.
- `v2-ui.js` steuert die V2-Navigation, `v3-ui.js` die V3-Navigation. Keine konkurrierende Navigation innerhalb derselben Oberfläche.
- Alle Prognosen verwenden `retirement-calculator.js` und denselben Rechenkern, keine unabhängigen Nebenrechnungen.
- Risikoprofile zentral in `risk-profiles.js` pflegen. Renditereihen und Profilvergleich ausschliesslich über den gemeinsamen Rechenkern.
- Titelzeilen ausschliesslich über `js/v4-pagetitle.js` (`PageTitle`) rendern: eine horizontale Zeile, Haupttitel links, kleine Kontextzeile rechts daneben, auf Mobile ebenfalls nebeneinander (Kontext höchstens zwei kurze Zeilen, nie unter dem Titel), Titel endet mit Punkt. Keine screen-spezifische Titelimplementierung.
- «Mein Plan» ist die Zusammenfassung und kein Inhaltsverzeichnis: PageTitle · Planstatus (ohne Buttons) · vier Kennzahlen · PK-Bezug · Card «Plan verbessern» · zwei sekundäre Zeilen. Alles Weitere liegt auf fokussierten Screens oder im Menü; diesen Screen nicht wieder mit Detailblöcken auffüllen.
- Hero-/Hintergrundbild ausschliesslich über `js/v4-hero.js` (`RetirementHero`) und die zwei verbindlichen Assets einsetzen: `public/images/Background.png` (Mobile, primäre Referenz) und `public/images/Background_Desktop.png` (ab 700 px). Kein externes Bild, kein Ersatzbild, keine Personen/Texte im Bild, keine zweite Umsetzung pro Screen.
- «Plan verbessern» besteht aus genau drei nummerierten Hebeln (Angaben präzisieren · Anlagestrategie · Bedarf netto) mit Vorschau-Chips; alle Wirkungen kommen aus dem gemeinsamen Rechenkern, gespeichert wird über die Detailseite.
- Anlagestrategie: drei antippbare Vorschau-Szenarien (keine Navigation, keine Änderung des gespeicherten Plans), primär «reicht bis Alter X», Restvermögen/Balken nur bei vergleichbarem Horizont; erst «Strategie übernehmen» persistiert.
- **V4 zeigt alle Beträge in heutiger Kaufkraft (real)** – die Engine rechnet intern so und liefert zusätzlich die nominale Sicht; V2/V3 (Historie) bleiben nominal. Jahresende des Vorjahres = Eröffnung des Folgejahres, keine Währungsüberleitung.
- Jahresansicht: Abschnitt «Deine Töpfe (Jahresende)» nennt die verwendete Anlagestrategie dynamisch aus dem Profil («Ausgewogen · Annahme 4,5 % p.a.»), «Rendite dieses Jahres» bleibt das gerechnete Ergebnis. Keine Währungsüberleitung zwischen den Jahren.
- «Restvermögen am Planungshorizont» ist überall dieselbe Zahl: das Jahresende des letzten Planjahres in heutiger Kaufkraft (`horizonValue()`), nicht die nominale Schlusszeile der Engine. In der Jahresansicht wird sie **nicht** zusätzlich ausgewiesen: «6 · Vermögen am Jahresende» zeigt nur «Total» und «Veränderung», weil «Total» im letzten Planjahr genau dieser Wert ist.
- Hebel 1 «Angaben präzisieren» klappt zusammen, sobald alle Angaben erfasst sind; die Bedarfs-Chips wechseln beim Antippen das Vorzeichen (− 500 ⇄ + 500).
- Renditeannahmen haben genau eine Quelle: das Strategieprofil in `risk-profiles.js`. Die Wertschriftenrendite bis zur Pensionierung ist ein interner Produktsatz (kein Eingabefeld) und wird bei unplausiblen Altwerten (≥ 10 % oder < 0,5 %) im Annahmen-Screen markiert, nicht stillschweigend verwendet.
- Säule 3a: Gruppe «Säule 3a» auf dem Screen Vermögen (Guthaben und Beiträge) plus Menüeintrag «Säule 3a»; leerer Beitrag = 0, Beitrag ohne Guthaben wird gemeldet, beide leer = unverändert.
- Der Töpfe-Dialog zeigt nur Töpfe mit Vermögen (1–3 Zeilen, keine CHF-0-Zeile, kein leerer Ring).
- Detailseiten: gleiche Rückweg-Zeile unter der Titelzeile (`PageTitle.render(titel, kontext, {detail:true})` → `.v4-detailbar`) mit rundem `‹ Mein Plan` links und rundem «✕» rechts, beide über `data-v4-back`; die Knöpfe liegen nie in der Titelzeile (dort bräche der Kontext die Ein-Zeilen-Regel). Editoren als Tabelle (Label links, Wert rechts, Einheitenspalte, `hyphens:auto`), «Übernehmen» immer als echter `type="submit"`; Info-Dialoge tabellarisch mit Betrag prominent, Herkunftszeile und «✕»-Knopf im Kopf. Vermögenszeilen dürfen leer bleiben (`applyAsset` mit `{keepOptional:true, allowEmpty:true}` → leer = nicht erfasst, nie 0).
- Der ⓘ von «Einkommen netto / Monat» heisst in der obersten Zeile «Einkommen brutto» und ist die Summe **aller** Einnahmequellen (`incomeGross` des Rechenkerns, inkl. weitere Einnahmen), nie die Summe einzelner Rentenarten – nur so geht `brutto − Steuern = netto` auf. Die aufklappbare Liste heisst «Einnahmen einzeln» und summiert sich genau auf das Bruttoeinkommen.
- Nach dem Schnellstart startet der Kapitalbezug mit 50 % (Varianten 0 / 50 / 100, aktueller Plan in der Mitte).
- Die vier Kennzahlen auf «Mein Plan» sind eine Rechenkette: Einkommen netto / Monat · Bedarf netto / Monat · Aus Vermögen / Monat · Startkapital, mit sichtbar aufgehender Differenz (Einkommen + Aus Vermögen = Bedarf). Das Bruttoeinkommen («Einkommen brutto») steht nur im ⓘ und in der Jahresrechnung.

## Tests

- Bei Änderungen am gemeinsamen Rechenkern: `node js/retirement-calculator.test.js`.
- V2-Bedienabläufe (nur noch zur Sicherung der erhaltenen Historie): `tests/v2-check.cy.js`, `tests/v2-inline.cy.js`, `tests/v2-details.cy.js`.
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
