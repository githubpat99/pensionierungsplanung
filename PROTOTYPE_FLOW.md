# Prototyp Flow für den interaktiven Pensionsplaner

Dieses Dokument beschreibt den konkreten Seitenfluss und Inhaltsaufbau für den ersten funktionalen Prototyp.

---

## Startseite / Landing

**Ziel:** Nutzer direkt abholen und klar machen, dass sie hier eigene Daten testen können.

Bereiche:
- Überschrift: "Interaktiver Pensionsplaner"
- Kurztext: "Teste deine eigene Situation, ohne Daten zu speichern."
- Nutzen-Boxen: "Persönlich", "Sofort sichtbar", "Keine Datenabgabe"
- CTA-Button: "Jetzt starten"
- Optionaler Schnellzugriff: "Ich möchte erst einmal ein Beispiel sehen"

---

## Schritt 1: Persönliche Angaben

**Felder:**
- Alter
- Geplantes Pensionierungsalter
- Wohnkanton
- Zivilstand
- Kinder ja/nein
- Erwartete Lebenserwartung (optional)

**UX:**
- kurze Erklärung jeweils neben dem Feld
- Validierung: Alter und Pensionierungsalter müssen sinnvoll sein
- Callout: "Diese Werte bestimmen dein Budget im Alter"

---

## Schritt 2: Pensionskasse

**Felder:**
- Altersguthaben
- Umwandlungssatz
- Erwartete Jahresrente
- Kapitalauszahlung
- Mischform-Option: 0/25/50/75/100 % Kapital

**UX:**
- Einfache Schieberegler für Mischform
- Zwischeninfo: "Kapital vs. Rente: um wie viel verändert sich Ihr Einkommen?"

---

## Schritt 3: Weitere Vermögenswerte

**Felder:**
- Säule 3a
- Wertschriften / Fonds
- Immobilienwert
- Hypothek
- übriges Vermögen

**UX:**
- positives Vermögen und Schulden getrennt erfassen
- Hinweis: "Nur relevante Werte eingeben"

---

## Schritt 4: Einkommen im Alter

**Felder:**
- AHV
- PK-Rente
- übrige Renten
- Kapitalerträge
- gewünschtes Einkommen pro Jahr

**UX:**
- Echtzeit-Summenkarte: "Einkommen gesichert / noch offen"

---

## Schritt 5: Simulation & Szenarien

**Struktur:**
- Linker Bereich: Schieberegler
  - Kapitalbezug 0–100 %
  - Rendite 0–8 %
  - Inflation 0–4 %
  - Lebenserwartung 80–100+
  - jährlicher Kapitalverbrauch
- Rechter Bereich: Grafiken
  - Vermögensverlauf Kapital vs. Rente
  - Cashflow im Alter
  - Restvermögen / Ausfall-Risiko

**UX:**
- Änderungen werden sofort im Chart sichtbar
- Kurztext unter jedem Slider: "Was bedeutet das?"

---

## Schritt 6: Ergebnisübersicht

**Inhalte:**
- Textliche Zusammenfassung
  - "Ihr Kapital reicht voraussichtlich bis Alter X"
  - "Bei 2 % Rendite nur bis Alter Y"
  - "Lebenslange Rente bietet Sicherheit"
- Ampel-Status / Icon-Boxen
  - Sicherheit
  - Flexibilität
  - Erbe
- Zahlenblöcke
  - Monatliches Einkommen
  - Restvermögen mit 85
  - Restvermögen mit 95
  - Vererbbares Vermögen

**UX:**
- klare Stichpunkte statt lange Sätze
- Hervorhebung der wichtigsten Erkenntnis

---

## Schritt 7: Sensitivitätsanalyse

**Elemente:**
- Use-Case-Karten mit Szenarien:
  - "Ich werde 100"
  - "Zwei schlechte Börsenjahre"
  - "CHF 20'000 mehr laufende Kosten"
  - "Pflegeheim"
- Pro Karte: kurzer Impact-Text und Visualisierung
- Optional: Schalter "Mehr Details anzeigen"

---

## Schritt 8: Vergleichsübersicht

**Tabelle / Spalten:**
- Variante 1: 100 % Rente
- Variante 2: 50/50
- Variante 3: 100 % Kapital

**Kennzahlen:**
- monatliches Einkommen
- Restvermögen mit 85
- Restvermögen mit 95
- Erbe
- Risiko-Score

**UX:**
- Fokus auf einfache Vergleichbarkeit
- Möglich: farbige Balken oder Pfeile

---

## Layout-Strategie für den Prototyp

1. **Wizard / Schrittweise Eingabe** für die Daten.
2. **Live-Simulation** als zentrale Seite mit Slidern und Charts.
3. **Ergebnis-Dashboard** als Abschluss.
4. **Optional: Ein Beispiel-Start** mit vorausgefüllten Daten.

---

## Was der Prototyp nicht braucht

- komplexe Datenbank
- Nutzer-Accounts
- PDF-Export im ersten Schritt
- detaillierte Steuerberechnung
- vollständige Monte-Carlo-Engine

---

## Empfehlung für den nächsten Prototyp-Schritt

- Erstelle ein interaktives HTML/CSS/JS-Wireframe mit den wichtigsten Eingabe- und Resultatabschnitten.
- Fokussiere auf:
  - persönliche Angaben
  - Pensionskasse / Kapitalwahl
  - zwei Vergleichsszenarien
  - eine live Grafik
  - einfache Ergebniszusammenfassung

Dann prüfen wir mit einem Test-User oder anhand der konkreten Inhalte, ob die Reihenfolge und Begriffe funktionieren.
