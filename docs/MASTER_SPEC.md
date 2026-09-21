# Master Specification – Ruhestands-Check

Gültiger fachlicher und funktionaler Sollzustand der Anwendung, Stand 11. September 2026. Diese Datei ist die zentrale Spezifikation, kein Changelog. Sie wird zusammen mit [PRODUCT_RULES.md](PRODUCT_RULES.md) und [AGENTS.md](../AGENTS.md) gepflegt. Historische Auftragstexte sind keine konkurrierenden aktuellen Navigationsvorgaben.

Vor einer Änderung die betroffenen Kapitel lesen und Widersprüche ausdrücklich nennen. Nach erfolgreicher Umsetzung die betroffenen bestehenden Abschnitte anpassen; ersetzte Konzepte nicht als zusätzliche Regeln anhängen. Neue Anforderungen dürfen bestehende Berechnungen nicht stillschweigend umdeuten. **IMPLEMENTIERT** beschreibt eindeutig vorhandenes Verhalten; **ZU VERIFIZIEREN** benennt offene fachliche Grundlagen, ohne eine neue Berechnungsregel einzuführen.

## 1. Produktvision und Ziel

Der Ruhestands-Check gibt eine verständliche erste Standortbestimmung für die Pensionierung in der Schweiz. Er verknüpft laufende Einnahmen, Lebensbedarf, Vorsorge, verfügbares Kapital, Steuern und Entnahmen bis zum gewählten Zielalter. Eine kompakte Antwort führt bei Bedarf direkt zu den fachlichen Details.

Ergebnisse sind Modellrechnungen unter den gewählten Annahmen, keine Garantie, individuelle Steuerberechnung oder persönliche Anlageempfehlung. Die App soll persönliche Werte vollständig auf diesem Gerät speichern und wiederherstellen können.

## 2. Zielgruppe und Benutzerfragen

Zwei Wege: Menschen vor Pensionierung (`pre`) und bereits Pensionierte (`post`). Vorwissen über Anlagen oder Steuern wird nicht vorausgesetzt. Zentrale Fragen:

- Welche monatlichen Einnahmen habe ich nach geschätzten Steuern?
- Wie viel meines Lebensbedarfs muss ich aus Vermögen ergänzen?
- Reicht das verfügbare Kapital bis zu meinem Zielalter, und was bleibt übrig?
- Woraus bestehen Einkommen und Vermögen?
- Wie wirkt sich vor Pensionierung meine Wahl zwischen PK-Rente und Kapital aus?
- Was bedeuten ungünstige Renditereihenfolgen oder Belastungsszenarien?

## 3. UX-Grundsätze

**V2 – geführter Ruhestandsplan:** Separater Finanz-Simulator unter `v2.html`; `index.html` bleibt vollständig erhalten. Der Benutzer erhält früh eine erste Einschätzung. Mit jeder bestätigten Datengruppe wird die Planung vollständiger und belastbarer. Finanzierungsstatus und Belastbarkeit werden getrennt dargestellt. Ruhige Gestaltung mit Weissraum, feinen Linien, klaren Kennzahlen und wenig Kartenoptik; keine Punkte, Trophäen oder Erfolgswahrscheinlichkeiten. Die nachstehenden älteren Oberflächenregeln beschreiben den erhaltenen V2-/Legacy-Stand. Für die eigenständige V3 gilt Kapitel 23.


Einfach beginnen, Zusammenhänge im Plan erklären und fachliche Vertiefung freiwillig öffnen. Der Hauptfluss erfasst persönliche und finanzielle Fakten. Keine Anlageprofilwahl und keine Zielalterfrage im Basischeck; neue Planungen verwenden zentrale Anlageannahmen und einen automatisch abgeleiteten Planungshorizont. Modellannahmen werden offengelegt und später unter «Lebensphasen & Annahmen» bearbeitet; eine erweiterte Profilwahl ist nicht Bestandteil des Produkts. Monatliche Beträge sind die primäre Sprache von Basischeck, Plan und Einkommenseditor; intern werden Jahresbeträge verwendet. Vorsorgebeiträge ausdrücklich pro Jahr erfassen.

Bestehende Farbwelt, Typografie, Karten und Visualisierungen erhalten. Mobile ohne horizontales Seitenscrollen. Jede Seite hat einen verständlichen Titel, jede Unterseite genau einen logisch übergeordneten Rückweg. Keine konkurrierende Wizard-Navigation. Eine klare primäre Aktion, soweit die Seite eine benötigt; Detailseiten brauchen keine künstliche Weiter-Aktion.

Beispielwerte sichtbar kennzeichnen. Kein Portrait in Ergebnisboxen; Patrick erscheint einmal im Header. Fehler bei Validierung oder Speicherung verständlich anzeigen.

## 4. Informationsarchitektur

**V2 – IMPLEMENTIERT:** Permanente Bottom Navigation «Dein Plan», «Vorsorge», «Annahmen», «Mehr» auf Arbeitsscreens; auf Start verborgen. Einkommen, Bedarf, Zeitpunkt und Vermögen gehören zu «Dein Plan», der Vorsorgeeditor zu «Vorsorge». Plan-Kennzahlen öffnen eigene Zusammensetzungsseiten für Einkommen (`income-detail`) und Vermögen (`assets-detail`). Restbedarf führt zur Mechanik (`asset-funding`), die auch über den CTA «So finanziert dein Vermögen deinen Ruhestand →» der Vermögensdetailseite erreichbar ist. Der aktive Bereich bleibt beim Öffnen eines Details markiert. Vor vollständigen Kerndaten sind Vorsorge und Annahmen deaktiviert; «Dein Plan» führt zur ersten offenen Kerngruppe. «Mehr» bietet Speichern, bestätigten Neustart, Modellhinweise und Hilfe. Die folgende Architektur beschreibt den erhaltenen Legacy-Stand; die V3-Architektur steht in Kapitel 23.

```text
START
└── DEINE ANGABEN
    └── DEIN PLAN
        ├── Kapital & 3-Töpfe-Modell
        │   └── Einkommen & Steuern [Info-Button]
        ├── PK – Rente oder Kapital [nur pre]
        ├── Szenarien & Risiken
        ├── Angaben ändern
        │   ├── Persönliche Situation
        │   ├── Einkommen & Bedarf
        │   ├── Vermögen
        │   ├── Vorsorge [nur pre]
        │   └── Lebensphasen & Annahmen
        ├── Auf diesem Gerät speichern
        ├── Beratung ansehen
        └── Neue Planung [Bestätigung vor Reset]
```

Die drei Hauptbereiche sind Start, Deine Angaben und Dein Plan. Es gibt keine Zwischenübersicht „Meine Planung verstehen“, keinen zweiten Eingang „Was kann sich verändern?“ und keine getrennte Hauptfunktion „Meine Angaben im Detail“.

## 5. Navigation und Benutzerfluss

**V2 – Navigationsvertrag:** `v2-ui.js` besitzt die Bereichsnavigation. Bei vollständiger Planung entfallen globale Übersicht-Rücklinks. Unbestätigte Editorentwürfe bleiben beim Bereichswechsel in der Sitzung erhalten, werden jedoch nicht gespeichert; Abbrechen verwirft den betreffenden Entwurf, Übernehmen verwirft nur den übernommenen und fachlich abhängige Entwürfe; unabhängige PK-/3a-Entwürfe bleiben erhalten. Die Vorsorgeübersicht (`vorsorge`) und der PK-Editor (`pension`) sind getrennte Routen und teilen keinen Editorentwurf. Die Rückkehr auf den Plan zeigt bestätigte Rechendaten. Wiedereinstieg stellt auch «Mehr» und die Vorsorgeübersicht wieder her. Die Zielposition wird nach dem Bereichswechsel gespeichert. Einkommens- und Vermögensdetail führen mit «← Dein Plan» zurück; der Einkommenseditor (`income`) und der Wohnkantoneditor (`tax`) führen bei Übernahme/Abbruch zur Einkommensdetailseite. Vermögenszeilen werden direkt darunter auf der Detailseite bearbeitet; kein separater Vermögenseditor. Alte gespeicherte `assets`-Positionen öffnen die Vermögensdetailseite. Mechanik führt mit «← Vermögen» zur Vermögenszusammensetzung. Auf allen diesen Seiten bleibt «Dein Plan» in der Bottom-Navigation aktiv. Der PK-/3a-Abbruch führt zur Vorsorgeübersicht. Detailseiten zeigen bestätigte Daten; Entwürfe werden nur im Editor als Vorschau verwendet.

**V2 – Benutzerfluss:** Situationswahl → Zeitpunkt (Alter und Pensionierungsalter gemeinsam; post nur heutiges Alter) → monatlicher Bedarf → monatliche Einnahmequellen (AHV und weitere regelmässige Einnahmen; Wohnkanton verpflichtend, keine PK-Rente) → frei verfügbares Gesamtvermögen. Ohne Wohnkanton lässt sich die Einnahmengruppe nicht übernehmen und keine neue Berechnung abschliessen; das Feld trägt den dezenten Hinweis «Für die Schätzung deiner Steuern.». Vier kurze Eingabegruppen mit Live-Plan, unbekannte Werte «noch offen», unfertiges Ergebnis neutral. Jede bestätigte Gruppe speichert Daten und nächste Position. Früh folgt die erste Reichweite; danach gezielt Vorsorge prüfen und vier Gruppenzugänge Einkommen, Vermögen, Vorsorge, Annahmen. Keine lange Angabenliste. Zeitpunkt und Bedarf bleiben am Plan änderbar. Gruppenentwürfe wirken als ungespeicherte Vorschau; Abbrechen stellt bestätigte Werte wieder dar. V2 hat einen eigenen Navigation Owner `v2-ui.js`; der folgende Routenvertrag bleibt ausschliesslich für den bestehenden Einstieg gültig.


`check-ui.js` ist alleiniger Navigation Owner. Eine explizite Routentabelle enthält Titel, Parent und optional den Rendering-Zielbereich einer erhaltenen Detailkomponente.

| Zustand | Bedeutung | Parent |
|---|---|---|
| situation | Start mit Situationswahl, aktuellem Plan und Laden | keiner |
| basic | Bestehender kompakter Basischeck „Deine Angaben“ | situation |
| plan | Zentrales Ergebnis „Dein Plan“ | keiner; Bearbeitung über Angaben ändern |
| capital / scenarios | Die gleichnamigen Detailbereiche | plan |
| income | Einkommen & Steuern, über Info-Button im Kapitalbereich | capital |
| pension | PK – Rente oder Kapital, nur pre | plan |
| advice | Beratung | plan |
| edit_overview | Angaben ändern | plan |
| edit_personal / edit_income / edit_assets / edit_pension | Eine Datengruppe bearbeiten | edit_overview |
| assumptions | Lebensphasen & Annahmen | edit_overview |

Die Kompatibilitätsnamen `answer` und `details` werden auf `plan` und `edit_overview` aufgelöst; sie erzeugen keine weiteren Seiten. `pension` und `edit_pension` sind im Post-Weg nicht zugänglich.

Start → Situation auswählen → Basischeck → „Meine erste Antwort ansehen“ → Dein Plan. Der Plan enthält seine drei Ergebniswerte, Status, direkte Links unter „Dein Plan im Detail“, Angaben ändern, Speichern und Beratung.

Kapital, PK und Szenarien → **← Dein Plan**. Einkommen & Steuern → **← Kapital & 3-Töpfe-Modell**. Angabenübersicht → **← Dein Plan**. Gruppen- und Annahmeneditor → **← Angaben ändern**. Nach **Änderungen übernehmen** wird gespeichert und die Angabenübersicht geöffnet; der nächste Planaufruf berechnet aktuelle Ergebnisse. Kein Wechsel zum nächsten alten Wizard-Schritt.

Eine neue logische Seite öffnet oben. Der Rückweg mit Titel bleibt beim Scrollen oben erreichbar. Navigation verändert keine gespeicherten Eingaben. Noch nicht übernommene Formularwerte bleiben beim Verlassen und Wiederöffnen desselben Editors innerhalb der Sitzung als Entwurf erhalten. Abhängige Entwürfe werden nach übernommenen Änderungen aktualisiert bzw. verworfen, damit sie keine alten gespeicherten Werte verdecken.

Im erhaltenen Legacy-Stand ist die Marke nicht klickbar; in V3 öffnet sie «Mein Plan» (Kapitel 23). **Neue Planung** fragt ausdrücklich nach, bevor aktuelle Arbeitswerte und der lokale Beratungsabschluss zurückgesetzt werden. Abbruch lässt die Planung stehen; der separat gespeicherte persönliche Stand bleibt auch beim bestätigten Reset erhalten.

Alte Tabs, Fortschrittsanzeige, Zurück/Weiter-Aktionen, „Neu berechnen“ und „Weitere Themen“ sind im neuen Ablauf nicht sichtbar. Legacy-Einstiegspunkte fordern eine Route beim Navigation Owner an; gespeicherte Werte werden nicht über Navigations-Seiteneffekte berechnet.

## 6. Eingabedaten

Alle Geldbeträge sind CHF, Alter ganze Jahre, Prozentwerte in Eingaben Prozentpunkte. Nichtnegative Bestände, Beiträge, Schulden und Einnahmen; persönlich eingegebene Gesamtschulden können den Immobilienwert übersteigen. Kein erzwungenes positives gebundenes Nettovermögen.

| Gruppe | Gemeinsame bzw. Post-Angaben | Zusätzliche Pre-Angaben |
|---|---|---|
| Persönliche Situation | Modus beim Einstieg, Alter heute, Wohnkanton | Pensionierungsalter |
| Einkommen & Bedarf | AHV, weitere Renten, weitere Einnahmen/Nettomiete, Lebensbedarf; post zusätzlich bestehende PK-Rente | PK-Rente wird aus PK-Aufteilung berechnet |
| Vermögen | Immobilienwert, Hypotheken; post vorhandenes freies Gesamtvermögen | Bankguthaben und Wertschriften separat |
| Vorsorge | Kein künftiger Aufbau im Post-Weg | PK-Guthaben, Säule 3a, PK-Beiträge Arbeitnehmer/Arbeitgeber, 3a-Beitrag, weitere Sparleistung; PK-Zins, 3a-/Wertschriftenrendite |
| Entscheidungen und Annahmen | Planungshorizont, hinterlegte Anlageannahme ohne Profilwahl, Inflation, Lebensphasen, Einnahmelaufzeiten, Immobilienaufteilung, drei Topfrenditen, Reparaturstress | PK-Kapitalanteil, Umwandlungssatz, Vergleichsrendite PK-Kapitalbezug |

