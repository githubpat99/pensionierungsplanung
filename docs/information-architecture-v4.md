# Ruhestands-Check V4 – Informationsarchitektur

Verbindliche Navigations- und Strukturregeln der V4-Oberfläche (`v4.html`, `js/v4-ui.js`,
`css/v4.css`). Dieses Dokument ist die Referenz für die Informationsarchitektur; es ergänzt
`docs/MASTER_SPEC.md` (Kapitel 24) und `docs/PRODUCT_RULES.md` (Kapitel 24) und hat für
Navigationsfragen Vorrang vor älteren V4-Entwürfen. Umgesetzt und geprüft in
`tests/v4-browser-checks.html`.

## 1. Produktprinzip

**«Mein Plan» ist Home** und beantwortet genau eine Frage: **Reicht mein Geld für die
Pensionierung?** Jeder andere Bereich ist von dort in einem Schritt erreichbar und führt
dorthin zurück.

Die App fühlt sich nicht wie eine Sammlung von Finanzfunktionen an, sondern wie drei Fragen:

| Ebene | Frage des Benutzers |
| --- | --- |
| **Mein Plan** | Wo stehe ich? |
| **Planen** | Was kann ich verändern? |
| **Plan verstehen** | Wie funktioniert das eigentlich? |

## 2. Die drei Ebenen

1. **MEIN PLAN** – Antwort und aktueller Stand (Planstatus, Kennzahlen, nächste Aktion).
2. **PLANEN** – Angaben präzisieren, Entscheidungen verändern, Varianten testen.
3. **PLAN VERSTEHEN** – Jahresverlauf, Töpfe-Modell, Annahmen & Berechnung. Freiwillige
   Vertiefung, nie Voraussetzung für den normalen Ruhestands-Check.

## 3. Sitemap

```
MEIN PLAN (Home)
│   Planstatus · 4 Kennzahlen · PK-Bezug · zustandsabhängige Aktion
│   · Jahresverlauf (Schnelleinstieg) · Meine Varianten (Schnelleinstieg)
│
├── PLANEN
│   ├── Angaben & Grundlagen        (Daten-Hub aller Editoren)
│   │     ├── Persönliche Angaben            → Editor
│   │     ├── AHV-Renten                     → Editor
│   │     ├── Pensionskasse (PK)             → Editor
│   │     ├── Säule 3a                       → Editor
│   │     ├── Weitere Einnahmen              → Editor
│   │     ├── Bedarf netto                   → Editor
│   │     └── Vermögen                       → Editor (inkl. Säule-3a-Gruppe)
│   ├── Plan präzisieren / Plan optimieren   (ein Screen, zwei Zustände)
│   └── Meine Varianten                      (max. 3, genau eine aktiv)
│
└── PLAN VERSTEHEN   DETAILS
    ├── Jahresverlauf               («Jahr für Jahr.»)
    │     └── Deine Töpfe → Töpfe-Modell (Dialog)
    ├── Töpfe-Modell                (derselbe Dialog, direkt aus dem Menü)
    └── Annahmen & Berechnung       («Annahmen.»)
```

Zustandsabhängiger Einstieg:

```
Daten fehlen/geschätzt ──▶ «Plan präzisieren» ──▶ Angaben ergänzen ──▶ Daten vollständig
                                                                             │
                                                                             ▼
                                                              «Plan optimieren» (Strategie, Bedarf)
```

## 4. «Mein Plan» – erlaubt und nicht erlaubt

**Erlaubt (vollständige Liste, in dieser Reihenfolge):** PageTitle · Planstatus (ohne
Knöpfe) · vier Kennzahlen (Einkommen netto / Monat · Bedarf netto / Monat · Aus Vermögen /
Monat · Startkapital) · PK-Bezug · genau eine zustandsabhängige Aktion («Plan präzisieren»
bzw. «Plan optimieren») · maximal zwei sekundäre Zeilen («Jahresverlauf», «Meine Varianten ·
n gespeichert»).

