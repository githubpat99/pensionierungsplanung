# Pensionierungsplanung – Spezifikationsentwurf 0.1

Stand: 9. September 2026. Diskussionsgrundlage, noch kein Implementierungsauftrag.

Ziel: Die bestehende übersichtliche App zu einer nachvollziehbaren Planung mit Lebensphasen, Immobilien und einer einfachen Entnahme- und Risikosicht erweitern. Die Drei-Töpfe-Idee ist ein Baustein zur Finanzierung des Ruhestands.

## 1. Geprüfte Grundlage

- Aktuelle lokale Hauptseite: `index.html`, einschliesslich eingebetteter Berechnungslogik. Die älteren Prototypen und Konzeptdateien sind keine verlässliche Beschreibung dieses aktuellen Stands. Die README beschreibt noch einen älteren Excel-Import.
- Referenz: `C:/Users/patri/Downloads/Pensionierungs_Cockpit_einfach.xlsx`, Blätter Cockpit, Annahmen und Verlauf. Werte und repräsentative Formeln wurden direkt aus dem XLSX gelesen; keine Neuberechnung oder visuelle Funktionsprüfung vorgenommen.
- Die persönlich im Browser gespeicherten Eingaben wurden nicht ausgelesen. Aussagen zur App beziehen sich auf den Quellcode, Zahlenbeispiele auf das Excel.
- App und Excel wurden nicht verändert. Aussagen im Excel sind Modellannahmen und Referenzinhalt, keine zusätzlichen Arbeitsaufträge.

## 2. Was bereits vorhanden ist

| Bereich | Aktuelle App | Konsequenz |
|---|---|---|
| Einstieg | Vor oder nach Pensionierung, Alter und Planungshorizont | Beibehalten |
| Aufbau | PK-, 3a- und Wertschriftenhochrechnung mit Beiträgen und Renditen | Beibehalten, Bezugstermine später präzisieren |
| PK-Entscheid | Kapital/Rente/Mischung und Umwandlungssatz | Beibehalten |
| Vermögen | Freies Kapital, Immobilien, Hypotheken, gebundenes Nettovermögen | Zu Eigenheim und Renditeobjekt erweitern |
| Einkommen | AHV, PK-Rente, weitere Renten und weitere Einnahmen | Um Beginn, Ende und Kaufkraftentwicklung erweitern |
| Bedarf | Ein jährlicher Betrag, danach Inflation | Durch maximal drei einfach editierbare Lebensphasen ergänzen |
| Entwicklung | Jahresrechnung mit konstantem Kapitalertrag; Vermögensgrafik und Lückenhinweis | Rechenkern präzisieren und um Stressverläufe erweitern |
| Risiko | Vorsichtig/ausgewogen/mutig setzt 2,5/4,5/6 % konstante Rendite | Das ist noch keine Verlust- oder Krisensimulation |
| Bedienung | Geführte Erfassung, Übersicht, Entwicklung, Annahmen, Angaben, lokale Speicherung und Beratungsübergabe | Bestehende Struktur erhalten |

Relevante Codefundstellen: `index.html` ab Zeile 324 (Daten), 389–396 (Projektion), 635–636 (Ergebnis). Im aktuellen Modell bleiben Immobilien und Hypotheken konstant. Negatives Immobilieneigenkapital wird auf null begrenzt; dadurch können Schulden im Nettovermögen fehlen. Die Lückenprüfung erkennt zudem einen Fehlbetrag im Jahr des Kapitalverbrauchs unter Umständen erst im Folgejahr. Der Bedarf wird erst ab Simulationsbeginn inflationiert; sein Preisstand vor Pensionierung ist deshalb zu klären.

## 3. Erkenntnisse aus dem Excel

| Grösse | Referenzwert |
|---|---:|
| Liquides PK-Kapital | CHF 1’200’000 |
| Eigenheim abzüglich Hypothek | CHF 670’000 |
| Renditeobjekt abzüglich Hypothek | CHF 300’000 |
| Nettovermögen | CHF 2’170’000 |
| Gebundener Anteil | 44,7 % |
| Bedarf / Einnahmen erste Phase | CHF 120’000 / CHF 62’000 jährlich |
| Entnahmebedarf erste Phase | CHF 58’000 jährlich |
| Geldmarkt / Anleihen / Aktien zum Start | CHF 58’000 / 116’000 / 1’026’000 |

Fundstellen: Annahmen!A5:F7, A12:F14, A19:D27, A32:C34; Cockpit!A18:I20.

