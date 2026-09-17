# Use Cases: Vermögens- und Verbrauchsplanung

## Ziel
Die Webapp soll nicht nur Pensionierung abbilden, sondern als allgemeine Vermögens- und Verbrauchsplanung für Privatpersonen und Berater dienen. Sie unterstützt verschiedene Einkommensarten, Vermögenswerte, Erträge und Szenarien. Zinsen, Inflation und Annahmen sollen transparent gemacht und veränderbar sein.

## Personas

### 1. Privatperson / Haushalt
- Einzeln oder mit Partner/in
- Ziel: Überblick über künftige Einnahmen, Ausgaben, Vermögen, Liquidität und finanzielle Ziele
- Erwartung: einfache Eingabe, direkte Visualisierung, Vergleich von Szenarien

### 2. Ältere Person / Ruheständler
- Ziel: prüfen, ob bestehende Einkünfte und Vermögen in den nächsten Jahren genügen
- Erwartung: Liquiditätsübersicht, Stabilität der Auszahlungen, Sicherheits- und Risikoanalyse

## Kernfunktionen

### Eingaben
- persönliche Daten: Alter, Haushaltsgröße, Planungszeitraum
- Basiswerte: Gesamtvermögen, Gesamteinnahmen, Gesamtausgaben (genügen als Mindestdaten)
- Einkommensquellen: Lohn, Partner-/Zusatz-Einkommen, Dividenden, Mieteinnahmen, andere Erträge
- Vermögenswerte: Kapital, Liegenschaften, Pensionskasse, andere Investments
- Ausgaben: fixe & variable Kosten, Lebenshaltung, Rückstellungen
- Annahmen: Zinssatz, Renditeannahmen, Inflation, Wachstumsraten, Entnahmerate
- Planungsziele: gewünschtes verfügbares Einkommen, Sparziele, Sicherheitsreserve

### Ausgaben / Ergebnisse
- Liquiditätsverlauf über 5, 10, 15, 20 Jahre
- Vorsorgelücke / Finanzierungslücke
- Erforderliche Sparbeiträge
- Alterseinkommen aus allen Quellen
- Vermögensentwicklung: Kapital, Immobilienwerte, Cash-Reserve
- Szenarienvergleich: Best Case / Base Case / Worst Case oder konservativ vs. optimistisch

## Use Cases

### Use Case 1: Individuelle Planung für Einpersonenhaushalt
1. Nutzer startet die Webapp.
2. System fragt nach aktuellen Einnahmen, Vermögen, erwarteten Erträgen, Ausgaben und Zins-/Inflationsannahmen.
3. System arbeitet die Angaben im aktuellen Dialogdurchlauf im Speicher aus, ohne Persistenz.
4. System zeigt Projektionen für 5, 10, 15 und 20 Jahre, inklusive Liquiditätsverlauf, Sparbedarf und möglicher Lücken.
5. Nutzer kann Szenarien anpassen und vergleichen.

### Use Case 2: Planung für Paar / Haushaltsbudget
1. Nutzer gibt Partner-Einkommen und -Vermögen ein.
2. System aggregiert Einkommen und Ausgaben des Haushalts.
3. System zeigt, wie sich gemeinsame Liquidität und Vermögensreserven entwickeln.
4. Szenarien erlauben die Analyse von Partnertrennung, Renteneintritt des Partners oder veränderten Ausgaben.

### Use Case 3: Szenarioanalyse als Berater-Tool
1. Nutzer erstellt eine Situation für eine Einzelperson oder ein Paar.
2. Dialog führt durch standardisierte Eingaben für Einkommen, Vermögen, Ausgaben und Annahmen.
3. System berechnet Vergleichsberichte für 5/10/15/20 Jahre.
4. Nutzer kann die Ergebnisse als Gesprächsgrundlage verwenden.

### Use Case 4: Szenarioanalyse
1. Nutzer definiert mehrere Szenarien als unterschiedliche Finanzentscheidungen:
   - Mehr Amortisation vs. Status quo
   - Kapitalbezug statt Rente
   - Höhere Ersparnisse
   - Reduzierte Ausgaben
2. Das Basisszenario bleibt erhalten und dient als Vergleichsreferenz.
3. System berechnet in jedem Szenario die Vermögens- und Cashflow-Entwicklung.
4. Ergebnisse werden nebeneinander und als Linienchart dargestellt.

### Use Case 5: Import bestehender Daten
1. Nutzer importiert eine Excel-Datei mit aktuellen Werten.
2. System übernimmt vorhandene Zahlen als Ausgangsbasis.
3. Nutzer kann darauf aufbauend Szenarien erstellen und Vorhersagen anpassen.

## Wichtige Fragen, die der Dialog stellen sollte
- Welche Einnahmequellen existieren heute und in Zukunft?
- Welche Vermögenswerte sollen berücksichtigt werden?
- Wie hoch sind die geschätzten Erträge aus Dividenden, Immobilien und Zinsen?
- Welches jährliche Ausgabenniveau wird erwartet?
- Welche Annahmen gelten für Rendite, Inflation und Zinsentwicklung?
- Welche Zeiträume sollen projektiert werden?
- Wie möchte der Nutzer Szenarien vergleichen?

## Architekturentscheidungen
- Keine Persistenz im MVP: Daten verbleiben im aktuellen Sitzungskontext und werden nicht dauerhaft gespeichert.
- Datenmodell wird später definiert; erstmal fokussiert die App auf Dialog und Interaktion.
- Mobile-first Design: Eingabedialoge und Visualisierungen müssen auf kleinen Bildschirmen leicht nutzbar sein.
- Dialogbasierter Workflow: Nutzer*innen beantworten nacheinander relevante Fragen, statt sofort viele Felder gleichzeitig zu sehen.
- Transparente Annahmen: Zinssatz, Inflation und Szenario-Parameter sind sichtbar, veränderbar und beeinflussen unmittelbar die Projektionen.
- Szenario-Engine: Berechnungen sollten in der Webapp klientenseitig erfolgen, um schnelle Vergleiche zu ermöglichen.

## Priorisierung
1. Grundmodell: Einnahmen + Vermögen + Ausgaben + Zins/Inflation + Projektion 5/10/15/20 Jahre
2. Szenariovergleich: mehrere Annahmen parallel darstellen
3. Haushaltsfunktionen: Partner-/Zusatz-Einkommen, mehrere Vermögenswerte
4. Verwendung als Berater- / Kundengesprächs-Tool: vergleichende Projektionen, Entscheidungsoptionen
5. Datenimport/Export und Excel-Integration

## Nächste Schritte
1. Gemeinsame Auswahl der wichtigsten Eingaben für den ersten MVP.
2. Definition des Dialogflusses in der App (Fragenreihenfolge, Erfassungsmaske).
3. Prototyp-Layout für die Visualisierung der Szenarien.
