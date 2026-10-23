# Ruhestandsbegleiter: Wissensanbindung 0.3

Dieser PHP-Endpunkt erweitert den separat auf nickpatrick.it-pin.ch/ruhestand gehosteten Gesprächsprototyp 0.2. Er verändert keine V4-Oberfläche, keine Plan-Speicherstände und keine Berechnungen des Ruhestands-Checks. Das bestehende Frontend versteht die unveränderten Antwortfelder reply/topic/proposals; Quellenhinweise stehen zusätzlich im Antworttext. Der Frontend-Hinweis «noch keine geprüfte Wissensbasis» bleibt bis zur nächsten UI-Anpassung bestehen: verwendet werden ausdrücklich interne Entwürfe ohne Fachfreigabe.

## Einrichten
1. Die bisherige api.php lokal sichern. Die neue Datei als sites/nickpatrick.it-pin.ch/ruhestand/api.php hochladen und ersetzen. Kein weiterer öffentlicher PHP-Helfer nötig.
2. In der vorhandenen privaten config.php innerhalb des return-Arrays ergänzen:

```php
'knowledge_allow_drafts' => true,
```

API-Schlüssel, Passwort, Origin und Kontingent bleiben erhalten. Der Schalter ist ausschliesslich für den geschlossenen internen Test. Fehlt er oder ist er false, werden diese Entwürfe nicht eingelesen und der Verbindungstest meldet das. Dies ist kein Freigabemechanismus für eine öffentliche Beratung.

3. Private Dateien aus dem App-Repo auf das Hosting übertragen:

```text
private-ruhestand/
  config.php
  knowledge/
    kinderleistungen/CH-AR.md
    pensionskassen/sgpk/REGLEMENT_2026_KINDERLEISTUNGEN.md
```

Die bereits empfohlene flache Ablage wird ebenfalls unterstützt. Bei doppelten Dateien gewinnt die Unterordnerfassung. README-Dateien werden nicht geladen. Änderungen im Git-Repo gelangen erst durch erneuten Upload aufs Hosting.

4. Website neu öffnen, KI verbinden und neues Gespräch starten. Testfrage: «Ich bin bei der sgpk versichert. Welche Kinderleistungen sind in eurer Wissensbasis belegt, und was ist bei der Alterskinderrente noch offen?» Danach AHV/Familienzulagen, anschliessend ein sachfremdes Thema testen.

## Verhalten
Feste Positivliste aus zwei Dateien, UTF-8- und Metadatenprüfung, maximal 40 KB je Datei/18 KB je Fachauszug. Keine beliebigen Pfade oder Konfigurationsdateien, keine symbolischen Links aus dem privaten Wissensordner heraus. Quellenabgleich älter als 120 Tage oder in der Zukunft wird abgelehnt. Status entwurf ist nur bei ausdrücklicher Freischaltung erlaubt. Dies ist ein einfacher Review-Zeitfilter, kein automatischer Abgleich mit amtlichen Quellen.

Themenwahl anhand der letzten drei Nutzernachrichten und ausdrücklich bestätigter Übersicht: Kinder/AHV/Familienzulagen laden den CH/AR-Baustein; sgpk/PK SG/St.Galler Pensionskasse den sgpk-Baustein. Für generische PK-Fragen ist die Kassenzuordnung weiterhin zu klären. Anschlussfragen bleiben über den jüngsten Kontext möglich; bei Themenwechseln können vorherige Quellen noch mitgegeben werden. Keine semantische Suche oder Behauptung vollständiger Themenabdeckung.

Fachabschnitte und offene Prüfungen werden übertragen; Gesprächsvorlagen, Beispieltests und Änderungsnotizen ausgelassen. Importierte Dokumente bleiben Daten, keine Systemanweisungen. Prompt-Regeln bieten keine Garantie gegen Fehlinterpretationen. Im Antworttext werden die bereitgestellten Bausteine mit Quellenstand, Version und offiziellen Links genannt; das ist eine Anzeige des Kontextes, keine Garantie, dass jede Aussage daraus korrekt abgeleitet wurde.

Der authentifizierte Verbindungstest prüft vorhandene lesbare Bausteine, ohne einen Modellaufruf zu erzeugen. Modellzugriff, fachliche Antwort und Quellenverwendung müssen mit dem ersten echten Gesprächsschritt geprüft werden. Bestehender Passwort-/Origin-Schutz und das Tageskontingent bleiben bestehen. Keine zusätzliche Gesprächsspeicherung; der externe KI-Dienst erhält nun auch die ausgewählten Wissensauszüge.

## Rücknahme
Alte api.php wiederherstellen. Private Konfiguration und Wissensdateien können erhalten bleiben. Die Wissensbasis ist versioniert im App-Repo unter knowledge; hier liegt nur die serverseitige Anbindung. Noch kein automatischer Import in die Planungs-App oder ihr Dossier.


### Merkpunkte im Gesprächsprototyp 0.4 (23.10.2026)

Die gelben Vorschlagskarten sind durch eine dezente Zeile unter der jeweiligen Antwort ersetzt: «Für später merken?» mit einem verständlichen Anliegen und «Merken». Die Zweckbeschreibung erscheint einmal pro Gespräch. Erst der Klick übernimmt; danach «✓ Gemerkt» und «Rückgängig». Kein Ablehnen-Knopf und kein Zwang zur Übernahme. Höchstens ein Vorschlag pro Antwort, nur für ein konkretes persönliches Anliegen; allgemeine Wissensfragen sollen keine Vorschläge erzeugen. Die Übersicht heisst «Meine gemerkten Punkte», ist leer kompakt und zeigt dann keinen deaktivierten Download. Entfernen in der Übersicht synchronisiert die Zeile im Gespräch. Eingaben und Modelltext bleiben als Text gerendert. Kein Eingriff in V4-Plan, Rechenkern oder Speicherstand.

DOM-Tests: Merken/Rückgängig, Entfernen, leere Übersicht, höchstens ein Vorschlag, Reset und sichere Textdarstellung; PHP-Syntax geprüft. Keine visuelle Browserabnahme oder neue Live-Modellprüfung ausgeführt.

Für das Hosting-Update 0.4 `index.html` und `api.php` in `sites/nickpatrick.it-pin.ch/ruhestand/`, `app.js` und `style.css` im dortigen Ordner `assets` ersetzen. Private config.php und Wissensdateien bleiben erhalten. Der vollständige Frontend-Stand ist jetzt im App-Repository unter `ruhestand/` versioniert; session.js und conversation.js sind gegenüber 0.2 unverändert. Test: `node ruhestand/memory-ui.test.cjs` mit verfügbaren Testpaketen linkedom und php-parser (keine Browser-Abhängigkeiten der Anwendung).


### KI-Status nach Verbindung (23.10.2026)

Nach erfolgreichem Verbindungstest verschwinden Verbindungsblock mit Passwort, Zustimmung und Statusmeldung sowie die zusätzliche Moduszeile im Chatkopf. Ein kleines grünes Symbol im Chatkopf zeigt «KI aktiv» über Tooltip und zugängliche Beschriftung. Vor der Verbindung bleiben Zugang und Übermittlungshinweis sichtbar. Ein Gesprächsreset behält die Verbindung und das Symbol; Neuladen startet wie bisher im Demo-Modus. DOM-Verhalten und JavaScript-Syntax geprüft, keine visuelle Browserabnahme oder erneute Modellprüfung. Keine Änderung an privater Konfiguration, Wissensdateien oder V4-Planung.
