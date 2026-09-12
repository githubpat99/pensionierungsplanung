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

Einfach beginnen, Zusammenhänge im Plan erklären und fachliche Vertiefung freiwillig öffnen. Der Hauptfluss erfasst persönliche und finanzielle Fakten. Keine Anlageprofilwahl und keine Zielalterfrage im Basischeck; neue Planungen verwenden zentrale Anlageannahmen und einen automatisch abgeleiteten Planungshorizont. Modellannahmen werden offengelegt und später unter «Lebensphasen & Annahmen» bearbeitet; eine erweiterte Profilwahl ist nicht Bestandteil des Produkts. Monatliche Beträge sind die primäre Sprache von Basischeck, Plan und Einkommenseditor; intern werden Jahresbeträge verwendet. Vorsorgebeiträge ausdrücklich pro Jahr erfassen.

Bestehende Farbwelt, Typografie, Karten und Visualisierungen erhalten. Mobile ohne horizontales Seitenscrollen. Jede Seite hat einen verständlichen Titel, jede Unterseite genau einen logisch übergeordneten Rückweg. Keine konkurrierende Wizard-Navigation. Eine klare primäre Aktion, soweit die Seite eine benötigt; Detailseiten brauchen keine künstliche Weiter-Aktion.

Beispielwerte sichtbar kennzeichnen. Kein Portrait in Ergebnisboxen; Patrick erscheint einmal im Header. Fehler bei Validierung oder Speicherung verständlich anzeigen.

## 4. Informationsarchitektur

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

Die Marke ist nicht klickbar. **Neue Planung** fragt ausdrücklich nach, bevor aktuelle Arbeitswerte und der lokale Beratungsabschluss zurückgesetzt werden. Abbruch lässt die Planung stehen; der separat gespeicherte persönliche Stand bleibt auch beim bestätigten Reset erhalten.

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

Basischeck und persönlicher Editor validieren Alter 18–100 und Pensionierung pre 50–100. Der Horizont wird ausschliesslich unter «Lebensphasen & Annahmen» bearbeitet: ganzzahlig, höchstens 110 und strikt nach Planungsstart. Pre-Pensionierung darf nicht vor dem aktuellen Alter liegen. Post startet heute; ein bislang späteres Pensionierungsalter wird beim Übernehmen auf das aktuelle Alter begrenzt.

Basischeck: Frage nach behaltenen Immobilien blendet Marktwert/Hypotheken ein; bei Nein werden beide auf null gesetzt. Ein dadurch ungültiger Renditeobjektanteil wird deaktiviert. Direkte Gruppeneditoren zeigen nur vorhandene modellierte Felder; sie führen keine neue Vermögenskategorie ein.

## 7. Berechnungsmodell

`retirement-calculator.js` ist der gemeinsame, DOM-unabhängige Planadapter und Rechenkern für Hochrechnung, PK-Entscheid, Kapitalbasis, Simulation, Profilvergleich und Ergebnisbewertung. Steuerrechnung in `tax-model.js`, Jahresrechnung in `retirement-engine.js`. Keine eigenständigen Nebenrechnungen für Chart, PK-Screen oder Ergebnisboxen.

Simulation beginnt pre am Pensionierungsalter, post am aktuellen Alter. Vor Pensionierung keine Inflation auf Lebensbedarf und keine zusätzliche Abzinsung des projizierten Startkapitals. Alle frei verfügbaren Beträge gehen am Start in die Kapitalbasis ein.

Die Ruhestandsrechnung verwendet konstante Kaufkraft des Startjahres. Pro Phase bleibt der reale Lebensbedarf konstant; das entspricht nominalem Wachstum mit Inflation. Eine zusätzliche Inflationierung desselben realen Bedarfs wäre Doppelzählung. Ruhestandsansichten nennen diesen Modellpreisstand „Kaufkraft zu Beginn deiner Pensionierung“, bei bereits Pensionierten „Kaufkraft zu Beginn deiner Planung“. „Wert bei Pensionierung“ bezeichnet die hochgerechneten Startwerte.

