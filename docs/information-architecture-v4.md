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
│   ├── Meine Varianten                      (max. 3, aktueller Plan zuerst und offen;
│   │     └── Action-Card «Rente oder Kapital?» → Variantenvergleich   nur vor der Pensionierung)
│   └── Rente oder Kapital?                  (Vergleich; Action-Card unter dem PK-Regler,
│         kein Menüpunkt · CTA → Beratungsflow · «Übernehmen» gibt es hier nicht)
│
└── PLAN VERSTEHEN   DETAILS
    ├── Jahresverlauf               («Jahr für Jahr.»)
    │     └── Topf-Icon an Abschnitt 1 und 6 → Töpfe-Modell (Dialog)
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
  Töpfe Jahresende · Vermögen Jahresende) – jeder **zugeklappt mit genau einer Kennzahl**
  (Total · Netto verfügbar · Fehlbetrag bzw. Überschuss · Total Entnahme · Rendite dieses
  Jahres · Total), der Rest kommt auf Tap; der aufgeklappte Zustand bleibt beim Jahreswechsel
  erhalten. Abschnitt 5 nennt aufgeklappt dynamisch die verwendete
  Anlagestrategie (`{Profil} · Annahme {x} % pro Jahr` mit ⓘ). **Renditeannahme** (`4,5 % pro Jahr`)
  und **«Rendite dieses Jahres»** (gerechnetes Jahresergebnis, z. B. + CHF 51'347) bleiben
  sauber getrennt. Das Töpfe-Modell ist über das **Donut-Icon direkt neben den Überschriften 1
  und 6** erreichbar (derselbe Dialog wie im Menü, aber an der Position der Überschrift);
  der frühere Textlink am Seitenende ist
  entfernt, und die Erklärung (Variante, Kaufkraft, Annahmen) steht hinter einem ⓘ in der
  Jahreszeile – der Screen selbst trägt keinen stehenden Erklärtext.
- **Töpfe-Modell** (Dialog, siehe §8).
- **Rente oder Kapital?** (`Rente oder Kapital?` / `Zwei Varianten im Vergleich.`): eigener
  Vergleichsscreen für **genau zwei** Varianten (Ebene *Planen*, erreichbar über den PK-Bereich
  auf «Mein Plan» und über «Meine Varianten» – **kein** Menüpunkt; **nur vor der Pensionierung**,
  weil der Screen an den Kapitalbezug gebunden ist). Links fix und grün der
  **aktuelle Plan**, rechts blau die **Variante** (Auswahl nur aus den übrigen gespeicherten
  Varianten). Je Karte genau drei Kernwerte (Startkapital netto · PK-Rente netto / Mt. ·
  Vermögen reicht bis) in exakt ausgerichteten Zeilen, darunter ein dynamisches Kurzfazit, die Grafik
  «Vermögensentwicklung» mit dem Umschalter **Vermögen / Einkommen** (zwei Linien, keine
  CHF-Y-Achse, Aufbrauch direkt an der Linie markiert als «0 mit {Alter}»), der Detailvergleich
  «Die wichtigsten Unterschiede» (sieben Zeilen, Wertspalten in denselben Farben), die Card
  «Und deine Anlagestrategie?» als **Beratungs-CTA** in den **bestehenden Beratungsflow**.
  Unter der Grafik stehen nur **zwei eingeklappte Informationszeilen** – der Screen bleibt eine
  Übersicht und passt bei 390 × 844 exakt auf einen Screen (848 px = 1,00). Der Screen zeigt **keine** Empfehlung und
  **keine** Übernahme und verändert weder Plan noch Töpfe oder Strategie (Details unten).
- **Annahmen & Berechnung** (`Annahmen.` / `Renditen & Inflation`): Planungshorizont,
  Inflation, Renditeannahmen, interne Produktsätze. Renditeannahmen haben **genau eine
  Quelle**: das Strategieprofil in `js/risk-profiles.js` (Vorsichtig 2,5 %, Ausgewogen
  4,5 %, Chancenorientiert 6,0 % real). Strategieprofil, Annahmen-Screen, Jahresverlauf und
  Projektion rechnen nie mit unabhängigen Renditewerten.

**Variantenvergleich «Rente oder Kapital?» (verbindlich):** Der Screen vergleicht **genau zwei**
gespeicherte Varianten und erklärt den Unterschied zwischen mehr Kapital und lebenslanger Rente.

- **Einstieg:** als kompakte, ganzflächig klickbare **Action-Card «Rente oder Kapital?»** direkt
  unter dem PK-Regler auf «Mein Plan» (Subline «Vergleiche deinen Plan mit einer anderen
  Variante», Icon `arrowsExchange` links, Chevron rechts, mintfarbene Fläche mit grünem Rahmen,
  dunkelgrüner Titel) und zusätzlich auf «Meine Varianten». **Kein** Menüpunkt im Hamburger. Der
  Einstieg erscheint nur, wenn ein Plan mit mehr als einer Variante existiert. Die frühere Zeile
  «Aktueller Plan» unter dem Regler ist entfernt (nur der Vorschauzustand meldet sich).
- **Kopf:** `PageTitle` mit Titel «Rente oder Kapital?» und Kontext «Zwei Varianten im
  Vergleich.», darunter genau ein Rückweg «‹ Mein Plan». **Abweichungen zur Spec-Vorlage:** der
  Titel endet als Frage **ohne** Punkt (einzige Ausnahme der Punkt-Regel), und der Kontext ist
  gekürzt, weil der vorgegebene Satz bei 390 px drei Zeilen bräuchte – die V4-Regel erlaubt
  höchstens zwei.
- **Karten:** aktuelle Variante **immer links**, grün, Beschriftung exakt «Aktueller Plan»
  (nicht «Dein aktueller Plan»), nicht auswählbar; rechts blau **«Variante»** (ohne «Zweite»,
  ebenso in der Grafiklegende) mit Auswahl **ausschliesslich** der übrigen gespeicherten
  Varianten. Je Karte genau drei Kernwerte: Startkapital netto · PK-Rente netto / Mt. ·
  Vermögen reicht bis, in beiden Karten auf **derselben Höhe** (drei identische Zeilen: Badge ·
  Auswahl/Untertitel · Werte; die Auswahl ist 28 px hoch statt der globalen 44 px `select`-Höhe
  und überdeckt den Badge nicht). Beide Karten bleiben auch auf Mobile (390, 320 px)
  **nebeneinander** – kein horizontales Scrollen.
- **Farblogik (global für den Screen):** `currentPlan = grün` (`--v3-green`),
  `comparisonVariant = blau` (`--v3-pot-bonds`) – für Rahmen, Werte, Wertspalten, Linien und
  Marker. Farben bedeuten **Identität, keine Bewertung**.
- **Kurzfazit:** dynamisch aus den beiden Varianten abgeleitet
  («Mehr Kapital hält in dieser Planung länger Vermögen verfügbar.» / «Mehr Rente gibt dir dafür
  lebenslang ein höheres Einkommen.»), sonst neutral («Die Varianten unterscheiden sich vor allem
  bei verfügbarem Startkapital und lebenslanger PK-Rente.»). Nie «besser», «empfohlen» oder
  «optimal».
- **Grafik:** eine Chart-Fläche mit dem Umschalter **Vermögen / Einkommen** (Default Vermögen).
  Zwei Linien (grün/blau) in nahezu voller Kartenbreite, **ohne CHF-Y-Achse**, mit dezenten
  Hilfslinien und direkten Wertelabels; **je Linie höchstens drei Wertelabels** in der Priorität
  **Start · gemeinsamer Vergleichszeitpunkt (Mitte) · Ende/Aufbrauch** – die übrigen Datenpunkte
  bleiben ohne Zahl, nach dem Aufbrauchpunkt kommt keine weitere Null-Marke. **Jedes Label sitzt
  waagerecht zentriert über seinem Datenpunkt** (`labelX = pointX`), weicht bei Überdeckung nur
  **vertikal** aus und rutscht erst am Chartrand innerhalb der Kante (≤ 2 px), wo es eine
  **Leader-Line** zum Punkt bekommt; findet es keinen Platz, entfällt es. Start und
  Vergleichszeitpunkt tragen beide Linien. **Der Startpunkt ist das Startkapital am
  Pensionierungsalter – dieselbe Zahl wie «Startkapital netto» in der Karte** (vorher begann die
  Linie mit dem Ende des ersten Planjahres und wich dadurch um eine Jahresentnahme ab). **Keine Linie läuft durch ein Label** und kein Label
  berührt die **X-Achse**, die genau die beschrifteten Zeitpunkte zeigt (ohne Beschriftung «Alter»,
  mit Abstand unter der Zeichenfläche und unter **jedem** Punkt, links das Pensionierungsalter,
  keine zusätzlichen Zehnjahreswerte – Beispiel «optimiert»: 65 · 78 · 90). Fällt das freie Vermögen auf 0, steht die Marke **«0 mit {Alter}»** direkt an der
  Linie (nie «Plan endet» oder «Geld reicht nur bis») – **dieselbe Zahl wie «Vermögen reicht bis»
  in Karte und Statusbox** (`exhaustionAge()`). Unter der Grafik: «Wichtig: Wenn das
  freie Vermögen aufgebraucht ist, laufen AHV und PK-Rente weiter.» Die Einkommensansicht zeigt
  das monatlich verfügbare Nettoeinkommen (Nettoeinkommen + tatsächlich entnommenes Kapital) und
  damit den Rückfall auf die lebenslangen Einkommen. Die **gewählte Vergleichsvariante und die
  Ansicht** sind Nutzereinstellungen und werden getrennt vom Plan unter `retirement-v4-compare`
  (`{share, view}`) gemerkt; nach einem Neuladen zeigt der Vergleich wieder denselben Stand.
- **Datenquelle:** ausschliesslich die zentrale Jahresprojektion und die bestehenden
  Rechenfunktionen (`evaluatePlan`, `calculatePension`, `calculateAvailableCapital`,
  `incomeSourcesAtStart`). **Keine** zweite Finanz- oder Steuerberechnung; Steuerwerte kommen aus
  dem kantonalen Modell und werden ohne Wohnkanton als «geschätzt» gekennzeichnet.
- **Detailvergleich «Die wichtigsten Unterschiede»:** sieben Zeilen (Kapitalsteuer beim Bezug ·
  Verfügbares Startkapital nach Steuern · PK-Rente netto pro Monat · Laufende Einkommensteuer pro
  Jahr · Vermögen mit 85 · Vermögen reicht bis · Danach Einkommen netto / Mt.), Wertspalten in
  Grün/Blau. **«Danach Einkommen»** = laufendes Nettoeinkommen nach Aufbrauch des frei
  verfügbaren Vermögens (AHV, PK-Rente, weitere dauerhafte Einkommen – netto, **ohne**
  Kapitalentnahme), mit ⓘ.
- **Beratung als CTA (kein Accordion):** Die Zeile «Und deine Anlagestrategie?» hat mintfarbenen
  Hintergrund, grünen Rahmen, dunkelgrünen Titel, das Icon `arrowUpRight` und die Subline «Passt
  deine Strategie zu Rente, Bedarf und Anlagehorizont?»; rechts unten steht «Individuell
  besprechen →» statt eines Chevrons. Die ganze Fläche öffnet den **bestehenden** Beratungsflow
  (Dialog «Angaben für die Beratung»). Kein neuer Flow.
- **Unter der Grafik: zwei Klappzeilen plus Beratungs-CTA.** «Die wichtigsten Unterschiede» und
  «So haben wir gerechnet» (Tabler-Icon `adjustments`, kein Emoji) sind `<details>` mit Kopfzeile,
  Kurzzeile und Chevron; die geschlossene Kurzzeile der Berechnungsbasis ist knapp und ohne
  Beschriftungen («AR · 5,2 % · Ausgewogen · bis 90»), **Inflation und die ausgeschriebenen
  Bezeichnungen erscheinen erst beim Aufklappen**. Damit passt die Übersicht im zugeklappten
  Standardzustand bei 390 × 844 **exakt auf einen Screen** (848 px = 1,00; Referenzbreiten
  390–440 px, darunter darf der Text stärker umbrechen).
- **Nicht erlaubt:** Empfehlung oder Wertung, «Übernehmen» im Vergleich, automatische Änderung
  der Anlagestrategie oder der Töpfe (z. B. keinen Obligationentopf entfernen), eigene
  Steuerformel, Y-Achse mit CHF-Stufen.

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
───────────────────────────────  (dezent abgesetzt, keine Navigation)
    Angaben für die Beratung
    Plan zurücksetzen
    Neu laden
    App-Version 25.09.2026 · Build 1
```

**Pilotbereich (Pilottesting):** Ganz unten stehen dezent abgesetzt **«Angaben für die
Beratung»**, **«Plan zurücksetzen»** und **«Neu laden»** samt Versionszeile (Klasse
.v4-menu-quiet, gedämpfte Schrift, Trennlinie darüber). Sie sind bewusst **keine**
Menüdestinationen im Sinn der Informationsarchitektur, sondern Werkzeuge für die Übergabe, den
Neustart bzw. das Aktualisieren:

- **Angaben für die Beratung** bereitet den Plan als **Klartext** auf, den der Nutzer kopieren
  oder als Datei speichern und selbst verschicken kann: Person und Zeitraum · Einkommen im
  ersten Planjahr · Bedarf und Entnahme · Vermögen zum Pensionierungszeitpunkt · Aufteilung auf
  die Töpfe · Ergebnis · Annahmen · Varianten. **Transparent:** nicht erfasste Werte stehen als
  «noch nicht erfasst», geschätzte AHV als «geschätzte AHV-Pauschale», der Kopf nennt «heutige
  Kaufkraft» und «Modellrechnung, keine Steuer- oder Anlageberatung». Der Text ist bearbeitbar,
  und es wird **nichts automatisch verschickt** (kein mailto-Link, kein Formular); «Text
  kopieren» markiert den Text und nutzt die Clipboard-API, wenn verfügbar, «Als Datei
  speichern» legt eine .txt-Datei ab.
- **Plan zurücksetzen** fragt zuerst nach («Plan zurücksetzen?» mit «Abbrechen») und entfernt
  danach alle erfassten Angaben, Varianten und die Anlagestrategie aus diesem Browser; die App
  startet wieder im **Schnellstart** (ohne Hamburger, weil kein Plan existiert).
- **Neu laden** speichert den aktuellen Stand und lädt die Seite neu – **ohne** Datenverlust und
  ohne Cache-Löschen. Darunter steht die **App-Version** (aus `js/v4-version.js`): Tester können
  sie in einer Rückmeldung nennen, und die Zuordnung «welche Version, welcher Fehler» ist eindeutig.

## 7a. Update, Speicherstände und Service Worker

- **Kein manuelles Löschen:** Ein neues Deployment muss bei jedem Tester ankommen. Der
  **Service Worker** (`sw.js`, registriert über `js/v4-sw.js`) liefert HTML und Code **netz-zuerst
  ohne HTTP-Cache**, räumt bei der Aktivierung alle alten Caches, übernimmt sofort die Kontrolle
  (`skipWaiting`/`claim`) und lässt die Seite bei einem echten Update **einmal** neu laden. Nur
  Medien laufen stale-while-revalidate; `/tests/` und `?dev=1` bleiben unberührt.
- **Speicherstände:** Jeder Stand trägt `version` (Datenschema 2) und `storageVersion`
  (Generation, aktuell 3). Beim Laden wird **migriert** (und sofort neu abgelegt), **gesichert und
  geräumt** (Backup unter `retirement-v3-plan.backup-…`, höchstens zwei, mit sichtbarer Meldung und
  weiterhin möglichem Speichern) oder **geschützt** (neuerer Stand bleibt byte-gleich, Schreiben
  blockiert, sichtbare Meldung). Die App läuft in allen drei Fällen weiter.
- **Sichtbarkeit:** Speicherereignisse erscheinen im Banner `#v4Notice` (`role="status"`,
  schliessbar). Sie sind der Grund, warum Tester nach einem Deployment nichts löschen müssen.

