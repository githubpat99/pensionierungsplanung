describe('Product rules and complete local restoration',()=>{
 for(const [mode,width] of [['pre',1280],['post',390]])it(`${mode}: detailed phases, save, reload and migrate at ${width}px`,()=>{
  cy.viewport(width,900);cy.visit('/');
  cy.get(`[data-mode=${mode}]`).click();
  cy.get('#checkForm [name=canton]').select('AR');
  cy.get('#checkForm button[type=submit]').click();
  cy.window().then(w=>w.CheckUI.go('assumptions'));
  cy.get('#plan-need').clear().type('97500');
  cy.get('#need2').clear().type('85000');cy.get('#need3').clear().type('75000');
  cy.contains('#planningForm summary','Zusätzliche zeitlich begrenzte Einnahmen').click();
  cy.get('#extra-name-0').type('Zusatzleistung');cy.get('#extra-amount-0').clear().type('4000');
  cy.get('#planningForm .primary').click();cy.get('#checkApp h1').should('have.text','Angaben ändern');
  ['capital','scenarios','assumptions','details','income'].forEach(name=>{
   cy.window().then(w=>{w.CheckUI.go(name);expect(w.document.documentElement.scrollWidth).to.be.at.most(width);});
  });
  let before,projection;
  cy.window().then(w=>{w.CheckUI.go('answer');before=w.CheckUI.getPlan();projection=JSON.stringify(w.planProjection());});
  cy.get('#checkApp [data-action=save]').click();
  cy.get('.check-message').should('have.text','✓ Dein Stand wurde auf diesem Gerät gespeichert.');
  cy.get('.check-storage').should('contain','Zuletzt gespeichert:');
  cy.reload();cy.get('#checkApp [data-action=load]').click();
  cy.window().then(w=>{expect(w.CheckUI.getPlan()).to.deep.equal(before);expect(JSON.stringify(w.planProjection())).to.equal(projection);});
  // Real legacy envelopes: v1/v2 use state; v3 uses plan.
  for(const version of [1,2]){
   cy.window().then(w=>{const saved=JSON.parse(w.localStorage.getItem('retirement-personal-snapshot-v1'));w.localStorage.setItem('retirement-personal-snapshot-v1',JSON.stringify({version,savedAt:saved.savedAt,state:w.RetirementCalculator.toState(before)}));});
   cy.reload();cy.get('#checkApp [data-action=load]').click();
   cy.window().then(w=>expect(JSON.stringify(w.planProjection())).to.equal(projection));
  }
  cy.window().then(w=>w.CheckUI.go('scenarios'));
  cy.contains('#planRisks summary','Was passiert').click();cy.contains('#planRisks summary','Jahresrechnung prüfen').click();
  cy.window().then(w=>{expect(w.document.documentElement.scrollWidth).to.be.at.most(width);if(width<600)expect(w.document.querySelector('#planRisks .plan-table').scrollWidth).to.be.at.most(width);});
 });
 it('shows storage errors and preserves a valid personal save',()=>{
  cy.visit('/');cy.window().then(w=>w.eval("st=structuredClone(D);st.mode='pre';st.canton='AR';st.exampleValues=false;ensurePlan();CheckUI.go('answer');"));
  cy.get('#checkApp [data-action=save]').click();
  let saved;
  cy.window().then(w=>{saved=w.localStorage.getItem('retirement-personal-snapshot-v1');const original=w.Storage.prototype.setItem;cy.stub(w.Storage.prototype,'setItem').callsFake(function(key,value){if(key==='retirement-personal-snapshot-v1')throw Error('Speicher voll');return original.call(this,key,value);});});
  cy.get('#checkApp [data-action=save]').click();cy.get('.check-message').should('contain','Speichern nicht möglich');
  cy.window().then(w=>expect(w.localStorage.getItem('retirement-personal-snapshot-v1')).to.equal(saved));
  cy.reload();cy.window().then(w=>w.localStorage.setItem('retirement-personal-snapshot-v1','broken'));
  cy.get('#checkApp [data-action=load]').click();cy.get('.check-message').should('contain','Laden nicht möglich');
  cy.window().then(w=>{w.localStorage.setItem('retirement-personal-snapshot-v1','{"version":99}');w.eval("st.mode='pre';st.canton='AR';CheckUI.go('answer');");});
  cy.get('#checkApp [data-action=save]').click();cy.get('.check-message').should('contain','Version');
  cy.window().then(w=>expect(w.localStorage.getItem('retirement-personal-snapshot-v1')).to.equal('{"version":99}'));
 });
 it('explains the actual tax and splits net income without double counting',()=>{
  cy.visit('/');cy.window().then(w=>{
   w.eval("st=structuredClone(D);st.mode='post';st.canton='AR';st.post.ahv=30000;st.post.pkRent=20000;st.post.other=0;st.post.otherIncome=10000;ensurePlan();CheckUI.go('income');");
   expect(w.CheckUI.getResult().incomeTax).to.equal(8100);
   expect(w.document.getElementById('rIncomeTotal').textContent).to.equal(w.eval('CHFJ(51900)'));
   expect(w.document.getElementById('rRent').textContent).to.equal(w.eval('CHFJ(43250)'));
   expect(w.document.getElementById('rOther').textContent).to.equal(w.eval('CHFJ(8650)'));
   const sources=w.RetirementCalculator.incomeSourcesAtStart(w.CheckUI.getPlan());
   expect(sources.reduce((total,source)=>total+source.annualIncome,0)).to.equal(60000);
  });
  cy.get('#resultTaxes .income-source').should('have.length',3);
  cy.get('.income-source-summary').should('contain','AHV').and('contain','PK-Rente').and('contain','Weitere Einnahmen').and('contain','CHF 30’000/J.').and('contain','CHF 2’500 / Monat');
  cy.viewport(390,844);cy.get('#resultTaxes').scrollIntoView();cy.screenshot('income-sources-mobile',{capture:'viewport'});
  cy.window().then(w=>{
   w.eval("st.plan.extras=[{name:'Spätere Rente',amount:99999,from:st.currentAge+1,until:100}];CheckUI.go('income');");
   expect(w.CheckUI.getResult().incomeGross).to.equal(60000);
   expect(w.document.documentElement.scrollWidth).to.be.at.most(w.document.documentElement.clientWidth);
  });
  cy.get('.income-source-summary').should('not.contain','Spätere Rente');
  cy.get('#resultTaxes .tax-info summary').first().click();
  cy.get('#resultTaxes .tax-info').first().should('contain','CHF 60’000').and('contain','CHF 8’100').and('contain','13,5 %');
 });
});
