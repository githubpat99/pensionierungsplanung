describe('Guided V2: confirmed data and financing are separate',()=>{
 const fill=(values)=>Object.entries(values).forEach(([name,value])=>{if(name==='canton'){cy.get('.canton-trigger').click();cy.get(`.canton-option[data-code="${value}"]`).click();}else if(typeof value==='boolean')cy.get(`[name=${name}]`).check();else if(name==='pkShare')cy.get(`[name=${name}]`).invoke('val',value).trigger('input');else cy.get(`[name=${name}]`).clear().type(String(value));});
 function core(mode){
  cy.get(`[data-mode=${mode}]`).click();fill(mode==='pre'?{age:60,retirement:65}:{age:70});cy.get('#question').submit();
  fill({need:7500});cy.get('#question').submit();cy.get('[name=pkRent]').should('not.exist');fill({canton:'',ahv:3430,other:0,additional:0});
  cy.get('[data-metric=income]').should('contain',"− CHF 3'430").and('contain',"− CHF 41'160");
  cy.get('[data-metric=withdrawal]').should('contain',"= CHF 4'070").and('contain',"= CHF 48'840");
  cy.get('#question').submit();fill({free:650000});cy.get('.funding').should('be.visible');if(mode==='pre')cy.screenshot('guided-live-pre',{capture:'fullPage'});cy.get('#question').submit();
 }
 for(const mode of ['pre','post'])for(const width of [360,1280])it(`${mode} ${width}: first answer, grouped refinement, quality, reload and system appearance`,()=>{
  cy.viewport(width,900);cy.visit('/v2.html');
  cy.window().then(w=>w.localStorage.setItem('retirement-personal-snapshot-v1','legacy-preserved'));
  core(mode);
  cy.get('.quality-plan strong').should('contain','Erste Einschätzung');
  cy.get('.funding').should('have.attr','data-status','pending');
  cy.get('#app select').should('not.exist');
  cy.get('#v2Nav [data-nav=pension]').click();
  cy.get('[data-open=pension]').click();
  if(mode==='pre'){
   cy.get('.segmented').should('not.exist');cy.get('.pension-impact').should('not.exist');
   cy.get('[name=pk]').should('be.visible');cy.get('[name=p3]').should('not.exist');
   fill({pk:550000,pkContrib:22000,pkShare:50});
   cy.get('[data-readout=capital] strong').invoke('text').should('not.equal','CHF 0');
   cy.get('[data-readout=rent] strong').invoke('text').should('not.equal','CHF 0');
   if(width===360)cy.screenshot('guided-pension-mobile',{capture:'fullPage'});
  }else{cy.get('[name=pk],[name=pkContrib],[name=p3]').should('not.exist');fill({pkRent:1000});}
  cy.get('#question').submit();
  cy.window().then(w=>{
   const p=w.CheckV2.getPlan(),r=w.CheckV2.getResult();
   expect(r.yearlyProjection).to.deep.equal(w.RetirementEngine.simulate(w.RetirementCalculator.simulationInput(p)));
   if(mode==='pre')expect(r.incomeGross).to.equal(3430*12+w.RetirementCalculator.calculatePension(p).rent);
  });
  if(mode==='pre'){cy.get('#v2Nav [data-nav=pension]').click();cy.get('[data-open=pension3a]').click();fill({p3:120000,p3Contrib:7000});cy.get('#question').submit();}
  cy.get('[data-metric=income]').click();cy.get('[data-open=income]').click();
  fill({canton:'AR',ahv:2350,other:80,additional:0});
  cy.get('#question').submit();cy.get('[data-parent=plan]').click();cy.get('[data-metric=capital]').click();
  cy.get('[data-asset=cash]').click();fill({cash:50000});cy.get('[data-asset-form]').submit();cy.get('[data-asset=securities]').click();fill({securities:600000,...(mode==='pre'?{saving:10000}:{})});cy.get('[data-asset-form]').submit();cy.get('[data-parent=plan]').click();
  cy.get('.quality-plan strong').should('contain','Gute Basis');
  cy.get('[data-metric=capital]').click();
  cy.get('[data-view=asset-funding]').click();cy.get('h1').should('contain','So finanziert dein Vermögen deinen Ruhestand');
  cy.window().then(w=>{
   const r=w.CheckV2.getResult(),cash=n=>'CHF '+Math.round(n).toLocaleString('de-CH').replace(/’/g,"'");
   const texts=[...w.document.querySelectorAll('.bucket-flow strong')].map(el=>el.textContent);
   expect(texts.slice(0,3)).to.deep.equal([r.bucketAllocation[2],r.bucketAllocation[1],r.bucketAllocation[0]].map(cash));
  });
  cy.get('[data-parent=assets-detail]').click();cy.get('[data-parent=plan]').click();
  cy.get('#v2Nav [data-nav=assumptions]').click();cy.get('[name=reviewed]').should('not.exist');cy.get('#question').submit();
  cy.get('.quality-plan strong').should('contain','Gut abgestützt');
  let before;
  cy.window().then(w=>{
   before=JSON.stringify(w.CheckV2.getResult());
   expect(w.document.documentElement.scrollWidth).to.be.at.most(width);
   expect(w.localStorage.getItem('retirement-personal-snapshot-v1')).to.equal('legacy-preserved');
  });
  cy.get('[name=theme]').should('not.exist');
  cy.window().then(w=>w.localStorage.setItem('retirement-v2-theme','dark'));
  cy.reload();cy.get('html').should('have.attr','data-theme','system');cy.get('[data-resume]').click();
  cy.get('.quality-plan strong').should('contain','Gut abgestützt');
  cy.window().then(w=>expect(JSON.stringify(w.CheckV2.getResult())).to.equal(before));
  cy.screenshot(`guided-${mode}-${width}-system`,{capture:'fullPage'});
  cy.window().then(w=>expect(w.getComputedStyle(w.document.documentElement).colorScheme).to.equal(w.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  cy.get('[data-metric=need][data-open=need]').click();fill({need:7600});cy.get('#question').submit();
  cy.get('.quality-plan strong').should('contain','Gute Basis');
 });
 it('resumes only confirmed input and requires confirmation before a new plan',()=>{
  cy.viewport(360,850);cy.visit('/v2.html');cy.get('[data-mode=pre]').click();
  fill({age:70,retirement:65});cy.get('#question').submit();cy.get('[name=retirement]').should('have.attr','aria-invalid','true');
  fill({retirement:70});cy.get('#question').submit();fill({need:9999});cy.reload();
  cy.get('[data-resume]').click();cy.get('[name=need]').should('have.value','');
  fill({need:5000});cy.get('#question').submit();fill({canton:'',ahv:0,other:0,additional:0});cy.get('#question').submit();fill({free:0});cy.get('#question').submit();
  cy.get('.funding').should('contain','bis Alter 70').and('contain','Es fehlen noch');
  cy.window().then(w=>cy.stub(w,'confirm').returns(false).as('confirmation'));
  cy.get('[data-nav=more]').click();cy.get('[data-new]').click();cy.get('h1').should('contain','Mehr');
  cy.get('@confirmation').should('have.been.calledOnce');
  cy.window().then(w=>w.confirm.returns(true));cy.get('[data-new]').click();cy.get('[data-mode]').should('have.length',2);
  cy.window().then(w=>expect(w.localStorage.getItem('retirement-v2-plan')).to.equal(null));
 });
 it('keeps unreadable data intact and reports write failures',()=>{
  cy.visit('/v2.html',{onBeforeLoad(w){w.localStorage.setItem('retirement-v2-plan','{broken');}});
  cy.get('#app').should('contain','nicht lesbar');cy.get('html').should('have.attr','data-theme','system');
  cy.window().then(w=>{expect(w.localStorage.getItem('retirement-v2-plan')).to.equal('{broken');cy.stub(w,'confirm').returns(true);});
  cy.get('[data-new]').click();cy.get('[data-mode=post]').click();
  cy.window().then(w=>cy.stub(w.Storage.prototype,'setItem').throws(new Error('quota')));
  fill({age:70});cy.get('#question').submit();cy.get('#saveStatus').should('contain','Speichern nicht möglich');
  cy.get('[name=need]').should('be.visible');cy.get('[data-home]').click();cy.get('[data-resume]').click();cy.get('[name=need]').should('be.visible');
  cy.window().then(w=>expect(w.CheckV2.getState().values.age).to.equal(70));
 });
});

it('ignores an old manual light preference as well',()=>{
 cy.visit('/v2.html',{onBeforeLoad(w){w.localStorage.setItem('retirement-v2-theme','light');}});
 cy.get('html').should('have.attr','data-theme','system');cy.get('[name=theme]').should('not.exist');
 cy.window().then(w=>expect(w.getComputedStyle(w.document.documentElement).colorScheme).to.equal(w.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
});