**Nicht erlaubt:** Detail-Überschrift/Inhaltsverzeichnis, Varianten-Karten, Strategie-,
Töpfe-, Steuern-, AHV-, PK-, Einkommens- oder Vermögens-Blöcke, «Plan verbessern», «Plan
genauer machen», Autosave-Text, «Jetzt speichern», zusätzliche Kennzahlen (Renten brutto,
Steuerdetails).

Die Kennzahlenkette muss intuitiv aufgehen:
`Einkommen netto + Aus Vermögen = Bedarf netto` (z. B. 4'122 + 2'678 = 6'800). Bruttorenten
und Steuerdetails stehen in den jeweiligen Details, nie als konkurrierende Hauptkennzahl.

## 5. Präzisieren vs. Optimieren

Datenqualität und Planoptimierung sind **zwei verschiedene Konzepte** und erscheinen nie im
selben Block:

| Zustand | Bedingung | Card auf «Mein Plan» | Screen |
| --- | --- | --- | --- |
| **A – Präzisieren** | mindestens eine Angabe fehlt oder ist geschätzt (`precisionItems().open.length > 0`) | «Plan präzisieren» · «Dein erster Plan basiert teilweise auf Schätzungen.» · «n Angaben machen deinen Plan genauer.» | «Plan präzisieren.» / «Mach deinen ersten Plan genauer.» – **nur** der Datenhebel 1 (AHV-Rente, Weiteres Kapital & Säule 3a, Weitere Einnahmen, PK-Ausweis) mit «Angaben ergänzen» |
| **B – Optimieren** | alle Angaben erfasst | «Plan optimieren» · «Teste Strategie, Bedarf und weitere Möglichkeiten.» | «Plan optimieren.» / «Teste, was deinen Plan verbessert.» – **nur** die Optimierungshebel 1 Anlagestrategie und 2 Bedarf netto |

Der Wohnkanton ist **kein** Präzisierungspunkt: er wird bereits im Schnellstart verbindlich
erfasst. Zustand C («Was wäre wenn?») ist bewusst **nicht** umgesetzt, solange er inhaltlich
nichts anderes anbietet als Zustand B.

## 6. «Plan verstehen»

Freiwillige Detail-/Expertenebene für Benutzer, die wissen wollen, wie ihre Planung
funktioniert. Sie ist im Menü als eigene Gruppe mit dem Badge **DETAILS** gekennzeichnet und
wird freundlich kommuniziert – keine Warnsymbole, kein «Nur für Experten», keine
absichtliche Abschreckung.

- **Jahresverlauf** (`Jahr für Jahr.` / `So arbeitet dein Plan im Detail.`): sechs nummerierte
  Abschnitte (Vermögen Jahresanfang · Einkommen · Bedarf · Entnahme aus den Töpfen · Deine
  Töpfe Jahresende · Vermögen Jahresende). Abschnitt 5 nennt dynamisch die verwendete
  Anlagestrategie (`{Profil} · Annahme {x} % pro Jahr` mit ⓘ). **Renditeannahme** (`4,5 % pro Jahr`)
  und **«Rendite dieses Jahres»** (gerechnetes Jahresergebnis, z. B. + CHF 51'347) bleiben
  sauber getrennt.
- **Töpfe-Modell** (Dialog, siehe §8).
- **Annahmen & Berechnung** (`Annahmen.` / `Renditen & Inflation`): Planungshorizont,
  Inflation, Renditeannahmen, interne Produktsätze. Renditeannahmen haben **genau eine
  Quelle**: das Strategieprofil in `js/risk-profiles.js` (Vorsichtig 2,5 %, Ausgewogen
  4,5 %, Chancenorientiert 6,0 % real). Strategieprofil, Annahmen-Screen, Jahresverlauf und
  Projektion rechnen nie mit unabhängigen Renditewerten.

## 7. Navigation (Hamburger)

Das Menü ist **aufgabenorientiert**, nicht modellgetrieben:

```
MEIN PLAN
    Mein Plan
PLANEN
    Angaben & Grundlagen
    Meine Varianten
PLAN VERSTEHEN            DETAILS
    Jahresverlauf
    Töpfe-Modell
    Annahmen & Berechnung
```

**Keine** eigenen Hauptnavigationseinträge für Steuern, AHV, PK, Säule 3a, Einkommen,
Bedarf, Vermögen oder «Plan verbessern» – das sind Bestandteile einer Aufgabe, keine
Destinationen. Sie liegen hinter **einem** Menüpunkt «Angaben & Grundlagen».

**Jede Zeile nennt Zustand UND erfassten Wert.** «Erfasst» allein hilft niemandem, der prüfen
will, ob die Zahl stimmt. Deshalb steht in jeder Zeile der tatsächlich hinterlegte Betrag bzw.
die Kurzbeschreibung – z. B. «Pensionskasse (PK) · Beitrag CHF 24'000 / Jahr · CHF 750'000»,
«Säule 3a · CHF 120'000», «Weitere Einnahmen · Keine», «Vermögen · Bank & Wertschriften ·
CHF 200'000». Beschreibungen werden nie abgeschnitten, sondern umgebrochen. Dieselbe Regel gilt
für die Zeilen im Zustand A («Plan präzisieren»); beide Screens nutzen dieselbe Quelle
(`captured()` in `js/v4-ui.js`).

- **Schnellstart:** solange kein erster Plan existiert, gibt es **keinen** Hamburger.
- **Menüpunkte dürfen nur diese sechs sein:** `plan`, `basics`, `variants`, `years`, `pots`,
  `assumptions` (Reihenfolge wie oben).

## 8. Crosslinks – mehrfach erreichbar, einmal implementiert

Inhalte dürfen kontextuell mehrfach erreichbar sein, aber es gibt **genau eine
Implementierung**:

| Inhalt | Weg 1 | Weg 2 | Implementierung |
| --- | --- | --- | --- |
| Töpfe-Modell | Menü → Plan verstehen → Töpfe-Modell | Jahresverlauf → «Deine Töpfe» → Töpfe-Modell | **derselbe Dialog** (`openPotsModal()`, `#v4Modal`, Titel «Das Töpfe-Modell») |
| Angaben-Editor (AHV, PK, 3a, Einnahmen, Bedarf, Vermögen) | Menü → Angaben & Grundlagen → Zeile | Plan präzisieren → Zeile «…» bzw. «Angaben ergänzen» | **dieselbe Editorseite** (`openDetail(page)`) |
| Anlagestrategie | Plan optimieren → Hebel 1 | Töpfe-Dialog → Card «Anlagestrategie» | **dieselbe Quelle** (`profileComparison()` / `risk-profiles.js`) |
| Anlagestrategie im Jahresverlauf | Abschnitt 5 «Deine Töpfe (Jahresende)» | Töpfe-Dialog-Card | **dieselbe Quelle** (`risk-profiles.js`) |

Der Test prüft für das Töpfe-Modell, dass beide Wege **identischen** Inhalt rendern.

**Töpfe-Modell (verbindlich):** Lead «Dein frei verfügbares Vermögen ist auf drei Töpfe
verteilt.» · Donut mit hellem, neutralem Zentrum (Mint/Creme) und Navy-Text: «Frei
verfügbares Vermögen» und darunter der Betrag · genau drei kompakte Zeilen für Geldmarkt
(IconCash, Grün), Obligationen (IconChartBar, Blau), Wertschöpfung (IconTrendingUp, Violett)
mit Icon, Namen, CHF-Betrag und Prozentanteil · die Erklärungen der Töpfe hängen als ⓘ an der
Zeile, **kein** zweiter Erklärblock · danach eine einzige Card «Anlagestrategie» mit dem
tatsächlich aktiven Profil («Ausgewogen · 4,5 % pro Jahr»), der Herkunft **«Annahme»**
(automatisch/Standard) bzw. **«gewählt»** (vom Benutzer übernommen, Feld
`state.strategyChosen`) und der Subline «Bestimmt die erwartete Rendite deiner Anlage, nicht die Aufteilung.» mit
optionalem ⓘ · «Schliessen». Der Dialog passt bei 390 × 844 **ohne internes Scrollen**.

## 9. Zustandsabhängige Navigation

| Zustand | Hamburger | Card auf «Mein Plan» | «Plan verstehen» |
| --- | --- | --- | --- |
| **kein Plan** (Schnellstart) | ausgeblendet | – (Schnellstart ist Home) | nur nach dem ersten Plan |
| **erster/unvollständiger Plan** | sichtbar | «Plan präzisieren» | verfügbar, aber nicht beworben |
| **vollständiger Plan** | sichtbar | «Plan optimieren» | verfügbar |
| **optimierter Plan** (Strategie übernommen) | sichtbar | «Plan optimieren»; Töpfe-Dialog nennt die Herkunft «gewählt» | verfügbar |

## 10. UX-Regeln

- **Progressive disclosure:** erst die Antwort, dann die Details. Komplexe Details sind
  freiwillig und liegen mindestens einen Klick tief.
- **Keine Feature-Navigation:** Navigationspunkte sind Aufgaben (Planen, Verstehen), keine
  Datenfelder.
- **Keine Doppelungen:** dieselbe Information hat eine Implementierung und eine Quelle.
- **Kein Long-Screen als Inhaltsverzeichnis:** «Mein Plan» bleibt eine Viewport-Höhe.
- **«Mein Plan» ist die zentrale Rückkehrposition** – aber über «Übernehmen», nicht über
  «Zurück» (siehe Apply-and-return-Regel).
- **Einheitliche Rückwege:** fokussierte Screens haben genau **einen** Rückweg unter der
  Titelzeile (`PageTitle` mit `{detail:true}`, `data-v4-back`). Kein «✕», kein «Zurück», kein
  Home, kein zweiter Chevron für dieselbe Funktion. **Ausnahme:** Modals/Bottom-Sheets
  schliessen mit dem globalen **ModalCloseButton** (IconX, ca. 22 px, kein Kreis, kein Border,
  kein Shadow, transparenter Normalzustand, mindestens 40 × 40 px Touchfläche, oben rechts,
  `aria-label="Schliessen"`).
- **Apply-and-return-Regel (verbindlich):** Änderungen an planungsrelevanten Daten werden mit
  **«Übernehmen»** bestätigt. Nach erfolgreichem Übernehmen wird der Plan neu berechnet und der
  Nutzer direkt zu **«Mein Plan»** geführt, damit die Wirkung sofort sichtbar ist. Das Muster
  lautet **Ändern → Übernehmen → Wirkung auf «Mein Plan» sehen** und gilt für alle
  planungsrelevanten Eingaben (Alter, Pensionierungsalter, Wohnkanton, AHV, PK, Säule 3a,
  weiteres Kapital, Bedarf, Annahmen). Reine Zurück-Navigation **speichert nichts** und
  verändert den Navigationskontext nicht.
- **«Zurück» führt zur übergeordneten Seite, nicht immer auf «Mein Plan»:** Der Rückweg trägt
  den Namen der Seite, von der aus der Screen geöffnet wurde (`detailParent` in `js/v4-ui.js`).
  Aus «Angaben & Grundlagen» geöffnete Editoren zeigen «‹ Angaben & Grundlagen» und führen
  dorthin zurück; aus «Plan präzisieren» geöffnete Editoren zeigen «‹ Plan präzisieren».
  Top-Level-Screens (Jahresverlauf, Varianten, Plan präzisieren/optimieren, Angaben &
  Grundlagen sowie über das Menü geöffnete Screens wie «Annahmen») zeigen «‹ Mein Plan». Damit
  sind «Zurück» (Navigation, keine Anwendung) und «Übernehmen» (speichern/berechnen → «Mein
  Plan») sauber getrennt.
- **Ausnahme bei mehrstufigen Eingaben:** Bleibt ein Arbeitsbereich über mehrere Schritte
  offen (z. B. mehrere 3a-Konten im Bereich «Weiteres Kapital & Säule 3a»), darf «Speichern»
  innerhalb des Bereichs bleiben; erst das abschliessende «Übernehmen» führt auf «Mein Plan».
  In V4 gibt es aktuell keinen solchen mehrstufigen Bereich: «Vermögen» ist eine Tabelle mit
  einem «Übernehmen».
- **PageTitle bleibt verbindlich:** `[ grosser Titel links ] [ kleine Kontextzeile rechts
  daneben ]`, einzeilig, Kontext nie als Subtitle unter dem Titel.

## 11. Architekturregel für zukünftige Features

Bevor ein neuer Menüpunkt oder eine neue Card auf «Mein Plan» entsteht, muss geklärt werden:

1. Braucht der Benutzer diese Information, um zu verstehen, ob sein Plan funktioniert?
2. Ist es eine Aktion, mit der er seinen Plan verändert?
3. Oder erklärt die Funktion lediglich, wie die Berechnung funktioniert?

Zuordnung: **1 → MEIN PLAN** · **2 → PLANEN** · **3 → PLAN VERSTEHEN**.

Nicht automatisch jedes neue Feature im Hamburger **und** auf «Mein Plan» verlinken. Eine
Information, die keine der drei Fragen beantwortet, gehört in keine der drei Ebenen.

## 12. Abnahme (Stand dieser Umsetzung)

| Kriterium | Status |
| --- | --- |
| Mein Plan ist Home | erfüllt – Logo und Menüpunkt führen immer dorthin |
| Mein Plan bleibt kurz | erfüllt – Titel · Status · 4 Kennzahlen · PK-Bezug · 1 Aktion · 2 Zeilen |
| Hamburger ist aufgabenorientiert | erfüllt – sechs Destinationen in drei Gruppen |
| Plan präzisieren ist zustandsabhängig | erfüllt – nur bei offenen/geschätzten Angaben |
| Plan optimieren erscheint bei ausreichender Datenqualität | erfüllt – alle Angaben erfasst |
| Varianten sind eigener Screen | erfüllt – «Meine Varianten», auf «Mein Plan» nur eine Zeile |
| Plan verstehen ist klar als freiwillige Vertiefung erkennbar | erfüllt – eigene Menügruppe mit Badge «DETAILS» |
| Jahresverlauf ist unter Plan verstehen | erfüllt – Menügruppe und Titel «Jahr für Jahr.» |
| Töpfe-Modell ist direkt und aus dem Jahresverlauf erreichbar | erfüllt – Menüpunkt und Abschnitt-5-Zeile |
| beide Wege verwenden dieselbe Komponente | erfüllt – identischer Dialoginhalt (Test) |
| Annahmen sind nicht Teil der normalen User Journey | erfüllt – nur unter «Plan verstehen» |
| keine unnötigen Fachmenüpunkte | erfüllt – AHV/PK/3a/Einkommen/Bedarf/Vermögen nicht im Menü |
| Back-Navigation konsistent | erfüllt – genau ein «‹ Mein Plan» pro Screen |
| Modals verwenden einheitliches IconX | erfüllt – `#v4Modal .v3-modal-close` |
| keine Doppelungen von «Plan verbessern» / «Plan genauer machen» | erfüllt – beide Begriffe entfernt |
| `information-architecture-v4.md` existiert | erfüllt – dieses Dokument |
| Dokumentation entspricht der tatsächlichen Implementierung | erfüllt – geprüft in `tests/v4-browser-checks.html` |

## 13. Offene, untersuchte Punkte

**Auffälliger Wert «Wertschriftenrendite 16 %»:** Untersucht in Datenquelle, Rechenkern und
Konvertierung. Ergebnis: Die Wertschriftenrendite bis zur Pensionierung ist ein **interner
Produktsatz** (`secReturn`), kein Eingabefeld; im heutigen Datenbestand steht 4,5 %. Ein
16-%-Wert kann nur aus einem **Altbestand** im lokalen Speicher stammen (Dezimal-/
Prozentverwechslung oder alte Annahme) – der Rechenkern führt ihn unverändert als
Prozentsatz (`plan.assumptions.rates.capitalReturn`), rechnet also nie mit 0,16 statt 16 %.
Solche Werte werden im Screen «Annahmen» als **zu prüfen** markiert (≥ 10 % oder 0 < x < 0,5 %)
und können mit einem Klick auf 4,5 % zurückgesetzt werden; stillschweigend verwendet werden
sie nie. Die Rendite **im Ruhestand** kommt ohnehin ausschliesslich aus dem Strategieprofil.
