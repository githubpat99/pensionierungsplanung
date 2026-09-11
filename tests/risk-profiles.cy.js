describe('Profile-dependent growth curves',()=>{
 for(const [mode,width] of [['pre',1280],['post',390]])it(`${mode}: live curves, common scale, consistent amounts and full profile restoration`,()=>{
  cy.viewport(width,900);cy.visit('/');
  cy.window().then(w=>w.eval(`st=structuredClone(D);st.mode='${mode}';st.canton='AR';st.currentAge=65;st.retirementAge=65;st.planningAge=85;st.need=55000;ensurePlan();CheckUI.go('scenarios');`));
  const images=[],ends=[];let scale;
  for(const key of ['cautious','balanced','growth']){
   cy.get(`#checkApp > .check-profiles [data-profile=${key}]`).click();
   cy.get(`#checkApp > .check-profiles [data-profile=${key}]`).should('have.attr','aria-pressed','true');
   cy.get('#chart').should('be.visible');
   let expected;
   cy.window().then(w=>{
    const plan=w.CheckUI.getPlan(),result=w.CheckUI.getResult(),pess=w.planProjection('historicalPessimistic'),opt=w.planProjection('historicalOptimistic');
    expected=JSON.stringify({plan,result,pess,opt});
    const c=w.document.getElementById('chart');images.push(c.toDataURL());
    if(scale===undefined)scale=c.dataset.scaleMax;expect(c.dataset.scaleMax).to.equal(scale);
    expect(c.dataset.profile).to.equal(key);expect(c.dataset.endAge).to.equal('85');expect(c.dataset.capitalBasis).to.equal('available');ends.push(opt.at(-1).free);
    const chf=v=>w.eval(`CHF(${v})`);
    expect(w.document.getElementById('ve').textContent).to.equal(chf(opt.at(-1).free));
    expect(w.document.getElementById('se').textContent).to.equal(chf(pess.at(-1).free));
    expect(w.document.querySelector(`[data-comparison=${key}] [data-unfavourable]`).textContent).to.equal(chf(pess.at(-1).free));
    expect(w.document.querySelector(`[data-comparison=${key}] [data-favourable]`).textContent).to.equal(chf(opt.at(-1).free));
    expect(w.document.querySelector('.profile-result').classList.contains(result.assessment)).to.equal(true);
    expect(w.document.querySelector(`[data-comparison=${key}] [data-baseline]`).textContent).to.equal(chf(result.capitalAtTargetAge));
    expect(w.document.getElementById('v0').textContent).to.equal(chf(result.availableCapital));
    expect(w.document.querySelector('.profile-result').textContent).to.include(chf(result.capitalAtTargetAge));
    const d=w.document.documentElement;expect(d.scrollWidth).to.be.at.most(d.clientWidth);
   });
   cy.contains('#planRisks summary','Was passiert').click();
   cy.window().then(w=>{
    const text=w.document.querySelector('#planRisks .plan-scenarios tbody tr').textContent;
    expect(text).to.include(w.eval(`CHF(${w.planProjection('historicalPessimistic').at(-1).free})`));
    w.CheckUI.go('capital');
    expect(w.document.getElementById('financeModel').textContent).to.include('Wachstum');
    expect(w.CheckUI.getResult().availableCapital).to.equal(w.planningInput().capital);
    w.CheckUI.go('answer');
   });
   cy.get('#checkApp [data-action=save]').click();
   cy.reload();cy.get('#checkApp [data-action=load]').click();
   cy.window().then(w=>{
    const plan=w.CheckUI.getPlan(),result=w.CheckUI.getResult(),pess=w.planProjection('historicalPessimistic'),opt=w.planProjection('historicalOptimistic');
    // Metadata only records whether these are examples, which saving turns off.
    const before=JSON.parse(expected);before.plan.metadata.exampleValues=false;
    expect(JSON.parse(JSON.stringify({plan,result,pess,opt}))).to.deep.equal(before);
    expect(plan.riskProfile).to.equal(key);
    w.CheckUI.go('scenarios');
   });
   cy.get(`#checkApp > .check-profiles [data-profile=${key}]`).should('have.attr','aria-pressed','true');
  }
  cy.then(()=>{expect(new Set(images).size).to.equal(3);expect(new Set(ends).size).to.equal(3);});
  cy.get('#chart').scrollIntoView();cy.screenshot('growth-chart-'+mode,{capture:'viewport'});
  cy.get('#profileComparison').scrollIntoView();cy.screenshot('profile-comparison-'+mode,{capture:'viewport'});
  if(mode==='pre'){
   cy.viewport(390,844);cy.window().then(w=>w.CheckUI.go('pension'));
   cy.get('.legacy-profile-selector [data-profile=cautious]:visible').click();
   cy.get('.legacy-profile-selector [data-profile=cautious]:visible').should('have.attr','aria-pressed','true');
   cy.get('.legacy-profile-selector:visible').scrollIntoView();cy.screenshot('compact-profile-pension',{capture:'viewport'});
   cy.window().then(w=>{expect(w.CheckUI.getPlan().riskProfile).to.equal('cautious');w.CheckUI.go('capital');});
   cy.get('#checkApp > .check-profiles [data-profile=cautious]').should('have.attr','aria-pressed','true');
   cy.get('#checkApp > .check-profiles .profile-options').should(el=>expect(el[0].getBoundingClientRect().height).to.be.lessThan(90));
   cy.window().then(w=>expect(w.document.documentElement.scrollWidth).to.be.at.most(w.document.documentElement.clientWidth));
   cy.get('#checkApp > .check-profiles').scrollIntoView();cy.screenshot('compact-profile-capital',{capture:'viewport'});
  }
 });
});