Ausgabenjahre laufen von Startalter inklusive bis Zielalter exklusive. Eine zusätzliche Terminalzeile zeigt Kapital am Zielalter ohne weitere Jahresausgabe. Rechenwerte bleiben ungerundet; CHF-Anzeigen werden gerundet.

## 8. Einkommen

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

Im PK-Detail kann der Anteil 0–100 % interaktiv verändert werden. Aktuelle Netto-Kapitalbasis, Rente, Steuer, Kapital-/Rentenvergleich und Finanzierbarkeit aktualisieren sich mit demselben Modell. Die Erfolgsaussage bezieht sich stets auf die gewählte Aufteilung. Eine Hintergrundprüfung anderer Aufteilungen ist keine automatische Empfehlung.

Säule 3a ist im Startkapital vollständig enthalten. Eine gesonderte 3a-Bezugssteuer wird derzeit nicht berechnet; diese Modellgrenze muss offengelegt werden. Post werden keine künftigen PK-/3a-Beiträge oder Bezugsentscheide abgefragt.

## 11. Steuern

**IMPLEMENTIERT:** Vereinfachte kantonale Modellkonfiguration `2026.1`, kein individueller Steuertarif. Die vollständigen Parameter stehen in der Tabelle unten und in `tax-config.js`.

Laufende Einkommenssteuer: Jahressteuerbasis bis CHF 80’000 → erster Satz; über CHF 80’000 bis 130’000 → zweiter; darüber → dritter. Der ausgewählte Satz gilt für den gesamten steuerbaren Betrag, nicht als marginaler Stufentarif. Im Jahresmodell zunächst reale Steuerbasis in nominalen Jahresbetrag umrechnen, Steuer berechnen und wieder auf den realen Preisstand zurückführen.

Kapitalbezugssteuer: Steuersatz zwischen den Referenzbeträgen CHF 50’000 / 100’000 / 250’000 / 500’000 / 1’000’000 linear interpolieren. Unterhalb bzw. oberhalb gilt der jeweilige äussere Satz; bei null Bezug ist der Satz null. Betrag mal Satz / 100 ergibt die Steuer. Keine Kapitalbezugssteuer auf bestehendes Privatvermögen.

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

Ohne gültigen Kanton liefern Steuermethoden null; vorläufig wird kein Steuerabzug gerechnet. Keine grüne Finanzierbarkeit behaupten. Vermögenssteuer, separate Zins-/Dividendenbesteuerung und 3a-Bezugssteuer fehlen. Privatentnahmen und private Kursgewinne werden nicht als laufende Steuerbasis angesetzt.

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

Neue Planungen verwenden `RiskProfiles.defaultProfile = balanced`: reale Topfrenditen 0 / 1 / 4,5 %, Schwankungsfaktor 0,70 und PK-Vergleichsrendite 4,5 %. Alle Ansichten verwenden denselben Rechenkern und dieselben hinterlegten Anlageannahmen. Bestehende gespeicherte Profile, individuelle Renditen und Schwankungsfaktoren bleiben unverändert; sie werden als gespeicherte Anlageannahmen kenntlich gemacht. Alter Schlüssel `bold` wird als `growth` gelesen. Keine Zwangsmigration persönlicher Werte.

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

Gebundenes Kapital ist keine Hauptkennzahl von «Dein Plan». Ergänzende Vermögensangaben stehen nach den zentralen Finanzierungswerten und werden visuell zurückgestuft. Kapital-/Entnahmegrafiken und Topfdarstellungen umfassen weiterhin ausschliesslich verfügbares Anlagekapital; gebundene Beträge bleiben getrennt.

„Dein Plan“ ergänzt bei laufenden Einnahmen und Kapitalentnahme die zugehörigen Jahresbeträge aus dem gemeinsamen Ergebnisobjekt unter den primären Monatswerten.