Der Basischeck fasst AHV und Renten zusammen (pre ohne PK), weitere Einnahmen separat sowie Bank/Wertschriften zu einem Betrag. Bei Änderung eines Sammelbetrags bleiben bestehende Einzelanteile proportional erhalten; war der vorherige Gesamtwert null, wird der erste Einzelposten verwendet. Bestehende zeitlich begrenzte Einnahmen und Lebensphasen werden nicht gelöscht. Einzelbeträge werden anschliessend in den Gruppen bearbeitet.

Basischeck und persönlicher Editor validieren Alter 18–100 und Pensionierung pre 50–100. Der Wohnkanton ist für neue Eingaben verpflichtend: die Einnahmengruppe wird ohne gültigen Kanton nicht übernommen, eine neue Planung gilt ohne ihn nicht als vollständig und wird nicht berechnet; die Validierung lautet «Bitte wähle deinen Wohnsitzkanton.». Ein älterer gespeicherter Stand ohne Kanton bleibt ladbar und speicherbar, zeigt die Steuer jedoch ausdrücklich als offen; bis der Kanton ergänzt ist, gilt er als unvollständig und die Navigation lässt Vorsorge und Annahmen deaktiviert. Der Horizont wird ausschliesslich unter «Lebensphasen & Annahmen» bearbeitet: ganzzahlig, höchstens 110 und strikt nach Planungsstart. Pre-Pensionierung darf nicht vor dem aktuellen Alter liegen. Post startet heute; ein bislang späteres Pensionierungsalter wird beim Übernehmen auf das aktuelle Alter begrenzt.

Basischeck: Frage nach behaltenen Immobilien blendet Marktwert/Hypotheken ein; bei Nein werden beide auf null gesetzt. Ein dadurch ungültiger Renditeobjektanteil wird deaktiviert. Direkte Gruppeneditoren zeigen nur vorhandene modellierte Felder; sie führen keine neue Vermögenskategorie ein.

**V2 – Eingabeumfang:** Keine persönlichen Beispielbeträge. Alter 18–100, Pensionierung pre 50–100 und nicht vor heute; leere oder ungültige Beträge blockieren die Übernahme, null wird ausdrücklich erfasst. Einnahmen werden bereits im Einstieg getrennt nach AHV und weiteren regelmässigen Einnahmen (weitere Renten und weitere Einnahmen/Nettomiete) erfasst, monatlich vor persönlicher Steuer. Kein PK-Rentenfeld im frühen oder vertieften Einkommenseditor. Der Wohnkanton steht verpflichtend in derselben Gruppe; eine leere Auswahl ist kein Berechnungszustand mehr, der Feldhinweis lautet «Für die Schätzung deiner Steuern.». Diese Bestätigung bestätigt zugleich die Einkommensgruppe. PK-Rente entsteht ausschliesslich unter Vorsorge → Pensionskasse: pre automatisch aus Guthaben, Beiträgen, Bezugsaufteilung und Umwandlungssatz. Für bereits Pensionierte wird dort die tatsächlich laufende Rente erfasst; keine künftige Ansparung oder erneute Bezugsentscheidung. Heutiges verfügbares Gesamtvermögen wird ohne noch gebundene PK-/3a-Guthaben und Immobilien erfasst. Alte V2-Gesamteinnahmen bleiben bis zur expliziten Aufteilung wirksam; keine Quellen aus dem Gesamtbetrag erfinden. Ohne Vermögensstruktur bleibt dieses Kapital bis Ruhestandsstart unverändert; keine zusätzliche Vorsorge oder Ansparung erfinden.

Die Vertiefungen ersetzen bzw. ergänzen gezielt die groben Angaben:
- Einkommen: Wohnkanton, AHV, weitere Renten, weitere Einnahmen/Nettomiete; PK-Rente ausschliesslich lesend aus Vorsorge übernehmen. Quellen gelten ab Start ohne Indexierung. Die Quellen sind aus dem Einstieg vorausgefüllt; bei alten V2-Ständen ersetzt die explizite Aufteilung die bisherige grobe Summe.
- Vermögen: Bank und Wertschriften, pre zusätzliche jährliche Anlage. Optional weitere verfügbare Vermögenswerte sowie Immobilienwert und Hypotheken (beide gemeinsam oder beide offen). Bank, Wertschriften mit jährlicher Anlage, weitere Vermögenswerte sowie Immobilien netto öffnen jeweils einen Inline-Editor. Bei noch nicht aufgeteiltem Kapital werden erstmals erfasste Bestände dem Rest zugeordnet (Rest mindestens null); spätere Änderungen bekannter Bestände verändern die Summe um die Differenz. Der Rest bleibt sichtbar und direkt korrigierbar. Erst vollständig erfasste Bank/Wertschriften/Pre-Sparleistung ohne verbleibenden Rest bestätigen die Vermögensgruppe. Weitere verfügbare Vermögenswerte werden ohne zusätzliche Aufbauverzinsung wie liquide Mittel dem vorhandenen Cash-Eingang des Rechenkerns zugeordnet, separat angezeigt und einmal einbezogen. Immobilien gehen über die bestehenden re/mort-Felder ausschliesslich in gebundenes Kapital ein, auch bei negativem Netto. Leere optionale Felder bedeuten nicht erfasst, explizite null bedeutet kein Bestand. Alte Speicherstände erhalten keine erfundenen Einzelbeträge.
- Vorsorge pre: PK-Guthaben und jährliche Sparbeiträge Arbeitnehmer/Arbeitgeber zusammen, dazu eine prominente Rente/Kapital-Entscheidung mit interaktivem Slider. Der PK-Screen zeigt nur PK-Eingaben und live berechnete PK-Ergebnisse; eine separate `Auswirkung auf deinen Plan`-Ansicht entfällt. Säule 3a ist ein eigener Vorsorge-Screen mit Guthaben heute, jährlichem Beitrag und «Voraussichtlich zum Pensionierungszeitpunkt». Der Betrag stammt aus `calculateRetirementStart().p3`; die Hauptfläche zeigt keine Kaufkraft-Zusatzzeile. Die fehlende separate 3a-Bezugssteuer steht in der aufklappbaren Erklärung. Keine manuelle oder vorläufige Pre-PK-Rente. Die automatisch berechnete Rente wird unmittelbar in Einkommen und Plan übernommen. Keine Doppelzählungs-Eingabe oder entsprechende UI-Logik. Vorsorgekapital ergänzt ausschliesslich bisher frei verfügbares Kapital; PK-Bezugssteuer unverändert vor Topfaufteilung.
- Vorsorge post: unter Pensionskasse die tatsächlich laufende PK-Rente erfassen; bereits bezogenes Kapital gehört zum verfügbaren Vermögen; keine künftigen PK-/3a-Beiträge oder erneute Bezugsbesteuerung.
- Annahmen: Planungshorizont, Inflation und pre PK-Zins, Umwandlungssatz und 3a-Rendite gemeinsam prüfen. Bestehende Defaults, keine Risikowahl. Unverändertes Zielalter erhält den Automatikmodus; eine Änderung macht es manuell. Persönliche Daten nicht aus den Annahmen ableiten. **V3:** Eine separat einstellbare Wertschriftenrendite wird nicht mehr ausgewiesen; für den Aufbau vor der Pensionierung gilt ein hinterlegter interner Satz (Standard 4,5 %), der im ⓘ «So rechnen wir mit Renditen» offengelegt wird. Im Ruhestand rechnet die Simulation mit den Portfolio-Sätzen des Risikoprofils (Cash 0 %, Anleihen 1 %, Wertschöpfung 6 % real).

## 7. Berechnungsmodell

`retirement-calculator.js` ist der gemeinsame, DOM-unabhängige Planadapter und Rechenkern für Hochrechnung, PK-Entscheid, Kapitalbasis, Simulation, Profilvergleich und Ergebnisbewertung. Steuerrechnung in `tax-model.js`, Jahresrechnung in `retirement-engine.js`. Keine eigenständigen Nebenrechnungen für Chart, PK-Screen oder Ergebnisboxen.

Simulation beginnt pre am Pensionierungsalter, post am aktuellen Alter. Vor Pensionierung keine Inflation auf Lebensbedarf und keine zusätzliche Abzinsung des projizierten Startkapitals. Alle frei verfügbaren Beträge gehen am Start in die Kapitalbasis ein. In V3 ist das projizierte 3a-Guthaben bereits einmalig Teil des freien Startkapitals; spätere 3a-Zuflüsse gibt es nicht (Kapitel 10).

Die Ruhestandsrechnung verwendet konstante Kaufkraft des Startjahres. Pro Phase bleibt der reale Lebensbedarf konstant; das entspricht nominalem Wachstum mit Inflation. Eine zusätzliche Inflationierung desselben realen Bedarfs wäre Doppelzählung. Ruhestandsansichten nennen diesen Modellpreisstand „Kaufkraft zu Beginn deiner Pensionierung“, bei bereits Pensionierten „Kaufkraft zu Beginn deiner Planung“. „Wert bei Pensionierung“ bezeichnet die hochgerechneten Startwerte.

Ausgabenjahre laufen von Startalter inklusive bis Zielalter exklusive. Eine zusätzliche Terminalzeile zeigt Kapital am Zielalter ohne weitere Jahresausgabe. Rechenwerte bleiben ungerundet; CHF-Anzeigen werden gerundet.

## 8. Einkommen

**V2 – Zusammensetzung:** Ein Tap auf die Einkommenskennzahl öffnet «Deine Einkommen im Ruhestand». Zuerst stehen die Quellen: AHV, PK-Rente, weitere regelmässige Einnahmen (weitere Renten plus weitere Einnahmen/Nettomiete). Danach wird die Rechnung nachvollziehbar: «Renten gesamt · vor Steuern», «Weitere Einnahmen», «Einnahmen vor Steuern», «Geschätzte Steuern» mit Monatsbetrag und Jahresbetrag sowie «Einkommen netto», dazu der ausgeschriebene Wohnkanton und der verwendete Satz. So ist sichtbar, wie aus den Einnahmen vor Steuern das Netto entsteht. Die drei Quellen bleiben auch bei expliziter null sichtbar; unbekannte Alt-Aufteilungen werden als offen und mit einer separaten nicht aufgeteilten Gesamtsumme gezeigt. PK-Rente ausschliesslich aus Vorsorge; vor Erfassung offen, pre danach aus der Calculator-Rente. Keine manuelle PK-Erfassung im Einkommenseditor. `CheckV2State.breakdown` ordnet bestehende Engine-Quellen lediglich für die Anzeige zu. Brutto, Steuer und Netto stammen aus `evaluatePlan`; die Nettoanzeige verwendet exakt `monthlyIncomeNet` wie der Plan. Darunter öffnet das dezente ⓘ «So rechnen wir mit Steuern» die Rechendetails (Kapitel 11). Nur ein älterer gespeicherter Stand ohne Kanton zeigt «Steuern noch offen», Steuerbetrag nicht CHF 0; der gleiche vorläufige verfügbare Betrag wird ausdrücklich ohne Steuerabzug bezeichnet und «Wohnkanton ergänzen» öffnet einen Editor nur für den Kanton, auch bei alten unaufgeteilten Einnahmen. Fehlender Kanton verhindert «Gut abgestützt». «Einkommen bearbeiten» öffnet den separaten Quelleneditor. Keine neue Steuerformel.

Im Kapitalbereich zeigt eine kompakte Finanzierungsübersicht Bedarf → Einkommen netto → Aus Vermögen, jeweils mit «/ Jahr» und «/ Monat» und gemeinsamem Bezugsalter. Jahreswerte stammen unverändert aus der gewählten Engine-Zeile, Monatswerte sind diese Beträge geteilt durch zwölf; ohne Kanton wird Einkommen ausdrücklich vorläufig ohne Steuerabzug bezeichnet. Ein beschrifteter Info-Button öffnet die bestehende Einkommenssicht mit Quellen und Steuerdetails. Kein separater Einkommenseintrag in der Plannavigation.

Quellen: AHV, PK-Rente, weitere Renten und weitere Einnahmen. Die zusätzliche reguläre Einnahme kann als Nettomietertrag markiert werden. Bis zu drei zusätzliche benannte Einnahmen können mit Betrag, Beginn, Ende und Inflationsanpassung erfasst werden. Kein Ansatz sicherer laufender Kapitalerträge.

AHV ist ein eingegebener Jahresbetrag, keine Berechnung individueller AHV-Ansprüche. Pre-PK-Rente stammt aus Kapitel 10; Post-PK-Rente ist eingegeben. Hauptquellen werden auf den Ruhestandsstart bezogen und gelten standardmässig von Start bis Alter 111 exklusiv, ohne Indexierung. Individuelle Laufzeiten überschreiben dies. Zusatzeinnahmen ohne explizites Bezugsalter verwenden in der Engine das aktuelle Alter als Preisbezug.

Eine Quelle zählt nur, wenn `from ≤ age < until`. Ihr realer Jahreswert lautet:

```text
Betrag × (1 + (indexiert ? Inflation : 0))^(Alter − Bezugsalter)
       / (1 + Inflation)^(Alter − Bezugsalter)
```

Nominal feste Einnahmen verlieren damit Kaufkraft. Steuerbare Quellen bilden die Steuerbasis; eine explizit nichtsteuerbare Quelle wird von dieser ausgenommen. Brutto minus geschätzte Einkommenssteuer ergibt laufendes Netto.

„Einkommen & Steuern“ zeigt aktive Quellen im ersten Planungsjahr mit Jahres- und Monatsbetrag vor persönlicher Einkommenssteuer direkt vor der Steuerzusammenfassung. Nullwerte und noch nicht aktive bzw. beendete Quellen werden ausgeblendet. Quelle und Bruttosumme stammen aus derselben Jahresengine.

