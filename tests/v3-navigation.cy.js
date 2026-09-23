const money = value => `CHF ${Math.round(value).toLocaleString('de-CH').replace(/’/g, "'")}`;
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
 it('short entry works before and after retirement without requiring assets or a canton',()=>{
  cy.visit('/v3.html',{onBeforeLoad(w){w.localStorage.removeItem('retirement-v3-plan');}});
  cy.get('#age').type('60');cy.get('#retirement').type('65');cy.get('#ahv').type('2500');
  cy.get('#v3Form').submit();cy.get('h1').should('have.text','Mein Bedarf');cy.get('#need').type('6500');cy.get('#v3Form').submit();
  cy.get('h1').should('have.text','Mein Plan');cy.get('.v3-stepper').should('not.exist');cy.contains('PK-Angaben erfassen').should('be.visible');
  cy.contains('Vermögen ergänzen').click();cy.get('h1').should('have.text','Vermögen');cy.contains('Noch nicht erfasst').should('exist');
  cy.get('[data-back]').click();menu('personal');cy.get('#personMode').select('post');cy.get('#age').clear().type('70');cy.get('#v3DetailForm').submit();
  cy.contains('PK-Rente erfassen').click();cy.get('#pkRent').type('2800');cy.get('#v3DetailForm').submit();cy.get('#shareRange').should('not.exist');
  cy.get('[data-save]').click();cy.reload();cy.get('h1').should('have.text','Mein Plan');
 });
 it('slider and precise input preview 0/1/35/99/100 without changing the active plan; saves three variants',()=>{
  seed();cy.get('[data-save]').click();
  for(const share of [0,1,35,99,100]){
   cy.get('#shareRange').invoke('val',share).trigger('input');cy.get('#shareNumber').should('have.value',String(share));
   cy.window().then(w=>{const pk=w.RetirementCalculator.calculatePension(w.V3.planFor(share));cy.get('#previewReadout').should('contain',money(pk.rent/12)).and('contain',money(pk.netCap));});
   stored(s=>expect(s.details.pension.pkShare).eq(0));
  }
  cy.get('#shareNumber').clear().type('35');cy.get('#shareRange').should('have.value','35');cy.get('[data-remember]').click();
  // Kein Bestätigungstext: die geänderte Variantenkarte unten ist die Rückmeldung.
  // Der aktuelle Plan selbst ist veränderbar (Platz 1 = aktueller Plan).
  cy.get('.v3-variant-row').eq(0).find('.v3-compare-title strong').should('contain','35 %');
  // Drei feste Plätze: Speichern mutiert den Platz, es entsteht kein vierter.
  cy.get('[data-variant-index="2"]').click();cy.get('#shareNumber').clear().type('70');cy.get('[data-remember]').click();
  cy.get('.v3-variants-head').should('contain','Varianten vergleichen');
  cy.get('.v3-variant-row').should('have.length',3).each(row=>{expect(row.find('.v3-compare-metric').length).to.equal(5);});
  cy.contains('Neu').should('not.exist');
  cy.get('.v3-decision-actions button').should('have.length',1).and('contain','Speichern');
  cy.contains('Variante übernehmen').should('not.exist');
  cy.contains('Weiteres Kapital').should('not.exist');
  // Sichtbare Aktionen: aktueller Plan bezeichnet, die anderen zum Übernehmen.
  cy.get('.v3-variant-state').should('have.length',1).and('contain','Aktueller Plan');
  cy.get('.v3-variant-adopt').should('have.length',2).each(button=>expect(button.text().trim()).to.equal('Übernehmen'));
  cy.get('[data-adopt-variant="35"]').click();cy.get('#previewStatus').should('have.text','Dein aktueller Plan');
  cy.get('[data-save]').click();stored((s,w)=>{expect(s.details.pension.pkShare).eq(35);expect(s.v3Variants).deep.eq([0,35,70]);expect(w.localStorage.getItem('retirement-v2-plan')).eq('V2 remains untouched');});
  cy.get('#shareNumber').clear().type('99');cy.reload();cy.get('#shareNumber').should('have.value','35');
  cy.get('[data-compare]').click();cy.get('h1').should('have.text','Varianten vergleichen');
  cy.get('.v3-compare-sub').should('contain','Ausgangslage deiner Planung');
  cy.get('.v3-compare-chevron').should('have.length',3);
  cy.get('.v3-compare-start h3').should('contain','Ausgangslage zum Start der Pensionierung (Alter 65)');
  cy.get('.v3-compare-start .v3-pot-heading').should('contain','Total').and('contain','CHF');
  cy.get('.v3-compare-start .v3-pot-tiles li').should('have.length',3);
  cy.get('.v3-compare-start').should('contain','Geldmarkt').and('contain','Obligationen').and('contain','Wertschöpfung').and('contain','Total');
  cy.get('.v3-compare-note').should('contain','zuerst aus dem Geldmarkttopf genommen');
  cy.get('.v3-chart-body').should('not.be.visible');
  cy.get('[data-chart-toggle]').first().click();
  cy.get('[data-chart-share]').should('have.length',3);cy.get('[data-chart-share="35"]').should('have.attr','stroke-width','3.5');
  cy.get('[data-chart-share="0"]').should('have.attr','stroke-width','1.8');cy.get('[data-chart-share="70"]').should('have.attr','stroke-dasharray','2 6');
  cy.get('[data-chart-tick-age="95"]').should('exist');cy.get('.v3-chart-legend').should('contain','0 %').and('contain','35 %').and('contain','70 %');
  cy.get('[data-compare-share="70"]').click();cy.get('[data-adopt-compare]').should('not.be.disabled').click();
  cy.get('#previewStatus').should('not.exist');
  cy.get('.v3-compare-start .v3-pot-heading').should('contain','Startkapital');
  cy.get('.v3-compare-metric').should('have.length',15);
  cy.contains('So funktioniert der Variantenvergleich').should('exist');
  cy.contains('Planung Jahr für Jahr').should('exist');
  cy.document().then(d=>expect(d.documentElement.scrollWidth).lte(width));
  cy.reload();cy.get('h1').should('have.text','Varianten vergleichen');
 });
 it('edits PK data in one place, recalculates all variants, cancels drafts, and opens the net breakdown',()=>{
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
 it('consolidates 3a once, keeps property separate and persists optional assets',()=>{
  seed('pre','ZH',true);menu('assets');cy.contains('3a-Bezugssteuer wird nicht modelliert').should('exist');cy.contains('Säule 3a netto').should('not.exist');
  cy.get('[data-asset="otherAssets"]').click();cy.get('#asset-input-otherAssets').clear().type('40000');cy.get('[data-asset-form="otherAssets"]').submit();
  cy.get('[data-asset="otherAssets"]').should('contain',"CHF 40'000");
  cy.get('[data-open-vorsorge="pension3a"]').click();cy.get('#p3').should('have.value',"100'000");cy.get('#p3ModeField').should('not.exist');
  cy.get('#p3').clear().type('120000');cy.get('#v3DetailForm').submit();
  cy.window().then(w=>{const p=w.V3.planFor(0),C=w.RetirementCalculator,a=C.calculateAvailableCapital(p),v=C.calculateRetirementStart(p);expect(a.totalInvestableCapital).closeTo(v.cash+v.sec+v.p3,1e-6);expect(a.boundCapital).eq(500000);expect(C.simulationInput(p).capitalInjections).deep.eq({});});
  cy.get('[data-save]').click();cy.reload();menu('assets');cy.get('[data-asset="otherAssets"]').should('contain',"CHF 40'000");
 });
 it('shows taxes open without canton and preserves consolidated post-retirement assets',()=>{
  seed('pre','');cy.get('#previewReadout').should('contain','PK-Kapital brutto').and('contain','Steuern offen');
  cy.get('[data-pk-breakdown]').click();cy.get('[data-pk-net]').should('have.text','Steuern offen');cy.get('[data-detail-back]').click();
  menu('personal');cy.get('.canton-trigger').click();cy.get('[data-code="ZH"]').click();cy.get('#v3DetailForm').submit();cy.get('#previewReadout').should('contain','PK-Kapital netto');
  seed('post','ZH',true);cy.get('#shareRange').should('not.exist');menu('assets');cy.get('#assetTotal').should('contain',"CHF 230'000");cy.get('[data-open-vorsorge="pension3a"]').should('not.exist');
  cy.document().then(d=>expect(d.documentElement.scrollWidth).lte(width));
 });
 it('shows one planning year as a dashboard and returns to the comparison chart',()=>{
  seed();cy.get('[data-compare]').click();cy.get('[data-v3-next="years"]').click();
  cy.get('h1').should('have.text','Planung Jahr für Jahr');
  cy.get('.v3-year-pill').should('contain','Nur PK-Rente');
  cy.get('#yearAgeLabel').should('have.text','Alter 66');
  cy.get('.v3-year-nav-labels').should('contain','Pensionierung').and('contain','Alter 95');
  // Block 0 ist das Vermögen am Jahresanfang, danach die vier nummerierten Blöcke.
  cy.get('.v3-year-block').should('have.length',5);
  cy.get('.v3-year-block').eq(0).should('contain','Vermögen am Jahresanfang (Alter 66)');
  cy.get('.v3-year-block').eq(0).find('.v3-pot-heading').should('contain','Total').and('contain','CHF');
  cy.get('.v3-year-block').eq(0).find('.v3-pot-tiles li').should('have.length',3);
  cy.get('.v3-year-block').eq(1).should('contain','Dein Einkommen').and('contain','Renten & weitere Einnahmen').and('contain','Netto verfügbar');
  cy.get('.v3-year-block').eq(2).should('contain','Dein Bedarf').and('contain','Lebenshaltung (nach Steuern)').and('contain','Fehlbetrag');
  cy.get('.v3-year-block').eq(3).should('contain','So deckst du den Fehlbetrag').and('contain','Der Fehlbetrag wird aus dem Geldmarkttopf entnommen.').and('contain','Bestand Anfang Jahr').and('contain','Entnahme').and('contain','Bestand Ende Jahr');
  cy.get('.v3-pot-card').should('have.length',3).and('contain','Geldmarkt').and('contain','Obligationen').and('contain','Wertschöpfung');
  cy.get('.v3-pot-card.active').should('have.length',1);
  cy.get('.v3-pot-card.active .v3-pot-line.negative strong').should('contain','−');
  cy.get('.v3-year-block').eq(4).should('contain','Dein Vermögen Ende Alter 66').and('contain','gegenüber Jahresbeginn');
  cy.get('.v3-year-legend li').should('have.length',3);
  cy.get('.v3-year-detail').should('not.have.attr','open');
  cy.window().then(w=>{
   const row=w.RetirementCalculator.evaluatePlan(w.V3.planFor(0)).yearlyProjection[0];
   // Die Entnahmen der drei Töpfe ergeben zusammen den Kapitalbedarf des Jahres.
   expect(row.takes.reduce((a,b)=>a+b,0)).to.be.closeTo(row.withdrawal,1e-6);
   cy.get('.v3-year-wealth strong').should('have.text',`CHF ${Math.round(row.end).toLocaleString('de-CH').replace(/’/g,"'")}`);
  });
  cy.get('.v3-year-foot [data-year-forward]').click();cy.get('#yearAgeLabel').should('have.text','Alter 67');
  cy.get('.v3-year-foot [data-year-prev]').click();cy.get('#yearAgeLabel').should('have.text','Alter 66');
  cy.get('[data-year-play]').click();cy.wait(1300);cy.get('#yearAgeLabel').should('have.text','Alter 67');cy.get('[data-year-play]').click();
  cy.get('[data-year-back]').click();cy.get('h1').should('have.text','Varianten vergleichen');
  cy.get('[data-chart-toggle]').first().click();cy.get('[data-chart-share]').should('have.length',3);
  cy.document().then(d=>expect(d.documentElement.scrollWidth).lte(width));
 });
 it('does not overwrite future or corrupt stored versions',()=>{
  for(const raw of ['{broken',JSON.stringify({version:99,state:{}})]){
   cy.visit('/v3.html',{onBeforeLoad(w){w.localStorage.setItem('retirement-v3-plan',raw);}});
   cy.get('#v3Error').should('not.be.empty');cy.window().then(w=>{w.V3.save();expect(w.localStorage.getItem('retirement-v3-plan')).eq(raw);});
  }
 });
});
