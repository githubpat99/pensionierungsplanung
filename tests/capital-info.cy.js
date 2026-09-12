describe('Capital focus and on-demand explanations',()=>{
 for(const mode of ['pre','post'])for(const width of [390,1280])it(`${mode} at ${width}: secondary property, accessible exclusive help and unchanged results`,()=>{
  cy.viewport(width,900);cy.visit('/');let before;
  cy.window().then(w=>{w.eval(`st=structuredClone(D);st.mode='${mode}';st.canton='AR';ensurePlan();CheckUI.go('capital');`);before=JSON.stringify(w.CheckUI.getResult());});
  cy.get('#financeBound .finance-cylinder,#financeBound .finance-panel').should('not.exist');
  cy.get('#financeBound').should('contain','Gebundenes Kapital');
  cy.get('.finance-capital-header').should('contain','Verfügbares Anlagekapital').and('contain',mode==='pre'?'Start bei Pensionierung':'Start heute');
  cy.window().then(w=>{
   const rows=w.document.querySelectorAll('.finance-funding-row');
   expect([...rows].map(x=>x.id)).to.deep.equal(['financeNeed','financeIncome','financeWithdrawal']);
   const shown=w.eval("RetirementEngine.simulate(financingPreview.input,financingPreview.scenario)[0]");
   [shown.need,shown.rent,shown.withdrawal].forEach((value,i)=>{
    expect(rows[i].textContent).to.include(w.eval('CHF')(value));
    expect(rows[i].textContent).to.include(w.eval('CHF')(value/12));
    expect(rows[i].textContent).to.include('/ Jahr').and.include('/ Monat');
   });
   if(width===390){
    expect(w.document.querySelector('.finance-cylinder').getBoundingClientRect().height).to.be.at.most(70);
    expect(w.document.getElementById('financeBound').getBoundingClientRect().top).to.be.at.least(w.document.querySelector('.finance-open').getBoundingClientRect().bottom);
   }
  });
  cy.get('.finance-pot').should('have.length',3);cy.get('#financeHelp').should('not.be.visible');
  const labels=['Verfügbares Anlagekapital erklären','Topf 3 – Wachstum erklären','Topf 2 – Anleihen erklären','Topf 1 – Geldmarkt erklären','Gebundenes Immobilienkapital erklären'];
  for(const label of labels){
   cy.get(`[data-finance-help][aria-label="${label}"]`).click().should('have.attr','aria-expanded','true');
   cy.get('#financeHelp').should('be.visible');cy.get('[data-finance-help][aria-expanded=true]').should('have.length',1);
   cy.window().then(w=>expect(w.document.documentElement.scrollWidth).to.be.at.most(width));
  }
  cy.get('#financeHelp').should('contain','nicht für laufende Entnahmen');
  cy.get('[data-finance-help-close]').click();cy.get('#financeHelp').should('not.be.visible');
  cy.get('[aria-label="Topf 1 – Geldmarkt erklären"]').focus().type('{enter}');cy.get('#financeHelp').should('be.visible');
  cy.get('[aria-label="Topf 1 – Geldmarkt erklären"]').type('{esc}');cy.get('#financeHelp').should('not.be.visible');
  cy.get('[aria-label="Gebundenes Immobilienkapital erklären"]').click();
  cy.window().then(w=>{w.changeFinancing('phase','1');expect(w.document.querySelectorAll('#financeHelp').length).to.equal(1);expect(JSON.stringify(w.CheckUI.getResult())).to.equal(before);w.renderFinancingView();});
  cy.window().then(w=>{
   const bound=w.document.getElementById('financeBound').getBoundingClientRect(),model=w.document.getElementById('financeModel').getBoundingClientRect();expect(bound.top).to.be.at.least(model.bottom);
   expect(w.getComputedStyle(w.document.querySelector('#financeBound strong')).fontSize).to.equal('13px');
   expect(JSON.stringify(w.CheckUI.getResult())).to.equal(before);
  });
  if(width===1280){cy.get('#financeDialog .finance-info summary').click();cy.get('[aria-label="Verfügbares Anlagekapital erklären"]').click();cy.get('#financeDialog .finance-info').should('not.have.attr','open');cy.get('[data-finance-help-close]').click();}
  cy.get('#planOverview').screenshot(`capital-focus-${mode}-${width}`);
 });
});