Die additive Nettoaufteilung zwischen AHV/Renten und weiteren Einnahmen verteilt die eine Gesamtsteuer proportional. Sie ist eine Darstellung, keine unabhängige Steuerberechnung je Quelle.

## 9. Vermögen und Kapital

**V2 – Zusammensetzung:** «Dein verfügbares Vermögen» zeigt Bank/liquide Mittel, Wertschriften, pre projizierte Säule 3a und PK-Kapital sowie weitere verfügbare Vermögenswerte. Projektionen aus `calculateRetirementStart`, PK-Netto und gebundenes Kapital aus `calculateAvailableCapital`; Gesamtanzeige exakt `evaluatePlan().availableCapital`. PK-Kapital nach geschätzter Bezugssteuer, ohne Kanton ausdrücklich brutto/vorläufig mit Steuer offen. 3a-Bezugssteuer bleibt unmodelliert und wird genannt. Post keine erneute 3a-/PK-Addition; bezogene Beträge sind in den vorhandenen Mitteln enthalten. Noch nicht aufgeteiltes freies Kapital bleibt separat als Gesamtsumme sichtbar; nicht als Bankguthaben ausgeben. Gebundenes Vermögen steht sekundär nach der verfügbaren Summe: Immobilien netto mit Hinweis «Dieses Vermögen ist aktuell nicht für laufende Entnahmen eingeplant.» Ohne erfasste Immobilienwerte «Noch nicht erfasst», nicht CHF 0. Die reine Zusammensetzungsseite enthält keine Töpfe; dafür ein eigener CTA zur Mechanik. Bank/liquide Mittel, Wertschriften, weitere verfügbare Vermögenswerte und Immobilien netto sind klickbare Zeilen mit aktuellem Wert bzw. «Noch nicht erfasst» und «Erfassen». Ein Tap öffnet die Eingabe direkt darunter; Übernehmen aktualisiert sofort die Totale aus dem gemeinsamen Rechenkern. Abbrechen erhält bestätigte Werte. Es gibt keinen Button «Vermögen bearbeiten» und keine zusätzliche Editierseite. Säule 3a und PK-Kapital sind mit «aus Vorsorge» gekennzeichnet und öffnen ihre Vorsorgeeingabe, PK mit «gemäss deiner PK-Entscheidung». Der Mechanik-CTA bleibt separat.

Verfügbares Kapital und laufende Finanzierung stehen visuell im Vordergrund. Gebundenes Immobilienkapital bleibt Bestandteil des Vermögens, erscheint aber kleiner, zurückhaltend und nach den Finanzierungselementen. Keine gleichwertige Kennzahl oder vierte Topfgrafik. Bei einer Gesamtkapitalangabe werden verfügbarer und gebundener Anteil getrennt; der verfügbare Betrag erhält Vorrang. Immobilienwert und Hypotheken bleiben unter «Angaben ändern → Vermögen» vollständig editierbar; gebundenes Kapital finanziert keine automatischen Entnahmen.

Die Kapitalbegriffe im UI sind verbindlich: **Verfügbares Kapital** bzw. **verfügbares Anlagekapital** umfasst nur die drei Finanzierungstöpfe, ohne gebundenes Immobilienkapital. **Verfügbares Restkapital** ist deren verbleibender Betrag am genannten Alter; Jahresdaten nennen **verfügbares Kapital am Jahresende**. **Gebundenes Immobilienkapital** ist Marktwert minus Hypotheken und bleibt separat. **Gesamtkapital inkl. Immobilien netto** darf ausschliesslich für die Summe aus verfügbarem und gebundenem Kapital verwendet werden. Unqualifizierte Labels wie „Gesamt“, „Endkapital“ oder „Freies Gesamtkapital“ vermeiden. PK-Bezugsbeträge ausdrücklich als PK-Kapital brutto/netto kennzeichnen.

Pre werden PK, 3a und Wertschriften bis Pensionierung mit ihren individuellen Beiträgen/Renditen hochgerechnet. Bankguthaben, Immobilienwert und Hypothek bleiben in dieser Hochrechnung unverändert.

```text
existingFreeCapital = projizierte 3a + projizierte Wertschriften + Bankguthaben
netPkCapitalWithdrawal = bezogener PK-Anteil − geschätzte PK-Kapitalbezugssteuer
totalInvestableCapital = existingFreeCapital + netPkCapitalWithdrawal
boundCapital = Immobilienmarktwert − Hypotheken
```

Post ist das bereits vorhandene freie Gesamtvermögen die Anlagebasis; keine erneute PK-Addition und keine erneute Bezugssteuer. Rentenanteile der PK gehören nicht zum Anlagekapital.

Immobilien bleiben gebunden, finanzieren ohne modellierten Verkauf keine Entnahmen und werden nicht aufgrund des Anlageprofils verändert. Optional wird ein Renditeobjekt innerhalb der Gesamtwerte separat ausgewiesen; der Rest gehört zum Eigenheim. Wert und Schuld des Renditeobjekts dürfen die erfassten Gesamtwerte nicht übersteigen.

Nettomiete nach Objektkosten, Hypothekarzinsen und Unterhaltsreserve ist laufendes Einkommen; persönliche Einkommenssteuer folgt separat. Kein automatischer Verkauf, keine Wertsteigerung oder zusätzliche automatische Amortisation im bestehenden Modell.

## 10. Vorsorge / PK / Säule 3a

Pre-Hochrechnung über `max(0, Pensionierungsalter − aktuelles Alter)` Jahre, je Jahr:

```text
neuer Bestand = bisheriger Bestand × (1 + Jahresrendite / 100) + Jahresbeitrag
```

PK-Jahresbeitrag = Arbeitnehmer + Arbeitgeber. Säule 3a verwendet den 3a-Beitrag, Wertschriften die zusätzliche Sparleistung. Beiträge werden in dieser Modellhochrechnung am Jahresende hinzugefügt.

PK-Kapital brutto = projiziertes PK-Guthaben × Kapitalanteil / 100. PK-Rentenbasis = Restguthaben. Jährliche PK-Rente = Rentenbasis × Umwandlungssatz / 100. Nur auf den gewählten Kapitalbezug fällt die geschätzte einmalige Bezugssteuer an, vor Aufteilung auf die Töpfe.

In V2 kann der Anteil 0–100 % im PK-Detail verändert werden. V3 bearbeitet ihn ausschliesslich im Plan als Vorschau mit ausdrücklicher Übernahme (Kapitel 23). Aktuelle Netto-Kapitalbasis, Rente, Steuer, Kapital-/Rentenvergleich und Finanzierbarkeit aktualisieren sich mit demselben Modell. Die Erfolgsaussage bezieht sich stets auf die gewählte Aufteilung. Eine Hintergrundprüfung anderer Aufteilungen ist keine automatische Empfehlung.

**V3 – IMPLEMENTIERT, Säule 3a im Startkapital (Datenmodell; im UI heisst der Block «Weiteres Kapital»):** Sämtliche 3a-Guthaben gelten bei Beginn der Ruhestandssimulation als bereits bezogen. Das heutige Gesamtguthaben wird mit den erfassten Beiträgen und der bestehenden Aufbauannahme bis Pensionierung hochgerechnet (`calculateRetirementStart().p3`). Dieser Betrag geht genau einmal in `existingFreeCapital` ein. Keine Kontenverwaltung, keine Bezugsjahre, keine Staffelung, kein 3a-Topf im Ruhestand und keine späteren Kapitalzuflüsse.

**Keine 3a-Bezugssteuer wird modelliert.** Der 3a-Wert ist deshalb kein steuerbereinigter Nettobetrag; V3 erklärt diese Grenze im 3a-Editor und auf der Vermögensseite. Die reale Staffelungsmöglichkeit kann im Hinweis stehen, ist kein Eingabe- oder Berechnungsteil. Nur der PK-Kapitalbezug unterliegt der geschätzten Bezugssteuer.

Die V3-Migration führt bestehende gültige Kontenguthaben zu einem heutigen Guthaben zusammen; die Kontensumme ist bei alten Kontenplänen massgeblich. Originalangaben bleiben unter `legacyP3` inaktiv erhalten. Sie werden nie zusätzlich gerechnet. V3 entfernt `p3Mode` und `p3Accounts` aus dem aktiven Vorsorgebestand, damit der vorhandene Rechenkern seinen konsolidierten Startkapitalweg verwendet. Die frühere Bezugsplanungsfunktion im gemeinsamen Rechner bleibt nur aus Kompatibilitätsgründen erhalten; V3 ruft sie nicht auf. Die geänderte Modellannahme wird beim Laden erklärt; die Annahmenbestätigung entfällt bis zur erneuten Prüfung.

Post bleibt das eingegebene freie Vermögen konsolidierter Istbestand. Selbst erhaltene alte 3a-Angaben werden nicht zusätzlich addiert, aufgebaut oder besteuert. V2 und historische Dateien werden nicht geändert.

## 11. Steuern

**IMPLEMENTIERT:** Vereinfachte kantonale Modellkonfiguration `2026.1`, kein individueller Steuertarif. Die vollständigen Parameter stehen in der Tabelle unten und in `tax-config.js`.

Laufende Einkommenssteuer: Jahressteuerbasis bis CHF 80’000 → erster Satz; über CHF 80’000 bis 130’000 → zweiter; darüber → dritter. Der ausgewählte Satz gilt für den gesamten steuerbaren Betrag, nicht als marginaler Stufentarif. Im Jahresmodell zunächst reale Steuerbasis in nominalen Jahresbetrag umrechnen, Steuer berechnen und wieder auf den realen Preisstand zurückführen.

Kapitalbezugssteuer: Steuersatz zwischen den Referenzbeträgen CHF 50’000 / 100’000 / 250’000 / 500’000 / 1’000’000 linear interpolieren. Unterhalb bzw. oberhalb gilt der jeweilige äussere Satz; bei null Bezug ist der Satz null. Betrag mal Satz / 100 ergibt die Steuer. Keine Kapitalbezugssteuer auf bestehendes Privatvermögen.

**IMPLEMENTIERT – V3-Bezugssteuer:** Nur der tatsächlich bezogene PK-Kapitalanteil wird besteuert, einmalig vor der Topfaufteilung. 3a ist bereits im freien Startkapital enthalten und erhält keine modellierte Bezugssteuer. Freies Privatvermögen und private Entnahmen werden nicht mit dieser Steuer belastet. Die historische gemeinsame PK-/3a-Ereignislogik bleibt technisch für kompatible Altmodelle erhalten, ist kein V3-Produktverhalten.

| Kanton | Einkommen: drei Sätze in % | PK-Bezug: fünf Referenzsätze in % |
|---|---|---|
| AG – Aargau | 11,5 / 14,5 / 17,5 | 3,12 / 4,85 / 7,09 / 8,22 / 8,77 |
| AI – Appenzell Innerrhoden | 9,5 / 11,5 / 14 | 2,38 / 3,31 / 4,6 / 5,14 / 5,34 |
| AR – Appenzell Ausserrhoden | 13,5 / 16,5 / 19 | 7,56 / 7,94 / 8,96 / 9,91 / 11,14 |
| BE – Bern | 15 / 18 / 21 | 3,5 / 4,63 / 6,53 / 8,26 / 9,62 |
| BL – Basel-Landschaft | 14,5 / 18,5 / 22,5 | 3,46 / 3,84 / 4,86 / 6,72 / 9,56 |
| BS – Basel-Stadt | 13,5 / 16,5 / 19,5 | 3,66 / 5,29 / 8,26 / 9,45 / 9,97 |
| FR – Freiburg | 15 / 18 / 21,5 | 1,96 / 3,24 / 6,96 / 9,3 / 10,4 |
| GE – Genf | 14 / 18 / 21,5 | 2,53 / 4,13 / 6,22 / 7,41 / 8,11 |
| GL – Glarus | 12 / 14 / 16,5 | 4,79 / 5,17 / 6,19 / 6,73 / 6,93 |
| GR – Graubünden | 11,5 / 14,5 / 17,5 | 2,91 / 3,28 / 4,31 / 5,76 / 5,96 |
| JU – Jura | 14 / 17,5 / 21 | 5,39 / 6,17 / 8,56 / 9,64 / 10,11 |
| LU – Luzern | 11,5 / 14 / 16 | 2,27 / 3,76 / 5,45 / 6,22 / 6,53 |
| NE – Neuenburg | 17 / 20 / 23,5 | 4,89 / 5,68 / 7,83 / 8,46 / 8,75 |
| NW – Nidwalden | 10,5 / 13 / 15 | 2,67 / 3,64 / 5,01 / 5,55 / 5,74 |
| OW – Obwalden | 11 / 12,5 / 14,5 | 5,28 / 5,66 / 6,68 / 7,22 / 7,42 |
| SG – St. Gallen | 14 / 17,5 / 20,5 | 5,51 / 5,88 / 6,91 / 7,45 / 7,65 |
| SH – Schaffhausen | 10,5 / 13,5 / 16,5 | 1,98 / 3,18 / 4,83 / 5,37 / 5,57 |
| SO – Solothurn | 15 / 18 / 21 | 3,48 / 4,97 / 6,97 / 7,64 / 7,84 |
| SZ – Schwyz | 8 / 10 / 12 | 1,14 / 2,15 / 5,26 / 7,77 / 9,55 |
| TG – Thurgau | 12,5 / 15 / 17,5 | 6,23 / 6,61 / 7,63 / 8,17 / 8,37 |
| TI – Tessin | 12 / 15,5 / 19 | 4,02 / 4,4 / 5,42 / 7,1 / 8,09 |
| UR – Uri | 11 / 13 / 15 | 3,87 / 4,24 / 5,27 / 5,81 / 6 |
| VD – Waadt | 15 / 18 / 21,5 | 3,34 / 4,59 / 6,95 / 8,39 / 9,06 |
| VS – Wallis | 12 / 16 / 20 | 4,36 / 4,74 / 6,13 / 8,78 / 10,3 |
| ZG – Zug | 4,5 / 7 / 9 | 1,77 / 2,81 / 4,6 / 5,76 / 6,28 |
| ZH – Zürich | 10,5 / 13,5 / 17 | 4,5 / 4,88 / 5,9 / 7,16 / 11,16 |

