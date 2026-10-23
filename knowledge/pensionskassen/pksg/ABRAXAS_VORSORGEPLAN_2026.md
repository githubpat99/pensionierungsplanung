---
slug: pksg-abraxas-vorsorgeplan-2026
status: entwurf
version: "0.1"
institution: Pensionskasse Stadt St.Gallen
institution_id: pksg-stadt
pension_scheme: Abraxas Informatik AG (VP-AB)
jurisdiction: CH
regulation_effective_from: 2026-01-01
source_checked_at: 2026-10-23
human_review: offen
public_release: false
tags: [abraxas, pksg, vorsorgeplan, pensioniertenkinderrente, rente, kapital]
---

# Abraxas: Vorsorgeplan 2026 der Pensionskasse Stadt St.Gallen

## Zuordnung
Der öffentlich publizierte Abraxas-Plan gehört zur **Sammeleinrichtung Pensionskasse Stadt St.Gallen**. Nicht mit der kantonalen **St.Galler Pensionskasse (sgpk.ch)** gleichsetzen. Die persönliche Zugehörigkeit bleibt anhand des Vorsorgeausweises zu bestätigen.

## Originale und Quellenstand
- **S1 – kompletter Vorsorgeplan VP-AB, ab 01.01.2026, 22 Seiten:** [Original-PDF](https://docs.pk.stadt.sg.ch/pdfs/Vorsorgeplan%20Vorsorgewerk%20Abraxas%20Informatik%20AG_2026.pdf).
- **S2 – Rahmenreglement 2026, 46 Seiten:** [Original-PDF](https://docs.pk.stadt.sg.ch/pdfs/Rahmenreglement_2026_v2.pdf).
- **S3 – offizielle Dokumentenübersicht:** https://www.pk.stadt.sg.ch/dokumente/jahresrechnungen — dort sind beide als ab 01.01.2026 gültig verlinkt.
- Geöffnet am 23.10.2026; die gedruckten Seiten 17 und 19 des VP-AB zusätzlich visuell abgeglichen. Ältere 2024-Fassungen und Vorproduktionsdomains nicht als aktuelle Grundlage verwendet.
- Dies ist eine kuratierte Markdown-Auswertung mit Originalverweisen, keine Volltextabschrift oder archivierte PDF-Kopie.

## Belegte Eckpunkte des VP-AB

| Thema | Zusammenfassung | Beleg |
| --- | --- | --- |
| Versicherter Lohn | Jahreslohn minus Koordinationsabzug; dieser grundsätzlich ein Drittel des Jahreslohns, höchstens maximale AHV-Altersrente, bei Teilzeit angepasst. | S1 Ziff. 6, S. 4 |
| Zeitpunkt | Referenzalter 65; vorzeitige Pensionierung grundsätzlich ab Monat nach 60. Geburtstag. | S1 Ziff. 7, S. 5 |
| Umwandlung | Alter 63: 4,90 %; Alter 65: 5,20 %. | S1 Ziff. 13, S. 17 |
| Kapital | Bis 100 % des Sparkontos möglich. | S1 Ziff. 13 Abs. 2, S. 17 |
| Pensioniertenkinderrente | Ausgleich, soweit BVG-Altersrente plus BVG-Kinderrenten die reglementarische Altersrente übersteigen; frühestens ab Referenzalter. Ende bei Wegfall der Altersrente oder Kinderberechtigung. | S1 Ziff. 15, S. 19 |
| Invalidenkinderrente | Jährlich pro Kind bei Vollinvalidität 11 % des massgebenden versicherten Lohns. | S1 Ziff. 17, S. 19 |

## Ergänzung aus dem Rahmenreglement
S2 Ziff. 25 (S. 23) verknüpft die Pensioniertenkinderrente mit der möglichen Waisenrentenberechtigung und verweist für Höhe/weitere Voraussetzungen auf den Plan. Ziff. 31 (S. 28) regelt Kinderberechtigung grundsätzlich bis 18; bei Ausbildung oder mindestens 70 % Invalidität längstens bis 25 sowie Sonderfälle.

## Einordnung für den Begleiter
Redaktionelle Anwendungsvorgaben:
- Vor der Antwort Kasse und konkreten Plan zuordnen; Wohnort und Arbeitgebername ersetzen keinen aktuellen Versicherungsnachweis.
- Keine pauschale zusätzliche Kinderrente als Prozentsatz der gesamten PK-Altersrente versprechen.
- Für eine persönliche Bezifferung fehlen bestätigte Vergleichsgrössen, Leistungszeitpunkt und Kinderberechtigung. Fehlende Angaben bleiben unbekannt, nicht null.
- Unterschiedliche Leistungsarten getrennt erklären. Keine Werte automatisch in den Plan übernehmen.
- Bei späteren Bezugsjahren die dann geltenden Unterlagen erneut prüfen; dieses Dokument verändert keine App-Berechnung.
- Tabellenwerte ausserhalb des hier ausgewerteten Umfangs im Original nachschlagen und vor einer Verwendung prüfen.

## Offene Fragen vor individueller Anwendung
- Welcher Plan/Sparplan und welche allfälligen individuellen Übergangsbedingungen gelten?
- Welche bestätigten Berechnungsgrundlagen weist die Kasse für den Bezugszeitpunkt aus?
- Welche Nachweise zur Kinderberechtigung liegen vor?
- Sind Kapitalwahl, zeitliche Grenzen und Leistungskombination im konkreten Fall abgeklärt?

## Technischer Stand
Im App-Repo als Wissen abgelegt. API 0.5-abraxas enthält diesen Baustein in ihrer Positivliste und trennt PK Stadt St.Gallen/Abraxas von kantonaler sgpk. Wirksam nach Upload der neuen api.php und dieses Dokuments in die private Wissensablage. Zuordnungs- und Verwechslungstests unter PHP 8.3 erfolgreich; echte Modellantwort nach Hosting-Update noch zu prüfen.

## Prüfung
Quellenabgleich durch Recherche, keine menschliche Fachfreigabe. Keine individuelle Leistungszusage und keine neue Rechenlogik implementiert.
