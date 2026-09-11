describe('Retirement start and readable development',()=>{
 it('uses retirement capital without pre-retirement deflation and renders responsive charts',()=>{
  cy.visit('/');
  cy.window().then(w=>{
   w.eval("st=structuredClone(D);st.mode='pre';st.canton='AR';ensurePlan();CheckUI.go('scenarios');");
   const p=w.planningInput(),c=w.capitalComponents();
   expect(p.capital).to.equal(c.totalInvestableCapital);
   expect(p.capitalBreakdown.netPkCapitalWithdrawal).to.equal(c.netPkCapitalWithdrawal);
   expect(w.planProjection()[0].buckets.reduce((a,b)=>a+b,0)).to.be.closeTo(p.capital,1e-7);
  });
  cy.get('#resultTaxes').should('not.contain','PK-Kapital netto · heutige Kaufkraft');
  cy.viewport(1280,900);
  cy.window().then(w=>w.renderChart());
  cy.get('#chart').should(el=>expect(el[0].getBoundingClientRect().height).to.equal(350));
  cy.get('.app').should(el=>expect(el[0].getBoundingClientRect().width).to.equal(950));
  cy.get('#devInvestableCapital').should('contain','Verfügbares Anlagekapital');
  cy.get('#chart').scrollIntoView();cy.screenshot('development-desktop',{capture:'viewport'});
  [360,430].forEach(width=>{
   cy.viewport(width,844);cy.window().then(w=>w.renderChart());
   cy.get('#chart').should(el=>expect(el[0].getBoundingClientRect().height).to.equal(280));
   cy.window().then(w=>expect(w.document.documentElement.scrollWidth).to.be.at.most(width));
   cy.get('#chart').scrollIntoView();cy.screenshot('development-mobile-'+width,{capture:'viewport'});
  });
 });
 it('aligns PK, plan, chart and profile values at the target age, including short horizons',()=>{
  cy.visit('/');cy.window().then(w=>{
   w.eval("st=structuredClone(D);st.mode='pre';st.canton='AR';st.need=40000;ensurePlan();CheckUI.go('pension');");
   const amount=w.eval('CHF(CheckUI.getResult().capitalAtTargetAge)');
   expect(w.document.getElementById('planFeasibility').textContent).to.include('Verfügbares Restkapital').and.include(amount);
   w.CheckUI.go('plan');expect(w.document.querySelector('.check-answer').textContent).to.include('Verfügbares Restkapital').and.include(amount);
   for(const years of [1,2,7,30]){
    w.eval(`st.planningAge=st.retirementAge+${years};CheckUI.go('scenarios');`);
    const base=w.planProjection(),opt=w.planProjection('historicalOptimistic'),pess=w.planProjection('historicalPessimistic'),chf=v=>w.eval(`CHF(${v})`);
    const cards=[...w.document.querySelectorAll('.hcard:not(.hidden)')];
    expect(cards.at(-1).textContent).to.include('Alter '+base.at(-1).age).and.include(chf(opt.at(-1).free)).and.include(chf(pess.at(-1).free));
    expect(cards.at(-1).querySelector('[data-base]').textContent).to.equal('Basis: '+chf(base.at(-1).free));
    expect(w.document.querySelector('[data-comparison=balanced] [data-baseline]').textContent).to.equal(chf(base.at(-1).free));
   }
  });
 });

});
