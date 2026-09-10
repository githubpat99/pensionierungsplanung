describe('Retirement start and readable development',()=>{
 it('uses retirement capital without pre-retirement deflation and renders responsive charts',()=>{
  cy.visit('/');
  cy.window().then(w=>{
   w.eval("st=structuredClone(D);st.mode='pre';st.canton='AR';ensurePlan();ui();renderResult();show('result');tab('dev',document.querySelector('[data-tab=dev]'));");
   const p=w.planningInput(),c=w.capitalComponents();
   expect(p.capital).to.equal(c.totalInvestableCapital);
   expect(p.capitalBreakdown.netPkCapitalWithdrawal).to.equal(c.netPkCapitalWithdrawal);
   expect(w.planProjection()[0].buckets.reduce((a,b)=>a+b,0)).to.be.closeTo(p.capital,1e-7);
  });
  cy.get('#resultTaxes').should('not.contain','PK-Kapital netto · heutige Kaufkraft');
  cy.viewport(1280,900);
  cy.window().then(w=>w.renderChart());
  cy.get('#chart').should(el=>expect(el[0].getBoundingClientRect().height).to.equal(350));
  cy.get('.app').should(el=>expect(el[0].getBoundingClientRect().width).to.equal(900));
  cy.get('#devInvestableCapital').should('contain','Gesamtes Anlagekapital');
  cy.get('#chart').scrollIntoView();cy.screenshot('development-desktop',{capture:'viewport'});
  [360,430].forEach(width=>{
   cy.viewport(width,844);cy.window().then(w=>w.renderChart());
   cy.get('#chart').should(el=>expect(el[0].getBoundingClientRect().height).to.equal(280));
   cy.window().then(w=>expect(w.document.documentElement.scrollWidth).to.be.at.most(width));
   cy.get('#chart').scrollIntoView();cy.screenshot('development-mobile-'+width,{capture:'viewport'});
  });
 });
});
