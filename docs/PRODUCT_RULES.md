# Verbindliche Produktregeln – Ruhestands-Check

Stand: 11. September 2026. Grundlage: beauftragte Gesamtspezifikation in [OPTIMIZATION_SPEC_2026-09-11.md](OPTIMIZATION_SPEC_2026-09-11.md). Vor App-Änderungen diese Datei und `AGENTS.md` vollständig lesen. Ältere Entwürfe bleiben historisch erhalten. Widersprüche ausdrücklich benennen, niemals stillschweigend Regeln ersetzen.

## 1. Kapitalstart und Preisbasis

- Die Ruhestandssimulation beginnt am Pensionierungszeitpunkt; bei bereits Pensionierten am aktuellen Planungsalter.
- Vor Pensionierung wird keine Inflation auf den Lebensbedarf angewendet. Es gibt keine zusätzliche Abzinsung des projizierten Startkapitals.
- PK, Säule 3a und Wertschriften werden bis zur Pensionierung mit ihren jeweiligen Beiträgen und Renditen hochgerechnet. PK-Beiträge von Arbeitnehmer und Arbeitgeber werden zusammengezählt.
- Ab Ruhestandsstart wird Inflation berücksichtigt. Die bestehende Engine rechnet in konstanter Kaufkraft des Startjahres: realer Bedarf bleibt je Phase konstant (entspricht nominal wachsendem Bedarf), nominal feste Einnahmen verlieren Kaufkraft. Nicht nochmals Inflation auf den realen Bedarf rechnen.
- «Heutige Kaufkraft» bezeichnet in der Ruhestandsansicht den konstanten Modellpreisstand des Planungsstarts. «Wert bei Pensionierung» bezeichnet den projizierten Startwert; nominale spätere Beträge enthalten die Inflation seit diesem Start.
- Alle Prognosen verwenden dieselbe Engine und Kapitalbasis. Lediglich Renditeszenarien/ausgewiesene Zeitabschnitte unterscheiden sich.

## 2. Anlagekapital und Immobilien

- `existingFreeCapital + netPkCapitalWithdrawal = totalInvestableCapital`.
- Das gesamte frei verfügbare Kapital wird am Pensionierungszeitpunkt als Anlagekapital berücksichtigt. Bestehende Sammelbeträge nicht durch erneute PK-Addition doppelt zählen.
- Nur der tatsächlich bezogene PK-Kapitalanteil unterliegt der geschätzten Kapitalbezugssteuer. Privatvermögen wird nicht damit belastet.
- PK brutto minus einmalige Bezugssteuer ergibt PK netto; Steuer vor der Topfaufteilung abziehen, nicht zusätzlich zum Lebensbedarf addieren.
- Rentenanteile der PK gehören nicht zum verfügbaren Anlagekapital. Bei bereits Pensionierten vorhandenes Privatkapital nicht nochmals besteuern.
- Gebundenes Immobilienkapital (Marktwert minus Hypotheken) bleibt getrennt und finanziert ohne geplanten Verkauf keine Entnahmen.
- Immobilienerträge sind laufende Nettoeinnahmen nach Objektkosten, Hypothekarzinsen und Unterhaltsreserve; einmal zählen. Persönliche Einkommenssteuer wird separat berücksichtigt.
- Topf 1 + Topf 2 + Topf 3 entsprechen dem gesamten Anlagekapital; nur Rundungsdifferenzen sind zulässig.

## 3. Steuern und Einkommen

