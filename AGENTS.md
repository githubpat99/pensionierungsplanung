# Arbeitsanweisungen

## Ruhestands-Check

Vor jeder Änderung an der App muss `docs/PRODUCT_RULES.md` vollständig gelesen werden.

Die dort dokumentierten Berechnungs-, Steuer-, UX-, Text- und Darstellungsregeln sind verbindlich. Bestehende Regeln dürfen nicht stillschweigend verändert, entfernt oder durch neue Annahmen ersetzt werden.

Wenn eine neue Anforderung einer bestehenden Produktregel widerspricht, muss der Widerspruch vor der Umsetzung ausdrücklich genannt werden.

Nach jeder fachlichen Änderung ist zu prüfen, ob `docs/PRODUCT_RULES.md` aktualisiert werden muss.

## Master-Spezifikation

- `docs/MASTER_SPEC.md` ist die zentrale fachliche und funktionale Spezifikation des aktuellen Sollzustands, keine Historie und kein Changelog.
- Vor jeder Änderung zusätzlich die betroffenen Kapitel in `docs/MASTER_SPEC.md` lesen. Konflikte mit dem dokumentierten Sollzustand vor der Umsetzung ausdrücklich nennen.
- Nach jeder erfolgreich implementierten fachlichen oder funktionalen Änderung die betroffenen bestehenden Kapitel aktualisieren. Ersetzte Konzepte dort ersetzen, keine widersprüchlichen Änderungswünsche am Ende anhängen. Den ergänzenden Regelkatalog `docs/PRODUCT_RULES.md` konsistent halten.
- Eindeutig vorhandene, aber fachlich nicht abschliessend dokumentierte Logik als `IMPLEMENTIERT` beschreiben und offene Grundlagen mit `ZU VERIFIZIEREN` kennzeichnen. Keine neuen Berechnungsregeln aus Dokumentationslücken ableiten.

## Umsetzung und Prüfung

- Navigation: Start → Deine Angaben → Dein Plan. Details direkt vom Plan öffnen, keine Zwischenübersicht „Meine Planung verstehen“. Eine Angabenübersicht mit Gruppeneditoren; eindeutige Parents gemäss Master-Spezifikation Kapitel 4/5.
- Neue Oberfläche in `check-ui.js`/`check-ui.css`, unabhängiges Planungsmodell in `retirement-calculator.js`. Vorhandene Detailansichten werden schrittweise übernommen; alle Prognosen verwenden denselben Rechenkern, keine unabhängigen Nebenrechnungen.
- Bei Änderungen am gemeinsamen Rechenkern zusätzlich `node retirement-calculator.test.js` ausführen; dieser vergleicht Eingaben und vollständige Jahresverläufe mit dem bisherigen Berechnungsadapter. Neue Bedienabläufe mit `tests/new-check.cy.js` prüfen.
- `check-ui.js` ist alleiniger Navigation Owner. Erhaltene Fachkomponenten dürfen keine zweite Wizard-Navigation zeigen. Navigationsänderungen mit `tests/navigation.cy.js` prüfen; gezielte Checks statt unnötiger kompletter Testläufe. Der Navigationsauftrag verändert keine Berechnungsregeln.
- Berechnungsänderungen mit passenden Regressionstests absichern. Beide Wege (vor/nach Pensionierung), Persistenz, Desktop und Mobile prüfen.
- Risikoprofile zentral in `risk-profiles.js` pflegen. Renditereihen und Profilvergleich ausschliesslich über den gemeinsamen Rechenkern; keine eigenen Renditerechnungen in UI-Komponenten. Bei Profiländerungen zusätzlich `node risk-profiles.test.js` und `tests/risk-profiles.cy.js` ausführen. Produktregeln Abschnitt 10 ist verbindlich.
- Persönliche Browserdaten, Sicherungsdateien und erzeugte Screenshots nicht ungefragt committen.
- Dokumentation und zugehörige Codeänderungen gemeinsam committen, wenn ein Commit beauftragt ist.
- Historische Entwürfe erhalten; neue verbindliche Regeln und Abweichungen ausdrücklich dokumentieren.