Steuertexte nennen verwendetes Einkommen bzw. PK-Bezugsbetrag, Satz, Steuerbetrag und ausgeschriebenen Kanton. Einkommen brutto → geschätzte laufende Steuern → Netto verfügbar; PK brutto → einmalige Bezugssteuer → Netto zur Anlage getrennt ausweisen.

Ohne gültigen Kanton liefern Steuermethoden null; vorläufig wird kein Steuerabzug gerechnet. Keine grüne Finanzierbarkeit behaupten. Vermögenssteuer und eine separate Zins-/Dividendenbesteuerung fehlen; PK-Kapital wird mit dem vereinfachten kantonalen Modell geschätzt; die 3a-Bezugssteuer wird nicht modelliert. Privatentnahmen und private Kursgewinne werden nicht als laufende Steuerbasis angesetzt.

**IMPLEMENTIERT – Steuer-Rechendetails und Begrifflichkeit:** Die Steuerwerte sind vereinfachte Planungsannahmen des kantonalen Modells, kein individueller Steuerrechner. Die Oberfläche spricht von «Geschätzte Steuern», «Steuerannahme» und «Kantonale Steuerannahme»; sie behauptet keine Berechnung gemäss ESTV und keine Scheingenauigkeit. Das Modul `tax-detail.js` leitet aus dem kanonischen Plan und `evaluatePlan` ausschliesslich Anzeigewerte ab (keine eigene Steuerarithmetik): einmalig bei Pensionierung PK-Kapital brutto → geschätzte Kapitalbezugssteuer → PK-Kapital netto → + bereits vorhandenes freies Kapital → verfügbares Startkapital; jährlich im Ruhestand AHV, PK-Rente, weitere steuerbare Einnahmen, steuerbare Einnahmen, verwendete Steuerannahme (Kanton, Satz) und geschätzte Einkommenssteuer pro Jahr, verfügbares Einkommen pro Jahr und pro Monat. Damit ist ausdrücklich sichtbar, dass PK-Kapital netto nicht das gesamte verfügbare Startkapital ist und wann welche Steuer anfällt. Am Ende stehen der Hinweis «Planungsannahme» (Schätzwerte; Gemeinde, Zivilstand, Konfession, individuelle Abzüge und weitere steuerbare Einkünfte werden nicht vollständig berücksichtigt) und – nur bei tatsächlich vorhandenem 3a-Kapital – «Säule-3a-Bezugssteuer ist in dieser Planung derzeit noch nicht separat berücksichtigt.» Der Code-Pfad der 3a-Lücke ist `calculateAvailableCapital`: das projizierte 3a-Guthaben geht vollständig in `existingFreeCapital` ein, es wird keine 3a-Bezugssteuer abgezogen. Eine eigene 3a-Steuerlogik (Bezugsjahr, Staffelung, mehrere Konten, gemeinsame Berechnung mit dem PK-Bezug) ist bewusst nicht implementiert; die Bezugsplanung im Rechner (`p3Plan`/`p3Accounts`) bleibt für spätere Bezugszeitpunkte architektonisch offen und wird von V2 nicht genutzt.

Die Werte stammen für jede Ansicht aus derselben Quelle: `evaluatePlan().incomeGross`, `.incomeTax`, `.incomeNet`, `.yearlyProjection[0].taxableAnnualIncome` sowie `calculatePension` und `calculateAvailableCapital`. Der verwendete Prozentsatz und der Kantonsname kommen aus `TaxModel`. Die Steuerbasis ist das laufende Einkommen; Kapitalentnahmen aus freiem Vermögen erhöhen sie nicht.

**ZU VERIFIZIEREN:** Fachliche Herleitung und künftige Pflege der gelieferten Kantonssätze sowie die Eignung des vereinfachten Gesamtbetragstarifs. Ohne eigenen fachlichen Auftrag keine Anpassung.

## 12. Anlage und Risikoprofile

Zentrale Profilparameter in `risk-profiles.js`:

| Schlüssel | Anzeige | Reale Zielrendite Wachstum | Schwankungsfaktor |
|---|---|---|---|
| cautious | Vorsichtig | 2,5 % | 0,45 |
| balanced | Ausgewogen | 4,5 % | 0,70 |
| growth | Chancenorientiert | 6,0 % | 1,00 |

Profile bestimmen Rendite und Schwankung des langfristigen Wachstumstopfs, keine feste Aktienquote. Die Quote des Wachstumstopfs ergibt sich nach Reservierung in Topf 1/2. Höhere Renditechancen bedeuten grössere Verlustrisiken; auch Vorsichtig kann Verluste ausweisen. Höheres Risiko garantiert in keinem Szenario höheres Endkapital.

Im normalen Benutzerfluss gibt es keine Auswahl des Anlagerisikos: weder Basischeck, Plan, Kapitaldetail, PK-Detail, Szenarien noch Annahmen zeigen Profilbuttons oder Profilvergleichskarten. Die technischen Profile bleiben für kompatible Speicherstände, Regressionen und spätere Erweiterungen erhalten. Eine künftige Profilwahl gehört in erweiterte Annahmen und ist nicht implementiert.

Neue Planungen unter `index.html` verwenden `RiskProfiles.defaultProfile = balanced`: reale Topfrenditen 0 / 1 / 4,5 %, Schwankungsfaktor 0,70 und PK-Vergleichsrendite 4,5 %. Alle Ansichten verwenden denselben Rechenkern und dieselben hinterlegten Anlageannahmen. Bestehende gespeicherte Profile, individuelle Renditen und Schwankungsfaktoren bleiben unverändert; sie werden als gespeicherte Anlageannahmen kenntlich gemacht. Alter Schlüssel `bold` wird als `growth` gelesen. Keine Zwangsmigration persönlicher Werte.

**V2 – IMPLEMENTIERT:** Neue V2-Planungen verwenden explizit das zentrale Profil `cautious` (Wachstum 2,5 % real, Faktor 0,45; Geldmarkt 0 %, Anleihen 1 %). Keine Benutzerwahl. Das V2-Profil wird gespeichert. Bestehende Version-1-Stände ohne Profil erhalten `balanced`, damit ihre Jahresverläufe unverändert bleiben. Aufbauannahmen für PK/3a/Wertschriften bleiben separat und unverändert. Dies ersetzt für V2 die bisherige Balanced-Standardregel.

## 13. Kapitalentwicklung und Simulation

Alle Jahreswerte stammen aus der Engine. Jahresfolge:

1. Bedarf der aktiven Phase, aktive Einnahmen, Steuer und allfällige Sonderausgabe bestimmen.
2. Entnahmebedarf = max(0, Bedarf + Sonderausgabe − laufendes Netto).
3. Verfügbares Kapital jährlich nach den Zielreserven auf die drei Töpfe verteilen.
4. Laufende Entnahme am Jahresbeginn; höchstens vorhandenes Kapital entnehmen.
5. Positiver Einnahmenüberschuss geht in Topf 1. Die verbleibenden Topfbeträge inklusive Überschuss erhalten ihre jeweiligen realen Jahresrenditen.
6. Endbestände auf mindestens null begrenzen, Endkapital speichern, im Folgejahr erneut prüfen.

Ungedeckte Lücke = max(0, Entnahmebedarf − verfügbares Anfangskapital). Ein Kapitalstand von exakt null am Zielalter ist zulässig; frühere ungedeckte Ausgaben bleiben eine Finanzierungslücke. Für Bewertung/Lückenalter wird die vorhandene Toleranz von CHF 0,01 verwendet.

Jahresdaten enthalten Alter, freies und gebundenes Anfangskapital, Gesamtkapital, Bedarf, Brutto-/Nettoeinkommen, Steuer, Sonderausgabe, Entnahme, Finanzierungslücke, Anfangs-/Endbestände je Topf, Veränderung der Zielbestände, Renditebetrag und Endkapital. Das Diagramm darf diese Werte nicht selbst neu berechnen.

## 14. 3-Töpfe-Modell

**V2 – IMPLEMENTIERT:** «So finanziert dein Vermögen deinen Ruhestand» ist eine eigene Mechanikseite unter der Vermögensdetailseite und direkt vom Restbedarf auf dem Plan erreichbar. Sie zeigt verfügbares Kapital und zusätzlichen Jahresbedarf am Ruhestandsstart. Die Beträge und Reihenfolge Wachstum → Reserve → kurzfristig verfügbar → laufende Entnahmen stammen ausschliesslich aus `evaluatePlan().bucketAllocation`, `annualGap` und `monthlyGap`. Orientierung: 1 × laufender Jahresbedarf, ungefähr 2 × für spätere Reserve, Rest Wachstum; tatsächlich gelten die folgenden zwei Entnahmejahre der Engine. Keine eigene Topfberechnung. Immobilien netto erscheinen nur in der Vermögenszusammensetzung, nicht als Finanzierungstopf.

Reihenfolge: Bedarf → Einkommen netto → Aus Vermögen → verfügbares Anlagekapital → 3-Töpfe-Aufteilung → Simulation anpassen → gebundenes Kapital als Nebeninformation. Desktop zeigt die Simulation daneben. Standardansicht: verfügbares Anlagekapital als primärer Kapitalbetrag, Zeitpunkt (Start heute/bei Pensionierung bzw. Jahresbeginn der gewählten Phase und Alter) und die drei Töpfe mit Namen und Beträgen. Gebundenes Immobilienkapital folgt als kompakte Nebenzeile unter den Finanzierungselementen, ohne eigene grosse Karte, Goldtopf oder umfangreichen Dauertext. Definition über Info-Icon: Immobilienwert minus Hypotheken, nicht für laufende Entnahmen eingeplant; keine modellierten Verkäufe, Teilverkäufe oder zusätzliche Belehnung.

Info-Icons bei Anlagekapital und jedem Topf öffnen einen zugeordneten Hilfebereich im Seitenfluss. Anlagekapital erklärt Zusammensetzung inklusive gewähltem PK-Nettobezug, Ausschluss von Immobilienkapital, tatsächlichen Zeitpunkt und Kaufkraft des Planungsstarts; Vorschauwerte werden kenntlich gemacht. Topfhilfen erklären kurzfristigen Bedarf, mittelfristige Reserve und langfristiges Wachstum samt Risiken. Methodik (Reserven, jährliche Auffüllung und mögliche Verkäufe nach Verlusten) steht hinter «So funktionieren die Töpfe». Keine doppelte Kapitalkennzahl oder permanente Methodik-/Zielkarte. Fehlbeträge und der Hinweis auf fehlenden Kanton bleiben sichtbar.

Geldfluss **Topf 3 Wachstum → Topf 2 Anleihen → Topf 1 Geldmarkt → Lebensbedarf**. Die Darstellung folgt dieser Reihenfolge: Topf 3 → Topf 2 → Topf 1, anschliessend laufende Kosten. Die Topfkarten stehen in Flussrichtung hintereinander; Pfeile verbinden benachbarte Töpfe. Auch die Topfübersicht in den Szenarien verwendet 3 → 2 → 1. Topf 2 wird grundsätzlich aus Topf 3 aufgefüllt, Topf 1 aus Topf 2. Jährliche bedarfsgerechte Prüfung und Zielauffüllung.

Topf 1 reserviert die aktuelle Jahresentnahme. Topf 2 reserviert die Summe der folgenden zwei Jahresentnahmen. Nur verbleibendes Kapital geht in Topf 3. Bei knappen Mitteln hat Topf 1 Vorrang, danach Topf 2. Die Summe der drei Anfangstöpfe entspricht dem gesamten verfügbaren Anlagekapital.

Auch nach Kursverlusten erfolgt die bestehende Zielauffüllung; dadurch können Verkäufe im Wachstumstopf notwendig sein. Keine implementierte Verlust-Verkaufsvermeidung behaupten. Die Jahresengine gleicht Zielbestände rechnerisch aus; ihre Transferwerte sind Bestandsdifferenzen, kein separates Orderbuch einzelner Überweisungen.

Das Modell ist eine freiwillige Kapitalvertiefung, kein zusätzlicher Pflichtschritt im Basischeck. Keine Risikowahl; Topf 1 erklärt den kurzfristigen Bedarf, Topf 2 die mittelfristige Reserve, Topf 3 das langfristige Wachstum mit den hinterlegten Anlageannahmen. Gesamtes Anlagekapital, laufende Finanzierung, Reserven und verbleibender Wachstumstopf müssen verständlich zusammenpassen. Gebundenes Immobilienkapital bleibt separat. Vorschauwerte ändern keine gespeicherten Topfannahmen.

## 15. Lebensphasen / Planungshorizont

Drei Bedarfsphasen mit individuellem Jahresbedarf: erste ab Planungsstart, zweite standardmässig ab 73, dritte ab 83. Die dritte Phase muss nach der zweiten beginnen. Massgebend ist die letzte zum aktuellen Alter begonnene Phase.

Neue Planungen leiten das Zielalter automatisch aus der statistischen Restlebenserwartung im **heutigen Alter** ab. Die bestätigte altersabhängige Referenz ersetzt ausdrücklich den ursprünglich vorgesehenen festen Schweizer Standardwert und die bisherige manuelle Zielalterfrage im Hauptfluss. Kein neues Geschlechtsfeld und keine persönliche Sterbewahrscheinlichkeit.

