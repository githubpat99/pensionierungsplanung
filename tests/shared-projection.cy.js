describe('One portrait and consistent tax cashflows',()=>{
 it('shows one missing-canton notice and one header portrait at phone widths',()=>{
  cy.visit('/');
  cy.get('#checkApp h1').should('contain','Reicht mein Geld');
  cy.get('img[src="pin.jpeg"]:visible').should('have.length',1);
  cy.window().then(w=>w.eval("st=structuredClone(D);st.mode='pre';ensurePlan();CheckUI.go('pension');"));
  cy.get('#planFeasibility').should('contain','Wohnsitzkanton');
  cy.get('#pkVariantStatus').should('not.be.visible').and('be.empty');
  [360,390,430].forEach(width=>{
   cy.viewport(width,844);
   cy.window().then(w=>expect(w.document.documentElement.scrollWidth).to.be.at.most(width));
   cy.get('img[src="pin.jpeg"]:visible').should('have.length',1);
  });
  cy.window().then(w=>w.eval("jump('ageNow');"));
  cy.get('#groupEditor [name=canton]').find('option:selected').should('have.text','Bitte auswählen');
  cy.get('#groupEditor [name=canton]').select('AR');cy.get('#groupEditor button[type=submit]').click();
  cy.window().then(w=>w.eval("CheckUI.go('pension');"));
  cy.get('#pkVariantStatus').should('be.visible');
  cy.window().then(w=>w.eval("CheckUI.go('answer');"));
  cy.get('.completion-row img').should('not.exist');
  cy.get('img[src="pin.jpeg"]:visible').should('have.length',1);
 });
 it('uses the same full tax-aware projections for chart and scenario table',()=>{
  cy.visit('/');
  cy.window().then(w=>{
   w.eval("st=structuredClone(D);st.mode='pre';st.canton='AR';ensurePlan();ui();");
   const input=w.planningInput(),base=w.planProjection();
   const evaluated=w.RetirementFeasibility.evaluate(input,50);
   expect(evaluated.rows).to.deep.equal(base);
   const pessimistic=w.planProjection('historicalPessimistic'),optimistic=w.planProjection('historicalOptimistic');
   for(let i=0;i<base.length-1;i++){
    expect(pessimistic[i].estimatedIncomeTax).to.equal(base[i].estimatedIncomeTax);
    expect(optimistic[i].withdrawal).to.equal(base[i].withdrawal);
    expect(pessimistic[i].withdrawal).to.be.closeTo(Math.max(0,base[i].need+base[i].estimatedIncomeTax-base[i].grossIncome),1e-7);
   }
   expect(pessimistic[0].free).to.equal(input.capital);
   const calls=[],original=w.planProjection;
   w.planProjection=function(s){calls.push(s);return original(s);};
   w.renderChart();
   expect(calls).to.include('historicalPessimistic').and.include('historicalOptimistic');
   expect(w.document.querySelector('.chart-context').textContent).to.include('geschätzten Steuern');
   w.eval("CheckUI.go('scenarios');");
  });
  cy.viewport(390,844);cy.scrollTo('top');cy.screenshot('shared-chart-mobile',{capture:'viewport'});
 });
});