## 8. Crosslinks – mehrfach erreichbar, einmal implementiert

Inhalte dürfen kontextuell mehrfach erreichbar sein, aber es gibt **genau eine
Implementierung**:

| Inhalt | Weg 1 | Weg 2 | Implementierung |
| --- | --- | --- | --- |
| Töpfe-Modell | Menü → Plan verstehen → Töpfe-Modell (= Jahresanfang des ersten Planjahres) | Jahresverlauf → Topf-Icon an Abschnitt 1 (Jahresanfang) bzw. 6 (Jahresende) → Töpfe-Modell | **derselbe Dialog** (`openPotsModal()`, `#v4Modal`, Titel «Das Töpfe-Modell») |
| Angaben-Editor (AHV, PK, 3a, Einnahmen, Bedarf, Vermögen) | Menü → Angaben & Grundlagen → Zeile | Plan präzisieren → Zeile «…» bzw. «Angaben ergänzen» | **dieselbe Editorseite** (`openDetail(page)`) |
| Anlagestrategie | Plan optimieren → Hebel 1 | Töpfe-Dialog → Card «Anlagestrategie» | **dieselbe Quelle** (`profileComparison()` / `risk-profiles.js`) |
| Anlagestrategie im Jahresverlauf | Abschnitt 5 «Deine Töpfe (Jahresende)» | Töpfe-Dialog-Card | **dieselbe Quelle** (`risk-profiles.js`) |
| Variantenvergleich «Rente oder Kapital?» | PK-Bereich auf «Mein Plan» → Action-Card «Rente oder Kapital?» | «Meine Varianten» → dieselbe Action-Card | **derselbe Screen** (`renderCompare()`, `comparisonOf()`), gespeist aus `evaluatePlan()` |
| Alte Planung (Schema 1, ohne Variantenplätze) | Laden in V4 | – | `V3State.restore()`/`migrations` – drei Variantenplätze, sonst Sicherung + Neustart |
| Beratung / Anlagestrategie | Menü (Pilotbereich) → «Angaben für die Beratung» | Variantenvergleich → «Individuell besprechen» | **derselbe Dialog** (`openAdvisorModal()`) |

