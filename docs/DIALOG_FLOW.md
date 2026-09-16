# Mobile-First Dialog-Flow Design

## Ziel
Eine mobile-first Webapp, die Nutzer*innen in einem klaren Dialog durch die wichtigsten Eingaben für Vermögens- und Verbrauchsplanung führt. Die App arbeitet ohne Persistenz im MVP und berechnet Szenarien im aktuellen Session-Kontext.

## Architekturentscheidungen
- Mobile-first: Dialoge sind für ein schmales Display optimiert, mit einer Fragegruppe pro Bildschirm.
- Keine Persistenz: Eingaben bleiben nur im aktuellen Session-Speicher und werden nicht dauerhaft gespeichert.
- Späteres Datenmodell: Das Datenmodell wird erst nach dem Dialogfluss definiert.
- Klientenseitige Berechnung: Szenarien und Projektionen werden im Browser berechnet.
- Basiswerte zuerst: Gesamtvermögen, Gesamteinnahmen und Gesamtausgaben genügen für eine erste Projektion.
- Entscheidungsorientierte Szenarien: Szenarien beschreiben Finanzentscheidungen wie Amortisation, Kapitalbezug oder Ausgabenänderungen.
- Dialogbasierter Workflow: der Nutzer wird durch eine definierte Reihenfolge von Eingaben geführt.

## Seiten / Schritte

### 1. Willkommen
- Titel: "Willkommen"
- Kurzer Text: "Wir beginnen mit ein paar Basisdaten. Danach wählst du dein Ziel und die Planung wird persönlicher."
- Button: "Los geht's"
- Hinweis: "Keine Anmeldung nötig. Daten verbleiben lokal im Browser."

### 2. Basisinfos
- Frage: "Für wen planst du?"
  - Optionen: Einzelperson, Paar
- Frage: "Alter" / "Alter Hauptperson"
- Bei Paar: "Alter Partner/in"
- Frage: "Planungszeitraum (Jahre)"
- Button: "Weiter"

### 3. Zielauswahl
- Frage: "Was möchtest du erreichen?"
  - Optionen: Vermögen verstehen, Lebensstandard sichern, Szenarien vergleichen, Beratung vorbereiten
- Button: "Weiter"

### 3. Basiswerte
- Eingabefelder:
  - Gesamtvermögen
  - Gesamteinnahmen pro Jahr
  - Gesamtausgaben pro Jahr
- Hinweis: "Diese drei Werte reichen für die erste Projektion. Details kannst du danach ergänzen."
- Button: "Weiter"

### 4. Vermögenswerte
- Optional:
  - Geldvermögen / Sparkapital
  - Immobilienwert
  - Wertpapiere / Fonds
  - Pensionskasse / Vorsorgeguthaben
  - Sonstiges Vermögen
- Hinweis: "Ergänze hier zusätzliche Vermögensdetails, wenn verfügbar."
- Button: "Weiter"

### 5. Ausgaben
- Optional:
  - Fixkosten (Miete, Hypothek, Versicherungen)
  - Lebenshaltungskosten
  - Grösse der Reserve / Puffer
  - Sonstige Ausgaben
- Hinweis: "Du kannst jetzt Gesamtwerte eingeben oder hier ins Detail gehen."
- Button: "Weiter"

### 6. Annahmen
- Eingabefelder:
  - Erwarteter Zinssatz (z.B. 1.5 %)
  - Inflation (z.B. 2.0 %)
  - Rendite auf Kapital und Dividenden
  - Wachstum der Mieteinnahmen
- Hinweis: "Diese Werte können später in Szenarien angepasst werden."
- Button: "Weiter"

### 7. Szenarien
- Start mit einem Basisszenario und mindestens einem Alternativszenario.
- Das Basisszenario bleibt immer erhalten und dient als Referenz.
- Felder:
  - Szenarioname: Basis (fest)
  - Szenarioname: Alternative
  - Entscheidungsoptionen: z.B. mehr Amortisation, Kapitalbezug statt Rente, mehr sparen, geringere Ausgaben
- Option: "Weiteres Szenario hinzufügen"
- Button: "Projektion anzeigen"

### 8. Ergebnisübersicht
- Zeige kompakte Karten für:
  - Prognostiziertes Vermögen nach 5/10/15/20 Jahren
  - Jährliche Liquidiät / Cashflow
  - Sparbedarf oder Überschuss
  - Vorsorgelücke (falls vorhanden)
- Visualisierungen:
  - Linienchart: Vermögensentwicklung pro Szenario, Basisszenario plus Alternativszenario
  - Tabelle: Vermögen und Netto-Jahresüberschuss pro Jahr und pro Szenario
- Zusammenfassungstext:
  - Zielbezogene Hinweise je nach Auswahl
  - Hinweis, dass das Basisszenario immer erhalten bleibt
- Buttons: "Zurück zur Annahmen", "Neues Szenario" 

## Mobile-First UX-Prinzipien
- Einfache, große Buttons
- Klarer Fokus: nur 1-2 Fragen pro Bildschirm
- Persistente Fortschrittsanzeige (z.B. "Schritt 4 von 8")
- Inline-Hilfen und kurze Erklärtexte
- Gute Lesbarkeit und Kontrast
- Möglichst wenig Tippen: Standardwerte, Dropdowns, ja/nein

## Dialogfluss als Serie von Karten
1. Willkommen
2. Profil
3. Basiswerte
4. Vermögenswerte
5. Ausgaben
6. Lebensereignisse
7. Annahmen
8. Szenarien
9. Ergebnisse

## MVP-Funktionalität
- Basis-Dialog für einen Durchlauf
- Keine Nutzerkonten, keine Speicherung über Session hinaus
- Berechnung von mindestens zwei Szenarien
- Projektionen für 5, 10, 15, 20 Jahre
- Einfache Vergleichsvisualisierung
- Mobile-optimiertes Layout

## Nächste Arbeiten
- UI-Prototyp mit Dialog-Wizard erstellen
- Erste Berechnungslogik für Szenarien definieren
- Ergebnis-Visualisierung und Vergleichsübersicht entwerfen
