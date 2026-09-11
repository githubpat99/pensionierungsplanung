# Pensionierungsplanung Webapp

Diese Webapp liest deine Excel-Datei `Rentenberechnung.xlsx` und zeigt die wichtigsten Kennzahlen zur Pensionierung, insbesondere Vorsorgelücken und Altersleistungen.

## Nutzung

1. Öffne `index.html` im Browser.
2. Wähle deine Excel-Datei `Rentenberechnung.xlsx` aus.
3. Die Seite zeigt die Übersichtstabelle, die jährlichen Lücken und Detailwerte für jedes Rentenjahr an.

## Dateien

- `index.html` - Hauptseite der Webapp
- `style.css` - Styling
- `app.js` - Logik zum Einlesen und Darstellen der Excel-Datei
- `Rentenberechnung.xlsx` - deine Excel-Basisdatei

## Hinweis

Die App funktioniert lokal im Browser und liest die Excel-Datei direkt aus dem Dateieingabefeld. Eine Installation ist nicht erforderlich.


## Steuer-MVP

`tax-config.js` enthält die vorgegebenen Planungsannahmen für alle 26 Kantone (Version 2026.1). Die Werte wurden aus der MVP-Spezifikation übernommen, nicht individuell oder anhand aktueller ESTV-Tarife nachgerechnet. `tax-model.js` enthält die browserunabhängigen Berechnungen.

Ohne Wohnkanton bleibt die Vorschau ohne Steuerabzug und zeigt einen Hinweis. Der Kanton und die Modellversion werden bei Auswahl im Arbeitsstand und in persönlichen Speicherständen gespeichert.

PK-Kapitalbezugssteuer wird vor der Anlage vom tatsächlich bezogenen Kapital abgezogen. Vorhandenes Privatkapital bei bereits Pensionierten wird nicht nochmals besteuert. Laufende Einkommenssteuer reduziert die Einnahmen; Entnahmen und Gesamtrendite der Töpfe werden nicht nochmals als Einkommen gezählt. Steuerstufen beziehen sich auf nominales Einkommen des jeweiligen Jahres, Steuerbeträge werden innerhalb des Ruhestandsverlaufs in dessen Kaufkraft zurückgerechnet.

Den Lebensbedarf **ohne Einkommenssteuern** eingeben. Bestehende Budgets werden nicht automatisch verändert; bereits enthaltene Einkommenssteuern müssen entfernt werden. Modellrechnung ohne individuelle Abzüge, Vermögenssteuer und Säule-3a-Bezugssteuer.

Prüfung: `node tax-model.test.js`, `node retirement-engine.test.js`, `node financing-view.test.js`, `node historical-returns.test.js`. Browser-Integration bei laufendem localhost:8000 mit installiertem Cypress: `cypress run` (Konfiguration in `cypress.config.js`).


## Machbarkeit vor dem PK-Regler

Die bestehenden Schritte für Einkommen, Bedarf und Horizont stehen vor dem PK-Entscheid. `retirement-feasibility.js` prüft elf Kapitalanteile (0–100 % in 10-Prozent-Schritten) mit `RetirementEngine.simulate`. `planningInput(capitalShare)` erzeugt die jeweilige Eingabe inklusive Steuern ohne die gespeicherte Reglerposition zu verändern.

Machbar bedeutet: kein ungedeckter Jahresbedarf bis zum Zielalter. Das Endkapital allein reicht als Kriterium nicht, weil die Engine negatives Kapital auf null begrenzt. Bei nicht gedeckten Plänen gewinnt die Variante mit der spätesten ersten Lücke, bei Gleichstand mit dem kleinsten aufsummierten Fehlbetrag. Eine exakte Null am Zielalter ist zulässig.

