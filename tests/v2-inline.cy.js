describe('V2: edit assets in place and use Vorsorge as the PK source',()=>{
 const money=n=>'CHF '+Math.round(n).toLocaleString('de-CH').replace(/’/g,"'");
 const fill=v=>Object.entries(v).forEach(([k,n])=>cy.get(`[name=${k}]`).clear().type(String(n)));
 for(const mode of ['pre','post'])for(const width of [360,1280])it(`${mode} ${width}: allocation, cancel, errors, drafts, totals and source links`,()=>{
  cy.viewport(width,844);cy.visit('/v2.html');cy.window().then(w=>{
   const M=w.CheckV2State;let s=M.fresh(mode);
   for(const [g,v] of Object.entries({time:mode==='pre'?{age:60,retirement:65}:{age:70},need:{need:5000},regular:{canton:'SG',ahv:2500,other:0,additional:0},free:{free:200000}}))s=M.apply(s,g,v);
   s.position='assets-detail';M.save(w.localStorage,s,'system');
  });cy.reload();cy.get('[data-resume]').click();
  cy.contains('button','Vermögen bearbeiten').should('not.exist');
  cy.get('[data-asset=cash]').should('contain','Noch nicht erfasst').and('contain','Erfassen').focus().should('have.focus').click();
  cy.get('[data-asset=cash]').should('have.attr','aria-expanded','true');
  fill({cash:-1});cy.get('[data-asset-form]').submit();cy.get('[name=cash]').should('have.attr','aria-invalid','true');
  cy.get('[data-detail=assets-total]').should('contain',"CHF 200'000");
  fill({cash:50000});cy.get('[data-nav=more]').click();cy.get('[data-nav=plan]').click();cy.get('[data-metric=capital]').click();
  cy.get('[name=cash]').should('have.value','50000');cy.get('[data-asset-form]').submit();
  cy.get('[data-detail=cash]').should('contain',"CHF 50'000");cy.get('[data-detail=unallocated-assets]').should('contain',"CHF 150'000");
  cy.get('[data-asset=securities]').click();fill({securities:150000,...(mode==='pre'?{saving:0}:{})});cy.get('[data-asset-form]').submit();
  cy.get('[data-detail=unallocated-assets]').should('not.exist');
  let total;
  cy.window().then(w=>{total=w.CheckV2.getResult().availableCapital;expect(w.CheckV2.getState().confirmed.assets).to.equal(true);});
  cy.get('[data-asset=cash]').click();fill({cash:999999});cy.get('[data-asset-cancel]').click();
  cy.get('[data-detail=cash]').should('contain',"CHF 50'000");
  cy.get('[data-asset=cash]').click();fill({cash:70000});cy.get('[data-asset-form]').submit();
  cy.get('[data-detail=assets-total]').should(el=>expect(el.text()).to.contain(money(total+20000)));
  cy.get('[data-asset=property]').click();fill({propertyValue:100000});cy.get('[data-asset-form]').submit();cy.get('[name=mortgage]').should('have.attr','aria-invalid','true');
  fill({mortgage:200000});cy.screenshot(`inline-property-${mode}-${width}`,{capture:'viewport'});cy.get('[data-asset-form]').submit();
  cy.get('[data-detail=bound-assets]').should('contain',"CHF -100'000");
  cy.get('[data-detail=assets-total]').should(el=>expect(el.text()).to.contain(money(total+20000)));
  cy.get('[data-asset=otherAssets]').click();fill({otherAssets:30000});cy.get('[data-asset-form]').submit();
  cy.reload();cy.get('[data-resume]').click();cy.get('[data-detail=other-assets]').should('contain',"CHF 30'000");
  if(mode==='pre'){
   cy.get('[data-detail=p3-assets] [data-open=pension3a]').click();fill({p3:100000,p3Contrib:7000});cy.get('#question').submit();
   cy.get('[data-metric=capital]').click();cy.get('[data-detail=pk-assets] [data-open=pension]').click();
   fill({pk:500000,pkContrib:20000});cy.get('[name=pkShare]').invoke('val',50).trigger('input');
  }else{cy.get('[data-nav=pension]').click();cy.get('[data-open=pension]').click();fill({pkRent:1500});}
  cy.get('#question').submit();cy.get('[data-metric=income]').click();
  cy.window().then(w=>{
   const s=w.CheckV2.getState(),p=w.CheckV2.getPlan();const rent=mode==='pre'?w.RetirementCalculator.calculatePension(p).rent:1500*12;
   expect(w.CheckV2.getResult().incomeGross).to.equal(2500*12+rent);
   expect(s.details.income.pkRent).to.equal(undefined);
   cy.get('[data-detail=pk-income]').should('contain',money(rent/12));
   expect(w.document.documentElement.scrollWidth).to.be.at.most(width);
  });
  cy.get('[data-open=income]').click();cy.get('[name=pkRent]').should('not.exist');
 });
});