- Einkommenssteuer und Kapitalbezugssteuer getrennt berechnen und ausweisen. Bestehende kantonale Konfiguration und Interpolation verwenden.
- Laufende Steuer auf AHV, PK-Rente, weitere Renten und steuerbare Einnahmen. Privatentnahmen und private Kursgewinne sind kein laufendes steuerbares Einkommen.
- Steuer einmal vom Bruttoeinkommen abziehen. Kapitalentnahme = max(0, Lebensbedarf minus laufendes Nettoeinkommen), im Stressfall zuzüglich Sonderausgabe.
- Kapitalerträge sind Teil der Kapitalentwicklung, keine sicheren laufenden Einnahmen. Steuern nicht von der Aktienrendite abziehen.
- Steuertexte nennen verwendeten Einkommensbetrag, berechneten Steuerbetrag, angenommenen Prozentsatz und ausgeschriebenen Kanton. Keine «Stufe tief/mittel/hoch» im UI.
- Steuertexte: laufende Einkommenssteuer, Kapitalbezugssteuer, kompakte Modellgrenzen. «Modellrechnung, keine individuelle Steuerberechnung.» Vermögenssteuer und allfällige 3a-Bezugssteuern fehlen; Zinsen/Dividenden werden nicht separat besteuert.
- Fehlender Wohnkanton: neutrale vorläufige Einschätzung; keine grüne Finanzierbarkeitsaussage. Auf dem PK-Screen nur eine Erklärung, keine zweite offene Reichweitenbox.
- Einkommensübersicht: Netto gesamt, aus AHV/Renten, aus weiteren Einnahmen, benötigte Kapitalentnahme. Zur additiven Nettoaufteilung wird dieselbe geschätzte Gesamtsteuer proportional auf die laufenden Einkommensgruppen verteilt; dies ist eine Darstellung, keine separate Steuerberechnung je Quelle.

## 4. Drei Töpfe und Renditeannahmen

- Geldfluss: Topf 3 (Aktien) → Topf 2 (Anleihen) → Topf 1 (Geldmarkt) → Lebensbedarf.
- Topf 2 wird grundsätzlich aus Topf 3, Topf 1 aus Topf 2 aufgefüllt. Jährliche Prüfung und bedarfsgerechter Ausgleich.
- Topf 1 reserviert die laufende Jahresentnahme; Topf 2 die beiden folgenden Entnahmejahre; Topf 3 erhält das übrige freie Kapital.
- Die bestehende jährliche Zielauffüllung bleibt bestehen. Sie kann auch nach Verlusten Aktienverkäufe erfordern. Reserven dienen der Überbrückung; keine implementierte Verlust-Verkaufsvermeidung behaupten. Eine spätere Krisenregel braucht einen eigenen Auftrag und Regressionstests.
- Risikoprofile bestimmen primär Renditeannahmen, niemals automatisch eine feste Aktienquote. Die Quote ergibt sich nach Reservierung in Topf 1/2.
- Profile: «Renditeannahme vorsichtig · 2,5 %», «Renditeannahme ausgewogen · 4,5 %», «Renditeannahme chancenorientiert · 6,0 %». Bestehenden Wirkungsbereich klar nennen: PK-Ertragsvergleich; die Simulation verwendet separat die drei Topfrenditen.

## 5. Ergebnisse und Diagramme

- Ergebnisse immer als Modellrechnung unter den gewählten Annahmen bezeichnen.
- Die zentrale Ergebnis-/Erfolgsaussage bezieht sich auf die aktuell gewählte PK-Aufteilung, nicht auf irgendeine mögliche Aufteilung. Das ersetzt die bisherige Hervorhebung der allgemeinen Machbarkeit. Die Hintergrundprüfung mehrerer Aufteilungen darf bestehen bleiben.
- Positiv: «Unter den gewählten Annahmen ist dein gewünschter Lebensstandard bis Alter [Zielalter] finanzierbar.» Dazu erwartetes Restkapital am Zielalter.
- Bei erster Finanzierungslücke: voraussichtliche Reichweite unter gewählten Annahmen; keine grüne Erfolgsmeldung. Kapital exakt null am Ziel ist zulässig, frühere ungedeckte Ausgaben bleiben eine Lücke.
- Abschluss: «Deine erste Planung steht.»
- Diagramm: «Ungünstige und günstige Renditereihenfolge»; Legenden «Ungünstige Reihenfolge» / «Günstige Reihenfolge».
- Beide Kurven nutzen dieselben historischen Renditen 2016–2025 in unterschiedlicher Reihenfolge und dieselben Steuern/Entnahmen. Grafik zeigt die ersten zehn Ruhestandsjahre (bei kürzerem Horizont nur diesen); die Planung läuft bis zum Ziel weiter.
- Werte lesbar, keine Überlagerungen; Nullachse «0». Mobile weniger Labels, vollständige Werte in Karten. Keine zusätzlichen Opt./Pess.-Präfixe vor den Kartenbeträgen nötig.