„Dein Plan“ zeigt drei Aussagen: laufende monatliche Nettoeinnahmen, monatliche Ergänzung aus Vermögen und verfügbares Restkapital am Zielalter bzw. erstes Lückenalter. Dazu Planungsspanne und sichtbare Modellkennzeichnung. Der Plan nennt das verwendete Zielalter und weist bei automatischem Horizont auf die Schweizer Restlebenserwartung hin; manuelle/alte Horizonte werden als gespeichert bezeichnet. Beide Hinweise nennen «Lebensphasen & Annahmen» als Änderungsort. Der Plan zeigt «Planung bis Alter …» sowie einen kurzen Hinweis auf die altersabhängige Schweizer Referenz und die Anpassung unter Annahmen; manuelle/alte Horizonte werden als gespeicherter Planungshorizont bezeichnet.

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

Unter «Lebensphasen & Annahmen» werden Kapitalanlage, tatsächlich verwendete langfristige reale Wachstumsrendite und der veränderbare Planungshorizont erklärt. Keine Profilwahl. Neue Planungen verwenden die zentrale durchschnittliche Anlageannahme und reale Topfrenditen 0 / 1 / 4,5 % (Geldmarkt/Anleihen/Wachstum). Vorhandene individuelle Werte bleiben beim Laden erhalten.

**IMPLEMENTIERT – vorausgefüllte Modell-/Beispielwerte:** Alter 56, Pensionierung 65, Zielalter automatisch gemäss Kapitel 15; Lebensbedarf CHF 90’000/Jahr; Inflation 0,6 %; PK-Zins 4,33 %; 3a-/Wertschriftenrendite 4,5 %; PK-Vergleichsrendite 4,5 %; Umwandlungssatz 5,2 %; PK-Bezug 50 %.

Pre-Beispiele: PK 550’000, 3a 120’000, Wertschriften 180’000, Bank 50’000, Immobilie 800’000, Hypothek 500’000; PK-Beiträge je 11’000 Arbeitnehmer/Arbeitgeber, 3a 7’000, übriges Sparen 10’000 jährlich; AHV 28’200, weitere Einkommen null. Post-Beispiele: AHV 28’200, PK-Rente 26’000 jährlich, übrige Einkommen null, frei 650’000, Immobilie 800’000 und Hypothek 500’000. Keine automatische Kantonsannahme.

Lebensphasen 73/83 mit zunächst gleichem Bedarf; keine zusätzlichen Einnahmen, keine markierte Nettomiete; Reparaturstress CHF 30’000. Diese Werte sind Beispiele bzw. wählbare Annahmen, keine persönlichen Fakten.

Reale Ruhestandsrenditen gelten nach Inflation und Anlagekosten; Zinsen/Dividenden nicht nochmals als Einnahmen addieren. Aufbauannahmen werden in der vorhandenen Hochrechnung direkt angewandt, ohne zusätzliche Inflationsbereinigung.

**ZU VERIFIZIEREN:** Fachliche Angemessenheit der langfristigen Inflations-, Aufbau- und Renditeannahmen, insbesondere die Verwendung einer kurzfristigen Prognose als langfristige Annahme. Dokumentieren, nicht im Navigationsauftrag verändern.

## 19. Datenzustand und State Management

Kanonischer Plan, verbunden mit dem bestehenden Arbeitsstate durch `fromState`/`toState`:

| Modellbereich | Wesentliche Inhalte |
|---|---|
| person | mode, currentAge, canton |
| retirement | age, targetAge |
| assets | pre: pk, p3, sec, cash, re, mort; post: free, re, mort |
| income | pre: ahv, other, rent; post: ahv, pkRent, other, otherIncome |
| spending | annualNeed |
| pensionDecision | capitalShare |
| assumptions | rates: pkInterest, p3Return, secReturn, capitalReturn, inflation, uws; contributions: pkContrib, pkEmployee, pkEmployer, p3Contrib, otherSave; legacy risk |
| riskProfile | cautious / balanced / growth |
| scenarios | version, phase2/3, need2/3, returns[3], volatilityFactor, timing, extras, rental, repair, propertySplit/value/debt |
| metadata | Erhaltene weitere Zustandsdaten, insbesondere exampleValues, horizonMode (automatic/manual/saved), horizonReference |

