describe('Product rules and complete local restoration',()=>{
 for(const [mode,width] of [['pre',1280],['post',390]])it(`${mode}: complete flow, edits, save, reload and migrate at ${width}px`,()=>{
  cy.viewport(width,900);cy.visit('/');
  cy.get('#exampleNotice').should('be.visible');
  cy.get(`.answer-card[onclick="chooseMode('${mode}')"]`).click();
  cy.get('[data-screen="ageNow"]').should('have.class','active');
  cy.get('[data-screen="ageNow"] select').select('AR');
  cy.get('#exampleNotice').should('not.be.visible');
  const steps=mode==='pre'?['ageNow','assets','build','income','need','horizon','pk']:['ageNow','postIncome','postAssets','need','horizon'];
  for(const screen of steps){
   cy.get(`[data-screen="${screen}"]`).should('have.class','active');
   cy.get(`[data-screen="${screen}"]`).then(el=>el.find('input').each((_,input)=>expect(input.getAttribute('aria-label')).to.be.a('string').and.not.empty));
   cy.get(`[data-screen="${screen}"] .actions .primary`).click();
  }
  cy.get('[data-screen="result"]').should('have.class','active');
  cy.get('.completion-row').should('contain','Deine erste Planung steht.');
  cy.get('[data-tab="ass"]').click();
  cy.get('#plan-need').clear().type('97500');
  cy.get('#need2').clear().type('85000');cy.get('#need3').clear().type('75000');
  cy.contains('#planningForm summary','Zusätzliche zeitlich begrenzte Einnahmen').click();
  cy.get('#extra-name-0').type('Zusatzleistung');cy.get('#extra-amount-0').clear().type('4000');
  cy.get('#planningForm .primary').click();
  ['pots','dev','ass','edit','overview'].forEach(name=>{
   cy.get(`[data-tab="${name}"]`).click();
   cy.window().then(w=>expect(w.document.documentElement.scrollWidth).to.be.at.most(width));
  });
  let before,projection;
  cy.window().then(w=>{before=w.eval('JSON.stringify(st)');projection=JSON.stringify(w.planProjection());});
  cy.get('.completion-actions .secondary').should('have.text','Auf diesem Gerät speichern').click();
  cy.get('#personalSaveMessage').should('have.text','✓ Dein Stand wurde auf diesem Gerät gespeichert.');
  cy.get('.completion-row').scrollIntoView();cy.screenshot('saved-'+mode,{capture:'viewport'});
  cy.get('.personal-save-box [data-personal-date]').should('contain','Zuletzt gespeichert:');
  cy.reload();
  cy.get('[data-screen="start"] [data-personal-load]').should('be.visible').click();
  cy.window().then(w=>{expect(w.eval('JSON.stringify(st)')).to.equal(before);expect(JSON.stringify(w.planProjection())).to.equal(projection);});
  cy.get('#exampleNotice').should('not.be.visible');
  // Compatibility across a deployment/schema upgrade: load the previous v1 envelope.
  cy.window().then(w=>{const saved=JSON.parse(w.localStorage.getItem('retirement-personal-snapshot-v1'));saved.version=1;w.localStorage.setItem('retirement-personal-snapshot-v1',JSON.stringify(saved));});
  cy.reload();cy.get('[data-screen="start"] [data-personal-load]').click();
  cy.window().then(w=>expect(JSON.stringify(w.planProjection())).to.equal(projection));
  cy.get('[data-tab=dev]').click();cy.contains('#planRisks summary','Was passiert').click();cy.contains('#planRisks summary','Jahresrechnung prüfen').click();
  cy.window().then(w=>{expect(w.document.documentElement.scrollWidth).to.be.at.most(width);if(width<600)expect(w.document.querySelector('#planRisks .plan-table').scrollWidth).to.be.at.most(width);});
  cy.get('#planRisks').scrollIntoView();cy.screenshot('yearly-'+mode,{capture:'viewport'});
 });
 it('shows storage errors and preserves a valid personal save',()=>{
  cy.visit('/');cy.window().then(w=>w.eval("st=structuredClone(D);st.mode='pre';st.canton='AR';st.exampleValues=false;ensurePlan();ui();renderResult();show('result');"));
  cy.get('.completion-actions .secondary').click();
  cy.window().then(w=>{const original=w.Storage.prototype.setItem;cy.stub(w.Storage.prototype,'setItem').callsFake(function(key,value){if(key==='retirement-personal-snapshot-v1')throw Error('Speicher voll');return original.call(this,key,value);});});
  cy.get('.completion-actions .secondary').click();cy.get('#personalSaveMessage').should('contain','Speichern nicht möglich');
  cy.reload();cy.window().then(w=>w.localStorage.setItem('retirement-personal-snapshot-v1','broken'));
  cy.get('[data-screen="start"] [data-personal-load]').click();
  cy.get('[data-screen="start"] [data-storage-message]').should('contain','Laden nicht möglich');
 });
 it('explains the actual tax and splits net income without double counting',()=>{
  cy.visit('/');cy.window().then(w=>{
   w.eval("st=structuredClone(D);st.mode='post';st.canton='AR';st.post.ahv=30000;st.post.pkRent=20000;st.post.other=0;st.post.otherIncome=10000;ensurePlan();ui();renderResult();show('result');");
   const first=w.planProjection()[0];
   expect(first.estimatedIncomeTax).to.equal(8100);
   expect(w.document.getElementById('rIncomeTotal').textContent).to.equal(w.eval('CHFJ(51900)'));
   expect(w.document.getElementById('rRent').textContent).to.equal(w.eval('CHFJ(43250)'));
   expect(w.document.getElementById('rOther').textContent).to.equal(w.eval('CHFJ(8650)'));
  });
  cy.get('#resultTaxes .tax-info summary').first().click();
  cy.get('#resultTaxes .tax-info').first().should('contain','CHF 60’000').and('contain','CHF 8’100').and('contain','13,5 %').and('not.contain','Aktuelle Stufe');
 });
});
