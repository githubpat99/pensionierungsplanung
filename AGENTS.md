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
- V4-Navigation folgt `docs/information-architecture-v4.md` (verbindlich): drei Ebenen **Mein Plan · Planen · Plan verstehen**. «Mein Plan» ist Home. Das Hamburger-Menü hat genau sechs aufgabenorientierte Destinationen in drei Gruppen (*Mein Plan* · *Planen*: Angaben & Grundlagen, Meine Varianten · *Plan verstehen* mit Badge «Details»: Jahresverlauf, Töpfe-Modell, Annahmen & Berechnung); darunter dezent abgesetzt der **Pilotbereich**: «Angaben für die Beratung» (transparente Klartext-Zusammenfassung für den Berater zum Kopieren oder Speichern als .txt; nicht Erfasstes als solches bezeichnet, kein automatischer Versand), «Plan zurücksetzen» (Rückfrage, danach Schnellstart) sowie **«Neu laden»** (speichert vorher, löscht nichts) mit der **App-Version** als gedämpfte Zeile darunter. AHV, PK, Säule 3a, Einkommen, Bedarf und Vermögen sind **keine** Menüpunkte, sondern liegen hinter «Angaben & Grundlagen». Dessen Zeilen (und die Zeilen in «Plan präzisieren») nennen über `captured()` immer den **erfassten Wert**, nicht nur «erfasst».
- Titelzeilen ausschliesslich über `js/v4-pagetitle.js` (`PageTitle`) rendern: eine horizontale Zeile, Haupttitel links, kleine Kontextzeile rechts daneben, auf Mobile ebenfalls nebeneinander (Kontext höchstens zwei kurze Zeilen, nie unter dem Titel, Umbruch nur an Wortgrenzen), Titel endet mit Punkt. Lange Titel (> 16 Zeichen) erhalten `v4-head-long` und unter 521 px 21 px, damit der Kontext Platz behält. Keine screen-spezifische Titelimplementierung.
- Eingaben: Beträge mit Tausendertrennzeichen (`data-amount`), Prozentwerte mit **Dezimalkomma** und numerischer Speicherung (`data-percent`). **Betragsfelder verhalten sich schweizerisch:** Gruppierung während des Tippens, der Cursor bleibt hinter derselben Anzahl signifikanter Zeichen, Dezimaltrennzeichen ist das **Komma** («4,5» bleibt «4,5»), Buchstaben und eingefügte Währungstexte werden sofort entfernt, Backspace hinter einem Gruppentrennzeichen löscht die Ziffer davor, und im Fokus zeigt das Feld einen grünen Rahmen mit Mint-Fläche ohne zweite Linie; nur lesende Zeilen mit langen Werten stapeln auf schmalen Screens (`.v4-readonly`), damit Label und Wert nie überlappen. Der Begriff «Nettomiete» erscheint **nicht** in der Oberfläche – das Einkommensfeld heisst «Weitere Einnahmen» (internes `rental`-Kennzeichen bleibt).
- «Mein Plan» ist die Zusammenfassung und kein Inhaltsverzeichnis: PageTitle · Planstatus (ohne Buttons; **keine Herkunftszeile** wie «Berechnet mit deinen Angaben und deinem Wohnkanton» – der Schätz-Hinweis erscheint nur ohne Wohnkanton) · vier Kennzahlen · PK-Bezug **mit der Action-Card «Rente oder Kapital?»** direkt unter dem Regler (mintfarben, grüner Rahmen, dunkelgrüner Titel, `arrowsExchange` links, Chevron rechts; kein «Aktueller Plan»-Hinweis mehr, nur der Vorschauzustand mit «Speichern» meldet sich; stärker als die sekundären Zeilen, dezenter als «Plan optimieren») · **genau eine zustandsabhängige Aktion** («Plan präzisieren» bei offenen/geschätzten Angaben, «Plan optimieren» bei vollständigen Angaben) · zwei sekundäre Zeilen (Jahresverlauf, Meine Varianten). Alles Weitere liegt auf fokussierten Screens oder im Menü; diesen Screen nicht wieder mit Detailblöcken auffüllen.
- Hero-/Hintergrundbild ausschliesslich über `js/v4-hero.js` (`RetirementHero`) und die zwei verbindlichen Assets einsetzen: `public/images/Background.png` (Mobile, primäre Referenz) und `public/images/Background_Desktop.png` (ab 700 px). Kein externes Bild, kein Ersatzbild, keine Personen/Texte im Bild, keine zweite Umsetzung pro Screen. Über Masthead/PageTitle liegt ein kräftiger Creme-Verlauf (`rgba(247,246,242,.90)` bis 84 px, danach weich ausblendend, ab den Tabs ist das Bild wieder deutlich sichtbar); Titel/Logo in Navy, Kontext dunkel und `font-weight:500`, **kein Textschatten, keine Kontur, keine Card hinter dem Titel**.
- «Plan präzisieren» (Datenqualität) und «Plan optimieren» (Optimierung) sind **zwei getrennte Konzepte in zwei Zuständen** desselben Screens: Zustand A zeigt nur den Datenhebel (Angaben präzisieren), Zustand B nur die Optimierungshebel (1 Anlagestrategie, 2 Bedarf netto). Nie mischen.
- Anlagestrategie (Hebel 1 im Zustand «Plan optimieren»): zeigt im Ruhezustand zugeklappt nur die **aktuelle** Strategie («{Profil} · Annahme {x} % pro Jahr · {Wirkung} – zum Ändern aufklappen.», Profil/Satz aus `risk-profiles.js`); die drei antippbaren Vorschau-Szenarien erscheinen erst auf Tap und nennen je «{Profil} · {x} % pro Jahr» sowie «reicht bis Alter X» bzw. «Restvermögen CHF …» (keine Navigation, keine Änderung des gespeicherten Plans), Balken nur bei vergleichbarem Horizont; erst «Strategie übernehmen» persistiert.
- **V4 zeigt alle Beträge in heutiger Kaufkraft (real)** – die Engine rechnet intern so und liefert zusätzlich die nominale Sicht; V2/V3 (Historie) bleiben nominal. Jahresende des Vorjahres = Eröffnung des Folgejahres, keine Währungsüberleitung.
- Jahresverlauf: Steuerung über Regler **und** zwei Schrittknöpfe (± 1 Planjahr, an den Enden deaktiviert); darunter «Alter X» · «n Planjahre». Der Screen ist eine **Übersicht**: jeder der sechs Abschnitte zeigt zugeklappt **genau eine Kennzahl** (Label, Betrag, Chevron) – 1 «Total» · 2 «Netto verfügbar» · 3 «Fehlbetrag»/«Überschuss» · 4 «Total Entnahme» · 5 «Rendite dieses Jahres» · 6 «Total» – und die Details kommen erst auf Tap (Chevron dreht, `yearState.fold` hält den offenen Zustand über den Jahreswechsel); nichts Aufzuklappendes bleibt eine einzelne Zeile. Abschnitt 5 nennt **aufgeklappt** die verwendete Anlagestrategie dynamisch aus dem Profil («Ausgewogen · Annahme 4,5 % pro Jahr»). Keine Währungsüberleitung zwischen den Jahren. Topf-Zeilen in den Abschnitten 1, 4 und 5 tragen **Icon und Farbe ihres Topfes** (`bucketConfig[].icon`/`.tone`, 15 px, `aria-hidden`; Reihenfolge Geldmarkt → Obligationen → Wertschöpfung) und zeigen **nur Töpfe mit Vermögen** – keine «CHF 0»-Zeile (dieselbe Regel wie im Töpfe-Dialog), Entnahmen negativ; bleibt kein Topf übrig, steht «Töpfe leer», ohne Entnahme «Keine Entnahme nötig». Abschnitt 6 bleibt ohne Topf-Zeilen. Das Töpfe-Modell hängt an einem **antippbaren Donut-Icon direkt neben den Überschriften 1 und 6** (`.v4-year-pot`, `data-v4-action="pots"`, `data-pot-position="start"` bzw. `"end"`, `aria-label="Töpfe-Modell öffnen"`, 36 px, grün, kein Topf-Farbcode) und öffnet denselben Dialog für das gewählte Jahr – an Abschnitt 1 mit dem **Jahresanfang** (`buckets`/`free`), an Abschnitt 6 mit dem **Jahresende** (`endBuckets`/`end`); der Textlink «Töpfe-Modell · Aufteilung und Entwicklung» am Seitenende ist **entfernt**, und die frühere Fusszeile (Variante, Kaufkraft, Annahmen) steht nur noch hinter dem ⓘ der Jahreszeile («So rechnet diese Ansicht») – der Screen trägt keinen stehenden Erklärtext.
- «Restvermögen am Planungshorizont» ist überall dieselbe Zahl: das Jahresende des letzten Planjahres in heutiger Kaufkraft (`horizonValue()`), nicht die nominale Schlusszeile der Engine. In der Jahresansicht wird sie **nicht** zusätzlich ausgewiesen: «6 · Vermögen am Jahresende» zeigt nur «Total» und «Veränderung», weil «Total» im letzten Planjahr genau dieser Wert ist.
- Hebel «Angaben präzisieren» erscheint nur im Zustand «Plan präzisieren»; die Bedarfs-Chips wechseln beim Antippen das Vorzeichen (− 500 ⇄ + 500).
- Renditeannahmen haben genau eine Quelle: das Strategieprofil in `risk-profiles.js`. Die Wertschriftenrendite bis zur Pensionierung ist ein interner Produktsatz (kein Eingabefeld) und wird bei unplausiblen Altwerten (≥ 10 % oder < 0,5 %) im Annahmen-Screen markiert, nicht stillschweigend verwendet.
- Säule 3a: Gruppe «Säule 3a» auf dem Screen Vermögen (Guthaben und Beiträge – in der Tabelle **vor** den optionalen Immobilien) plus Zeile «Säule 3a» auf «Angaben & Grundlagen»; leerer Beitrag = 0, Beitrag ohne Guthaben wird gemeldet, beide leer = unverändert.
- Das Töpfe-Modell ist **dynamisch**: es zeigt immer den Zustand eines Planjahres aus der zentralen Jahresprojektion (`endBuckets`/`end`, nach Entnahme, Rendite und Umbuchung), nennt das Jahr im Kopf («Alter X · Jahr JJJJ») und berechnet die Prozentanteile aus den Beträgen (Invariante: Summe der Töpfe = frei verfügbares Vermögen). **Zwei Positionen, eine Rechnung:** über Abschnitt 1 der Jahresansicht zeigt es den **Jahresanfang** (`buckets`/`free`, «Stand am Anfang dieses Jahres»), über Abschnitt 6 das **Jahresende** (`endBuckets`/`end`, «Stand am Ende dieses Jahres»); der **Menüeintrag** zeigt immer den **Jahresanfang des ersten Planjahres** – unabhängig vom zuletzt gewählten Jahr und identisch mit dem Icon an Abschnitt 1 im ersten Jahr. Nie die statische Startaufteilung, nie aus der Strategie abgeleitet, keine zweite Rechnung.
- Der Töpfe-Dialog zeigt nur Töpfe mit Vermögen (1–3 Zeilen, keine CHF-0-Zeile, kein leerer Ring) und ist über zwei Wege erreichbar (Menü «Töpfe-Modell» und Jahresverlauf über das Topf-Icon an den Überschriften 1 und 6), aber **einmal** implementiert: helles neutrales Donut-Zentrum (Mint) mit Navy-Text «Frei verfügbares Vermögen» + Betrag, darunter genau drei kompakte Zeilen (Icon, Name, CHF, Prozent, Erklärung am ⓘ der Zeile) und **eine** Card Anlagestrategie mit dem dynamischen Profil (`risk-profiles.js`), der Herkunft «Annahme» bzw. «gewählt» (Feld `state.strategyChosen` nach «Strategie übernehmen») und der Subline «Bestimmt die erwartete Rendite deiner Anlage, nicht die Aufteilung.» samt ⓘ. Die früheren Erklärblöcke und der generische Satz «Die Aufteilung folgt deiner Anlagestrategie …» sind entfernt; der Dialog passt bei 390 × 844 ohne internes Scrollen.
- **Deployment, Update und Speicherstände (verbindlich):** Jeder gespeicherte Stand trägt neben dem Datenschema `version` (2) die **Generation** `storageVersion` – definiert **einmal** in `js/v3-state.js` (`STORAGE_VERSION`, aktuell 3) und angezeigt über `js/v4-version.js` (`APP_VERSION`, Form `JJJJ-MM-TT.n`). `V3State.encode()` schreibt die Hülle, `V3State.restore()` lädt ohne zu werfen und meldet `{ok, state, migrated}` bzw. `{ok:false, reason:'newer'|'invalid', message}`. `js/v4-ui.js` reagiert in `load()` genau dreifach: **migrieren** (Migrationskette `migrations` in `js/v3-state.js`, migrierter Stand wird sofort neu abgelegt), **sichern und räumen** (`retirement-v3-plan.backup-{Zeitstempel}`, höchstens zwei Sicherungen, Hauptschlüssel geräumt, Schnellstart, Speichern bleibt möglich) oder **schützen** (Stand aus neuerer Generation/Schema bleibt byte-gleich, Schreiben blockiert). In **allen** Fällen läuft die App weiter und die Meldung ist sichtbar im Banner `#v4Notice` (schliessbar, `role="status"`) – `message()` schreibt weiterhin in `#v4Error` der Card. **Kein Deployment darf ein manuelles Löschen von Cache oder Speicher verlangen.** `sw.js` (registriert über `js/v4-sw.js`, Scope `./`, nur in `v4.html`) liefert HTML **und** Code netz-zuerst mit `cache:'no-store'` (Code **nie** cache-first – sonst Mischzustand aus alter Engine und neuer Oberfläche), stale-while-revalidate nur für Medien, reines Netz für `/tests/` und `?dev=1`, räumt im `activate` alle alten Caches, `skipWaiting()`/`clients.claim()`, Registrierung mit `updateViaCache:'none'` + `update()` und **genau ein** Reload bei einem echten Update (nicht bei der Erstinstallation). Bei jedem Deployment: `APP_VERSION` erhöhen, bei geändertem Zustandsaufbau `STORAGE_VERSION` **und** einen Migrationsschritt ergänzen, `?v=` der geänderten Assets in `v4.html` erhöhen.
- **Apply-and-return (globale V4-Regel):** «Übernehmen» bestätigt planungsrelevante Änderungen (Alter, Pensionierungsalter, Kanton, AHV, PK, 3a, weiteres Kapital, Bedarf, Annahmen), rechnet neu und führt **immer auf «Mein Plan»**. «Zurück» ist reine Navigation, speichert nichts und führt zur übergeordneten Seite (`detailParent`: «Angaben & Grundlagen» / «Plan präzisieren» / «Mein Plan»). Ausnahme: mehrstufige Arbeitsbereiche dürfen intern «Speichern» (in V4 nicht vorhanden).
- Detailseiten: **genau ein** Rückweg unter der Titelzeile (`PageTitle.render(titel, kontext, {detail:true})` → `.v4-detailbar`, `data-v4-back`, Label = übergeordnete Seite) – kein «✕», kein Home auf fokussierten Screens; nur Modals schliessen mit dem Tabler-«✕». Der Rückweg liegt nie in der Titelzeile (dort bräche der Kontext die Ein-Zeilen-Regel). Editoren als Tabelle (Label links, Wert rechts, Einheitenspalte, `hyphens:auto`), «Übernehmen» immer als echter `type="submit"`; Info-Dialoge tabellarisch mit Betrag prominent, Herkunftszeile und einem Schliessen-Knopf im Kopf, der nur das Tabler-«✕» (`close` aus `js/icons.js`, 22 px, stroke 1,7, `--v3-green`) zeigt: transparent, ohne Rahmen/Schatten, ≥ 40 × 40 px Touchfläche, mintfarbener Kreis erst bei Hover/Tastatur-Focus, `aria-label="Schliessen"`. Vermögenszeilen dürfen leer bleiben (`applyAsset` mit `{keepOptional:true, allowEmpty:true}` → leer = nicht erfasst, nie 0).
- Der ⓘ von «Einkommen netto / Monat» heisst in der obersten Zeile «Einkommen brutto» und ist die Summe **aller** Einnahmequellen (`incomeGross` des Rechenkerns, inkl. weitere Einnahmen), nie die Summe einzelner Rentenarten – nur so geht `brutto − Steuern = netto` auf. Die aufklappbare Liste heisst «Einnahmen einzeln» und summiert sich genau auf das Bruttoeinkommen.
- Nach dem Schnellstart startet der Kapitalbezug mit 50 % (Varianten 0 / 50 / 100, aktueller Plan in der Mitte).
- Die vier Kennzahlen auf «Mein Plan» sind eine Rechenkette: Einkommen netto / Monat · Bedarf netto / Monat · Aus Vermögen / Monat · Startkapital, mit sichtbar aufgehender Differenz (Einkommen + Aus Vermögen = Bedarf). Das Bruttoeinkommen («Einkommen brutto») steht nur im ⓘ und in der Jahresrechnung.
- «Meine Varianten»: der **aktuelle Plan steht immer zuerst und offen** (Badge «✓ Aktueller Plan», sechs Kennzahlen); alle **weiteren Varianten sind zugeklappt** (`<details class="v4-variant-fold">`) und zeigen nur den Namen und die **Reichweite** («Reicht voraussichtlich bis Alter X» bzw. «Plan geht voraussichtlich auf»). Die Kennzahlen kommen auf Tap, «Übernehmen» bleibt auch zugeklappt sichtbar; **«Übernehmen» bestätigt die Variante als aktuellen Plan und springt direkt auf «Mein Plan»** (Apply-and-return, wie jede andere planungsrelevante Änderung) – auf dem Variantenscreen steht die übernommene Quote danach zuerst, die übrigen sind wieder zugeklappt (max. drei Plätze, keine Radio-Buttons, keine Duplikate). **Ohne Kapitalbezug – also in der Situation «Bereits pensioniert» – existiert der ganze Variantenbereich nicht:** keine Zeile «Meine Varianten» auf «Mein Plan», kein Menüpunkt, kein Vergleichseinstieg, `renderVariants()` leitet auf «Mein Plan» zurück; tote «Übernehmen»-Knöpfe sind ausgeschlossen. **Schema-1-Speicherstände** (alte Planungen ohne `v3Variants`) erhalten beim Laden die drei Variantenplätze, damit der Vergleich sofort verfügbar ist.
- «Rente oder Kapital?» (`renderCompare()`, `route: comparison`) vergleicht **genau zwei** Varianten: links fix und **grün** der aktuelle Plan («Aktueller Plan», nicht auswählbar), rechts **blau** die wählbare **«Variante»** (ohne «Zweite», Auswahl nur aus den übrigen gespeicherten Varianten), je Karte genau drei Kernwerte (Startkapital netto · PK-Rente netto / Mt. · Vermögen reicht bis) in exakt ausgerichteten Zeilen und beide Karten auch auf Mobile nebeneinander. Einstieg als kompakte Action-Card «Rente oder Kapital?» direkt unter dem PK-Regler auf «Mein Plan» und auf «Meine Varianten» – **kein** Menüpunkt. Farben bedeuten Identität (grün = aktuell, blau = Vergleich), nie Bewertung. Die Grafik nutzt die zentrale Jahresprojektion, hat **keine CHF-Y-Achse** (nur die Jahreszahlen mit Abstand unter der Fläche, **ohne** Beschriftung «Alter», aber unter **jedem** Punkt, und **nur unter den beschrifteten Zeitpunkten** – keine Zehnjahres-Zwischenwerte wie 76 zwischen 66 und 78; Beispiel «optimiert»: 66 · 78 · 90), zeigt **höchstens drei Wertelabels je Linie** (Priorität Start · gemeinsamer Vergleichszeitpunkt · Ende/Aufbrauch mit «0 mit {Alter}») **kollisionsfrei** – jedes Label sitzt **mittig über seinem Datenpunkt** (`labelX = pointX`), weicht bei Überdeckung **nur vertikal** aus und rutscht erst am Chartrand an die Kante, wo es eine **Leader-Line** bekommt; sonst entfällt es, keine Linie läuft durch ein Label und keines berührt die X-Achse – und kennt den Umschalter Vermögen/Einkommen. Die gewählte Vergleichsvariante und die Ansicht werden getrennt vom Plan unter `retirement-v4-compare` (`{share, view}`) gemerkt und nach einem Neuladen wiederhergestellt. «Vermögen reicht bis» ist überall dieselbe Zahl: die Oberfläche beschriftet Planjahre mit `row.age + 1`, die Reichweite kommt zentral aus `exhaustionAge()` (Statusbox = Vergleichskarte = Grafikmarke). Unter der Grafik stehen zwei eingeklappte Zeilen («Die wichtigsten Unterschiede» mit sieben Zeilen inkl. «Danach Einkommen», «So haben wir gerechnet» mit der kompakten Kurzzeile «AR · 5,2 % · Ausgewogen · bis 90» – Inflation und Bezeichnungen erst beim Aufklappen) sowie die **Beratungs-Card** «Und deine Anlagestrategie?» als CTA (mintfarben, grüner Rahmen, «Individuell besprechen →» statt Chevron, öffnet den bestehenden Beratungsflow), damit die Übersicht bei 390 × 844 exakt auf **einen Screen** passt (848 px = 1,00). Der Screen gibt **keine Empfehlung**, hat **kein «Übernehmen»** und ändert weder Plan noch Strategie oder Töpfe. Titel «Rente oder Kapital?» endet als Frage ohne Punkt (einzige Ausnahme der Punkt-Regel).