Die Aktienposition entspricht 85,5 % des liquiden Kapitals. Dies folgt aus der Restwertregel und ist keine bereits begründete persönliche Risikoentscheidung. Der Entnahmebedarf von CHF 58’000 entspricht 4,83 % des Startkapitals; er ist keine zugesicherte nachhaltige Entnahmerate.

Vor einer Übernahme zu korrigieren bzw. explizit festzulegen:

1. Die Einkommensquellen in Annahmen!B32:C34 sind nur eine Aufschlüsselung. Die Phaseneinkommen E12:E14 sind feste Zahlen. Eine Änderung des Mietertrags verändert die Planung daher derzeit nicht automatisch.
2. Die Bezeichnung «sichere Einkünfte» umfasst auch den Nettoertrag des Renditeobjekts. Vorschlag: «Laufende Einnahmen», mit getrenntem Ausfallrisiko.
3. Die Töpfe werden in Verlauf!G4:I5 und den Parallelspalten jährlich aus dem Gesamtbestand neu zugeteilt. Einzelne Topfbestände und konkrete Transfers werden nicht fortgeschrieben. Das entspricht einer jährlichen Zielauffüllung, aber keiner gesonderten Regel zum Vermeiden von Aktienverkäufen nach Verlusten.
4. Die Reserve berechnet sich aus dem aktuellen Bedarf mal Anzahl Jahre. An Phasengrenzen muss sie die tatsächlichen Bedarfe der kommenden Jahre berücksichtigen.
5. Schwach/Normal/Stark sind konstante reale Renditen. Auch «Schwach» unterstellt bei Aktien jährlich +1,5 % real; ein Börsencrash wird nicht abgebildet.
6. Jahresgrenzen: Gerechnet werden 65 bis 94, also 30 Entnahmejahre. Cockpit!G13 weist für «83–95» zwölf Jahre aus; bei inklusiver Beschriftung wären es dreizehn. Die Grafik ordnet Endbestände dem jeweiligen Startalter zu und wiederholt den letzten Wert bei 95. Start- und Endzeitpunkte eindeutig beschriften.
7. MAX(0, ...) verhindert negative Kapitalstände, dokumentiert aber nicht den ungedeckten Bedarf. Dieser muss separat fortgeschrieben werden.
8. Heutige Kaufkraft ist sinnvoll. Konstante reale Einkommen unterstellen jedoch Kaufkrafterhalt. Nominal feste Einkommen dürfen nicht stillschweigend so behandelt werden.

## 4. Fachliches Zielmodell

### Lebensplanung bestimmt die Entnahme

Je Planjahr:

`Finanzierungssaldo = laufende Einnahmen − laufender Bedarf − Sonderausgaben`

`Entnahmebedarf = max(0, −Finanzierungssaldo)`

`Überschuss = max(0, Finanzierungssaldo)`

Kapitalrenditen werden in den Topfbeständen berücksichtigt. Sie werden nicht zusätzlich als externe Einnahmen gezählt. Ein Überschuss erhöht das liquide Vermögen.

Standardmässig drei frei benennbare Lebensphasen mit Beginn, Ende und Jahresbedarf. Optional eine einfache Aufteilung in notwendigen und anpassbaren Bedarf, damit Sparmöglichkeiten im Krisenfall sichtbar werden. Einkommen werden einmal als Quellen erfasst und über ihre Laufzeit den Jahren zugeordnet; keine doppelte Eingabe von Phasensummen.

### Immobilien ergänzen Vermögen, Einkommen und Risiken

- Eigenheim: Marktwert und Hypothek separat; Eigenkapital bleibt gebunden. Wohnkosten gehören ins Budget, kein fiktiver Mietertrag als verfügbare Zahlung.
- Renditeobjekt: Wert, Hypothek und verfügbarer Netto-Cashflow. Eingabe als Nettobetrag mit sichtbarer Definition: nach Objektkosten, Hypothekarzinsen und vorgesehener Instandhaltungsreserve. Persönliche Steuern werden konsistent im Haushaltsbudget berücksichtigt.
- Amortisation bindet Liquidität und reduziert die Schuld; sie ist kein reiner Vermögensverlust. Falls vorgesehen, als eigene Zahlung modellieren.
- Verkauf nur als ausdrücklich geplantes Ereignis. Erst der Erlös nach Hypothek, Kosten und eingegebenen Steuern wird liquide; ab dann endet der Mietertrag. Neue Wohnkosten bei Eigenheimverkauf berücksichtigen.
- Für die erste Erweiterung sind konstante Objektwerte und Schulden zulässig, sofern die Annahme sichtbar ist. Mietausfall und zusätzliche Unterhaltsausgaben müssen als Stress möglich sein.

