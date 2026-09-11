describe('Optional editing and neutral incomplete results',()=>{
 it('keeps advanced editing accessible and missing-canton results neutral',()=>{
  cy.viewport(390,844);cy.visit('/');
  cy.window().then(w=>w.eval("st=structuredClone(D);st.mode='pre';ensurePlan();CheckUI.go('answer');"));
  cy.get('.check-result').should('have.class','pending').and('contain','Wohnkanton');
  cy.window().then(w=>w.jump('ageNow'));
  cy.get('#prog .progress').should('not.be.visible');
  cy.get('[data-screen="ageNow"] .chat-shell').should('not.be.visible');
  cy.get('#groupEditor [name=canton]').select('AR');
  cy.get('#groupEditor button[type=submit]').click();
  cy.get('#checkApp h1').should('have.text','Angaben ändern');
  cy.window().then(w=>w.CheckUI.go('pension'));
  cy.get('#pkTaxSummary .tax-info').first().find('summary').click();
  cy.get('#pkTaxSummary').should('contain','Modellrechnung');
  cy.window().then(w=>expect(w.document.documentElement.scrollWidth).to.be.at.most(390));
 });
});
