describe('Feasibility before PK choice',()=>{
  const setup="st=structuredClone(D);st.mode='pre';st.canton='ZG';st.currentAge=65;st.retirementAge=65;st.planningAge=95;st.need=80000;st.assets.pk=1000000;st.assets.p3=0;st.assets.sec=0;st.assets.cash=0;st.income.ahv=0;st.ass.uws=10;st.ass.inflation=0;st.pkShare=100;ensurePlan();st.plan.need2=80000;st.plan.need3=80000;st.plan.returns=[0,0,0];ui();show('pk');";
  it('separates overall feasibility from the current split and keeps the selected state',()=>{
    cy.visit('/');cy.window().then(w=>w.eval(setup));
    cy.get('#planFeasibility').should('contain','Dein Plan geht grundsätzlich auf');
    cy.get('#pkVariantStatus').should('contain','Finanzierungslücke');
    cy.window().then(w=>{
      const before=w.eval('JSON.stringify(st)');w.getPlanFeasibility();
      expect(w.eval('JSON.stringify(st)')).to.equal(before);
      expect(w.makeFlow()).to.deep.equal(['ageNow','assets','build','income','need','horizon','pk']);
    });
    cy.get('#pkSlider').invoke('val',0).trigger('input');
    cy.get('#planFeasibility').should('contain','Dein Plan geht grundsätzlich auf');
    cy.get('#pkVariantStatus').should('contain','Diese Variante reicht bis mindestens Alter 95');
    cy.get('#pkIncomeTaxSummary').should('contain','Geschätzte Steuern');
    cy.window().then(w=>w.eval("st.need=200000;st.plan.need2=200000;st.plan.need3=200000;ui();"));
    cy.get('#planFeasibility').should('contain','noch nicht vollständig').and('contain','Nachhaltig finanzierbar');
    cy.viewport(390,844);
    cy.get('#planFeasibility').should('be.visible');
    cy.get('#pkSlider').should('be.visible');
    cy.window().then(w=>{
      const doc=w.document,ids=['planFeasibility','pkSlider','pkVariantStatus','pkTaxSummary'];
      ids.slice(1).forEach((id,i)=>expect(doc.getElementById(ids[i]).compareDocumentPosition(doc.getElementById(id))&4).to.equal(4));
      expect(doc.documentElement.scrollWidth).to.be.at.most(390);
      w.eval("st.canton=null;ui();");
    });
    cy.get('#planFeasibility').should('contain','Machbarkeit noch offen');
  });
  it('moves from horizon to PK and from PK to results',()=>{
    cy.visit('/');cy.window().then(w=>w.eval(setup+"flow=makeFlow();i=5;showStep();"));
    cy.get('[data-screen="horizon"] .actions .primary').click();
    cy.get('[data-screen="pk"]').should('have.class','active');
    cy.get('[data-screen="pk"] .actions .primary').click();
    cy.get('[data-screen="result"]').should('have.class','active');
  });
});