## 6. Speicherung und Beispielwerte

- «Auf diesem Gerät speichern» speichert den vollständigen persönlichen App-State mit Schema-Version, Datum und Uhrzeit. Bei Erfolg «✓ Dein Stand wurde auf diesem Gerät gespeichert.» und «Zuletzt gespeichert: … um …».
- Auf Start «Meinen Stand laden». Vor-/Nach-Pensionierung, Alter, Kanton, sämtliche Vermögen/Schulden, Beiträge, Einkünfte/Laufzeiten, Lebensphasen, PK-Wahl, Steuer-/Inflations-/Renditeannahmen, Immobilienaufteilung und Topfannahmen müssen identisch wiederherstellbar sein.
- Ältere gültige Speicherstände migrieren; Fehler beim Speichern/Laden sichtbar anzeigen. Defekte/fremde zukünftige Versionen nicht still überschreiben. Deployment darf kompatible Daten nicht unbrauchbar machen.
- Vorausgefüllte Werte: «Beispielwerte – bitte durch deine persönlichen Angaben ersetzen.» Hinweis nach erster tatsächlicher Änderung oder Laden persönlicher Daten entfernen. Persönliche Speicherstände niemals als Beispiele kennzeichnen.
- Finanzierungs-Vorschauwerte bleiben Vorschau; gespeicherte tatsächliche Topfannahmen vollständig erhalten.

## 7. Bedienung und Darstellung

- Bestehende Gestaltung/Navigation erhalten; keine neuen Hauptscreens. Edit-Modus ohne Wizard-Fortschritt, stattdessen «Meine Angaben · …».
- Patrick nur einmal im Header; Begleittext daran angebunden. Statusboxen ohne Portrait.
- Wohnkanton kompakter Select «Dein Wohnsitzkanton»; zugänglicher Name, kein redundanter sichtbarer Labelblock.
- Jedes Eingabefeld braucht einen eindeutigen sichtbaren Kontext/Label und einen zugänglichen Namen (`aria-label` bzw. Label). Tastaturbedienbarkeit sicherstellen.
- «Ändern» statt «Aendern». Schweizer Tausendertrennzeichen, Prozentwerte mit Dezimalkomma.
- Mobile braucht kein horizontales Scrollen, auch Jahresdaten und Szenarien nicht. Keine abgeschnittenen Zahlen/Texte; wichtige Erklärungen mindestens 13 px, normaler Text etwa 15–16 px.
- Gesamtanlagekapital direkt bei den Töpfen sichtbar. Keine zweite PK-Kaufkraft-Zwischenzeile.

## 8. Qualität und Pflege

- Änderungen an Berechnungsregeln benötigen passende Regressionstests; Einnahmensummen, PK-Steuer nur auf PK, Kapitalzusammensetzung, Phasen und Inflationszeitpunkt prüfen.
- Beide vollständigen Wege vor/nach Pensionierung auf Desktop/Mobile testen, inklusive Speichern → Reload → Laden, Migration und Fehlerfällen.
- Bestehende Dokumentation erhalten. Diese Regeln und zugehörigen Code gemeinsam pflegen; vor zukünftigen Änderungen beide Pflichtdateien lesen.
