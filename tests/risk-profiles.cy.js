describe('Investment assumptions without profile selection',()=>{
 for(const [mode,width] of [['pre',1280],['post',390]])it(`${mode}: scenarios, PK and saved legacy profiles without selectors`,()=>{
  cy.viewport(width,900);cy.visit('/');
  for(const key of ['cautious','balanced','growth']){
   // Existing profiles remain readable; the product no longer offers these choices.
   cy.window().then(w=>w.eval(`st=structuredClone(D);st.mode='${mode}';st.canton='AR';st.currentAge=65;st.retirementAge=65;st.planningAge=85;st.horizonMode='saved';delete st.horizonReference;st.need=55000;ensurePlan();st=RetirementCalculator.toState(RetirementCalculator.withReturnProfile(RetirementCalculator.fromState(st),'${key}'));CheckUI.go('scenarios');`));
   cy.get('button[data-profile],.risks,#profileComparison').should('not.exist');
   cy.get('#chart').should('be.visible');
   let expected;
   cy.window().then(w=>{
    const plan=w.CheckUI.getPlan(),result=w.CheckUI.getResult(),pess=w.planProjection('historicalPessimistic'),opt=w.planProjection('historicalOptimistic');
    expected=JSON.stringify({plan,result,pess,opt});
    const c=w.document.getElementById('chart'),chf=v=>w.eval(`CHF(${v})`);
    expect(c.dataset.profile).to.equal(key);expect(c.dataset.endAge).to.equal('85');
    expect(w.document.getElementById('ve').textContent).to.equal(chf(opt.at(-1).free));
    expect(w.document.getElementById('se').textContent).to.equal(chf(pess.at(-1).free));
    expect(w.document.querySelector('#ae').closest('.hcard').querySelector('[data-base]').textContent).to.equal('Basis: '+chf(result.capitalAtTargetAge));
    expect(w.document.getElementById('v0').textContent).to.equal(chf(result.availableCapital));
    expect(Number(c.dataset.scaleMax)).to.be.at.least(Math.max(...pess.map(r=>r.free),...opt.map(r=>r.free),...result.yearlyProjection.map(r=>r.free)));
    expect(w.document.documentElement.scrollWidth).to.be.at.most(width);
   });
   cy.contains('#planRisks summary','Was passiert').click();
   cy.window().then(w=>{
    expect(w.document.getElementById('planRisks').textContent).to.include(w.eval(`CHF(${w.planProjection('historicalPessimistic').at(-1).free})`));
    w.CheckUI.go('capital');expect(w.planningInput().capital).to.equal(w.CheckUI.getResult().availableCapital);
    if(mode==='pre'){w.CheckUI.go('pension');expect(w.document.querySelectorAll('.risks,button[data-profile]').length).to.equal(0);}
    w.CheckUI.go('plan');
   });
   cy.get('#checkApp [data-action=save]').click();cy.reload();cy.get('#checkApp [data-action=load]').click();
   cy.window().then(w=>{
    const before=JSON.parse(expected);before.plan.metadata.exampleValues=false;
    expect(JSON.parse(JSON.stringify({plan:w.CheckUI.getPlan(),result:w.CheckUI.getResult(),pess:w.planProjection('historicalPessimistic'),opt:w.planProjection('historicalOptimistic')}))).to.deep.equal(before);
   });
  }
 });
});