Navigationszustand und Formularentwürfe sind davon getrennt. Öffnen/Schliessen eines Details setzt weder Modell noch Profil zurück. Editorübernahme schreibt nur die bearbeitete Gruppe, behält andere Modellteile und speichert den Arbeitsstand. Unverändert übernommene monatliche Einzelfelder erhalten den exakten gespeicherten Jahresbetrag.

Automatischer Arbeitsstand: `retirementMvp5`. Persönlicher Snapshot separat: `retirement-personal-snapshot-v1`, Hülle `{version:4, savedAt, plan}`. Unterstützte Altschemas 1/2 mit `state`, 3 mit `plan`; Migration erhält Werte und individuelle Renditen. Schema 4 enthält kanonisches Profil und Schwankungsfaktor. Horizontmodus und Referenzkennung werden kompatibel über metadata gespeichert. Fehlende alte Horizontkennzeichnung wird als saved behandelt, niemals vom neuen Automatikdefault übernommen. Laden verändert weder Zielalter noch Jahresergebnisse.

Vor Laden validieren, bestehende Arbeitswerte nach Bestätigung ersetzen, vorherigen Stand unter `retirement-before-personal-load` sichern. Persönliche Daten nicht als Beispiel markieren. Beschädigte oder unbekannte zukünftige Versionen nicht überschreiben. Speicherfehler sichtbar melden. Identisch wiederhergestellte Modelle müssen identische Jahresergebnisse erzeugen.

Speicherbestätigung: „✓ Dein Stand wurde auf diesem Gerät gespeichert.“ Datum/Uhrzeit sichtbar. Speicherung gilt nur für diesen Browser auf diesem Gerät; keine Cloud-Synchronisation.

Der vorhandene Beratungsbereich ist eine lokale Testeingabe: Thema, optionaler Name/Telefon, E-Mail; kein Versand und keine Kontaktaufnahme. Der Abschluss wird lokal mit Zeitstempel gespeichert und setzt den vorhandenen Bearbeitungsschutz. Die vorhandene Testaktion versucht zusätzlich, einen vorbereiteten Nachrichtentext in die Zwischenablage zu kopieren; sie versendet ihn nicht. Laden eines persönlichen Stands bzw. bestätigte neue Planung hebt diesen Abschlusszustand auf. Die Navigation bleibt verfügbar.

## 20. Technische Architektur

Statische Browseranwendung ohne Framework-Migration. `index.html` ist produktiver Einstieg und enthält erhaltene Detailmarkups, Arbeitsstate und Legacy-Fachadapter. `index_save.html` ist die unveränderte Nutzersicherung, kein zweiter produktiver Einstieg.

| Verantwortung | Komponenten |
|---|---|
| Navigation, Basischeck, Plan, Gruppeneditoren | check-ui.js / check-ui.css |
| Reiner Planadapter, Projektion und Bewertung | retirement-calculator.js |
| Jahresrechnung, Entnahmen, Töpfe | retirement-engine.js |
| Steuermodell und Parameter | tax-model.js / tax-config.js |
| Steuer-/Einkommensdarstellung | tax-view.js |
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

Fachliche Zusatzinformationen, Definitionen und methodische Hinweise liegen, soweit für das unmittelbare Verständnis nicht erforderlich, hinter Info-Icons, Aufklappern oder «So rechnen wir». Beträge, Status, Zeitpunkt und wichtigste Hebel haben Vorrang. Im Kapitalbereich sind Hilfen standardmässig geschlossen; höchstens eine neue Info-Erklärung ist gleichzeitig offen. Beschriftete Buttons funktionieren mit Klick, Touch und Tastatur, melden ihren Zustand mit `aria-expanded` und verweisen auf den Hilfebereich. Erneuter Klick, «Hinweis schliessen» oder Escape schliesst ihn. Hilfen erscheinen im Seitenfluss, ohne Hauptnavigation zu überlagern. Gebundenes Kapital bleibt eine kleine ergänzende Zeile unterhalb der Finanzierungselemente.

