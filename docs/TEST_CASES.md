# Testfälle und Traceability

Ein Testfall gehört genau einem Use Case aus [USE_CASES.md](USE_CASES.md). Die Tabelle bildet die vorhandene Automatisierung ab; `offen` bedeutet, dass ein fachlicher oder UI-Nachweis noch fehlt. Erwartete Beträge werden aus dem gemeinsamen Rechenkern abgeleitet, nicht in dieser Tabelle als neue Fachregeln festgelegt.

| TC-ID | UC-ID | Titel | Vorbedingung | Eingabedaten | Aktion | Erwartetes fachliches Resultat | Erwartetes UI-Verhalten | Automatisiert | Testdatei |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-01.01 | UC-01 | Vor Pensionierung planen | Neuer V2-Stand | Gültige Kerndaten | Gruppen bestätigen | Plan ab Pensionierungsstart | Monatswerte im Plan | Ja | `tests/v2-check.cy.js` |
| TC-02.01 | UC-02 | Bereits pensioniert planen | Neuer Post-Stand | PK-Rente, freies Kapital | Gruppen bestätigen | Keine erneute PK-Besteuerung | Post-Ansichten ohne Bezugsregler | Ja | `tests/v2-check.cy.js`, `js/v2-state.test.js` |
| TC-03.01 | UC-03 | PK-Anteile 0/50/100 | Gültiger Pre-Plan | PK-Guthaben und Kanton | Anteile wählen | Rente und Kapital aus gemeinsamem Rechner | Drei feste Varianten sichtbar | Ja | `js/retirement-calculator.test.js`, `tests/v3-navigation.cy.js` |
| TC-03.02 | UC-03 | Kapitalbezugssteuer | Pre-Plan mit Kanton | PK-Guthaben und Kapitalquote | Quote ändern | Steuer nur auf bezogenes PK-Kapital | Brutto, Steuer und Netto getrennt | Ja | `js/tax-model.test.js`, `tests/v3-navigation.cy.js` |
| TC-03.03 | UC-03 | PK-Regler live | V3-Plan mit PK und Vermögen | 0/50/100 % | Regler bewegen | Gewählter Anteil im State und Rechner sofort aktualisiert | Kein «Variante übernehmen» | Ja | `tests/v3-navigation.cy.js` |
| TC-03.04 | UC-03 | PK-Rente aus Plan öffnen | Vollständiger V3-Plan | PK-Rente vorhanden | Rentenwert antippen | Keine Berechnungsänderung | PK-Editor und Rückweg zum Plan | Ja | `tests/v3-navigation.cy.js` |
| TC-03.05 | UC-03 | Auswahl synchron | Vollständiger V3-Plan | 100 % Kapital | Vergleich öffnen | Vergleich nutzt denselben Anteil | Titel, Linie und Karte markieren 100 % | Ja | `tests/v3-navigation.cy.js` |
| TC-03.06 | UC-03 | Drei Verläufe | Vergleich geöffnet | 0/50/100 % | Checkbox aktivieren | Gleicher Rechenkern je Variante | Drei Linien, gewählte Linie betont | Ja | `tests/v3-navigation.cy.js` |
| TC-03.07 | UC-03 | Freie Mischform | Vergleich geöffnet | 45 % Kapital | Drei Verläufe aktivieren | Gewählte Mischform bleibt im State | Gewählte Linie zusätzlich sichtbar | Ja | `tests/v3-navigation.cy.js` |
| TC-04.01 | UC-04 | Quellen einmal zählen | Plan mit Sammelbetrag | Einzelne Vermögensquelle | Vermögen aufteilen | Keine Doppelzählung | Einzelwerte und Summe stimmen | Ja | `js/v3-ui.test.js`, `tests/v3-navigation.cy.js` |
| TC-05.01 | UC-05 | Einkommensquellen | Plan mit AHV und weiteren Renten | AHV, PK, weitere Renten | Plan und Detail öffnen | Monatswerte aus Rechner | Quellen getrennt; weitere Renten nur bei Betrag | Teilweise | `tests/v2-details.cy.js`, `tests/v3-navigation.cy.js` |
| TC-06.01 | UC-06 | Säule 3a | Pre-Plan | 3a-Guthaben | Vorsorge erfassen | 3a fliesst einmal in Kapitalbasis | Quelle lesend sichtbar | Ja | `js/v3-ui.test.js`, `tests/v3-navigation.cy.js` |
| TC-07.01 | UC-07 | Kantonswechsel | Plan mit Kanton | ZH → SG | Kanton ändern | Steuer erhält neuen Code | Auswahl zeigt Wappen, Kürzel und Namen | Ja | `tests/v3-navigation.cy.js` |
| TC-07.02 | UC-07 | Lokale Wappen | Kanton-Editor offen | 26 Kantone | Picker öffnen | Kein Einfluss auf Steuerformel | 26 lokale SVGs, AR/SG/ZH korrekt | Ja | `tests/v3-navigation.cy.js` |
| TC-08.01 | UC-08 | Horizont erhalten | Automatischer oder manueller Plan | Zielalter 95 | Speichern, laden | Manuelles Alter bleibt | Zielalter sichtbar | Ja | `js/life-expectancy.test.js`, `js/v2-state.test.js` |
| TC-09.01 | UC-09 | Drei Töpfe | Plan mit Kapital | Verfügbare Mittel | Detail öffnen | Topfsumme entspricht Anlagekapital | Reihenfolge und Erklärung stimmen | Teilweise | `js/retirement-engine.test.js` |
| TC-10.01 | UC-10 | Reload | Bestätigter V2-Stand | Gespeicherte Gruppen | Seite neu laden | Gleiche Resultate | Weiterplanen möglich | Ja | `tests/v2-check.cy.js` |
| TC-10.02 | UC-10 | V3-PK-Auswahl erhalten | Gespeicherter V3-Stand | 100 % Kapital | Reload und laden | Quote bleibt im State | Regler und Vergleich synchron | Ja | `tests/v3-navigation.cy.js` |
| TC-11.01 | UC-11 | Änderung und Abbruch | Bestehender Plan | Entwurf im Editor | Ändern / abbrechen | Nur bestätigte Änderung wirkt | Rückweg zum Plan | Ja | `tests/v2-inline.cy.js`, `tests/v3-navigation.cy.js` |
| TC-12.01 | UC-12 | Neue Planung | Gespeicherter V2-Stand | Neustart | Bestätigen | Arbeitsstand zurückgesetzt | Sicherheitsfrage erscheint | Ja | `tests/v2-check.cy.js` |
| TC-13.01 | UC-13 | Ungültiger Betrag | Offener Editor | Negativer Betrag | Übernehmen | State unverändert | Fehlermeldung sichtbar | Teilweise | `js/v3-ui.test.js` |
| TC-14.01 | UC-14 | Mobile und Desktop | Vollständiger Plan | 360/390/1280 px | Kernansichten prüfen | Gleiche Berechnung | Kein horizontaler Überlauf | Teilweise | `tests/v2-check.cy.js`, `tests/v3-navigation.cy.js` |
| TC-14.02 | UC-14 | Altersachse bei Zielalter 86 | V3-Vergleich | Zielalter 86 | Diagramm öffnen | Jahresreihe unverändert | 85/86 überlappen nicht; 86 sichtbar | Ja | `tests/v3-navigation.cy.js` |
| TC-15.01 | UC-15 | Kontext-Hilfe | Kapitaldetail | – | Info öffnen und schliessen | Kein Einfluss auf Plan | Tastatur und Touch funktionieren | Offen | – |
| TC-03.08 | UC-03 | PK-Detail mit Rente und Kapital | Vollständiger V3-Plan | 45 % Kapital | PK-Rente antippen | PK-Rente und PK-Kapital aus demselben Rechner wie «Mein Plan» | PK-Detail zeigt Aufteilung, Rente pro Monat/Jahr und Kapital brutto/Steuer/netto | Ja | `js/v3-ui.test.js`, `tests/v3-navigation.cy.js` |
| TC-03.09 | UC-03 | PK-Aufteilung 0/100 % im Detail | V3-Plan | 0 % und 100 % Kapital | PK-Detail öffnen | Bei 100 % Kapital ist die PK-Rente 0, bei 0 % entsteht kein Kapitalbezug | Aufteilung verständlich; Werte identisch zu «Mein Plan» | Ja | `js/v3-ui.test.js`, `tests/v3-navigation.cy.js` |
| TC-16.01 | UC-16 | Kontextsprung aus «Mein Plan» | Vollständiger V3-Plan | – | Planwert antippen | Keine Berechnungsänderung | Zielabschnitt im Viewport sichtbar, nicht vom Header verdeckt | Ja | `tests/v3-navigation.cy.js` |
| TC-16.02 | UC-16 | Einheitliche Rücknavigation | Jeder V3-Detail-Screen | – | Screen öffnen und zurück | Keine | Genau ein «← Mein Plan» oben links, kein zweiter Button unten | Ja | `tests/v3-navigation.cy.js` |
| TC-16.03 | UC-16 | Speichern/Abbrechen im PK-Detail | PK-Detail geöffnet | Geänderter PK-Wert | ← Mein Plan, Abbrechen, Übernehmen | Nur «Übernehmen» schreibt die PK-Grunddaten | Plan zeigt bestätigte bzw. neue Werte | Ja | `tests/v3-navigation.cy.js` |

Offene V3-Regressionen werden nach der UX-Umsetzung ergänzt und automatisiert. Für jede neue Prüfung bleiben Vorbedingung, Eingabedaten, Aktion sowie fachliches und sichtbares Ergebnis getrennt nachvollziehbar.