## Tests

- Bei Änderungen am gemeinsamen Rechenkern: `node js/retirement-calculator.test.js`.
- V2-Bedienabläufe (nur noch zur Sicherung der erhaltenen Historie): `tests/v2-check.cy.js`, `tests/v2-inline.cy.js`, `tests/v2-details.cy.js`.
- V2-Navigation: `tests/v2-navigation.cy.js`; V3-Navigation und Varianten: `tests/v3-navigation.cy.js`.
- Profiländerungen: `node js/risk-profiles.test.js` und die betroffenen Browserprüfungen.
- Berechnungsänderungen mit Regressionstests absichern. Beide Wege (vor/nach Pensionierung), Persistenz, Desktop und Mobile prüfen.
- Deployment-relevante Änderungen: `tests/v4-browser-checks.html` prüft in den Blöcken **«Speicherstand»** (Migration, Sicherung/Räumung, Schutz neuerer Stände, sichtbare Meldung) und **«Service Worker»** (`skipWaiting`/`claim`, netz-zuerst für HTML **und** Code, Medien stale-while-revalidate, Bypass für `/tests/` und `?dev=1`, Update-Flow). Für die echte Update-Kette zusätzlich einmal mit **persistentem** Browserprofil prüfen (Hülle und Code nach einem geänderten Deployment ohne Löschen frisch).
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
