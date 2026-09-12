describe('Automatic Swiss planning horizon',()=>{
 for(const [mode,width] of [['pre',390],['post',1280]])it(`${mode}: automatic ages, manual horizon, drafts and persistence`,()=>{
  cy.viewport(width,900);cy.visit('/');cy.get(`[data-mode=${mode}]`).click();
  cy.get('[name=planningAge],button[data-profile]').should('not.exist');
  cy.get('[name=currentAge]').clear().type(mode==='pre'?'60':'80');cy.get('[name=canton]').select('AR');
  cy.get('#checkForm button[type=submit]').click();
  let target;
  cy.window().then(w=>{target=w.LifeExpectancy.defaultTargetAge(mode==='pre'?60:80,mode==='pre'?65:80);expect(w.CheckUI.getPlan().retirement.targetAge).to.equal(target);});
  cy.get('.check-horizon-note').should('contain','Restlebenserwartung');
  cy.get('[data-action=edit]').click();cy.get('[data-go=assumptions]').click();
  cy.get('#planning-age').then(el=>expect(Number(el.val())).to.equal(target));
  cy.screenshot('horizon-assumptions-'+mode,{capture:'viewport'});
  // Invalid horizon cannot partially save other assumptions.
  cy.get('#planning-age').clear().type('60');cy.get('[onclick="savePlanning()"]').click();
  cy.get('.check-deep-heading h1').should('have.text','Lebensphasen & Annahmen');
  cy.window().then(w=>expect(w.CheckUI.getPlan().retirement.targetAge).to.equal(target));
  cy.get('#planning-age').clear().type('100');cy.get('#checkApp .check-back').click();cy.get('[data-go=assumptions]').click();
  cy.get('#planning-age').should('have.value','100');cy.get('[onclick="savePlanning()"]').click();
  cy.get('[data-go=edit_personal]').click();cy.get('[name=planningAge]').should('not.exist');
  cy.get('[name=currentAge]').clear().type(mode==='pre'?'61':'81');cy.get('#groupEditor button[type=submit]').click();
  cy.get('#checkApp .check-back').click();
  cy.get('.check-lead').should('contain','Alter 100');cy.get('.check-horizon-note').should('contain','gespeicherter');
  cy.window().then(w=>{expect(w.CheckUI.getPlan().metadata.horizonMode).to.equal('manual');expect(w.CheckUI.getPlan().retirement.targetAge).to.equal(100);});
  let result;cy.window().then(w=>result=JSON.stringify(w.CheckUI.getResult()));
  cy.get('[data-action=save]').click();cy.reload();cy.get('[data-action=load]').click();
  cy.window().then(w=>{expect(JSON.stringify(w.CheckUI.getResult())).to.equal(result);expect(w.CheckUI.getPlan().metadata.horizonMode).to.equal('manual');expect(w.document.documentElement.scrollWidth).to.be.at.most(width);});
 });
 it('updates automatic horizons, retains automatic mode on unchanged assumption save, and handles age 100',()=>{
  cy.visit('/');cy.get('[data-mode=post]').click();cy.get('[name=canton]').select('AR');cy.get('#checkForm button[type=submit]').click();
  cy.get('[data-action=edit]').click();cy.get('[data-go=assumptions]').click();cy.get('[onclick="savePlanning()"]').click();
  cy.get('[data-go=edit_personal]').click();cy.get('[name=currentAge]').clear().type('100');cy.get('#groupEditor button[type=submit]').click();
  cy.window().then(w=>{expect(w.CheckUI.getPlan().retirement.targetAge).to.equal(102);expect(w.CheckUI.getPlan().metadata.horizonMode).to.equal('automatic');});
 });
 it('allows returning from a retired plan to the pre-retirement form before correcting retirement age',()=>{
  cy.visit('/');cy.window().then(w=>w.eval("st=structuredClone(D);st.mode='post';st.currentAge=80;ensurePlan();LifeExpectancy.updateAutomatic(st);CheckUI.go('situation');"));
  cy.get('[data-mode=pre]').click();cy.get('#checkForm').should('be.visible');
  cy.get('[name=canton]').select('AR');cy.get('[name=retirementAge]').clear().type('85');cy.get('#checkForm button[type=submit]').click();
  cy.get('.check-answer').should('be.visible');cy.window().then(w=>expect(w.CheckUI.getPlan().retirement.targetAge).to.equal(90));
 });

});
