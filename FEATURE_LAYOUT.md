# Interaktiver Pensionsplaner - Prototyp Feature Layout

## Ziel
Ein funktionaler Prototyp mit Fokus auf Nutzerführung, Eingabe und visueller Simulation. Die technische Architektur wird erst später entschieden, sobald das Zusammenspiel und der Inhalt klar sind.

---

## 1. Einstieg und Nutzerführung
- Titel / kurzer Einleitungstext
- Nutzen der Anwendung (nicht nur Rechnen, sondern "Was bedeutet das für mich?")
- Hinweis: "Teste deine eigene Situation, die Daten bleiben lokal"
- Einstieg: "Schnellstart" oder "Ich möchte selbst anpassen"

---

## 2. Persönliche Angaben
- Alter
- Geplantes Pensionierungsalter
- Wohnkanton
- Zivilstand
- Kinder ja/nein
- Erwartete Lebenserwartung (optional)

Ziel: Basis-Situation festlegen. Diese Seite ist kurz und klar.

---

## 3. Pensionskasse
- Altersguthaben
- Umwandlungssatz
- Erwartete Jahresrente
- Kapitalauszahlung
- Mischform-Option (z. B. 25/50/75 % Kapital)

Ziel: Die wesentlichen PK-Parameter erfassen, ohne zu tief ins Detail zu gehen.

---

## 4. Weitere Vermögenswerte
- Säule 3a
- Wertschriften / Fonds
- Immobilien
- Hypothek
- übriges Vermögen

Ziel: Gesamtes verfügbare Vermögen abbilden.

---

## 5. Einkommen im Alter
- AHV
- PK-Rente
- übrige Renten
- Kapitalerträge
- gewünschtes Einkommen

Ziel: Soll-Einkommen im Alter plus bestehende Sicherheiten erfassen.

---

## 6. Simulation
### Kernbereich
- Echtzeitgrafik mit Vermögensverlaufs-Projektion
- Szenario A: Kapitalbezug
- Szenario B: Lebenslange Rente
- Vergleichsbalken / Linien für beide Varianten

### Slider-Bereich
- Kapitalbezug: 0–100 %
- Rendite des Kapitals: 0–8 %
- Inflation
- Lebenserwartung
- jährlicher Kapitalverbrauch

Ziel: Der Nutzer kann unmittelbar sehen, wie sich Varianten verändern.

---

## 7. Ergebnis-Panel
- Zusammenfassung in klaren Aussagen:
  - "Bei Ihrer Situation reicht Kapital bis Alter X"
  - "Bei 2% Rendite reicht Kapital nur bis Y"
  - "Lebenslange Rente ist finanziell sicherer"
  - "Vererbbares Vermögen geschätzt: CHF ..."
- Ampelsystem / Icons für Risiko, Sicherheit, Flexibilität

Ziel: Nicht nur Zahlen, sondern Handlungsempfehlung.

---

## 8. Sensitivitätsanalyse
- Fragen mit Antworten/Visualisierung:
  - "Was passiert, wenn ich 100 werde?"
  - "Was, wenn die Börse zwei schlechte Jahre hat?"
  - "Was, wenn ich CHF 20'000 mehr brauche?"
  - "Was, wenn ich mit 70 ein neues Auto kaufe?"
  - "Was, wenn ich ins Pflegeheim komme?"

Umsetzung als einfache Szenarien oder kleine Vergleichskarte.

---

## 9. Vergleichsübersicht
- Drei Varianten nebeneinander
  - 100 % Rente
  - 50/50
  - 100 % Kapital
- Metriken:
  - Monatliches Einkommen
  - Vermögen mit 85
  - Vermögen mit 95
  - Vererbbares Vermögen
  - Risikostatus

Ziel: Direkter Vergleich der wichtigsten Kennzahlen.

---

## 10. Was fehlt heute oft in Rechnern
Ein guter Prototyp sollte zeigen:
- Cashflow über die gesamte Pension
- Vermögensentwicklung
- Steuerbelastung (Basis)
- Vererbbares Vermögen
- Risiko, dass Kapital aufgebraucht wird
- Break-even-Punkt zwischen Rente und Kapital
- Monte-Carlo-Ansatz als Erweiterung

---

## 11. Prototyp-Phasen
1. Papier/Mockup: Inhalte und Seitenfluss festlegen
2. Low-Fidelity Prototyp: statische UI + Eingabefelder
3. High-Fidelity Prototyp: erste Simulationen + Grafik
4. Review mit Nutzer / Performance-Test
5. Architekturentscheidung: React/Next.js + Diagramm-Bibliothek

---

## 12. Hinweis zur Umsetzung
- Fokus zuerst auf Inhalte, Begriffe, Reihenfolge und Verständlichkeit
- Keine technischen Details vor Fertigstellung des Prototyps
- Später kann das System modular werden: Inputs, Szenarien, Simulation, Visualisierung