Das ist die vorgeschlagene fachliche Einordnung, keine Aussage darüber, was Dr. Beck persönlich zu diesen Immobilien empfehlen würde.

### Drei Töpfe innerhalb des liquiden Vermögens

| Topf | Aufgabe | Zielgrösse |
|---|---|---|
| Geldmarkt | Nächstes Auszahlungsjahr finanzieren | Nächster jährlicher Entnahmebedarf |
| Anleihen | Zusätzliche Überbrückung | Summe der folgenden zwei jährlichen Entnahmebedarfe als Startvariante |
| Aktien | Langfristige Anlage | Verbleibendes Kapital, vorbehaltlich bewusster Risikoentscheidung |

Ein plus zwei Reservejahre sind die Excel-Variante, keine festgelegte optimale Aufteilung. Bei CHF-Bedarf muss die Reserve auf CHF ausgerichtet sein. Anleihen haben Kurs-, Kredit- und gegebenenfalls Währungsrisiken; ihre genaue Ausgestaltung kann nicht durch das Wort «Puffer» ersetzt werden.

Vor Implementierung der Strategie ist eine vollständige jährliche Auffüllregel festzulegen: Termin, Reihenfolge, Zielbestände, Verhalten nach Aktienverlusten und Verhalten bei erschöpften Reserven. «Einmal jährlich verschieben» allein reicht nicht.

Vorschlag für den ersten überprüfbaren Vergleich: jährliche Zielauffüllung gemäss Excel als klar benannte Basisstrategie. Danach eine separat spezifizierte Krisenregel vergleichen. Keine implizite Behauptung, Zielauffüllung verhindere Aktienverkäufe in schlechten Jahren. Keine Marktprognose zum Umschichten voraussetzen.

## 5. Einfache Risikosicht

Die Übersicht beantwortet fünf Fragen: Wie viel muss aus dem Vermögen kommen? Wie lange reichen Geldmarkt und Anleihen auf Basis der kommenden Bedarfe? Wie hoch ist der Aktienanteil? Wann entsteht erstmals ein ungedeckter Bedarf? Wie viel frei verfügbares und gebundenes Vermögen bleibt am Ende?

Geplante Szenarien, mit offen sichtbaren Annahmen und ohne Eintrittswahrscheinlichkeiten:

- Basis: zentraler Renditepfad.
- Frühe Börsenkrise: beispielsweise Aktien −30 % im ersten Jahr; anschliessende Jahresrenditen explizit angeben. Zusätzlicher Vergleich derselben Renditen in umgekehrter Reihenfolge.
- Lange Schwäche: mehrere schwache Aktienjahre, auch ein negatives Anleihenjahr; kein automatisch unterstellter Aufholeffekt.
- Immobilienstress: beispielsweise ein Jahr ohne Nettoertrag plus ein eingegebener Unterhaltsbetrag. Optional höhere Hypothekarzinsen ab Erneuerung.
- Längeres Leben: gleicher Plan mit fünf zusätzlichen Jahren.

Beispiele sind Testannahmen, keine Vorhersagen. Ein kombiniertes Markt-/Immobilienszenario soll möglich sein. Ergebnisse zeigen konkrete Fehlbeträge, Reserveverbrauch und Auswirkungen einer Reduktion des anpassbaren Budgets. Eine Erfolgswahrscheinlichkeit oder Monte-Carlo-Simulation gehört nicht zur ersten Version.

## 6. Rechenvertrag und Abnahmekriterien

