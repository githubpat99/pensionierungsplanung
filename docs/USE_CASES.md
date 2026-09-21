# Use Cases – Ruhestands-Check

Diese Fälle beschreiben die aktuelle Anwendung. Der produktive Einstieg ist `index.html` → `v2.html`; `v3.html` ist ein separater Entwurf. Die fachlichen Regeln stehen in `MASTER_SPEC.md` und `PRODUCT_RULES.md`. Frühere, breiter angelegte Ideen sind unter `archive/concepts/USE_CASES_legacy.md` archiviert.

| ID | Use Case | Erwartetes Ergebnis | Stand |
| --- | --- | --- | --- |
| UC-01 | Planung vor Pensionierung | Alter, Pensionierungszeitpunkt, Bedarf, Einkünfte und Vermögen führen zum Plan; Vorsorgewerte verfeinern ihn. | V2 implementiert |
| UC-02 | Bereits pensioniert | Heute laufende PK-Rente und vorhandenes freies Kapital werden ohne erneuten PK-Bezug verwendet. | V2 implementiert |
| UC-03 | PK-Rente und Kapital | 0–100 % in Einerschritten per Regler/Zahl; Vorschau, bewusste Übernahme und bis zu drei gespeicherte Quoten; gleiche gemeinsame Angaben und Jahresrechnung. | V3 implementiert |
| UC-04 | Vermögen | Verfügbare Mittel sind editierbar; 3a und PK werden einmal aus Vorsorge übernommen; Immobilien bleiben gebunden. Optionale Betragsfelder dürfen leer bleiben und gelten dann als nicht erfasst. | V2 unverändert; V3 implementiert |
| UC-05 | Einkommen | AHV, weitere Renten und weitere Einnahmen werden getrennt erfasst und im Ergebnis mit Steuerwirkung angezeigt. | V2 unverändert; V3 implementiert |
| UC-06 | Säule 3a | Hochrechnung bis Pensionierung, dann genau einmal im freien Startkapital. Keine Konten, späteren Zuflüsse oder modellierte 3a-Bezugssteuer. Post keine Zusatzaddition. | V3 implementiert; V2 unverändert |
| UC-07 | Steuern | Kanton bestimmt laufende und PK-Bezugssteuer und ist für neue Planungen verpflichtend. Geschätzte Steuern, Kapitalbezugssteuer und Modellgrenzen sind in den Steuer-Rechendetails nachvollziehbar; Kapitalentnahmen aus freiem Vermögen bleiben steuerfrei. Ein älterer Stand ohne Kanton bleibt vorläufig mit «Steuern offen» und ohne vermeintliches PK-Netto. | V2 und V3 implementiert |
| UC-08 | Planungshorizont | Automatisch abgeleitetes Zielalter ist in den Annahmen anpassbar; bestehende manuelle Werte bleiben erhalten. | V2 implementiert |
| UC-09 | Drei Töpfe | Verfügbares Kapital und Entnahmen werden in der fachlich definierten Reihenfolge dargestellt. | V2 implementiert |
| UC-10 | Speicherung und Wiederherstellung | Bestätigte Angaben bleiben auf diesem Gerät erhalten und erscheinen nach Reload wieder. In V3 speichert die App automatisch und zeigt den letzten Speicherzeitpunkt («✓ Automatisch gespeichert | Datum, Zeit») mit «Jetzt speichern». | V2 implementiert; V3 separat |
| UC-11 | Bestehende Planung ändern | Bestätigte Änderungen aktualisieren den Plan; Abbruch erhält die bisherigen Werte. | Implementiert |
| UC-12 | Neue Planung | Ein bestätigter Neustart setzt den Arbeitsstand zurück; persönlicher Speicherstand bleibt erhalten. | V2 implementiert |
| UC-13 | Fehler und Grenzwerte | Ungültige Eingaben blockieren Übernahme; Speicherfehler werden angezeigt. | Teilweise automatisiert |
| UC-14 | Mobile und Desktop | Kernabläufe bleiben bei 360/390 px und Desktop bedienbar und ohne horizontales Scrollen. V3 verdichtet Abstände und Karten, ohne die Schrift zu verkleinern; Pflichtfelder tragen `*`, Beträge Tausendertrennzeichen, und der Variantenvergleich passt in einen mobilen Blick. | Weiter zu prüfen |
| UC-15 | Hilfe | Kontextuelle Modellhinweise sind erreichbar; eine vollständige In-App-Anleitung ist offen. | Teilweise implementiert |
| UC-16 | Navigation | Logo/Menü öffnen Mein Plan; Kennzahlen führen in eigene V3-Details. Abbruch verwirft Entwürfe, Übernahme schreibt die zugehörigen Angaben. | V3 implementiert |

V3 ist eigenständig unter `v3.html`; V2 ist veraltet und bleibt unverändert. Die verbindlichen V3-Regeln stehen in `MASTER_SPEC.md`, Kapitel 23.