Mobile Kapitalansicht: kompakte gemeinsame Finanzierungsübersicht, reduzierte Kartenabstände und Polster, niedrigere Töpfe mit direkt zugeordneten Info-Icons und dezenten Pfeilen. Einheiten einheitlich «/ Jahr» und «/ Monat». «Gebundenes Kapital» steht klein mit Info-Icon nach der Simulation; die Erklärung bezeichnet Immobilienwert abzüglich Hypotheken. Desktop behält eine grosszügigere Darstellung.

Header mit statischer Marke und einem Portrait. Basischeck mit klar gegliederten Feldern, sichtbaren Einheiten, Beispielhinweis und aufklappbarem „So rechnen wir“. Plan mit drei Ergebniswerten, Ampel/Erklärung und direkter Detailnavigation.

Angabenübersicht mit vier Gruppen vor bzw. drei nach Pensionierung: aktuelle Zusammenfassung und eindeutig benanntem „Ändern“-Button je Gruppe. Editor: Rückweg, Gruppentitel, vorhandene Felder und **Änderungen übernehmen**. Lebensphasen und Annahmen verwenden eine gemeinsame Übernahmeaktion.

Details: einheitliche Titel und **← Dein Plan** (Einkommen & Steuern: **← Kapital & 3-Töpfe-Modell**), darunter vorhandene fachliche Darstellung und passende Interaktionen wie PK-Regler oder Horizontfeld. Keine gleichzeitigen alten Haupttabs, Wizard-Fortschritte oder Weiter/Zurück-Zeilen.

Jedes Feld hat sichtbaren Kontext/Label und zugänglichen Namen. Interaktive Elemente per Tastatur bedienbar, Eingaben haben zugängliche Beschriftungen. Rückwege bleiben beim Scrollen sichtbar. Schweizer Tausendertrennzeichen und Dezimalkomma für Prozentwerte. „Ändern“, keine Umschrift „Aendern“.

Diagrammwerte und Karten müssen lesbar bleiben, Tabellen auf Mobile umbrechen; kein horizontales Seitenscrollen. Wichtige Erklärungen mindestens 13 px, normale Texte etwa 15–16 px. Kompakter Kantonsselect ohne redundante Labelblöcke in Details. Keine rein dekorativen Zwischenansichten.

## 22. Offene Punkte / noch nicht spezifizierte Bereiche

- Fachliche Verifikation und Aktualisierungsprozess der gelieferten Steuerparameter sowie langfristigen Modellannahmen aus Kapitel 11/18 stehen aus. Der vorhandene Rechenstand gilt bis zu einem ausdrücklichen fachlichen Änderungsauftrag.
- Individuelle AHV-Ansprüche, Haushalts-/Gemeinde-/Zivilstandstarife, Vermögenssteuer, separate Dividenden-/Zinssteuer und 3a-Bezugssteuer sind nicht vollständig modelliert. Keine entsprechenden Ergebnisse suggerieren.
- Kein Immobilienverkauf, keine dynamische Verlust-Verkaufsvermeidung, keine Sterbewahrscheinlichkeiten und kein Monte Carlo. Eine Erweiterung benötigt eine eigene fachliche Spezifikation und Regressionen.
- Historische Daten sind als vorhandenes festes Muster dokumentiert; eine automatische jährliche Datenpflege ist nicht spezifiziert.
- Beratung bleibt lokaler Testablauf. Echter Versand, produktiver Kontaktprozess, Cloud-Konten und geräteübergreifende Speicherung sind nicht spezifiziert.
- Formularentwürfe gelten innerhalb der laufenden Sitzung; gespeicherter persönlicher Stand umfasst übernommene Modellwerte, nicht unfertige Eingaben oder Scrollpositionen.

Für den hier beschriebenen Navigationsumbau bestehen nach erfolgreicher Prüfung keine zusätzlichen fachlichen Entscheidungen. Spätere Änderungen sind in diese Kapitel zu integrieren und mit dem ergänzenden Regelkatalog konsistent zu halten.