- Jährliche Perioden von Geburtstag zu Geburtstag: Start 65 bis Ziel 95 bedeutet 30 Jahre, letzter Endbestand am 95. Geburtstag.
- Einheitliche interne Nominalrechnung mit expliziter Inflation und Preisbasis; Cockpit standardmässig in heutiger Kaufkraft. Reale Excel-Renditen werden mit `(1 + real) × (1 + Inflation) − 1` umgerechnet. Einkommen haben eine eigene Indexierungsannahme.
- Für jeden Topf Anfangsbestand, Rendite, Zuflüsse, Abflüsse und Endbestand ausweisen. Transfers summieren sich zu null. Der Zahlungszeitpunkt und die Verzinsung während des Entnahmejahres werden explizit definiert; keine volle Jahresverzinsung auf bereits zu Jahresbeginn ausgegebenes Kapital.
- Laufender Netto-Mietertrag wird genau einmal gezählt. Dividenden und Zinsen sind Bestandteil der Gesamtrendite, sofern nicht ausdrücklich anders modelliert.
- Ungedeckter Bedarf wird bereits im Jahr des teilweisen Kapitalverbrauchs ausgewiesen, auch wenn am Jahresanfang noch Kapital vorhanden war.
- Gebundenes Kapital deckt keine Zahlungen ohne ein geplantes Liquiditätsereignis. Negative Immobilien-Eigenkapitalwerte dürfen Schulden nicht verschwinden lassen.
- Phasen dürfen keine Lücken oder Überschneidungen haben. Steuer-/Kostenannahmen und nicht enthaltene Positionen sichtbar machen, ohne ein Steueroptimierungsmodul einzuführen.
- Referenzprüfung: CHF 120’000 minus CHF 62’000 ergibt CHF 58’000. Ab 73 sinken Bedarf und Einkommen jeweils um CHF 17’000, die Lücke bleibt CHF 58’000. Ab 83 beträgt sie CHF 45’000.
- Weitere Prüfungen: null Kapital; Einnahmen über Bedarf; Phasenwechsel innerhalb der Reserve; Mietausfall; Verkauf ohne doppelte Ertragszählung; frühzeitiger Kapitalverbrauch; identische Renditefolge in anderer Reihenfolge.

## 7. Umsetzung in überschaubaren Schritten

1. **Spezifikation abstimmen:** diesen Entwurf als gemeinsame Grundlage verwenden. Aktuellen Stand sichern; Umfang der ersten Erweiterung festhalten.
2. **Lebensphasen und Zahlungsströme:** Einkommen zeitlich erfassen, Immobilien differenzieren, eindeutige Jahresgrenzen und Fehlbetragsrechnung. Bestehende Oberfläche weiterverwenden.
3. **Drei-Töpfe-Modul:** prüfbare Jahresbestände und Transfers; Reservejahre und tatsächliche Aktienquote sichtbar machen. Eine vollständige Strategie statt mehrerer unvollständiger Varianten.
4. **Risikovergleich:** die definierten Belastungen auf dieselbe Berechnung anwenden; zuerst die Ergebnisse prüfen, danach kompakt in «Entwicklung» darstellen.

Technisch zunächst Berechnung aus `index.html` in ein unabhängig prüfbares Modul trennen. Bestehende lokale Daten mit Schema-Version und verlustfreier Migration übernehmen. Alte Profile nicht automatisch in persönliche Aktienquoten übersetzen. Sammelpositionen wie Immobilien erst aufteilen lassen; keine erfundenen Objektdaten. Keine zweite unabhängig gepflegte Excel-Rechenlogik in die App einbauen.

Vor Schritt 2 zu klären: Sind die Excel-Zahlen persönlich oder illustrativ? Ist das liquide PK-Kapital bereits nach Kapitalbezugssteuer verfügbar? Sind Steuern, Wohnkosten und Objektreserven im Bedarf bzw. Nettoertrag enthalten? Welche Ausgaben sind anpassbar? Ist ein Immobilienverkauf überhaupt geplant? Diese Angaben blockieren die vorliegende Konzeption nicht.

## 8. Quellen und Grenzen

- Eigene Bestandsprüfung von `index.html` und den genannten Excel-Zellen. Keine Behauptung, die Anwendung sei im Browser vollständig getestet.
- Dr. Andreas Beck / Nicolas Kocher, «Geld anlegen und davon leben», auf der offiziellen Veröffentlichungsseite verlinkt: https://www.globalportfolio-one.com/veroeffentlichungen . Die verlinkte PDF-Fassung vom 31.08.2026 liess sich beim Abruf nicht öffnen. Deshalb werden die genaue Auffüllregel und eine persönliche Immobilienempfehlung nicht als verifizierte Beck-Aussage dargestellt. Für eine originalgetreue Umsetzung ist die konkrete Text-/Videoquelle nachzulesen.
- Charles Schwab, «What Is Sequence-of-Returns Risk?»: https://www.schwab.com/learn/story/timing-matters-understanding-sequence-returns-risk . Begründet, weshalb die Reihenfolge schlechter Renditen bei laufenden Entnahmen relevant ist und Reserven das Risiko nur begrenzen können.

Die vorgeschlagene Architektur ist eine Planungsspezifikation. Die persönliche Portfolioaufteilung ist damit noch nicht entschieden.