Der Test prüft für das Töpfe-Modell, dass der Menüzugang und das Topf-Icon an Abschnitt 1 im ersten
Planjahr **identischen** Inhalt rendern (Jahresanfang des ersten Planjahres).

**Töpfe-Modell (verbindlich, dynamisch):** Der Dialog zeigt den Zustand **eines Planjahres** aus
der zentralen Jahresprojektion (`yearlyProjection`) – nicht die statische Startaufteilung und
nicht aus der Anlagestrategie abgeleitet. Im Kopf steht klein «Alter X · Jahr JJJJ» mit der
Position («Stand am Ende dieses Jahres» bzw. «Stand am Anfang dieses Jahres»); Donut,
Zentrum-Betrag und die Zeilen nutzen dieselben Jahreswerte, die Prozentanteile werden aus den
Beträgen gerechnet (`Betrag / frei verfügbares Vermögen × 100`). **Zwei Positionen, eine
Rechnung:** der Einstieg über Abschnitt 1 der Jahresansicht zeigt den **Jahresanfang**
(`buckets` / `free`), der Einstieg über Abschnitt 6 und das Menü das **Jahresende**
(`endBuckets` / `end`) – nie dieselben Werte für beide. **Invariante:** Summe der Töpfe = frei
verfügbares Vermögen der gezeigten Position. Aus dem
Jahresverlauf geöffnet zeigt es das dort gewählte Jahr und die Position des angeklickten Icons, aus
dem Menü **immer den Jahresanfang des ersten Planjahres** (dieselbe Sicht wie das Icon an
Abschnitt 1 im ersten Jahr). Jahresverlauf und Töpfe-Modell zeigen damit **niemals zwei verschiedene
Wahrheiten**; die Anlagestrategie bleibt reine Renditeannahme. Lead «Dein frei verfügbares
Vermögen ist in diesem Jahr …» · Donut mit hellem, neutralem Zentrum (Mint/Creme) und Navy-Text: «Frei
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
  weiteres Kapital, Bedarf, Annahmen) **und seit der Korrektur vom September 2026 auch für
  «Übernehmen» einer Variante auf «Meine Varianten»** – der Screen «Meine Varianten» ist keine
  Ausnahme mehr, sondern bestätigt und springt ebenfalls direkt auf «Mein Plan». Reine
  Zurück-Navigation **speichert nichts** und verändert den Navigationskontext nicht.
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
| Aktueller Plan zuerst, übrige Varianten zugeklappt | erfüllt – aktuelle Karte offen, übrige zeigen nur die Reichweite |
| «Übernehmen» einer Variante führt direkt auf «Mein Plan» | erfüllt – Apply-and-return gilt auch hier (Test: Titel «Mein Plan.» und übernommener Anteil im Regler) |
| Ohne Kapitalbezug kein toter Variantenscreen | erfüllt – «Bereits pensioniert»: keine Variantenzeile, kein Menüpunkt, kein Vergleichseinstieg, kein «Übernehmen»; der Screen führt auf «Mein Plan» zurück |
| Alte Schema-1-Planung erhält die drei Variantenplätze | erfüllt – sonst fehlten beim ersten Öffnen Vergleichseinstieg und Auswahl (Test mit `version: 1`) |
| Variantenvergleich ohne Menüpunkt, mit zwei Einstiegen | erfüllt – PK-Bereich auf «Mein Plan» und «Meine Varianten» |
| Aktueller Plan im Vergleich immer links und grün | erfüllt – «Aktueller Plan», nicht auswählbar, `--v3-green` |
| Vergleich zeigt keine Empfehlung und übernimmt nichts | erfüllt – dynamisches Fazit ohne Wertung, kein «Übernehmen», Test prüft unveränderten Plan |
| Vergleich: jedes Wertelabel über seinem Punkt, X-Achse ohne Zusatzwerte | erfüllt – `labelX = pointX`, nur vertikales Ausweichen, Leader-Line nur am Rand, Achse = Start · Vergleichszeitpunkt · Ende (Test: «66 · 78 · 90») |
| Vergleich merkt gewählte Variante und Ansicht | erfüllt – `retirement-v4-compare` (`{share, view}`), getrennt vom Plan, Prüfung nach echtem Neuladen |
| Plan verstehen ist klar als freiwillige Vertiefung erkennbar | erfüllt – eigene Menügruppe mit Badge «DETAILS» |
| Jahresverlauf ist unter Plan verstehen | erfüllt – Menügruppe und Titel «Jahr für Jahr.» |
| Töpfe-Modell ist direkt und aus dem Jahresverlauf erreichbar | erfüllt – Menüpunkt und Topf-Icon an den Überschriften 1 und 6 |
| beide Wege verwenden dieselbe Komponente | erfüllt – Menü = Jahresanfang des ersten Planjahres, identischer Dialoginhalt (Test) |
| Annahmen sind nicht Teil der normalen User Journey | erfüllt – nur unter «Plan verstehen» |
| keine unnötigen Fachmenüpunkte | erfüllt – AHV/PK/3a/Einkommen/Bedarf/Vermögen nicht im Menü |
| Back-Navigation konsistent | erfüllt – genau ein «‹ Mein Plan» pro Screen |
| Modals verwenden einheitliches IconX | erfüllt – `#v4Modal .v3-modal-close` |
| keine Doppelungen von «Plan verbessern» / «Plan genauer machen» | erfüllt – beide Begriffe entfernt |
| `information-architecture-v4.md` existiert | erfüllt – dieses Dokument |
| Dokumentation entspricht der tatsächlichen Implementierung | erfüllt – geprüft in `tests/v4-browser-checks.html` |
| Deployment erreicht Tester ohne manuelles Löschen | erfüllt – Service Worker netz-zuerst für HTML und Code, `skipWaiting`/`claim`, Reload bei echtem Update (Prüfung + Zweiphasen-Probe mit geändertem Deployment) |
| Tester sehen ihre App-Version | erfüllt – Menüzeile «App-Version …» plus «Neu laden» ohne Datenverlust |
| Alte/defekte Speicherstände blockieren nie | erfüllt – Migration, Sicherung + Räumung mit sichtbarer Meldung, Schutz neuerer Stände |

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
