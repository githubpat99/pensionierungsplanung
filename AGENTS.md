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
- V4-Navigation folgt `docs/information-architecture-v4.md` (verbindlich): drei Ebenen **Mein Plan · Planen · Plan verstehen**. «Mein Plan» ist Home. Das Hamburger-Menü hat genau sechs aufgabenorientierte Destinationen in drei Gruppen (*Mein Plan* · *Planen*: Angaben & Grundlagen, Meine Varianten · *Plan verstehen* mit Badge «Details»: Jahresverlauf, Töpfe-Modell, Annahmen & Berechnung); darunter dezent abgesetzt der **Pilotbereich** «Feedback geben» (Freitext-Dialog mit Vorlage, Versand erst auf Klick per `mailto:`, Plandaten werden nie automatisch mitgeschickt) und «Plan zurücksetzen» (Rückfrage, danach Schnellstart). AHV, PK, Säule 3a, Einkommen, Bedarf und Vermögen sind **keine** Menüpunkte, sondern liegen hinter «Angaben & Grundlagen». Dessen Zeilen (und die Zeilen in «Plan präzisieren») nennen über `captured()` immer den **erfassten Wert**, nicht nur «erfasst».
- Titelzeilen ausschliesslich über `js/v4-pagetitle.js` (`PageTitle`) rendern: eine horizontale Zeile, Haupttitel links, kleine Kontextzeile rechts daneben, auf Mobile ebenfalls nebeneinander (Kontext höchstens zwei kurze Zeilen, nie unter dem Titel, Umbruch nur an Wortgrenzen), Titel endet mit Punkt. Lange Titel (> 16 Zeichen) erhalten `v4-head-long` und unter 521 px 21 px, damit der Kontext Platz behält. Keine screen-spezifische Titelimplementierung.
- Eingaben: Beträge mit Tausendertrennzeichen (`data-amount`), Prozentwerte mit **Dezimalkomma** und numerischer Speicherung (`data-percent`); nur lesende Zeilen mit langen Werten stapeln auf schmalen Screens (`.v4-readonly`), damit Label und Wert nie überlappen. Der Begriff «Nettomiete» erscheint **nicht** in der Oberfläche – das Einkommensfeld heisst «Weitere Einnahmen» (internes `rental`-Kennzeichen bleibt).
- «Mein Plan» ist die Zusammenfassung und kein Inhaltsverzeichnis: PageTitle · Planstatus (ohne Buttons) · vier Kennzahlen · PK-Bezug · **genau eine zustandsabhängige Aktion** («Plan präzisieren» bei offenen/geschätzten Angaben, «Plan optimieren» bei vollständigen Angaben) · zwei sekundäre Zeilen (Jahresverlauf, Meine Varianten). Alles Weitere liegt auf fokussierten Screens oder im Menü; diesen Screen nicht wieder mit Detailblöcken auffüllen.
- Hero-/Hintergrundbild ausschliesslich über `js/v4-hero.js` (`RetirementHero`) und die zwei verbindlichen Assets einsetzen: `public/images/Background.png` (Mobile, primäre Referenz) und `public/images/Background_Desktop.png` (ab 700 px). Kein externes Bild, kein Ersatzbild, keine Personen/Texte im Bild, keine zweite Umsetzung pro Screen. Über Masthead/PageTitle liegt ein kräftiger Creme-Verlauf (`rgba(247,246,242,.90)` bis 84 px, danach weich ausblendend, ab den Tabs ist das Bild wieder deutlich sichtbar); Titel/Logo in Navy, Kontext dunkel und `font-weight:500`, **kein Textschatten, keine Kontur, keine Card hinter dem Titel**.
- «Plan präzisieren» (Datenqualität) und «Plan optimieren» (Optimierung) sind **zwei getrennte Konzepte in zwei Zuständen** desselben Screens: Zustand A zeigt nur den Datenhebel (Angaben präzisieren), Zustand B nur die Optimierungshebel (1 Anlagestrategie, 2 Bedarf netto). Nie mischen.
- Anlagestrategie (Hebel 1 im Zustand «Plan optimieren»): zeigt im Ruhezustand zugeklappt nur die **aktuelle** Strategie («{Profil} · Annahme {x} % pro Jahr · {Wirkung} – zum Ändern aufklappen.», Profil/Satz aus `risk-profiles.js`); die drei antippbaren Vorschau-Szenarien erscheinen erst auf Tap und nennen je «{Profil} · {x} % pro Jahr» sowie «reicht bis Alter X» bzw. «Restvermögen CHF …» (keine Navigation, keine Änderung des gespeicherten Plans), Balken nur bei vergleichbarem Horizont; erst «Strategie übernehmen» persistiert.
- **V4 zeigt alle Beträge in heutiger Kaufkraft (real)** – die Engine rechnet intern so und liefert zusätzlich die nominale Sicht; V2/V3 (Historie) bleiben nominal. Jahresende des Vorjahres = Eröffnung des Folgejahres, keine Währungsüberleitung.
- Jahresverlauf: Steuerung über Regler **und** zwei Schrittknöpfe (± 1 Planjahr, an den Enden deaktiviert); darunter «Alter X» · «n Planjahre». Abschnitt «Deine Töpfe (Jahresende)» nennt die verwendete Anlagestrategie dynamisch aus dem Profil («Ausgewogen · Annahme 4,5 % pro Jahr»), «Rendite dieses Jahres» bleibt das gerechnete Ergebnis. Keine Währungsüberleitung zwischen den Jahren.
- «Restvermögen am Planungshorizont» ist überall dieselbe Zahl: das Jahresende des letzten Planjahres in heutiger Kaufkraft (`horizonValue()`), nicht die nominale Schlusszeile der Engine. In der Jahresansicht wird sie **nicht** zusätzlich ausgewiesen: «6 · Vermögen am Jahresende» zeigt nur «Total» und «Veränderung», weil «Total» im letzten Planjahr genau dieser Wert ist.
- Hebel «Angaben präzisieren» erscheint nur im Zustand «Plan präzisieren»; die Bedarfs-Chips wechseln beim Antippen das Vorzeichen (− 500 ⇄ + 500).
- Renditeannahmen haben genau eine Quelle: das Strategieprofil in `risk-profiles.js`. Die Wertschriftenrendite bis zur Pensionierung ist ein interner Produktsatz (kein Eingabefeld) und wird bei unplausiblen Altwerten (≥ 10 % oder < 0,5 %) im Annahmen-Screen markiert, nicht stillschweigend verwendet.
- Säule 3a: Gruppe «Säule 3a» auf dem Screen Vermögen (Guthaben und Beiträge – in der Tabelle **vor** den optionalen Immobilien) plus Zeile «Säule 3a» auf «Angaben & Grundlagen»; leerer Beitrag = 0, Beitrag ohne Guthaben wird gemeldet, beide leer = unverändert.
- Der Töpfe-Dialog zeigt nur Töpfe mit Vermögen (1–3 Zeilen, keine CHF-0-Zeile, kein leerer Ring) und ist über zwei Wege erreichbar (Menü «Töpfe-Modell» und Jahresverlauf → «Deine Töpfe»), aber **einmal** implementiert: helles neutrales Donut-Zentrum (Mint) mit Navy-Text «Frei verfügbares Vermögen» + Betrag, darunter genau drei kompakte Zeilen (Icon, Name, CHF, Prozent, Erklärung am ⓘ der Zeile) und **eine** Card Anlagestrategie mit dem dynamischen Profil (`risk-profiles.js`), der Herkunft «Annahme» bzw. «gewählt» (Feld `state.strategyChosen` nach «Strategie übernehmen») und der Subline «Bestimmt die erwartete Rendite deiner Anlage, nicht die Aufteilung.» samt ⓘ. Die früheren Erklärblöcke und der generische Satz «Die Aufteilung folgt deiner Anlagestrategie …» sind entfernt; der Dialog passt bei 390 × 844 ohne internes Scrollen.
- **Apply-and-return (globale V4-Regel):** «Übernehmen» bestätigt planungsrelevante Änderungen (Alter, Pensionierungsalter, Kanton, AHV, PK, 3a, weiteres Kapital, Bedarf, Annahmen), rechnet neu und führt **immer auf «Mein Plan»**. «Zurück» ist reine Navigation, speichert nichts und führt zur übergeordneten Seite (`detailParent`: «Angaben & Grundlagen» / «Plan präzisieren» / «Mein Plan»). Ausnahme: mehrstufige Arbeitsbereiche dürfen intern «Speichern» (in V4 nicht vorhanden).
- Detailseiten: **genau ein** Rückweg unter der Titelzeile (`PageTitle.render(titel, kontext, {detail:true})` → `.v4-detailbar`, `data-v4-back`, Label = übergeordnete Seite) – kein «✕», kein Home auf fokussierten Screens; nur Modals schliessen mit dem Tabler-«✕». Der Rückweg liegt nie in der Titelzeile (dort bräche der Kontext die Ein-Zeilen-Regel). Editoren als Tabelle (Label links, Wert rechts, Einheitenspalte, `hyphens:auto`), «Übernehmen» immer als echter `type="submit"`; Info-Dialoge tabellarisch mit Betrag prominent, Herkunftszeile und einem Schliessen-Knopf im Kopf, der nur das Tabler-«✕» (`close` aus `js/icons.js`, 22 px, stroke 1,7, `--v3-green`) zeigt: transparent, ohne Rahmen/Schatten, ≥ 40 × 40 px Touchfläche, mintfarbener Kreis erst bei Hover/Tastatur-Focus, `aria-label="Schliessen"`. Vermögenszeilen dürfen leer bleiben (`applyAsset` mit `{keepOptional:true, allowEmpty:true}` → leer = nicht erfasst, nie 0).
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
