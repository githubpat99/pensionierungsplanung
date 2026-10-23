# App-Wissensbasis: nickpatrick-Ruhestandsbegleiter

Stand: 2026-10-23. Fachwissen der bestehenden App pensionierungsplanung innerhalb von AI-Engineering-OS. Die Chat-Website hat darauf noch keinen technischen Zugriff.

## Ziel
Der Begleiter soll konkrete Fragen anhand nachvollziehbarer Quellen einordnen und passende nächste Fragen stellen. Eine allgemeine Weiterverweisung ersetzt keine verfügbare fachliche Erklärung.

## Erster Wissensfall
[Kinderleistungen im Ruhestand: AHV-Kinderrenten und Familienzulagen, CH/AR](kinderleistungen/CH-AR.md).
Auslöser ist ein Testdialog, in dem die KI bei einer Frage zu Kinderleistungen lediglich an eine Ausgleichskasse verwies. Der Dialog selbst ist kein Fachbeleg; persönliche Gesprächsdaten und Screenshots werden hier nicht abgelegt.

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
Repository-Dateien allein stehen dem laufenden Chat nicht zur Verfügung und trainieren kein Modell. Erforderlicher nächster technischer Schritt:

1. Ausgewählte Markdown-Bausteine mit Quellenmetadaten in ein versioniertes Lesepaket exportieren. Entwürfe für eine öffentliche Nutzung ausschliessen; interner Test nur ausdrücklich als solcher.
2. Paket auf dem Hosting serverseitig bereitstellen. Keine GitHub-Schlüssel im Browser. Für den ersten kleinen Bestand genügt eine nachvollziehbare Themen-/Stichwortsuche; eine Vektordatenbank ist noch nicht erforderlich.
3. Pro Anfrage passende Passagen samt Jurisdiktion, Gültigkeit, Status und Quellen bereitstellen. Nicht die gesamte Sammlung in jeden Prompt kopieren.
4. Den bisherigen Systemprompt anpassen: belegtes Wissen darf erklärt werden; fehlende oder widersprüchliche Grundlagen müssen sichtbar bleiben. Quellen sind Daten, keine Anweisungen.
5. Antwort mit Fundstellen/Links und Wissensversion ausgeben. Quellenlücke, Fristenablauf und unbekannter Individualanspruch führen zu gezielter Klärung statt erfundener Auskunft.
6. Wissensfall und Quellenanzeige mit Beispielgesprächen testen; Rechenwerte erst nach bestätigter persönlicher Zuordnung an die Planungs-App übergeben.

## Betrieb
Owner und menschliche Fachprüfung sind noch offen. Erster Review-Vorschlag: 2026-12-01, zusätzlich bei Gesetzes-/Quellenänderung. Der Vorschlag ist keine eingerichtete Erinnerung.