Der finanzierbare Bedarf wird für diese beste Variante durch wiederholte Simulation mit reduziertem Bedarf bestimmt. Alle vorhandenen Lebensphasen werden um denselben Jahresbetrag reduziert, mindestens auf null. Die Anzeige rundet auf CHF 500 und erläutert unterschiedliche Phasen. Die grundsätzliche Machbarkeit bleibt unabhängig von der aktuellen Reglerposition; ohne Kanton bleibt sie offen. Die Reichweite verwendet die Intervalle der Jahresrechnung: erste Lücke mit 87 bedeutet ungedeckten Bedarf im Jahr 87–88.

Zusätzliche Prüfung: `node retirement-feasibility.test.js`; Browserfälle in `tests/feasibility.cy.js`.


## Zusammensetzung des Anlagekapitals

`capitalComponents(capitalShare)` trennt freies Vermögen ausserhalb der PK, tatsächlichen PK-Bezug brutto, Bezugssteuer, PK-Bezug netto, gesamtes Anlagekapital und gebundenes Kapital. Die PK-Steuer wird ausschliesslich durch die bestehende `split()`-Berechnung auf den bezogenen PK-Anteil erhoben. `free0()` liefert bereits den Nettogesamtbetrag; davon darf die Steuer nicht nochmals abgezogen werden.

`planningInput().capitalBreakdown` verwendet die projizierten Kapitalwerte am Pensionierungszeitpunkt ohne zusätzliche Abzinsung für die Jahre bis zur Pensionierung. Das gesamte Anlagekapital ist die Summe aus freiem Vermögen ohne PK und PK-Kapital netto. Gebundenes Vermögen bleibt separat. Vor Pensionierung enthält das freie Vermögen die bisherige Projektion von Säule 3a, Wertschriften und Bankguthaben; deren bestehende Berechnung bleibt unverändert.

Der Test mit CHF 323'348 freiem Vermögen und CHF 1'100'943 PK-Bezug ergibt in AR rund CHF 1'301'646 Anlagekapital. Der zuvor in der Übersicht ausgewiesene Wert «Verfügbar» war dagegen bereits nach PK-Steuer; die dortigen CHF 1'424'291 sind keine Bruttobasis für einen weiteren Steuerabzug.

Die Entwicklungsseite zeigt das gesamte Anlagekapital direkt bei den drei Töpfen. Desktop: bis 900 px Breite und 350 px Charthöhe; Mobile: 280 px Charthöhe, nur Start-/Endlabels und exakte Zwischenwerte in den Karten.


## Verbindliche Regeln und Aktualisierung vom 11. September 2026

Vor Änderungen sind [AGENTS.md](AGENTS.md) und [docs/PRODUCT_RULES.md](docs/PRODUCT_RULES.md) vollständig zu lesen. Die beauftragte Gesamtspezifikation inklusive Abschnitt 0 ist unter [docs/OPTIMIZATION_SPEC_2026-09-11.md](docs/OPTIMIZATION_SPEC_2026-09-11.md) erhalten.

Die neuen Produktregeln ersetzen ausdrücklich die bisherige Hervorhebung der allgemeinen Machbarkeit: Der sichtbare Ergebnisstatus bewertet jetzt die aktuelle PK-Wahl; die Variantenprüfung bleibt intern verfügbar. Die jährliche Topfauffüllung bleibt unverändert und garantiert keine Vermeidung von Aktienverkäufen nach Verlusten. Der gezeigte Geldfluss lautet Aktien → Anleihen → Geldmarkt → Lebensbedarf.

Persönliche Speicherstände verwenden Schema 2; gültige Schema-1-Stände werden beim Laden migriert. Vollständiger State, Speicherzeit und verständliche Fehlerausgabe werden geprüft. Automatische Arbeitsstände und persönliche Speicherstände bleiben getrennt. Der bestehende Browser-Speicherschlüssel wird für die Kompatibilität beibehalten.

Neue Browser-Regressionen in `tests/product-rules.cy.js` prüfen beide vollständigen Wege, Netto-Einkommensgruppen, Steuertexte, Speicherung nach Reload, Schema-1-Kompatibilität und Speicherfehler. Ein tatsächliches neues Deployment ist hierfür nicht nötig; die ältere Datenversion wird gegen den aktuellen Code geladen.
