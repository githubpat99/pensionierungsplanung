describe('New simple check and optional depth',()=>{
 for(const mode of ['pre','post'])it(`${mode}: monthly check, result, optional depth and complete save/load`,()=>{
  cy.viewport(mode==='pre'?1280:390,900);cy.visit('/');
  cy.get('#checkApp h1').should('contain','Reicht mein Geld');
  cy.get('img[src="pin.jpeg"]:visible').should('have.length',1);
  cy.get(`[data-mode=${mode}]`).click();
  cy.get('#checkForm [name=canton]').select('AR');
  cy.get('#checkForm [name=monthlyNeed]').clear().type('6500');
  if(mode==='pre')cy.get('#checkForm [name=pk]').should('be.visible');
  else cy.get('#checkForm [name=pk]').should('not.exist');
  cy.get('#checkForm button[type=submit]').click();
  cy.get('.check-answer').should('be.visible');cy.get('.check-answer-lines article').should('have.length',3);
  cy.get('.tabs:visible').should('not.exist');cy.get('#checkApp').should('contain','CHF 6’500');
  let before;
  cy.window().then(w=>{before=JSON.stringify(w.CheckUI.getResult());expect(w.CheckUI.getResult().monthlyNeed).to.equal(6500);});
  cy.get('#checkApp [data-action=save]').click();cy.get('.check-message').should('contain','gespeichert');
  cy.reload();cy.get('#checkApp [data-action=load]').click();
  cy.window().then(w=>expect(JSON.stringify(w.CheckUI.getResult())).to.equal(before));
  cy.get('#checkApp [data-go=capital]').click();
  cy.get('#financeModel').should('be.visible');
  cy.window().then(w=>expect(w.planningInput().capital).to.equal(w.CheckUI.getResult().availableCapital));
  cy.get('#checkApp [data-go=plan]').click();cy.get('#checkApp [data-go=scenarios]').click();
  cy.get('#chart').should('be.visible');
  cy.window().then(w=>expect(w.document.documentElement.scrollWidth).to.be.at.most(mode==='pre'?1280:390));
  cy.get('#checkApp [data-go=plan]').click();cy.scrollTo('top');cy.screenshot('new-answer-'+mode,{capture:'viewport'});
 });
 it('offers monthly editing, validation and a clear overview on small phones',()=>{
  cy.viewport(360,844);cy.visit('/');cy.screenshot('new-start-mobile',{capture:'viewport'});
  cy.get('[data-mode=pre]').click();cy.get('[name=canton]').select('ZH');
  cy.get('[name=planningAge]').clear().type('60');cy.get('#checkForm button[type=submit]').click();cy.get('#checkFormError').should('contain','Reihenfolge');
  cy.get('[name=planningAge]').clear().type('95');cy.get('#checkForm button[type=submit]').click();
  cy.get('#checkApp [data-action=edit]').click();cy.get('[data-go=edit_income]').click();cy.get('[name=monthlyNeed]').should('have.value','7500');
  cy.window().then(w=>expect(w.document.documentElement.scrollWidth).to.be.at.most(360));
 });
 it('applies return profiles to the common result and fits all navigation states',()=>{
  cy.visit('/');cy.window().then(w=>w.eval("st=structuredClone(D);st.mode='pre';st.canton='AR';st.pkShare=37;ensurePlan();CheckUI.go('basic');"));
  cy.get('#checkForm [name=pkShare]').should('have.value','37');
  cy.get('#checkForm button[type=submit]').click();
  cy.window().then(w=>{expect(w.CheckUI.getPlan().pensionDecision.capitalShare).to.equal(37);w.CheckUI.go('assumptions');});
  const ends=[];
  for(const [profile,rate] of [['cautious',2.5],['balanced',4.5],['growth',6]]){
   cy.get(`#checkApp > .check-profiles [data-profile=${profile}]`).click();cy.get(`#checkApp > .check-profiles [data-profile=${profile}]`).should('have.attr','aria-pressed','true');
   cy.window().then(w=>{expect(w.planningInput().returns[2]).to.equal(rate);ends.push(w.CheckUI.getResult().capitalAtTargetAge);});
  }
  cy.then(()=>{expect(ends[0]).to.be.lessThan(ends[1]);expect(ends[1]).to.be.lessThan(ends[2]);});
  for(const width of [360,768,1280]){
   cy.viewport(width,900);
   for(const state of ['situation','basic','plan','income','capital','scenarios','assumptions','pension','edit_overview','edit_personal','edit_income','edit_assets','edit_pension','advice']){
    cy.window().then(w=>{w.CheckUI.go(state);const doc=w.document.documentElement;expect(doc.scrollWidth,`${state} at ${width}px`).to.be.at.most(doc.clientWidth);});
   }
  }
  cy.window().then(w=>w.CheckUI.go('situation'));cy.screenshot('new-start-desktop',{capture:'fullPage'});
  cy.viewport(390,900);cy.window().then(w=>w.CheckUI.go('answer'));cy.screenshot('new-answer-full-mobile',{capture:'fullPage'});
 });
});
