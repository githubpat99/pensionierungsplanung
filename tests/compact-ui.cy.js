describe('Compact UI and completion status',()=>{
 it('uses edit context and keeps missing-canton results neutral',()=>{
  cy.visit('/');
  cy.window().then(w=>w.eval("st=structuredClone(D);st.mode='pre';ensurePlan();ui();jump('ageNow');"));
  cy.get('#ptext').should('have.text','Meine Angaben · Zeitpunkt');
  cy.get('#prog .progress').should('not.be.visible');
  cy.get('[data-screen="ageNow"] .chat-shell').should('not.be.visible');
  cy.get('[data-screen="ageNow"] .tax-canton').find('select').should('have.attr','aria-label','Wohnkanton');
  cy.viewport(390,844);cy.screenshot('compact-edit-mobile',{capture:'viewport'});
  cy.get('[data-screen="ageNow"] .actions .primary').click();
  cy.get('.completion-row').should('have.class','provisional').and('contain','Steuern noch nicht berücksichtigt');
  cy.get('.completion-row .done').should('not.exist');
  cy.get('#resultTaxes').should('not.contain','Kanton fehlt');
  cy.window().then(w=>w.eval("changeTaxCanton('AR');jump('pk');"));
  cy.get('#pkTaxSummary .tax-info').first().find('summary').click();
  cy.get('#pkTaxSummary').should('contain','Modellrechnung');
  cy.window().then(w=>expect(w.document.documentElement.scrollWidth).to.be.at.most(390));
  cy.get('#pkTaxSummary .tax-info').first().find('summary').click();cy.scrollTo('top');
  cy.screenshot('compact-pk-mobile',{capture:'viewport'});
  cy.viewport(1280,900);cy.scrollTo('top');cy.screenshot('compact-pk-desktop',{capture:'viewport'});
  cy.window().then(w=>w.eval("returnToResult=false;i=0;showStep();"));
  cy.get('#ptext').should('contain','Schritt 1');
  cy.get('#prog .progress').should('be.visible');
 });
});
