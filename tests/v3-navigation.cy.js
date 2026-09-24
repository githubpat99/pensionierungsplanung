/* Cypress-Spezifikation der V3-Oberfläche (Entwurf v3.html).
   Stand der Umsetzung:
   - Der Variantenvergleich ist entfallen. Varianten, Ausgangslage und Einstiege stehen
     direkt auf «Mein Plan»; die Kapitalentwicklung liegt im Töpfe-Dialog.
   - Die Jahresrechnung ist ein Klick tief («So wurde dieses Jahr berechnet»); eine
     Sammel-Schaltfläche «Alle einblenden» gibt es nicht mehr.
   - Alle Anzeigewerte sind nominale CHF des Jahres; «heutige Kaufkraft» kommt nicht vor. */
const money = value => `CHF ${Math.round(value).toLocaleString('de-CH').replace(/’/g, "'")}`;
// Pauschale der AHV-Schätzung in der Schreibweise der Oberfläche (Trennzeichen als Apostroph).
const pauschal = `CHF 3'000`;
const menu = name => { cy.get('.menu-button').click(); cy.get(`[data-menu-page="${name}"]`).click(); };
function seed(mode='pre', canton='ZH', legacy3a=false) {
 cy.visit('/v3.html', {onBeforeLoad(w){w.localStorage.removeItem('retirement-v3-plan');w.localStorage.setItem('retirement-v2-plan','V2 remains untouched');}});
 cy.window().then(w=>{
  const M=w.CheckV2State;let s=M.fresh(mode);s.riskProfile='balanced';
  for(const [group,value] of [
   ['time',mode==='pre'?{age:60,retirement:65}:{age:70}],['regular',{canton,ahv:2500,other:200,additional:100}],['need',{need:6500}],
   ['assets',{cash:50000,securities:150000,saving:1000,otherAssets:30000,propertyValue:900000,mortgage:400000}],
   ['pension',mode==='pre'?{pk:600000,pkContrib:20000,pkShare:0}:{pkRent:2800}],
   ['pension3a',{p3:100000,p3Contrib:7000,...(legacy3a?{p3Mode:'later',p3Accounts:[{amount:30000,age:66},{amount:70000,age:70}]}:{})}],
   ['assumptions',{...M.defaults,targetAge:95}]
  ])s=M.apply(s,group,value);
  s.position='plan';s.v3Variants=[0];
  w.localStorage.setItem('retirement-v3-plan',JSON.stringify({version:2,savedAt:new Date().toISOString(),state:s}));w.V3.load();
 });
 cy.get('h1').should('have.text','Mein Plan');
}
function stored(fn) {cy.window().then(w=>fn(JSON.parse(w.localStorage.getItem('retirement-v3-plan')).state,w));}
for(const width of [360,1280]) describe(`V3 standalone at ${width}px`,()=>{
 beforeEach(()=>cy.viewport(width,900));
 it('führt im Schnellstart mit vier Angaben direkt zum ersten Plan',()=>{
  cy.visit('/v3.html',{onBeforeLoad(w){w.localStorage.removeItem('retirement-v3-plan');}});
  cy.get('h1').should('have.text','Mein Plan');
  cy.get('.v3-heading-plan .v3-plan-meta').should('exist').and('not.match','button');
  cy.contains('Nur 4 Angaben').should('exist');
  // Vier Eingabekarten mit den Fragen aus der Story.
  cy.get('.v3-start-card').should('have.length',4);
  cy.get('.v3-start-card').eq(0).find('label').should('have.text','Wie alt bist du?');
  cy.get('.v3-start-card').eq(1).find('label').should('have.text','Wann möchtest du in Pension?');
  cy.get('.v3-start-card').eq(2).find('label').should('have.text','Wie hoch ist dein PK-Guthaben heute?');
  cy.get('.v3-start-card').eq(3).find('label').should('have.text','Wie viel brauchst du pro Monat?');
  // Jede Karte trägt ein Icon aus dem lokalen Set, darunter drei ruhige Nutzenzeilen.
  cy.get('.v3-start-card .v3-start-icon svg.v3-icon').should('have.length',4);
  cy.get('.v3-start-benefits li').should('have.length',3).and('contain','Deine Angaben bleiben auf diesem Gerät');
  // Zeitangabe rechts im Kopf entsteht live aus den ersten beiden Angaben.
  cy.get('[data-plan-status]').should('have.text','Nur 4 Angaben – danach siehst du, wo du stehst.');
  cy.get('#start-age').type('60');cy.get('#start-retirement').type('65');
  cy.get('[data-plan-status]').should('contain','Pensionierung mit 65').and('contain','Planung bis');
  // Situationswahl kompakt; technische Annahmen stehen nicht unter den Feldern.
  cy.get('.v3-segment').should('have.length',2).each(button=>expect(button.find('svg.v3-icon').length).to.equal(1));
  cy.get('.v3-segment').eq(0).should('have.attr','aria-pressed','true').and('contain','Vor der Pensionierung');
  cy.get('#startMode').should('not.exist');
  cy.get('.v3-start-note').should('contain','sinnvolle Annahmen').and('not.contain','5,2 %');
  // Testfunktionen sind aus dem Erstnutzer-Flow entfernt.
  cy.contains('Beispielplanung laden').should('not.exist');cy.contains('Gespeicherten Stand laden').should('not.exist');
  // Über das ⓘ werden die verwendeten Annahmen transparent.
  cy.get('.v3-start-note .v3-modal-icon').click();
  cy.get('#v3ModalTitle').should('have.text','Annahmen für den ersten Check');
  cy.get('#v3ModalBody').should('contain',pauschal).and('contain','5,2 %').and('contain','Risikoprofil').and('contain','Wohnkanton');
  cy.get('.v3-modal-close').click();
  cy.get('.v3-form .v3-actions button').should('have.length',1).and('contain','Meinen ersten Plan anzeigen');
  cy.get('#start-age').type('60');cy.get('#start-retirement').type('65');cy.get('#start-pk').type('600000');cy.get('#start-need').type('6500');
  cy.get('#v3Form').submit();
  // Ergebnis zuerst: der Plan beginnt direkt mit dem PK-Bezug (kein Übersichtsblock davor).
  cy.get('h1').should('have.text','Mein Plan');
  cy.get('.v3-decision h2').should('contain','PK-Bezug wählen');
  cy.get('.v3-overview,.v3-summary').should('not.exist');
  cy.get('#previewReadout').should('contain','PK-Rente / Monat').and('contain','Bedarf / Monat');
  cy.window().then(w=>{const ahv=w.RetirementCalculator.incomeSourcesAtStart(w.V3.planFor(0)).find(source=>source.id==='ahv');expect(Math.round(ahv.annualIncome)).eq(36000);});
  // Verfeinerung in fester Reihenfolge: AHV · Kanton · Kapital · PK-Ausweis.
  cy.get('.v3-steps h2').should('have.text','Plan genauer machen');
  cy.get('.v3-step').should('have.length',4);
  cy.get('.v3-step').eq(0).should('contain','AHV-Rente').and('contain','geschätzt').and('contain','1').and('contain',pauschal);
  cy.get('.v3-step').eq(1).should('contain','Wohnkanton').and('contain','offen');
  cy.get('.v3-step').eq(2).should('contain','Weiteres Kapital und Säule 3a');
  cy.get('.v3-step').eq(3).should('contain','PK-Ausweis').and('contain','5,2 % pro Jahr');
  cy.get('.v3-step').eq(0).click();cy.get('h1').should('have.text','AHV-Renten');
  cy.contains('Geschätzte AHV-Rente').should('exist');
  cy.get('#ahv').clear().type('2800');cy.get('#v3DetailForm').submit();
  // Erledigte Punkte verschwinden: AHV ist erfasst, die Liste zeigt nur noch drei Punkte.
  cy.get('.v3-step').should('have.length',3);
  cy.get('.v3-step').eq(0).should('contain','Wohnkanton').and('contain','1');
  cy.get('.v3-steps').should('not.contain','AHV-Rente');
  cy.window().then(w=>{const ahv=w.RetirementCalculator.incomeSourcesAtStart(w.V3.planFor(0)).find(source=>source.id==='ahv');expect(Math.round(ahv.annualIncome)).eq(33600);});
  cy.get('[data-save]').click();cy.reload();cy.get('h1').should('have.text','Mein Plan');
  cy.get('.v3-step').should('have.length',3);
 });
 it('führt auch für bereits Pensionierte mit vier Angaben zum ersten Plan',()=>{
  cy.visit('/v3.html',{onBeforeLoad(w){w.localStorage.removeItem('retirement-v3-plan');}});
  cy.get('[data-situation="post"]').click();
  // Derselbe Schnellstart, andere Fragen: keine Pensionierung, kein PK-Guthaben.
  cy.get('h1').should('have.text','Mein Plan');
  cy.get('.v3-heading-plan .v3-plan-meta').should('exist').and('not.match','button');
  cy.get('.v3-start-card').should('have.length',4);
  cy.get('.v3-start-card').eq(0).find('label').should('have.text','Wie alt bist du?');
  cy.get('.v3-start-card').eq(1).find('label').should('have.text','Wie hoch ist deine PK-Rente?');
  cy.get('.v3-start-card').eq(2).find('label').should('have.text','Wie viel Vermögen hast du?');
  cy.get('.v3-start-card').eq(3).find('label').should('have.text','Wie viel brauchst du pro Monat?');
  cy.get('#start-retirement').should('not.exist');cy.get('#start-pk').should('not.exist');
  cy.get('.v3-start-note .v3-modal-icon').click();
  cy.get('#v3ModalBody').should('contain','Laufende PK-Rente').and('not.contain','Umwandlungssatz');
  cy.get('.v3-modal-close').click();
  cy.get('#start-age').type('70');cy.get('#start-pkRent').type('2800');cy.get('#start-free').type('300000');cy.get('#start-need').type('6500');
  cy.get('#v3Form').submit();
  cy.get('h1').should('have.text','Mein Plan');
  cy.get('.v3-decision h2').should('contain','Deine laufende Rente');
  cy.get('#previewReadout').should('contain','PK-Rente / Monat').and('contain','Fehlbetrag / Monat');
  cy.get('#shareRange').should('not.exist');
  cy.get('[data-save]').click();cy.reload();cy.get('h1').should('have.text','Mein Plan');
  cy.get('.v3-summary,.v3-overview').should('not.exist');
 });
 it('zeigt die PK-Vorschau 0/1/35/99/100 ohne den Plan zu ändern und hält genau drei Variantenplätze',()=>{
  seed();cy.get('[data-save]').click();
  for(const share of [0,1,35,99,100]){
   cy.get('#shareRange').invoke('val',share).trigger('input');cy.get('#shareNumber').should('have.value',String(share));
   cy.window().then(w=>{const pk=w.RetirementCalculator.calculatePension(w.V3.planFor(share));cy.get('#previewReadout').should('contain',money(pk.rent/12)).and('contain',money(pk.netCap));});
   stored(s=>expect(s.details.pension.pkShare).eq(0));
  }
  cy.get('#shareNumber').clear().type('35');cy.get('#shareRange').should('have.value','35');
  cy.get('#previewStatus').should('have.text','Vorschau (noch nicht gespeichert)');
  // Kein Bestätigungstext: die geänderte Variantenkarte unten ist die Rückmeldung.
  // Der aktuelle Plan selbst ist veränderbar (Platz 1 trägt nach dem Speichern 35 %).
  cy.get('[data-remember]').click();
  cy.get('.v3-variant-row').eq(0).find('.v3-compare-title strong').should('contain','35 %');
  cy.get('.v3-variant-badge').should('have.length',1).and('contain','Aktueller Plan');
  cy.get('[data-adopt-variant]').should('have.length',2);
  // Drei feste Plätze: Speichern mutiert den Platz, es entsteht kein vierter.
  cy.get('[data-variant-index="2"]').click();cy.get('#shareNumber').clear().type('70');cy.get('[data-remember]').click();
  cy.get('.v3-variants-head').should('contain','Meine Varianten');
  cy.get('.v3-variant-row').should('have.length',3);
  cy.get('.v3-compare-title strong').then(titles=>expect([...titles].map(node=>node.textContent.trim())).to.deep.eq(['35 % Kapitalbezug','50 % Kapitalbezug','70 % Kapitalbezug']));
  cy.get('[data-save]').click();
  stored((s,w)=>{expect(s.details.pension.pkShare).eq(35);expect(s.v3Variants).deep.eq([35,50,70]);expect(w.localStorage.getItem('retirement-v2-plan')).eq('V2 remains untouched');});
  cy.get('#saveLabel').should('contain','Automatisch gespeichert');
  cy.get('#shareNumber').clear().type('99');cy.reload();cy.get('#shareNumber').should('have.value','35');
  cy.get('.v3-variant-row').should('have.length',3);
 });
 it('zeigt sechs Kennzahlen je Variante, erklärt sie im Dialog und kennt keinen Variantenvergleich',()=>{
  seed();
  // Der frühere Vergleichsschirm ist entfernt – auch als Route und als Kartenform.
  cy.get('[data-compare]').should('not.exist');cy.get('.v3-compare-card').should('not.exist');
  cy.contains('Varianten vergleichen').should('not.exist');cy.contains('Deine Varianten').should('not.exist');
  cy.get('.v3-variant-row').should('have.length',3).each(row=>expect(row.find('.v3-compare-metric').length).to.equal(6));
  cy.get('.v3-compare-metric').should('have.length',18);
  cy.get('.v3-variant-row').eq(0).within(()=>['Total-Rente / Monat','Startkapital','Vermögen mit 95','PK-Rente / Monat','PK-Kapital netto','Fehlbetrag / Monat'].forEach(label=>cy.contains(label).should('exist')));
  cy.get('.v3-variant-status').should('have.length',3);
  // «Weiteres Kapital» ist Inhalt des Startkapital-Dialogs, keine eigene Zeile.
  cy.get('.v3-further').should('not.exist');
  cy.get('.v3-compare-metric').contains('Startkapital').parent().find('.v3-modal-icon').click();
  cy.get('#v3ModalTitle').should('have.text','Startkapital');
  cy.get('#v3ModalBody').should('contain','weiteres Kapital').and('contain','Säule 3a').and('contain','PK-Kapital netto');
  cy.get('.v3-modal-close').click();cy.get('#v3Modal').should('not.have.attr','open');
  // Der Tipp ersetzt den früheren Untertitel und bleibt geschlossen.
  cy.get('.v3-tip').should('contain','Tipp').and('contain','Teste verschiedene Varianten');
  cy.get('[data-tip-close]').click();cy.get('.v3-tip').should('not.exist');
  cy.get('[data-save]').click();cy.reload();cy.get('.v3-tip').should('not.exist');
  cy.get('.v3-outcome').should('contain','Jahresverlauf ansehen');
  cy.get('.v3-entry').should('have.length',3);
  cy.get('.v3-entry[data-v3-next="years"]').should('contain','Planung Jahr für Jahr');
  cy.get('.v3-entry[data-pots-modal]').should('contain','Töpfe-Modell');
  cy.get('.v3-entry[data-v3-next="assumptions"]').should('contain','Annahmen');
  cy.contains('Kaufkraft').should('not.exist');
  cy.document().then(d=>expect(d.documentElement.scrollWidth).lte(width));
 });
 it('übernimmt eine Variante mit einem einzigen Klick',()=>{
  seed();
  cy.get('#previewStatus').should('have.text','Dein aktueller Plan');
  cy.get('[data-adopt-variant="50"]').should('have.length',1).click();
  // Kein zweiter Bestätigungsschritt: der Plan wechselt direkt, die Karte wird bezeichnet.
  cy.get('#previewStatus').should('have.text','Dein aktueller Plan');cy.get('#shareNumber').should('have.value','50');
  cy.get('.v3-variant-row').eq(1).find('.v3-variant-badge').should('contain','Aktueller Plan');
  cy.get('.v3-variant-row').eq(0).find('.v3-variant-badge').should('not.exist');
  cy.get('[data-adopt-variant="50"]').should('not.exist');cy.get('[data-adopt-variant]').should('have.length',2);
  cy.get('[data-save]').click();
  stored(s=>{expect(s.details.pension.pkShare).eq(50);expect(new Set(s.v3Variants).size).eq(3);});
 });
 it('lädt eine Variante über einen Klick irgendwo auf die Kachel, ohne die ⓘ zu stören',()=>{
  seed();
  // Klick in den Kennzahlenbereich der zweiten Kachel.
  cy.get('.v3-variant-row').eq(1).find('.v3-compare-metrics').click();
  cy.get('#previewStatus').should('have.text','Vorschau (noch nicht gespeichert)');
  cy.get('#shareNumber').should('have.value','50');
  // Ein ⓘ-Klick öffnet nur den Dialog und lädt keine Quote.
  cy.get('.v3-variant-row').eq(2).find('.v3-compare-metric').last().find('.v3-modal-icon').click();
  cy.get('#v3Modal').should('have.attr','open');cy.get('#v3ModalTitle').should('exist');
  cy.get('.v3-modal-close').click();
  cy.get('#shareNumber').should('have.value','50');
  cy.get('#previewStatus').should('have.text','Vorschau (noch nicht gespeichert)');
 });
 it('bearbeitet PK-Angaben an einer Stelle, rechnet alle Varianten neu, verwirft Entwürfe und öffnet die Netto-Aufschlüsselung',()=>{
  seed();cy.get('#shareNumber').clear().type('35');cy.get('[data-remember]').click();
  let before;
  cy.window().then(w=>before=[0,35].map(s=>w.RetirementCalculator.evaluatePlan(w.V3.planFor(s)).availableCapital));
  cy.get('[data-pk-breakdown]').click();cy.get('#pkKapital').should('be.visible');cy.get('#pkShare').should('not.exist');
  cy.get('#pk').clear().type('800000');cy.get('[data-detail-back]').click();cy.get('[data-pk-breakdown]').click();cy.get('#pk').should('have.value',"600'000");
  cy.get('#pk').clear().type('800000');cy.get('#v3DetailForm').submit();cy.get('#shareNumber').should('have.value','35');
  cy.window().then(w=>[0,35].forEach((s,i)=>expect(w.RetirementCalculator.evaluatePlan(w.V3.planFor(s)).availableCapital).gte(before[i])));
  menu('assumptions');cy.get('#pkInterest').should('not.exist');cy.get('[data-detail-back]').click();
  cy.document().then(d=>expect(d.documentElement.scrollWidth).lte(width));
 });
 it('konsolidiert die Säule 3a netto, hält Immobilien getrennt und speichert optionale Werte',()=>{
  seed('pre','ZH',true);menu('assets');
  // Die 3a steht als Nettobetrag nach geschätzter Bezugssteuer; Immobilien bleiben getrennt.
  cy.get('.v3-asset-item').contains('Säule 3a netto').closest('.v3-asset-item').should('contain','brutto').and('contain','geschätzte Bezugssteuer').and('contain','aus Vorsorge');
  cy.get('[data-asset="otherAssets"]').click();cy.get('#asset-input-otherAssets').clear().type('40000');cy.get('[data-asset-form="otherAssets"]').submit();
  cy.get('[data-asset="otherAssets"]').should('contain',"CHF 40'000");
  cy.get('[data-open-vorsorge="pension3a"]').click();cy.get('#p3').should('have.value',"100'000");cy.get('#p3ModeField').should('not.exist');
  cy.get('#p3').clear().type('120000');cy.get('#v3DetailForm').submit();
  // Startkapital = freies Vermögen (inkl. 3a netto) + PK-Kapital netto; Immobilien zählen nicht.
  cy.window().then(w=>{const p=w.V3.planFor(0),C=w.RetirementCalculator,a=C.calculateAvailableCapital(p),v=C.calculateRetirementStart(p);expect(a.totalInvestableCapital).closeTo(v.cash+v.sec+a.p3.netAtStart+a.netPkCapitalWithdrawal,1e-6);expect(a.p3.netAtStart).lt(v.p3);expect(a.boundCapital).eq(500000);expect(C.simulationInput(p).capitalInjections).deep.eq({});});
  cy.get('[data-save]').click();cy.reload();menu('assets');cy.get('[data-asset="otherAssets"]').should('contain',"CHF 40'000");
 });
 it('zeigt Steuern offen ohne Wohnkanton und behält konsolidierte Werte nach der Pensionierung',()=>{
  seed('pre','');cy.get('#previewReadout').should('contain','PK-Kapital brutto').and('contain','Steuern offen');
  cy.get('[data-pk-breakdown]').click();cy.get('[data-pk-net]').should('have.text','Steuern offen');cy.get('[data-detail-back]').click();
  menu('personal');cy.get('.canton-trigger').click();cy.get('[data-code="ZH"]').click();cy.get('#v3DetailForm').submit();cy.get('#previewReadout').should('contain','PK-Kapital netto');
  seed('post','ZH',true);cy.get('#shareRange').should('not.exist');menu('assets');cy.get('#assetTotal').should('contain',"CHF 230'000");cy.get('[data-open-vorsorge="pension3a"]').should('not.exist');
  cy.document().then(d=>expect(d.documentElement.scrollWidth).lte(width));
 });
 it('zeigt ein Planjahr als Dashboard und öffnet die Jahresrechnung mit einem Klick',()=>{
  seed();cy.get('.v3-entry[data-v3-next="years"]').click();
  cy.get('h1').should('have.text','Planung Jahr für Jahr');
  cy.get('.v3-year-pill').should('contain','% Kapitalbezug');
  cy.get('#yearAgeLabel').should('have.text','Alter 66');
  // Jahr −/+ mit Icons statt Textpfeilen.
  cy.get('.v3-year-nav-row button').should('have.length',2).each(button=>expect(button.find('svg.v3-icon').length).to.equal(1));
  cy.get('.v3-year-nav-labels').should('contain','Pensionierung').and('contain','Alter 95');
  // Block 0 ist das Vermögen am Jahresanfang, danach die nummerierten Blöcke.
  cy.get('.v3-year-block').should('have.length',5);
  cy.get('.v3-year-block').eq(0).should('contain','Dein Vermögen am Jahresanfang').and('contain','CHF');
  cy.get('.v3-year-block').eq(0).find('.v3-year-legend li').should('have.length',3);
  cy.get('.v3-year-block').eq(1).should('contain','Dein Einkommen').and('contain','Renten & weitere Einnahmen').and('contain','Netto verfügbar');
  cy.get('.v3-year-block').eq(2).should('contain','Dein Bedarf').and('contain','Lebenshaltung / Bedarf');
  cy.get('.v3-year-block').eq(3).should('contain','Deine Töpfe');
  cy.get('.v3-pot-card').should('have.length',3).and('contain','Geldmarkt').and('contain','Obligationen').and('contain','Wertschöpfung');
  cy.get('.v3-pot-card.active').should('have.length',1);
  cy.get('.v3-year-rendite').should('contain','Rendite dieses Jahr');
  cy.get('.v3-year-block').eq(4).should('contain','Dein Vermögen am Jahresende');
  // Die Jahreswerte stammen unverändert aus der Simulation; die Töpfe decken den Kapitalbedarf.
  cy.window().then(w=>{
   const row=w.RetirementCalculator.evaluatePlan(w.V3.planFor(0)).yearlyProjection[0], end={...row,...row.nominal};
   expect(row.takes.reduce((a,b)=>a+b,0)).to.be.closeTo(row.withdrawal,1e-6);
   cy.get('.v3-year-wealth strong').last().should('have.text',money(end.end));
  });
  // Jahresrechnung: ein Klick ins Detail, keine Sammel-Schaltfläche mehr.
  cy.contains('Alle einblenden').should('not.exist');cy.get('.v3-calc-toggle').should('not.exist');
  cy.get('.v3-year-detail').should('not.have.attr','open');
  cy.get('.v3-year-detail > summary').should('contain','So wurde dieses Jahr berechnet').click();
  cy.get('.v3-year-detail').should('have.attr','open');
  cy.get('.v3-calc-section').should('have.length',6);
  cy.get('.v3-calc-section').each(section=>expect(section.find('.v3-calc-total-row[open]').length).to.be.greaterThan(0));
  cy.get('.v3-calc-section').eq(0).find('h4').should('contain','Einnahmen');
  cy.get('.v3-calc-section').eq(1).find('h4').should('contain','Bedarf');
  cy.get('.v3-calc-section').eq(2).find('h4').should('contain','Entnahmen aus den Töpfen');
  cy.get('.v3-calc-section').eq(3).find('h4').should('contain','Rendite der Töpfe');
  cy.get('.v3-calc-section').eq(4).find('h4').should('contain','Initialbefüllung der Töpfe');
  cy.get('.v3-calc-section').eq(5).find('h4').should('contain','Vermögen am Jahresende');
  cy.get('.v3-calc-foot').should('contain','nominale CHF dieses Jahres');
  cy.get('.v3-calc-close').click();cy.get('.v3-year-detail').should('not.have.attr','open');
  cy.get('.v3-year-nav-row [data-year-next]').click();cy.get('#yearAgeLabel').should('have.text','Alter 67');
  cy.get('.v3-year-nav-row [data-year-prev]').click();cy.get('#yearAgeLabel').should('have.text','Alter 66');
  cy.get('[data-year-back]').click();cy.get('h1').should('have.text','Mein Plan');
  cy.contains('Kaufkraft').should('not.exist');
  cy.document().then(d=>expect(d.documentElement.scrollWidth).lte(width));
 });
 it('öffnet das Töpfe-Modell als Dialog mit Donut, Legende und Kapitalentwicklung',()=>{
  seed();cy.get('.v3-entry[data-pots-modal]').click();
  cy.get('#v3Modal').should('have.attr','open');
  cy.get('#v3ModalTitle').should('have.text','Das Töpfe-Modell');
  cy.get('#v3ModalBody').should('contain','Dein Vermögen ist auf drei Töpfe verteilt').and('contain','Geldmarkt').and('contain','Obligationen').and('contain','Wertschöpfung').and('contain','Total');
  cy.get('#v3ModalBody .v3-donut').should('have.length',1);
  cy.get('#v3ModalBody .v3-donut-legend li').should('have.length',3);
  cy.get('#v3ModalBody .v3-pot-notes .v3-pot-note').should('have.length',3);
  cy.get('[data-chart-share]').should('have.length',3);
  cy.get('[data-chart-share="0"]').should('have.attr','stroke-width','3.5');
  cy.get('[data-chart-share="50"]').should('have.attr','stroke-width','1.8').and('have.attr','stroke-dasharray','9 6');
  cy.get('[data-chart-tick-age="95"]').should('exist');
  cy.get('.v3-chart-legend').should('contain','0 % Kapital').and('contain','50 % Kapital').and('contain','100 % Kapital').and('contain','Aktueller Plan');
  cy.get('#v3ModalBody [data-modal-close]').click();cy.get('#v3Modal').should('not.have.attr','open');
  // Die Töpfe bleiben Teil des Dialogs: kein eigener Schirm, kein Vergleichsschirm.
  cy.get('h1').should('have.text','Mein Plan');
  cy.document().then(d=>expect(d.documentElement.scrollWidth).lte(width));
 });
 it('lädt einen gesicherten Stand aus einer Datei und löscht ihn erst nach Bestätigung',()=>{
  seed();menu('assumptions');
  cy.get('.v3-data h2').should('have.text','Daten und Sicherung');
  cy.get('.v3-data-actions button').should('have.length',2).and('contain','Stand laden').and('contain','Stand löschen');
  cy.get('[data-data-file]').should('exist');
  cy.window().then(w=>{
   const M=w.CheckV2State;let s=M.fresh('pre');s.riskProfile='balanced';
   for(const [g,v] of [['time',{age:60,retirement:65}],['regular',{canton:'ZH',ahv:2800,other:0,additional:0}],['need',{need:11500}],['pension',{pk:600000,pkContrib:0,pkShare:0}]])s=M.apply(s,g,v);
   s.position='plan';s.v3Variants=[0,50,100];
   cy.get('[data-data-file]').selectFile({contents:Cypress.Buffer.from(JSON.stringify({version:2,savedAt:new Date().toISOString(),state:s})),fileName:'sicherung.json',mimeType:'application/json'},{force:true});
  });
  cy.get('h1').should('have.text','Mein Plan');
  cy.get('#previewReadout').should('contain',"CHF 11'500");
  // Ungültige Datei: Meldung, kein Überschreiben.
  menu('assumptions');
  cy.get('[data-data-file]').selectFile({contents:Cypress.Buffer.from('{kaputt'),fileName:'kaputt.json',mimeType:'application/json'},{force:true});
  cy.get('[data-data-status]').should('contain','nicht geladen');cy.get('h1').should('have.text','Annahmen');
  // Löschen in zwei Schritten.
  cy.get('[data-data-clear]').click();cy.get('[data-data-clear]').should('have.text','Wirklich löschen?');
  cy.get('[data-data-clear]').click();
  cy.get('h1').should('have.text','Mein Plan');
  cy.get('.v3-heading-plan .v3-plan-meta').should('exist').and('not.match','button');
  cy.get('#start-age').should('exist');
 });
 it('does not overwrite future or corrupt stored versions',()=>{
  for(const raw of ['{broken',JSON.stringify({version:99,state:{}})]){
   cy.visit('/v3.html',{onBeforeLoad(w){w.localStorage.setItem('retirement-v3-plan',raw);}});
   cy.get('#v3Error').should('not.be.empty');cy.window().then(w=>{w.V3.save();expect(w.localStorage.getItem('retirement-v3-plan')).eq(raw);});
  }
 });
});
