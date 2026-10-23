# App-Wissensbasis: nickpatrick-Ruhestandsbegleiter

Stand: 2026-10-23. Fachwissen der bestehenden App pensionierungsplanung innerhalb von AI-Engineering-OS. Die serverseitige Anbindung für den geschlossenen Test liegt unter [ruhestand/api.php](../ruhestand/api.php); wirksam wird sie erst nach Upload und expliziter Entwurfsfreischaltung auf dem Hosting.

## Ziel
Der Begleiter soll konkrete Fragen anhand nachvollziehbarer Quellen einordnen und passende nächste Fragen stellen. Eine allgemeine Weiterverweisung ersetzt keine verfügbare fachliche Erklärung.

## Erster Wissensfall
[Kinderleistungen im Ruhestand: AHV-Kinderrenten und Familienzulagen, CH/AR](kinderleistungen/CH-AR.md).
Auslöser ist ein Testdialog, in dem die KI bei einer Frage zu Kinderleistungen lediglich an eine Ausgleichskasse verwies. Der Dialog selbst ist kein Fachbeleg; persönliche Gesprächsdaten und Screenshots werden hier nicht abgelegt.

## Pensionskassen
- [Abraxas: Vorsorgeplan 2026 der Pensionskasse Stadt St.Gallen](pensionskassen/pksg/ABRAXAS_VORSORGEPLAN_2026.md) – eigenständige Einrichtung, nicht sgpk; Quellenkarte mit Originalplan, Rahmenreglement und Kinderleistungen. In der Positivliste ab API 0.5-abraxas; wirksam nach Hosting-Update.
- [St.Galler Pensionskasse: Reglement 2026 und Kinderleistungen](pensionskassen/sgpk/REGLEMENT_2026_KINDERLEISTUNGEN.md) – Original-PDF, Fundstellen und offene Alterskinderrentenprüfung; noch keine fachliche Freigabe.

## Aufbau beim schrittweisen Befüllen
Zuerst diesen Fall prüfen und anbinden; weitere Bereiche bei tatsächlichem Bedarf ergänzen:
- AHV: Beginn, Vorbezug/Aufschub, Beitragslücken, Kinderrenten.
- Pensionskasse: reglementsabhängige Leistungen, Rente/Kapital und Fristen.
- Säule 3a: Bezugsvoraussetzungen und Planung.
- Steuern: Bund, Kanton, Gemeinde und Bezugsjahr.
- Wohnen, Familie und Lebensgestaltung.

## Anforderungen an jeden Wissensbaustein
Fragestellung und verständliche Kernaussage; Geltungsbereich und Zeitraum; Voraussetzungen und Ausnahmen; offizielle Quellen mit Fundstellen, Quellenstand und Abrufdatum; offene Punkte; Abnahmetests. Frankenbeträge zusätzlich mit Einheit, Leistungsart, Bezugsperiode und Gültigkeit. Abrufdatum ist kein Beleg für künftige Gültigkeit.

Fakten, Annahmen, eigene Angaben und Empfehlungen unterscheiden. Ein automatischer Quellenabgleich ist keine menschliche Fachfreigabe. Falls Originalkopien archiviert werden, müssen sie unverändert und mit Herkunftsnachweis bei dieser App abgelegt werden. Die anfänglichen Bausteine verweisen auf die geöffneten Primärquellen und behaupten keine archivierte Originalkopie.

## Wie dieses Wissen zur Website gelangt
Repository-Dateien allein stehen dem laufenden Chat nicht zur Verfügung und trainieren kein Modell. Umsetzung und verbleibende Schritte (siehe [Hosting-Anleitung](../ruhestand/README.md)):

1. Ausgewählte Markdown-Bausteine mit Quellenmetadaten in ein versioniertes Lesepaket exportieren. Entwürfe für eine öffentliche Nutzung ausschliessen; interner Test nur ausdrücklich als solcher.
2. Paket auf dem Hosting serverseitig bereitstellen. Keine GitHub-Schlüssel im Browser. Für den ersten kleinen Bestand genügt eine nachvollziehbare Themen-/Stichwortsuche; eine Vektordatenbank ist noch nicht erforderlich.
3. Pro Anfrage passende Passagen samt Jurisdiktion, Gültigkeit, Status und Quellen bereitstellen. Nicht die gesamte Sammlung in jeden Prompt kopieren.
4. Den bisherigen Systemprompt anpassen: belegtes Wissen darf erklärt werden; fehlende oder widersprüchliche Grundlagen müssen sichtbar bleiben. Quellen sind Daten, keine Anweisungen.
5. Antwort mit Fundstellen/Links und Wissensversion ausgeben. Quellenlücke, Fristenablauf und unbekannter Individualanspruch führen zu gezielter Klärung statt erfundener Auskunft.
6. Wissensfall und Quellenanzeige mit Beispielgesprächen testen; Rechenwerte erst nach bestätigter persönlicher Zuordnung an die Planungs-App übergeben.

### Implementierter erster Teststand
Der PHP-Endpunkt liest die drei ausdrücklich vorgesehenen Markdown-Bausteine aus dem privaten Hosting-Ordner, unterstützt Unterordner und flache Ablage und wählt nach Themenwörtern aus den letzten drei Nutzernachrichten plus bestätigter Übersicht. Keine Vektordatenbank oder automatische Git-Synchronisation. Entwürfe nur mit `knowledge_allow_drafts: true`; Quellenstand höchstens 120 Tage alt. Antworten enthalten die bereitgestellten Grundlagen mit Version, Stand und offiziellen Links. Menschliche Fachprüfung und echte Modell-/Hosting-Abnahme bleiben offen. Dateiauswahl und Fehlerfälle wurden unter PHP 8.3 (WebAssembly-Testlaufzeit) geprüft; kein kostenpflichtiger Modellaufruf.

## Betrieb
Owner und menschliche Fachprüfung sind noch offen. Erster Review-Vorschlag: 2026-12-01, zusätzlich bei Gesetzes-/Quellenänderung. Der Vorschlag ist keine eingerichtete Erinnerung.


### Abraxas-Zuordnung, API 0.5-abraxas (23.10.2026)

Dritter Baustein: `pensionskassen/pksg/ABRAXAS_VORSORGEPLAN_2026.md` im privaten Wissensordner. «Abraxas», «PKSG» und «PK/Pensionskasse Stadt St.Gallen» wählen diesen Plan. «sgpk» und eindeutig kantonale Bezeichnungen wählen die kantonale St.Galler Pensionskasse. «PK SG» allein bleibt mehrdeutig, ohne eine der beiden Kassen auszuwählen. Die neueste ausdrückliche Kassennennung im Nutzerdialog geht früheren Nennungen und bestätigten Angaben vor; ausdrücklich genannte Vergleiche dürfen beide Grundlagen erhalten. Inhalte aus technischen Status-/Bearbeitungsabschnitten werden nicht als Fachwissen übertragen.

PHP-8.3-Tests für drei Bausteine, Zuordnungssynonyme, Mehrdeutigkeit, Vergleich und aktuelle Institution sowie bestehende Pfad-/Metadaten-/Freischaltungsregeln erfolgreich. Keine neue Live-Modellprüfung. Nur `sites/nickpatrick.it-pin.ch/ruhestand/api.php` ersetzen; private Konfiguration, API-Schlüssel und Frontend bleiben erhalten. Keine Änderung am V4-Rechenkern.