**IMPLEMENTIERT:** Zentrale Referenz `life-expectancy.js`, Kennung `bfs-period-2023`: [BFS-Periodensterbetafeln 2023 für die Schweiz](https://www.bfs.admin.ch/asset/de/px-x-0102020300_102), Bezugsjahr 2023, Beobachtungseinheit `ex`, Alter 18–100, abgerufen am 12. September 2026. Es handelt sich um Werte des Schweizer Mortalitätsmodells (Publikation 2023), nicht um die jährliche Sterbetafel 2024. Die vollständige Tabelle deckt auch Alter 100 ab. Quelle und Einzelwerte je Geschlecht stehen zentral im Modul; keine Live-Abfrage und kein automatisches Datenupdate.

Ohne Geschlechtserfassung wird der arithmetische Mittelwert der verbleibenden Jahre für Frauen und Männer verwendet. Diese Gleichgewichtung ist eine transparente Produktannahme, kein vom BFS publizierter bevölkerungsgewichteter Gesamtdurchschnitt. Zielalter = aufgerundet(heutiges Alter + mittlere Restlebenserwartung). Beispiele: Alter 56 → 86, 65 → 87, 80 → 90, 100 → 102. Falls eine sehr späte Pensionierung den statistischen Zielwert erreicht oder überschreitet, gilt mindestens Planungsstart + 1; diese technische Mindestspanne wird ausdrücklich erklärt. Planungsstart bleibt pre bei Pensionierung und post heute.

Änderungen an Alter/Situation aktualisieren automatische Horizonte bei Übernahme der persönlichen Angaben. Ein gespeichertes Zielalter wird beim Laden unverändert übernommen. Alte Pläne ohne Automatikkennzeichnung behalten ihren bisherigen Horizont. Eine Änderung des Horizonts unter «Lebensphasen & Annahmen» wechselt auf manuell; weitere Altersänderungen überschreiben ihn nicht. Unverändertes Übernehmen des Annahmenformulars erhält die Automatik. Manuelle/alte Horizonte vor einem neuen Planungsstart müssen zuerst in den Annahmen verlängert werden. Das Langzeitszenario verlängert den verwendeten Horizont weiterhin um fünf Jahre.

**ZU VERIFIZIEREN:** Aktualisierungsrhythmus der BFS-Referenz und langfristige Eignung der gleichgewichteten Periodenreferenz. Keine individuelle Lebensdauerprognose, keine Kohortenfortschreibung oder Gesundheitsdaten.

Basischeck und Einkommenseditor übernehmen eine Änderung des Anfangsbedarfs in Phase 2/3 nur, wenn deren Werte noch genau dem bisherigen Anfangsbedarf entsprechen; individuell abweichende spätere Bedarfe bleiben erhalten.

Laufzeiten sind ab Alter inklusive, bis Alter exklusiv; Ende muss nach Beginn liegen. Zusatzeinnahmen mit positivem Betrag benötigen Name und gültige Laufzeit. Leere Nullzeilen zählen nicht. In „Lebensphasen & Annahmen“ sind Phasen, Laufzeiten, zusätzliche Einnahmen, Immobilienaufteilung und Modellannahmen gemeinsam erreichbar.

## 16. Ergebnisdarstellung

**V2 – Planbedienung (IMPLEMENTIERT):** Die Finanzierungskette lautet Bedarf → Einkommen (netto bzw. Steuern offen) → Restbedarf aus Vermögen → verfügbares Vermögen → Reichweite. Auf dem Hauptscreen nur Monatsbeträge und der verfügbare Kapitalbetrag; Jahreswerte stehen in den Details. Der Einkommenstitel lautet mit Kanton «Einkommen netto», ergänzt um «nach geschätzten Steuern»; nur ein älterer gespeicherter Stand ohne Kanton zeigt ausdrücklich «Steuern noch offen» (neue Planungen verlangen den Kanton bereits im Einstieg). Die vier Kennzahlen sind als ganze Zeilen direkt bedienbar: Bedarf, Einkommen, Restbedarf und verfügbares Vermögen. Einkommen und Vermögen werden nicht zusätzlich unter «Plan genauer machen» wiederholt; Vorsorge und Annahmen sind über die sticky Bottom-Navigation erreichbar. Die Finanzierung erscheint als statische Timeline ohne Regler, der Stress-Test klein und sekundär. Die Datengrundlage wird kompakt und visuell getrennt von der Finanzierung dargestellt; aufgeklappt mit einzeln bestätigtem Zeitpunkt, Bedarf, Einkommen, Vermögen, PK, 3a und Annahmen sowie dem Wohnkanton. Bei fehlendem Kanton kein Erfolgs-Häkchen in der Finanzierungslinie. Deren gefülltes Segment endet proportional beim ersten Lückenalter. Der Zeitpunkt bleibt direkt am Plan editierbar. Verwaltungsfunktionen liegen unter «Annahmen» bzw. «Mehr».

**V2 – Ergebnis und Datenstand:** Monatlicher Bedarf − laufende Einnahmen = Ergänzung aus Vermögen; Jahreswerte in den Details, Entnahme bei Einkommensüberschuss weiterhin mindestens null gemäss Engine. Dazu verfügbares Anlagekapital und eine eigene Finanzierungslinie vom Ruhestandsstart bis zum Ziel. Die Linie endet beim ersten ungedeckten Jahr oder am berechneten Planungshorizont; niemals zusätzliche finanzierte Jahre ausserhalb dieses Horizonts behaupten. Lücke: finanziert bis zum Lückenalter, Zielalter und fehlende Jahre nennen. Bei Deckung und vorhandenem Kanton positive erste Antwort, unter den aktuellen Annahmen. Ohne Kanton neutral/vorläufig ohne Steuerabzug; noch keine bestätigte positive Finanzierbarkeitsaussage. Fehlende Vorsorge sichtbar erklären und ihre Prüfung als nächsten Schritt anbieten. Die bestehende Ampel/Schwachjahresbewertung bleibt erhalten, einschliesslich Erklärung bei empfindlicher Finanzierung.

**V2 – Belastbarkeit:** Drei qualitative Datenstufen, getrennt von der Finanzierung: «Erste Einschätzung», «Gute Basis», «Gut abgestützt». **IMPLEMENTIERT:** Gute Basis benötigt bestätigte Kerngruppen plus Einkommen, Vermögen und Vorsorge; Gut abgestützt zusätzlich übernommene Annahmen und vorhandenen Wohnkanton. «Übernehmen» bestätigt die Annahmen ohne zusätzliche Checkbox. Ein offenes Formular oder blosse Vorschau erhöht die Stufe nicht. Änderungen an anderen Gruppen entwerten die Annahmenbestätigung, geänderte Zeitpunkte zusätzlich die Bestätigungen von Einkommen/Vermögen/Vorsorge; erfasste Daten bleiben erhalten. Unverändert erneute Bestätigung ist möglich. Die Stufen sind UX-Status, keine statistische Sicherheit.

Nach Übernahme der Vorsorge zeigt V2 den tatsächlichen Vorher-/Nachher-Effekt (Reichweite, verfügbares Kapital), auch wenn er neutral oder ungünstig ausfällt. Beide Ergebnisse stammen aus demselben Calculator und Horizont. Keine Vorannahme einer Verbesserung. `LifeExpectancy.defaultTargetAge`, Inflation und Steuer-/Kapitalberechnung bleiben fachlich unverändert. Die V2-Standardanlage und Bestandserhaltung folgen Kapitel 12.


Gebundenes Kapital ist keine Hauptkennzahl von «Dein Plan». Ergänzende Vermögensangaben stehen nach den zentralen Finanzierungswerten und werden visuell zurückgestuft. Kapital-/Entnahmegrafiken und Topfdarstellungen umfassen weiterhin ausschliesslich verfügbares Anlagekapital; gebundene Beträge bleiben getrennt.

„Dein Plan“ ergänzt bei laufenden Einnahmen und Kapitalentnahme die zugehörigen Jahresbeträge aus dem gemeinsamen Ergebnisobjekt unter den primären Monatswerten.

„Dein Plan“ zeigt drei Aussagen: laufende monatliche Nettoeinnahmen, monatliche Ergänzung aus Vermögen und verfügbares Restkapital am Zielalter bzw. erstes Lückenalter. Dazu Planungsspanne und sichtbare Modellkennzeichnung. Der Plan nennt das verwendete Zielalter und weist bei automatischem Horizont auf die Schweizer Restlebenserwartung hin; manuelle/alte Horizonte werden als gespeichert bezeichnet. Beide Hinweise nennen «Lebensphasen & Annahmen» als Änderungsort. Der Plan zeigt «Planung bis Alter …» sowie einen kurzen Hinweis auf die altersabhängige Schweizer Referenz und die Anpassung unter Annahmen; manuelle/alte Horizonte werden als gespeicherter Planungshorizont bezeichnet.

**IMPLEMENTIERT – V3-Finanzierungsaussage erst mit genügenden Daten:** Eine qualitative Prognose («Finanzierungslücke voraussichtlich ab Alter X» bzw. «Unter den gewählten Annahmen bis Alter Y finanzierbar») erscheint nur, wenn die dafür nötigen Finanzdaten erfasst sind: verfügbares Vermögen (freies Vermögen oder mindestens eine erfasste Quelle wie Bank, Wertschriften oder weitere Vermögenswerte) und Vorsorge (PK-Guthaben bzw. laufende PK-Rente). Fehlt eines davon, zeigt der Plan stattdessen den kurzen neutralen Status «Vervollständige deinen Plan, um die langfristige Entwicklung zu sehen.» in derselben Zeile. Fehlende Angaben werden für diese Entscheidung ausdrücklich nicht als CHF 0 interpretiert; ein blosses Teildatensatz-Objekt (z. B. nur ein Immobilienwert) gilt nicht als erfasstes Vermögen. Die Aussage steht sowohl im vollständigen Plan (kompakte Zeile) als auch im unvollständigen Plan an derselben Stelle; die Berechnung selbst bleibt unverändert (Kapitel 7/13).

Statusregel der gewählten Planung: ohne Kanton neutral/vorläufig; sonst rot bei Lücke in Basisrechnung, gold wenn nur „Fünf schwache Jahre“ eine Lücke zeigt, grün wenn beide gedeckt sind. Gold erklären, keine Erfolgswahrscheinlichkeit erfinden.

Positive Kernaussage: Unter den gewählten Annahmen ist der gewünschte Lebensstandard bis zum Zielalter finanzierbar. «Verfügbares Restkapital» ergänzen: alle drei Töpfe, ohne gebundenes Immobilienkapital. PK und Plan zeigen denselben Betrag, gerundet auf CHF; keine zusätzliche Rundung auf CHF 500. Bei Lücke Alter nennen und keine grüne Erfolgsaussage zeigen. Abschlussformulierung „Deine erste Planung steht“.

„Szenarien & Risiken“ enthält die Grafik des verfügbaren Kapitals und bestehende Belastungsszenarien/Jahresdetails. Grafiküberschrift „Wie kann sich dein verfügbares Kapital entwickeln?“, Untertitel mit durchschnittlicher bzw. gespeicherter Anlageannahme und realer Zielrendite. Legenden „Basisrechnung“, „Ungünstige Reihenfolge“ und „Günstige Reihenfolge“. Die Basislinie entspricht dem Ergebnis unter „Dein Plan“. Datenpunktkarten zeigen Start, ungefähr ein Drittel und zwei Drittel des Horizonts sowie Zielalter, jeweils aus denselben Jahresreihen. Bei kurzen Horizonten doppelte Zeitpunkte weglassen.

Die Grafik zeigt verfügbares Kapital aller drei Töpfe bis zum verwendeten Zielalter. Gebundenes Immobilienkapital bleibt ausgeschlossen. Die ersten zehn Jahre sind lediglich die Länge des Renditemusters, kein separater Betrachtungshorizont. Keine Profilvergleichskarten und keine zusätzlichen Profilrechnungen für die Achsenskalierung. Eine gemeinsame Y-Skala umfasst Basisrechnung und beide Renditereihenfolgen des aktuellen Plans.

Keine redundanten Opt./Pess.-Präfixe vor farblich zugeordneten Kartenbeträgen; zugängliche Beschriftungen behalten. Nullachse „0“, auf Mobile weniger Diagrammlabels und vollständige Werte in Karten.

## 17. Szenarien und Risiken

Basis: konstante gewählte reale Topfrenditen. Historische Varianten verwenden dasselbe Schwankungsmuster, transformiert mit der zentralen durchschnittlichen Anlageannahme (bei bestehenden Plänen mit den erhaltenen Anlageannahmen), in günstiger bzw. ungünstiger Reihenfolge. Keine Monte-Carlo-Simulation implementiert.

Das vorhandene Muster basiert auf MSCI-World-Bruttorenditen in CHF und Schweizer Inflation:

| Jahr | Nominale Rendite % | Inflation % |
|---|---|---|
| 2016 | 9,81 | −0,4 |
| 2017 | 18,00 | 0,5 |
| 2018 | −7,14 | 0,9 |
| 2019 | 26,13 | 0,4 |
| 2020 | 6,34 | −0,7 |
| 2021 | 26,11 | 0,6 |
| 2022 | −16,46 | 2,8 |
| 2023 | 13,18 | 2,1 |
| 2024 | 28,34 | 1,1 |
| 2025 | 6,30 | 0,2 |

Reale Dezimalrendite = (1 + Nominalrendite/100) / (1 + Inflation/100) − 1.
Profiltransformation je historischem Wert r:

```text
exp(log(1 + reale Zielrendite)
    + Schwankungsfaktor × (log(1 + r) − Mittelwert aller historischen Logrenditen)) − 1
```

Vollständige Reihe zuerst transformieren, dann aufsteigend (ungünstig) bzw. absteigend (günstig) sortieren. Beide enthalten exakt dieselben Werte. Geometrische Serienrendite entspricht der Zielrendite innerhalb 0,05 Prozentpunkten. Die Engine erhält Prozentpunkte. Nach Ende der zehn Werte gilt die Basisrendite bis Zielalter.

Weitere deterministische Belastungen:

- Crash: im ersten Jahr Wachstumsschock `exp(Faktor × log(1 − 0,30)) − 1`.
- Fünf schwache Jahre: erstes Wachstumsjahr entsprechend mit −15 % Rohschock; weitere vier Jahre 0 %. Anleihen erstes Jahr −8 %, weitere vier Jahre 0 %.
- Immobilie: im ersten Jahr markierte Nettomiete und deren steuerbarer Anteil entfallen, zusätzlich eingestellte Reparaturausgabe.
- Kombiniert: Crash und Immobilienereignis im ersten Jahr.
- Längeres Leben: Zielalter plus fünf Jahre.

Erläuterungen zeigen tatsächlich verwendete profilspezifische Verluste. Steuern, Entnahmen und Kapitalbasis bleiben über die Szenarien konsistent. Historisches Muster ist keine Vorhersage oder versprochene Bandbreite.

## 18. Annahmen

Unter «Lebensphasen & Annahmen» werden Kapitalanlage, tatsächlich verwendete langfristige reale Wachstumsrendite und der veränderbare Planungshorizont erklärt. Keine Profilwahl. Neue Planungen unter `index.html` verwenden die zentrale durchschnittliche Anlageannahme und reale Topfrenditen 0 / 1 / 4,5 % (Geldmarkt/Anleihen/Wachstum); V2 verwendet 0 / 1 / 2,5 % gemäss Kapitel 12. Vorhandene individuelle Werte bleiben beim Laden erhalten.

**IMPLEMENTIERT – vorausgefüllte Modell-/Beispielwerte:** Alter 56, Pensionierung 65, Zielalter automatisch gemäss Kapitel 15; Lebensbedarf CHF 90’000/Jahr; Inflation 0,6 %; PK-Zins 4,33 %; 3a-/Wertschriftenrendite 4,5 %; PK-Vergleichsrendite 4,5 %; Umwandlungssatz 5,2 %; PK-Bezug 50 %.

Pre-Beispiele: PK 550’000, 3a 120’000, Wertschriften 180’000, Bank 50’000, Immobilie 800’000, Hypothek 500’000; PK-Beiträge je 11’000 Arbeitnehmer/Arbeitgeber, 3a 7’000, übriges Sparen 10’000 jährlich; AHV 28’200, weitere Einkommen null. Post-Beispiele: AHV 28’200, PK-Rente 26’000 jährlich, übrige Einkommen null, frei 650’000, Immobilie 800’000 und Hypothek 500’000. Keine automatische Kantonsannahme.

Lebensphasen 73/83 mit zunächst gleichem Bedarf; keine zusätzlichen Einnahmen, keine markierte Nettomiete; Reparaturstress CHF 30’000. Diese Werte sind Beispiele bzw. wählbare Annahmen, keine persönlichen Fakten.

Reale Ruhestandsrenditen gelten nach Inflation und Anlagekosten; Zinsen/Dividenden nicht nochmals als Einnahmen addieren. Aufbauannahmen werden in der vorhandenen Hochrechnung direkt angewandt, ohne zusätzliche Inflationsbereinigung.

**ZU VERIFIZIEREN:** Fachliche Angemessenheit der langfristigen Inflations-, Aufbau- und Renditeannahmen, insbesondere die Verwendung einer kurzfristigen Prognose als langfristige Annahme. Dokumentieren, nicht im Navigationsauftrag verändern.

## 19. Datenzustand und State Management

**V3 – IMPLEMENTIERT:** `v3-state.js` besitzt Varianten, V3-Migration und Speicherprüfung. Der vorhandene reine Eingabeadapter wird unverändert wiederverwendet; es wird keine V2-Oberfläche geladen oder geöffnet. V3-Navigation liegt ausschliesslich in `v3-ui.js`. Schema 2 und vollständiger Positions-/Datenvertrag stehen in Kapitel 23.


**V2 separat:** `retirement-v2-plan`, Hülle `{version:1, savedAt, state, theme, quality}`. `state` enthält Modus, bestätigte Kernwerte, Detailgruppen, Bestätigungen, aktuelle Position, `riskProfile` und Horizont samt Automatikstatus. Vorsorgeübersicht, Mehr, Einkommens-/Vermögensdetail, Mechanik und Wohnkantoneditor sind eigene gespeicherte Positionen. Der aktuelle Wohnkanton liegt für neue Änderungen zentral in `state.canton`; Altstände lesen ihn weiterhin aus `details.income.canton`. Für neue Planungen ist er verpflichtend (`error(..., {requireCanton:true})`, `complete(state)` verlangt ihn); `validate` bleibt tolerant, damit ein älterer Stand ohne Kanton geladen und gespeichert werden kann. Beide Eingabewege aktualisieren denselben kanonischen Kanton; ein Kantonswechsel entwertet die Annahmenbestätigung. Optionale weitere Vermögenswerte und Immobilienangaben liegen in `details.assets` und werden ohne erfundene Defaults geladen. Teilweise aufgeteiltes Vermögen trägt `partial: true` und einen expliziten `unallocated`-Rest. Inline-Entwürfe bleiben nur in der Sitzung, Übernehmen speichert bestätigte Einzelwerte. Post-PK-Renten aus alten Einkommensgruppen migrieren unverändert nach `details.pension.pkRent`; alte Pre-PK-Eingaben werden unter `archivedPkRent` erhalten und nicht mehr berechnet. Dadurch geänderte Pre-Planungen verlieren ihre Annahmenbestätigung. Ein fehlender PK-Bestand bleibt sichtbar offen. Alte Version-1-Stände ohne Profil behalten Balanced; Gesamteinnahmen bleiben bis zur expliziten Quellenaufteilung unverändert. Speichern nach Weiter/Übernehmen, ausserdem bestätigten Zustand mit aktueller Position beim Gruppenöffnen; keine Tastatureingaben speichern. Zielalter wird geladen, nicht beim Wiedereinstieg neu abgeleitet. Qualität wird aus validierten Bestätigungen abgeleitet. V2 folgt ausschliesslich dem Systemfarbschema über `prefers-color-scheme`, auch bei laufenden Änderungen. Keine manuelle Theme-Auswahl; alte `retirement-v2-theme`-Werte werden ignoriert. Neue Speicherhüllen verwenden `theme: system`. Start bietet bei vorhandenem Stand «Weiterplanen» und «Neue Planung», letztere nur nach Bestätigung. Logo, Zurück und Theme löschen keine Daten. Ungültige/zukünftige Speicherstände bleiben unangetastet und werden sichtbar gemeldet; erst ein bestätigter Neustart entfernt den V2-Stand. Schreibfehler in einem sichtbaren Alert oberhalb der Bottom Navigation anzeigen, auch wenn der Footer verborgen ist; aktuelle Werte in der geöffneten Seite erhalten. Keine Legacy-Schlüssel lesen, überschreiben oder löschen.

Kanonischer Plan, verbunden mit dem bestehenden Arbeitsstate durch `fromState`/`toState`:

| Modellbereich | Wesentliche Inhalte |
|---|---|
| person | mode, currentAge, canton |
| retirement | age, targetAge |
| assets | pre: pk, p3, sec, cash, re, mort; post: free, re, mort |
| income | pre: ahv, other, rent; post: ahv, pkRent, other, otherIncome |
| spending | annualNeed |
| pensionDecision | capitalShare |
| assumptions | rates: pkInterest, p3Return, secReturn (V3 nicht mehr editierbar, nur interner Aufbausatz), capitalReturn, inflation, uws; contributions: pkContrib, pkEmployee, pkEmployer, p3Contrib, otherSave; legacy risk |
| riskProfile | cautious / balanced / growth |
| scenarios | version, phase2/3, need2/3, returns[3], volatilityFactor, timing, extras, rental, repair, propertySplit/value/debt |
| metadata | Erhaltene weitere Zustandsdaten, insbesondere exampleValues, horizonMode (automatic/manual/saved), horizonReference |

Navigationszustand und Formularentwürfe sind davon getrennt. Öffnen/Schliessen eines Details setzt weder Modell noch Profil zurück. Editorübernahme schreibt nur die bearbeitete Gruppe, behält andere Modellteile und speichert den Arbeitsstand. Unverändert übernommene monatliche Einzelfelder erhalten den exakten gespeicherten Jahresbetrag.

Automatischer Arbeitsstand: `retirementMvp5`. Persönlicher Snapshot separat: `retirement-personal-snapshot-v1`, Hülle `{version:4, savedAt, plan}`. Unterstützte Altschemas 1/2 mit `state`, 3 mit `plan`; Migration erhält Werte und individuelle Renditen. Schema 4 enthält kanonisches Profil und Schwankungsfaktor. Horizontmodus und Referenzkennung werden kompatibel über metadata gespeichert. Fehlende alte Horizontkennzeichnung wird als saved behandelt, niemals vom neuen Automatikdefault übernommen. Laden verändert weder Zielalter noch Jahresergebnisse.

Vor Laden validieren, bestehende Arbeitswerte nach Bestätigung ersetzen, vorherigen Stand unter `retirement-before-personal-load` sichern. Persönliche Daten nicht als Beispiel markieren. Beschädigte oder unbekannte zukünftige Versionen nicht überschreiben. Speicherfehler sichtbar melden. Identisch wiederhergestellte Modelle müssen identische Jahresergebnisse erzeugen.

Speicherbestätigung: „✓ Dein Stand wurde auf diesem Gerät gespeichert.“ Datum/Uhrzeit sichtbar. Speicherung gilt nur für diesen Browser auf diesem Gerät; keine Cloud-Synchronisation.

Der vorhandene Beratungsbereich ist eine lokale Testeingabe: Thema, optionaler Name/Telefon, E-Mail; kein Versand und keine Kontaktaufnahme. Der Abschluss wird lokal mit Zeitstempel gespeichert und setzt den vorhandenen Bearbeitungsschutz. Die vorhandene Testaktion versucht zusätzlich, einen vorbereiteten Nachrichtentext in die Zwischenablage zu kopieren; sie versendet ihn nicht. Laden eines persönlichen Stands bzw. bestätigte neue Planung hebt diesen Abschlusszustand auf. Die Navigation bleibt verfügbar.

## 20. Technische Architektur

Statische Browseranwendung ohne Framework-Migration. V2 ist ein unabhängiger Einstieg über `v2.html` mit `v2-ui.js` / `v2-ui.css`, dem reinen Eingabeadapter `v2-state.js` und `v2-theme.js`. V2 lädt dieselben Berechnungsbibliotheken, aber keine bisherigen UI-/Speicherskripte. Bestätigte V2-Gruppen liegen getrennt unter `retirement-v2-plan`, das Farbschema folgt ausschliesslich dem Betriebssystem; der frühere Schlüssel `retirement-v2-theme` wird ignoriert. Persönliche Legacy-Schlüssel bleiben unberührt. Der V2-Adapter enthält Eingabevalidierung, Gruppenzustand und Speicherung, keine zweite Finanzengine. Gezielt prüfen: `tests/v2-inline.cy.js` für direkte Bearbeitung, Teilaufteilungen, Abbrechen, Validierung und Vorsorgequellen; `tests/v2-details.cy.js` für Zusammensetzung, gleiche Plansummen, Kanton, gebundene Immobilien und Detailnavigation; `tests/v2-check.cy.js` für Live-Werte, Gruppeneffekte, Datenstatus, Speicherung/Wiedereinstieg, beide Wege, Mobile/Desktop und Themes; `v2-state.test.js` für Summenersatz ohne Doppelzählung, Engine-Gleichheit, Horizont und Speicherfehler; `tests/new-check.cy.js` für den erhaltenen bisherigen Ablauf. `index.html` ist der unveränderte Einstieg und leitet auf `v2.html` weiter. V3 wird direkt über `v3.html` geöffnet; keine Umschaltung im Rahmen dieser Umsetzung. `index_save.html` ist die unveränderte Nutzersicherung, kein zweiter produktiver Einstieg.

| Verantwortung | Komponenten |
|---|---|
| Navigation, Basischeck, Plan, Gruppeneditoren | check-ui.js / check-ui.css |
| Reiner Planadapter, Projektion und Bewertung | retirement-calculator.js |
| Jahresrechnung, Entnahmen, Töpfe | retirement-engine.js |
| Steuermodell und Parameter | tax-model.js / tax-config.js |
| Steuer-/Einkommensdarstellung | tax-view.js |
| Steuer-Rechendetails (reine Anzeige aus dem gemeinsamen Rechner) | tax-detail.js |
| Kantonswahl mit lokalem Wappen | canton-picker.js / canton-picker.css |
| Altersabhängige Schweizer Horizontreferenz und Ableitung | life-expectancy.js |
| Risikoparameter, Reihenfolge, historische Ausgangsdaten | risk-profiles.js / historical-returns.js |
| Erhaltene Detailintegration, Phasenformular, Chart, Jahres-/Stressdetails | retirement-planning.js / retirement-planning.css |
| Kapital-/Topfvisualisierung | financing-view.js |
| Finanzierbarkeitsprüfung / PK-Darstellung | retirement-feasibility.js / feasibility-view.js |
| Speicherung und Migration | planning-storage.js / personal-save.js |
| Erhaltene Text-, Zugänglichkeits- und Verdichtungsanpassungen | product-ui.js / compact-ui.js / compact-ui.css |

Berechnungsbibliotheken werden vor den Browseradaptern geladen, `check-ui.js` zuletzt. Erhaltene Views rendern vorhandene Komponenten; der Navigation Owner entscheidet Screen/Tab und Rückweg. `savePlanning` und `saveAss` übernehmen Werte ohne eigene Weiterleitung; die neue Oberfläche steuert nach erfolgreicher Übernahme die Zielseite.

Keine parallelen Rechenmodelle, keine Framework-Neuarchitektur und keine grossflächige Legacy-Löschung. Persönliche Dateien und Screenshots nicht ungefragt versionieren.

Gezielte Qualitätssicherung: `tests/navigation.cy.js` für Hauptwege, Rückwege, Übernahme, Datenbestand und Reset; `tests/new-check.cy.js` für Basischeck/Layouts; Profil- und Speicherprüfungen in den vorhandenen Browserchecks. Bei Berechnungsänderung passende Node-Regressionen, insbesondere `retirement-calculator.test.js` für vollständige Gleichheit mit den Fachadaptern. Beide Modi und Mobile/Desktop berücksichtigen.

## 21. UI-Komponenten und Darstellungsregeln

**V2 – Darstellung:** Mobile First, kurze Fragegruppe mit kompaktem Live-Plan ohne wiederholte Datenstufen in jedem Editor; am Desktop nebeneinander. Alter/Pensionierung zusammen, PK-Guthaben und Beiträge zusammen, danach ein prominenter Rente/Kapital-Slider; Säule 3a als eigener Vorsorge-Screen. Unfertige Ergebnisse neutral. Datenstatus als drei dezente Kreise mit feiner Linie, Finanzierung als separate Zeitlinie mit Start und Ziel. Monatliche Kennzahlen auf dem Plan, Aufschlüsselungen und Jahreswerte nur in den Details. Zusammensetzungsseiten verwenden ruhige Betragszeilen, bei Vermögen direkt aufklappbare Editoren mit Tastaturbedienung und `aria-expanded`, eine hervorgehobene verfügbare Summe und sekundäres gebundenes Vermögen. Ausschliesslich Systemfarbschema ohne manuelle Auswahl; alte Hell-/Dunkel-Präferenzen werden ignoriert; Anthrazit im Dark Mode, keine grellen Controls oder Fokusflächen. Farben ausschliesslich über die zentralen Tokens `background`, `surface`, `text-primary`, `text-secondary`, `border`, `accent`, `success`, `warning`, `danger`. Nur subtile Zahlen-/Linienübergänge, reduzierte Bewegung respektieren. Keine Änderung an der bisherigen Oberfläche.


Fachliche Zusatzinformationen, Definitionen und methodische Hinweise liegen, soweit für das unmittelbare Verständnis nicht erforderlich, hinter Info-Icons, Aufklappern oder «So rechnen wir». Beträge, Status, Zeitpunkt und wichtigste Hebel haben Vorrang. Im Kapitalbereich sind Hilfen standardmässig geschlossen; höchstens eine neue Info-Erklärung ist gleichzeitig offen. Beschriftete Buttons funktionieren mit Klick, Touch und Tastatur, melden ihren Zustand mit `aria-expanded` und verweisen auf den Hilfebereich. Erneuter Klick, «Hinweis schliessen» oder Escape schliesst ihn. Hilfen erscheinen im Seitenfluss, ohne Hauptnavigation zu überlagern. Gebundenes Kapital bleibt eine kleine ergänzende Zeile unterhalb der Finanzierungselemente.

Die Steuer-Rechendetails folgen demselben Prinzip: Die Plan- und Einkommensansicht bleibt kompakt und zeigt nur Einnahmen vor Steuern, geschätzte Steuern und Netto; das dezente ⓘ «So rechnen wir mit Steuern» öffnet die Aufschlüsselung als Standard-`<details>` direkt unter der Steuerzeile – ohne neue Route, ohne überbreite Tabelle und vertikal lesbar auf Mobile. Der Kantonsdialog bleibt erforderlich, aber unaufdringlich: ein Feldhinweis, die Zusatzinformationen erst im Detail.

Mobile Kapitalansicht: kompakte gemeinsame Finanzierungsübersicht, reduzierte Kartenabstände und Polster, niedrigere Töpfe mit direkt zugeordneten Info-Icons und dezenten Pfeilen. Einheiten einheitlich «/ Jahr» und «/ Monat». «Gebundenes Kapital» steht klein mit Info-Icon nach der Simulation; die Erklärung bezeichnet Immobilienwert abzüglich Hypotheken. Desktop behält eine grosszügigere Darstellung.

Legacy-Header mit statischer Marke und einem Portrait; V3 verwendet den verlinkten Kopf ohne Portrait aus Kapitel 23. Basischeck mit klar gegliederten Feldern, sichtbaren Einheiten, Beispielhinweis und aufklappbarem „So rechnen wir“. Plan mit drei Ergebniswerten, Ampel/Erklärung und direkter Detailnavigation.

Angabenübersicht mit vier Gruppen vor bzw. drei nach Pensionierung: aktuelle Zusammenfassung und eindeutig benanntem „Ändern“-Button je Gruppe. Editor: Rückweg, Gruppentitel, vorhandene Felder und **Änderungen übernehmen**. Lebensphasen und Annahmen verwenden eine gemeinsame Übernahmeaktion.

Details: einheitliche Titel und **← Dein Plan** (Einkommen & Steuern: **← Kapital & 3-Töpfe-Modell**), darunter vorhandene fachliche Darstellung und passende Interaktionen wie PK-Regler oder Horizontfeld. Keine gleichzeitigen alten Haupttabs, Wizard-Fortschritte oder Weiter/Zurück-Zeilen.

Jedes Feld hat sichtbaren Kontext/Label und zugänglichen Namen. Interaktive Elemente per Tastatur bedienbar, Eingaben haben zugängliche Beschriftungen. Rückwege bleiben beim Scrollen sichtbar. Schweizer Tausendertrennzeichen und Dezimalkomma für Prozentwerte. „Ändern“, keine Umschrift „Aendern“.

Diagrammwerte und Karten müssen lesbar bleiben, Tabellen auf Mobile umbrechen; kein horizontales Seitenscrollen. Wichtige Erklärungen mindestens 13 px, normale Texte etwa 15–16 px. Kompakter Kantons-Picker mit Textname, Kürzel und lokalem Wappen; Tastatur und Touch bleiben bedienbar. Keine rein dekorativen Zwischenansichten.

**IMPLEMENTIERT – V3-Verdichtung, Eingaben und Speicherstatus:** V3 zeigt so viel relevante Information wie möglich im mobilen Viewport, ohne die Schrift zu verkleinern: reduzierte Top-/Bottom-Abstände (Seitenkopf, Detailkarten, Aktionszeilen, Rückweg), kompakte Karten, zusammengehörige Angaben inline und sekundäre Erklärungen hinter dem ⓘ. Pflichtfelder werden ausschliesslich mit einem kleinen `*` neben dem Label gekennzeichnet (`<span class="v3-required">*</span>`, Wohnkanton ist in V3 optional); der ausgeschriebene Hinweis «Pflichtangabe» existiert nicht mehr. Alle CHF-Beträge erscheinen mit Schweizer Tausendertrennzeichen (`CHF 194'500`), auch in den Eingabefeldern: Betragsfelder sind Textfelder mit `inputmode="decimal"` und `data-amount`, werden beim Tippen am Feldende und beim Verlassen des Feldes gruppiert und beim Lesen ohne Trennzeichen numerisch interpretiert; interne Werte, Validierung und Berechnung bleiben numerisch und unverändert. Prozent- und Altersfelder bleiben unverändert. Optionale Betragsfelder (weitere verfügbare Vermögenswerte, Immobilienwert, Hypotheken) dürfen leer bleiben, verlangen nie eine explizite 0 und werden nicht mit 0 vorbelegt; ein leeres optionales Feld gilt weiterhin als «Noch nicht erfasst», eine ausdrückliche 0 als erfasster Wert. Die Anzeige von Beträgen ausserhalb der Eingabefelder bleibt unverändert (`CHF` mit Tausendertrennzeichen, gerundet). Die Info-Icons stehen mit rund 5 px Abstand zum Text, sind einheitlich klein (14 px), dezent im bestehenden Grün und vertikal zum Text ausgerichtet; die zweite Ebene (`v3-info-sub`) bleibt rein symbolisch und behält eine ausreichend grosse Trefferfläche, ohne die Zeilenhöhe zu vergrössern.

**IMPLEMENTIERT – V3-Speicherstatus:** Der technische Hinweis «V3 wird separat gespeichert.» ist entfernt. Stattdessen zeigt jede Seite mit Speichermöglichkeit eine kompakte Zeile: «✓ Automatisch gespeichert | 18. Sept. 2026, 14:37» mit dem Zeitpunkt des letzten erfolgreichen Speicherns und dem Knopf «Jetzt speichern». Übernommene Änderungen speichern automatisch (kurz gebündelt); «Jetzt speichern» schreibt sofort und aktualisiert den Zeitstempel. Während offener, noch nicht geschriebener Änderungen lautet der Status «Änderungen noch nicht gespeichert», vor dem ersten Speichern «Noch nicht gespeichert», bei nicht verfügbarem Speicher «Speichern nicht möglich.». Technische Begriffe wie localStorage oder separater Speicher erscheinen nicht in der Oberfläche.

## 22. Offene Punkte / noch nicht spezifizierte Bereiche

- **V2 später:** Komplexe/historische Szenarien, interaktive Hebelvergleiche, Lebensphasen/Laufzeiten, Immobilienverkäufe/-szenarien und Beratung bleiben ausserhalb des aktuellen Umfangs. Keine Risikowahl, kein neues Steuermodell, kein Monte Carlo, keine Legacy-Bereinigung. Übernahme bestehender Legacy-Pläne ist nicht implementiert.


- Fachliche Verifikation und Aktualisierungsprozess der gelieferten Steuerparameter sowie langfristigen Modellannahmen aus Kapitel 11/18 stehen aus. Der vorhandene Rechenstand gilt bis zu einem ausdrücklichen fachlichen Änderungsauftrag.
- Individuelle AHV-Ansprüche, Haushalts-/Gemeinde-/Zivilstandstarife, Vermögenssteuer und eine separate Dividenden-/Zinssteuer sind nicht modelliert; eine 3a-Bezugssteuer ist in V3 nicht modelliert. Keine entsprechenden Ergebnisse suggerieren.
- Kein Immobilienverkauf, keine dynamische Verlust-Verkaufsvermeidung, keine Sterbewahrscheinlichkeiten und kein Monte Carlo. Eine Erweiterung benötigt eine eigene fachliche Spezifikation und Regressionen.
- Historische Daten sind als vorhandenes festes Muster dokumentiert; eine automatische jährliche Datenpflege ist nicht spezifiziert.
- Beratung bleibt lokaler Testablauf. Echter Versand, produktiver Kontaktprozess, Cloud-Konten und geräteübergreifende Speicherung sind nicht spezifiziert.
- Formularentwürfe gelten innerhalb der laufenden Sitzung; gespeicherter persönlicher Stand umfasst übernommene Modellwerte, nicht unfertige Eingaben oder Scrollpositionen.

Für den hier beschriebenen Navigationsumbau bestehen nach erfolgreicher Prüfung keine zusätzlichen fachlichen Entscheidungen. Spätere Änderungen sind in diese Kapitel zu integrieren und mit dem ergänzenden Regelkatalog konsistent zu halten.

## 23. V3 – eigenständiger Ruhestands-Check

- **IMPLEMENTIERT:** V3 liegt separat unter `v3.html`, mit eigener Navigation und eigenen Informationsseiten. V2 ist veraltet und bleibt unverändert; `index.html` verweist vorerst weiterhin auf V2. Keine V3-Aktion öffnet eine V2-Seite oder schreibt V2-Browserdaten. Der gemeinsame Rechenkern bleibt die einzige Quelle für sämtliche Projektionen.
- Einstieg «Meine Renten → Mein Bedarf → Mein Plan»: Vor-/Nach-Pensionierung, Zeitpunkt, AHV und optionaler Wohnkanton, danach Monatsbedarf. Die PK-Rente vor Pensionierung wird ausschliesslich aus PK-Grunddaten berechnet; solange diese fehlen, steht das ausdrücklich im Plan. Keine erfundene PK-Rente und keine Übernahme illustrativer Bildwerte. Nach dem Einstieg ist «Mein Plan» eine Statusseite ohne dauerhaften Wizard.
- Kopf mit Blattmarke «Ruhestands-Check», sichtbarem Seitentitel und Hamburger-Menü. Logo und Menüeintrag «Mein Plan» führen zum Plan. Danach: Persönliche Angaben, AHV-Renten, Pensionskasse, Weitere Einnahmen, Bedarf, Vermögen, Annahmen. Alle Informationen und Editoren liegen in V3. Erfasste Vermögen werden als Status gezeigt; offene Angaben als nächste Schritte. PK bleibt ein eigener prominenter Entscheidungsbereich.
- **PK-Varianten:** 0–100 % Kapital, ganze Prozentpunkte, Regler plus genaue Zahleneingabe. 1–99 % sind Mischformen. Änderungen sind Vorschauen und verändern weder aktuellen Plan noch dessen gespeicherte Quote. «Variante speichern» speichert eine Quote, «Variante übernehmen» aktiviert sie und speichert sie gegebenenfalls zusätzlich. Höchstens drei unterschiedliche Quoten; genau eine ist der aktuelle Plan. Bei voller Liste muss zuerst eine inaktive Variante entfernt werden. Abbruch, Rückkehr oder Reload verwerfen die Vorschau. Gemeinsame Daten existieren einmal; ihre Übernahme berechnet sämtliche Varianten neu.
- **«Mein Plan» – Aufbau (IMPLEMENTIERT):** Zeitangabe oben rechts, Seitentitel und kurze Handlungszeile («Passe den PK-Bezug an und sieh die Auswirkungen.»). Danach die Karte «PK-Bezug wählen»: Beschriftung «Kapitalanteil», Zahleneingabe mit Prozentzeichen und die Aufteilung «x % Kapital · y % Rente» in einer Zeile, darunter der Regler mit den Endlabels «0 % Kapital» und «100 % Kapital». Es folgt die Vorschau- bzw. Statusbox («Vorschau (noch nicht gespeichert)» bzw. «Dein aktueller Plan») mit den zwei berechneten Kennwerten PK-Rente pro Monat und PK-Kapital netto; beide bleiben anklickbar und führen zur PK-Seite. Primäre Aktion ist «+ Als Variante speichern» mit einer Bestätigungszeile («✓ Variante «x % Kapital» gespeichert.»); «Variante übernehmen» und «Zurück zum aktuellen Plan» stehen sekundär darunter und erscheinen nur bei aktiver Vorschau. Darunter «Meine Varianten» mit dem Zugang «Varianten vergleichen» in der Kopfzeile und je Variante Quote, den beschrifteten Kennzahlen «PK-Rente … · Startkapital …» und «davon PK netto …», dem Zustand «Aktueller Plan» bzw. «Neu» sowie einem «···»-Menü für Übernehmen und Entfernen. Nur der aktuelle Plan trägt das Häkchen; auf dieser Seite gibt es keine Auswahlkreise (Radio-Buttons gehören ausschliesslich in den Variantenvergleich) und keinen zweiten Vergleichsblock am Seitenende. «Weiteres Kapital» steht als eigene, aufklappbare Zeile mit der Aufschlüsselung nach Kategorien auf der Seite. Status, Rentenaufschlüsselung und nächste Schritte liegen bei vollständiger Planung in einem eingeklappten Bereich «Planstatus und Renten»; unvollständige Planungen zeigen die nächsten Schritte offen. Die Planseite enthält keine eigene Grafik.
- **Begriffe, Icons und Topffarben (IMPLEMENTIERT):** Verbindliche Begriffe sind **PK-Kapital netto** (Netto-Kapitalbezug nach den berücksichtigten Abzügen), **Weiteres Kapital** (alles zusätzlich zum PK-Bezug verfügbare Kapital, aufgeschlüsselt nach den tatsächlich erfassten Kategorien Säule 3a, freies Vermögen, Wertschriften, Bank und weitere Kapitalpositionen; ersetzt «Säule 3a im Startkapital»), **Startkapital** (= PK-Kapital netto + weiteres Kapital, aus `calculateAvailableCapital().totalInvestableCapital`) und **Vermögen am Jahresanfang/Jahresende** (aus `yearlyProjection[].buckets` bzw. `.endBuckets`). Icons kommen ausschliesslich aus dem lokalen Tabler-SVG-Modul `icons.js` (offizielle Outline-Pfade, `currentColor`, 20 × 20 px, `stroke-width` 1.75) – keine Emojis, keine zweite Icon-Sprache. Die drei Töpfe haben appweit dieselbe Farbe: Geldmarkt grün, Obligationen blau, Wertschöpfung violett (`--v3-pot-cash/--v3-pot-bonds/--v3-pot-growth`) in Kacheln, Karten, Kapitalbalken, Legenden und Detaildarstellungen.
- **Variantenmanagement (IMPLEMENTIERT und geprüft):** Es gibt **drei feste Variantenplätze**, die eine neue Planung mit 0 / 50 / 100 % startet; ein bestehender Anteil ersetzt den mittleren Platz, bestehende Plätze bleiben auf ihrer Position. Ein Klick auf eine Variante lädt deren Wert in den PK-Bezug (Vorschau) und markiert diese Zeile; «Als Variante speichern» **mutiert den geladenen Platz** (ohne Klick den ersten Platz, der nicht der aktuelle Plan ist) – es entsteht nie ein vierter Platz und nie ein doppelter Wert. Der Platz des aktuellen Plans wird nie überschrieben. Alle Variantenzeilen sind **identisch aufgebaut** (Quote, beschriftete Kennzahlen, «···»); das «···»-Menü wählt ausschliesslich, ob diese Variante der aktuelle Plan ist (der aktuelle Plan ist dort markiert), es gibt kein Entfernen und kein «Neu»-Abzeichen. Alle Kennzahlen werden aus demselben Zustand plus der Quote der Variante gerechnet. Die Zustands-API (`js/v3-state.js`) füllt fehlende Plätze beim Laden auf und schützt gespeicherte Werte. Geprüft durch `js/v3-variants.test.js` inklusive der Invarianten: Töpfe = Startvermögen, Startkapital = weiteres Kapital + PK netto, PK netto + Steuer = PK brutto, Jahresanfang = Vorjahresende (+ ausgewiesener Zufluss), Delta = Ende − Anfang, Entnahme je Topf = Kapitalbedarf, Anteile ≈ 100 %.
- **Variantenvergleich – Aufbau (IMPLEMENTIERT):** Oben «← Zurück zu Mein Plan», Titel, Handlungszeile («Wähle eine Variante und vergleiche die wichtigsten Kennzahlen sowie die Ausgangslage deiner Planung.»). Je Variante eine Karte mit Auswahlkreis, Quote, Aufteilung («Nur PK-Rente», «x % Kapital · y % Rente», «Keine PK-Rente»), Zustand «Aktueller Plan», Chevron und **fünf identisch beschrifteten Kennzahlen mit ⓘ**: «Total-Rente / Monat», «Startkapital», «Vermögen mit x», «PK-Rente / Monat» und «PK-Kapital netto»; jede Karte ist gleich aufgebaut, nur die Werte unterscheiden sich. Die Karten bilden zusammen eine Radiogruppe: Beim Öffnen ist der aktuelle Plan vorausgewählt, eine andere Auswahl ändert den Plan noch nicht. Die primäre Aktion «Als aktuellen Plan übernehmen» ist deaktiviert, solange die Auswahl der aktuelle Plan ist. Darunter «Ausgangslage zum Start der Pensionierung (Alter x)» mit «So sind deine Töpfe zu Beginn gefüllt (für die gewählte Variante).»: Der **Totalbetrag steht rechts in der Titelzeile**, darunter drei Topf-Kacheln (Geldmarkt, Obligationen, Wertschöpfung) mit Betrag, Anteil in Prozent und Balken aus `evaluatePlan().bucketAllocation`, dazu der Hinweis, dass der Fehlbetrag zuerst aus dem Geldmarkttopf und danach gemäss Strategie aus den weiteren Töpfen genommen wird. Es folgen die eingeklappte «Kapitalentwicklung bis Alter x» mit dem einzelnen Umschalter «Kapitalentwicklung anzeigen» bzw. «Kapitalentwicklung ausblenden» (inline, keine neue Route), der Aufklapper «So funktioniert der Variantenvergleich» und der Einstieg «So funktioniert deine Planung Jahr für Jahr» mit Kalender-Icon. Das Entfernen einer Variante liegt auf «Mein Plan» («···»-Menü).
- **Grafiken:** Echte Jahreswerte aus `evaluatePlan().yearlyProjection`, identische Zeit- und Wertskala, ohne gebundene Immobilien. Die Kapitalentwicklung liegt im Variantenvergleich und ist dort standardmässig eingeklappt; aufgeklappt zeigt sie alle gespeicherten Varianten gemeinsam und zusätzlich eine noch nicht gespeicherte Vorschau. Neutrale Farben, unterschiedliche Linienmuster und Marker, beschriftete Legende und Endwerte. Nur die aktive Quote erhält die stärkere Linie, ohne Wertung oder Empfehlung. Bei unvollständigem Vermögen oder Vorsorge keine Finanzierbarkeitsaussage.
- **Pensionskasse:** Einzige PK-Grunddatenquelle. Pre: heutiges Guthaben, jährliche Sparbeiträge zusammen, PK-Zins und Umwandlungssatz. Anteil/Varianten ausschliesslich im Plan. «PK-Kapital netto» ist ein berechnetes, anklickbares Ergebnis und öffnet Brutto → geschätzte Bezugssteuer → Netto derselben PK-Seite. Vorschauwerte bleiben dort als Vorschau gekennzeichnet. Post: nur tatsächlich laufende Rente, kein künftiger Kapitalbezug, keine erneute Besteuerung bestehenden Kapitals.
- **Säule 3a:** Zu Beginn der Ruhestandssimulation sind alle 3a-Guthaben bereits bezogen und genau einmal im freien Startkapital enthalten. Pre: heutiges Guthaben und jährlicher Beitrag, Hochrechnung mit bestehender Aufbauannahme bis Pensionierung. Keine Konten, Bezugsjahre, Staffelung, späteren Zuflüsse oder separaten 3a-Töpfe im Ruhestand. **Keine 3a-Bezugssteuer modelliert; der angezeigte Betrag ist kein steuerbereinigter Nettobetrag.** PK-Steuer nur auf tatsächlich bezogenes PK-Kapital. Post: vorhandenes verfügbares Vermögen ist konsolidierter Istbestand; keine zusätzliche 3a-Addition. Alte gültige V3-Konten werden anhand ihrer erfassten Guthaben zusammengeführt, die Originalangaben bleiben als inaktive Migrationsdaten erhalten; ein Hinweis erklärt die geänderte Modellannahme und verlangt deren Prüfung, ohne eine zusätzliche Zustimmungsschleife.
- **Vermögen:** Eigene Seite, Bank, Wertschriften und weitere verfügbare Mittel direkt editierbar. 3a und PK nur berechnet mit Links zu V3-Vorsorgeangaben. Weitere Mittel zählen einmal wie liquide Mittel. Bestehende unaufgeteilte Bestände bleiben erhalten; erstmalige Zuordnung reduziert den Rest, spätere Änderungen verändern ihn nicht erneut. Immobilienwert minus Hypotheken separat gebunden. Unbekannte/optionale leere Felder «Noch nicht erfasst», ausdrücklich eingegebene 0 bleibt 0.
- **Wohnkanton:** Optional. Ohne Kanton «Steuern offen», PK-Kapital ausdrücklich brutto, kein vermeintliches Netto, keine grüne Finanzierbarkeitsaussage. Vorläufige Rechnung ohne Steuerabzug. Mit Kanton Einkommenssteuer und einmalige PK-Bezugssteuer aus dem bestehenden Modell, keine neuen Tarife. Steuerdetails und Modellgrenzen hinter beschriftetem ⓘ. Jahres-Steueraufschlüsselung verlangt einen Kanton.
- **«Planung Jahr für Jahr» – Aufbau (IMPLEMENTIERT):** Kopfzeile mit «← Zurück zum Variantenvergleich» und einer Pille mit der gewählten Aufteilung («50 % Kapital · 50 % Rente»), Titel «Planung Jahr für Jahr», Zeile «So entwickelt sich dein Geld über die Jahre.», Jahresnavigation (Vorjahr/Alter/Jahr) und Jahresregler mit den Endlabels «Pensionierung» und dem Zielalter. Die Variante wird hier nicht gewechselt; sie kommt aus dem aktuellen Plan. Ein Jahr wird mit dem **erreichten Alter** beschriftet (Berechnungszeile Startalter = angezeigtes Alter − 1); die letzte Zeile trägt damit das Zielalter. Der Jahreskörper ist ein Dashboard in dieser Reihenfolge: **Vermögen am Jahresanfang** (drei Topf-Kacheln mit Betrag, Anteil und Balken aus `yearlyProjection[].buckets`, Total rechts in der Titelzeile, bei einem Bezugsjahr mit dem netto enthaltenen PK-Kapitalbezug), danach vier nummerierte Blöcke: **1 Dein Einkommen** (Renten & weitere Einnahmen, Steuern, aufklappbare Zeile «Netto verfügbar» mit Quellen, Steuersatz und Herleitung), **2 Dein Bedarf** (Lebenshaltung / Bedarf, hervorgehobener Fehlbetrag bzw. Überschuss mit ⓘ und direkt in der Karte «Wird aus deinem Geldmarkttopf entnommen.»), **3 So deckst du den Fehlbetrag** (Untertitel «Entnahme aus deinen drei Töpfen», je Topf Bestand Jahresanfang, Entnahme und Bestand Jahresende – die Entnahme erscheint negativ; darunter die Rendite dieses Jahres als Nebeninformation) und **4 Dein Vermögen am Jahresende** (Gesamtbetrag, Veränderung gegenüber Jahresanfang als reine Differenz Ende − Anfang mit Farbe, Aufteilungsbalken und Legende). Es folgen der eingeklappte Bereich «So wurde dieses Jahr berechnet» mit der vollständigen Jahresrechnung und die Fusszeile mit ausschliesslich der Jahresnavigation «‹ Alter x» / «Weiter zu Alter y ›» (im ersten bzw. letzten Jahr deaktiviert). Kein «Jahr abspielen» und kein «Kapitalentwicklung anzeigen» auf dieser Seite; die Kapitalentwicklung über alle Jahre zeigt der Variantenvergleich. Alle Werte stammen unverändert aus `evaluatePlan().yearlyProjection`; die Entnahme je Topf liefert die Jahresengine (`takes`), es gibt keine zweite Rechnung im UI. In einem Bezugsjahr nennt der Vermögensblock zusätzlich den netto investierten Kapitalbezug.
- **Einheitliche Topf-Darstellung (IMPLEMENTIERT):** Alle Topf-Darstellungen in V3 – Kacheln (Ausgangslage, Vermögen am Jahresanfang), Karten («So deckst du den Fehlbetrag»), Aufteilungsbalken und Legende – verwenden dieselbe Reihenfolge (Geldmarkt → Obligationen → Wertschöpfung, Total zuletzt), dieselben Namen, dieselben Beschriftungen («Bestand Anfang Jahr», «Entnahme», «Bestand Ende Jahr») und dieselbe zentrale Farbpalette `--v3-pot-cash/--v3-pot-bonds/--v3-pot-growth`. Icon, Balkensegment und Legendennamen eines Topfes tragen dieselbe Farbe. Entnahmen erscheinen als negative Zahl in der Warnfarbe, der Endbestand ist die betonte Zahl und der Topf mit Entnahme ist hervorgehoben. Damit sind die Ansichten sinngemäss gleich aufgebaut; die Dokumentation nennt die Töpfe ebenfalls einheitlich «Geldmarkt», «Obligationen», «Wertschöpfung».
- **Simulation:** Start pre bei Pensionierung, post heute. Kein Inflationsaufschlag auf den Bedarf vor Pensionierung; danach unveränderte reale Jahresengine. Derselbe Bedarf, Renten, Vermögen, Steuern und Renditen für alle Quoten. Anspar- und Ruhestandsrenditen bleiben bestehende Annahmen; keine neue Profilwahl. Die V3-Seite «Jahr für Jahr» erklärt ausschliesslich die tatsächlichen Jahresdaten des Rechners; keine spätere 3a-Zuführung.
- **Speicherung:** Eigener Schlüssel `retirement-v3-plan`, Schema 2 mit `savedAt` und vollständigem `state`, Quoten in `state.v3Variants`, aktive Quote in `state.details.pension.pkShare`, aktuelle V3-Position in `state.position`. Keine Duplikate der aktiven gemeinsamen Personendaten. Schema 1 bleibt lesbar. Automatisch nach bestätigten Änderungen und Navigation, zusätzlich «Jetzt speichern»; Wiederherstellung beim Öffnen. Unbestätigte Formularwerte und Vorschau bleiben ungespeichert. Fehlerhafte/neue Versionen werden sichtbar geschützt und weder automatisch noch manuell überschrieben. Bei Wechsel pre/post werden inkompatible PK-Eingaben inaktiv bewahrt und die passende Rente bzw. der passende PK-Bestand wiederhergestellt.
- **Darstellung:** Mobile-first, ausreichend grosse Touchflächen, keine horizontalen Überläufe, neutrale Modellhinweise. CHF mit Schweizer Tausendertrennzeichen auch in Eingaben; Werte bleiben intern numerisch. Erklärungen hinter ⓘ, Beträge/Status zuerst. Beispiele sichtbar als Beispielplanung gekennzeichnet. Speichermeldung mit Datum/Zeit, keine technischen Speicherbegriffe im normalen Ablauf.
- **Prüfung und Freigabe:** V3-Regressionen in `js/v3-ui.test.js` und `tests/v3-navigation.cy.js`, Rechenengine-/Steuertests weiterhin massgeblich. Produktive Umschaltung separat erst nach fachlicher und technischer Prüfung; offene Tarif-/Annahmefragen bleiben `ZU VERIFIZIEREN` gemäss Master-Kapiteln 11/18.
