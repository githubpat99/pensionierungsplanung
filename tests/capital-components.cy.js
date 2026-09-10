describe('Investable capital components',()=>{
 it('taxes only PK, preserves private capital for every split and uses the same total in all projections',()=>{
  cy.visit('/');
  cy.window().then(w=>{
   w.eval("st=structuredClone(D);st.mode='pre';st.canton='AR';st.currentAge=65;st.retirementAge=65;st.assets.pk=1100943;st.assets.p3=0;st.assets.sec=323348;st.assets.cash=0;st.assets.re=300000;st.assets.mort=0;st.pkShare=100;ensurePlan();ui();");
   const full=w.capitalComponents();
   expect(full.totalInvestableCapital).to.be.closeTo(1301646,1);
   for(const share of [0,50,100]){
    const c=w.capitalComponents(share),p=w.planningInput(share);
    expect(c.existingFreeCapital).to.equal(323348);
    expect(c.grossPkCapitalWithdrawal).to.equal(1100943*share/100);
    expect(c.pkWithdrawalTax).to.equal(w.TaxModel.calculateCapitalWithdrawalTax('AR',c.grossPkCapitalWithdrawal));
    expect(c.totalInvestableCapital).to.equal(323348+c.netPkCapitalWithdrawal);
    expect(p.capital).to.equal(c.totalInvestableCapital);
    expect(w.RetirementEngine.simulate(p)[0].buckets.reduce((a,b)=>a+b,0)).to.be.closeTo(p.capital,1e-7);
   }
   const p=w.planningInput();
   ['base','historicalPessimistic','historicalOptimistic'].forEach(s=>expect(w.planProjection(s)[0].free).to.equal(p.capital));
   w.eval("st.currentAge=56;st.ass.inflation=2;");
   const future=w.planningInput(),c=w.capitalComponents();
   expect(future.capital).to.be.closeTo(c.totalInvestableCapital,1e-6);
   expect(future.capitalBreakdown.existingFreeCapital+future.capitalBreakdown.netPkCapitalWithdrawal).to.be.closeTo(future.capital,1e-6);
   w.eval("st.mode='post';st.post.free=500000;");
   expect(w.capitalComponents().totalInvestableCapital).to.equal(500000);
   expect(w.capitalComponents().pkWithdrawalTax).to.equal(0);
  });
 });
});
