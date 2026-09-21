describe('V2: composition one tap from the compact plan',()=>{
 const money=n=>'CHF '+Math.round(n).toLocaleString('de-CH').replace(/’/g,"'");
 function seed(mode){
  cy.visit('/v2.html');cy.window().then(w=>{
   const M=w.CheckV2State;let s=M.fresh(mode);
   const groups={time:mode==='pre'?{age:60,retirement:65}:{age:70},need:{need:5000},regular:{canton:'SG',ahv:2500,other:100,additional:300},free:{free:200000},assets:{cash:50000,securities:150000,saving:0,otherAssets:0,propertyValue:800000,mortgage:300000},pension:mode==='pre'?{pk:500000,pkContrib:20000,pkShare:50}:{pkRent:1500}};
   if(mode==='pre')groups.pension3a={p3:100000,p3Contrib:7000};
   for(const [g,v] of Object.entries(groups))s=M.apply(s,g,v);
   s=M.apply(s,'assumptions',{...M.defaults,targetAge:s.targetAge,reviewed:true});s.position='plan';M.save(w.localStorage,s,'system');
  });cy.reload();cy.get('[data-resume]').click();
 }
 for(const mode of ['pre','post'])for(const width of [390,1280])it(`${mode} ${width}: matching totals, tax, bound property, mechanics and saved details`,()=>{
  cy.viewport(width,844);seed(mode);
  cy.get('.detail-list,.bucket-flow').should('not.exist');
  cy.get('[data-metric=income]').should('contain','nach geschätzten Steuern');
  let net,total;
  cy.get('[data-metric=income] strong').invoke('text').then(t=>net=t);
  cy.get('[data-metric=capital] strong').invoke('text').then(t=>total=t);
  cy.get('[data-metric=income]').click();
  cy.get('h1').should('have.text','Deine Einkommen im Ruhestand');
  cy.get('[data-nav=plan]').should('have.attr','aria-current','page');
  cy.get('[data-detail=income-net] strong').should(el=>expect(el.text()).to.equal(net));
  cy.get('.canton-line').should('contain','St. Gallen');
  cy.window().then(w=>{
   const r=w.CheckV2.getResult();cy.get('[data-detail=income-tax]').should('contain',money(r.incomeTax/12)).and('contain',money(r.incomeTax));
  });
  cy.screenshot(`income-${mode}-${width}`,{capture:'fullPage'});
  cy.reload();cy.get('[data-resume]').click();cy.get('h1').should('have.text','Deine Einkommen im Ruhestand');
  // The canton is mandatory for new input: it can be changed but not cleared. A stand saved
  // before that rule keeps loading and shows the tax explicitly as open.
  cy.get('[data-open=tax]').click();cy.get('.canton-option[data-code=""]').should('not.exist');
  cy.get('.canton-trigger').click();cy.get('.canton-option[data-code="ZH"]').click();cy.get('#question').submit();
  cy.window().then(w=>{const r=w.CheckV2.getResult();cy.get('[data-detail=income-tax]').should('contain',money(r.incomeTax/12)).and('contain',money(r.incomeTax));});
  cy.window().then(w=>{const record=JSON.parse(w.localStorage.getItem('retirement-v2-plan'));record.state.canton='';if(record.state.details.income)record.state.details.income.canton='';w.localStorage.setItem('retirement-v2-plan',JSON.stringify(record));});
  cy.reload();cy.get('[data-resume]').click();
  cy.get('[data-detail=income-tax]').should('contain','Steuern noch offen').and('not.contain','CHF 0');
  cy.get('[data-detail=income-net]').should('contain','Vorläufig verfügbar');
  cy.get('[data-parent=plan]').click();cy.get('.quality-plan strong').should('not.contain','Gut abgestützt');
  cy.get('.funding').should('have.attr','data-status','pending');
  cy.get('[data-metric=income]').should('contain','Steuern noch offen');
  cy.get('[data-metric=income]').click();cy.get('[data-open=tax]').click();cy.get('.canton-trigger').click();cy.get('.canton-option[data-code="SG"]').click();cy.get('#question').submit();
  cy.get('[data-detail=income-net] strong').should(el=>expect(el.text()).to.equal(net));
  cy.get('[data-parent=plan]').click();cy.get('[data-metric=capital]').click();
  cy.get('h1').should('have.text','Dein verfügbares Vermögen');
  cy.get('[data-nav=plan]').should('have.attr','aria-current','page');
  cy.get('[data-detail=assets-total] strong').should(el=>expect(el.text()).to.equal(total));
  cy.get('[data-detail=bound-assets]').should('contain',"CHF 500'000");
  cy.get('.bucket-flow').should('not.exist');
  if(mode==='post')cy.get('[data-detail=p3-assets],[data-detail=pk-assets]').should('not.exist');
  else cy.get('[data-detail=pk-assets]').should('contain','netto nach Bezugssteuer');
  cy.screenshot(`assets-${mode}-${width}`,{capture:'fullPage'});
  cy.get('[data-view=asset-funding]').click();cy.get('.bucket-flow li').should('have.length',4);
  cy.get('[data-nav=plan]').should('have.attr','aria-current','page');
  cy.get('[data-parent=assets-detail]').click();cy.get('[data-asset=otherAssets]').click();
  cy.get('[name=otherAssets]').clear().type('30000');cy.get('[data-asset-form]').submit();
  cy.get('[data-detail=other-assets]').should('contain',"CHF 30'000");
  cy.get('[data-detail=bound-assets]').should('contain',"CHF 500'000");
  cy.window().then(w=>{
   const r=w.CheckV2.getResult();cy.get('[data-detail=assets-total]').should('contain',money(r.availableCapital));
   expect(w.document.documentElement.scrollWidth).to.be.at.most(width);
  });
  cy.reload();cy.get('[data-resume]').click();cy.get('h1').should('have.text','Dein verfügbares Vermögen');
  cy.get('[data-detail=other-assets]').should('contain',"CHF 30'000");
 });
});
