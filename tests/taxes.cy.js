describe('Tax planning integration',()=>{
  it('persists canton, updates PK split, uses net capital, and supports retired plans',()=>{
    cy.visit('/');
    cy.window().then(w=>{
      w.eval("st=structuredClone(D);st.mode='pre';st.currentAge=65;st.retirementAge=65;st.assets.pk=1000000;st.pkShare=100;ui();show('ageNow');");
    });
    cy.get('[data-screen="ageNow"] select[aria-label="Wohnkanton"]').should('have.value','').find('option').should('have.length',27);
    cy.get('[data-screen="ageNow"] select[aria-label="Wohnkanton"]').select('AR');
    cy.window().then(w=>{
      expect(JSON.parse(w.localStorage.getItem('retirementMvp5')).canton).to.equal('AR');
      expect(w.eval('split().netCap')).to.equal(888600);
      expect(w.eval('planningInput().capital')).to.equal(1238600);
      w.show('pk');
    });
    cy.get('#pkTaxSummary').should('contain','111’400').and('contain','888’600');
    cy.get('#pkSlider').invoke('val',50).trigger('input');
    cy.get('#pkTaxSummary').should('contain','49’550').and('contain','450’450');
    cy.window().then(w=>{
      w.eval("renderResult();show('result');");
      expect(w.eval('planProjection()[0].estimatedIncomeTax')).to.be.greaterThan(0);
      w.savePersonalStand();
    });
    cy.reload();
    cy.window().then(w=>{
      expect(w.eval('st.canton')).to.equal('AR');
      expect(w.eval('split().netCap')).to.equal(450450);
      w.eval("st.mode='post';st.post.free=650000;ui();renderResult();show('result');");
      expect(w.eval('planningInput().capital')).to.equal(650000);
    });
    cy.get('#resultTaxes').should('contain','Netto verfügbar').and('not.contain','PK-Kapital brutto');
    cy.viewport(390,844);
    cy.window().then(w=>w.eval("tab('pots',document.querySelector('[data-tab=pots]'))"));
    cy.get('#financeIncome .tax-summary').should('be.visible').and('contain','Geschätzte Steuern');
  });
});
