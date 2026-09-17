# Use Cases – Ruhestands-Check

Diese Fälle beschreiben die aktuelle Anwendung. Der produktive Einstieg ist `index.html` → `v2.html`; `v3.html` ist ein separater Entwurf. Die fachlichen Regeln stehen in `MASTER_SPEC.md` und `PRODUCT_RULES.md`. Frühere, breiter angelegte Ideen sind unter `archive/concepts/USE_CASES_legacy.md` archiviert.

| ID | Use Case | Erwartetes Ergebnis | Stand |
| --- | --- | --- | --- |
| UC-01 | Planung vor Pensionierung | Alter, Pensionierungszeitpunkt, Bedarf, Einkünfte und Vermögen führen zum Plan; Vorsorgewerte verfeinern ihn. | V2 implementiert |
| UC-02 | Bereits pensioniert | Heute laufende PK-Rente und vorhandenes freies Kapital werden ohne erneuten PK-Bezug verwendet. | V2 implementiert |
| UC-03 | PK-Rente und Kapital | PK-Aufteilung verändert Rente, Kapitalbasis, Steuern und Reichweite über den gemeinsamen Rechenkern. | V2 implementiert; V3 Varianten in Arbeit |
| UC-04 | Vermögen | Verfügbare Mittel sind editierbar; 3a und PK werden einmal aus Vorsorge übernommen; Immobilien bleiben gebunden. | V2 implementiert; V3 in Arbeit |
| UC-05 | Einkommen | AHV, weitere Renten und weitere Einnahmen werden getrennt erfasst und im Ergebnis mit Steuerwirkung angezeigt. | V2 implementiert; V3 in Arbeit |
| UC-06 | Säule 3a | Bestand und Beiträge fliessen vor Pensionierung in die Kapitalbasis; nach Pensionierung keine erneute Addition. | V2 implementiert |
| UC-07 | Steuern | Wohnkanton beeinflusst Einkommens- und PK-Bezugssteuer; ohne Kanton bleibt die Einschätzung vorläufig. | Implementiert, vereinfachtes Modell |
| UC-08 | Planungshorizont | Automatisch abgeleitetes Zielalter ist in den Annahmen anpassbar; bestehende manuelle Werte bleiben erhalten. | V2 implementiert |
| UC-09 | Drei Töpfe | Verfügbares Kapital und Entnahmen werden in der fachlich definierten Reihenfolge dargestellt. | V2 implementiert |
| UC-10 | Speicherung und Wiederherstellung | Bestätigte Angaben bleiben auf diesem Gerät erhalten und erscheinen nach Reload wieder. | V2 implementiert; V3 separat |
| UC-11 | Bestehende Planung ändern | Bestätigte Änderungen aktualisieren den Plan; Abbruch erhält die bisherigen Werte. | Implementiert |
| UC-12 | Neue Planung | Ein bestätigter Neustart setzt den Arbeitsstand zurück; persönlicher Speicherstand bleibt erhalten. | V2 implementiert |
| UC-13 | Fehler und Grenzwerte | Ungültige Eingaben blockieren Übernahme; Speicherfehler werden angezeigt. | Teilweise automatisiert |
| UC-14 | Mobile und Desktop | Kernabläufe bleiben bei 360/390 px und Desktop bedienbar und ohne horizontales Scrollen. | Weiter zu prüfen |
| UC-15 | Hilfe | Kontextuelle Modellhinweise sind erreichbar; eine vollständige In-App-Anleitung ist offen. | Teilweise implementiert |
| UC-16 | Navigation aus dem Plan | Jeder direkt sichtbare Planwert öffnet den fachlich passenden Detailabschnitt im sichtbaren Bereich. Detail-Screens haben genau eine primäre Rücknavigation «← Mein Plan» oben links. | V3 implementiert |

Die V3-spezifischen Plan-Zugänge, der direkt wirksame PK-Regler, die Rentenaufschlüsselung und der Variantenvergleich werden erst nach Auflösung des Widerspruchs zu `MASTER_SPEC.md` als verbindlicher Stand beschrieben.
