describe('Guided V2: confirmed data and financing are separate',()=>{
 const fill=(values)=>Object.entries(values).forEach(([name,value])=>{if(name==='canton')cy.get(`[name=${name}]`).select(value);else if(typeof value==='boolean')cy.get(`[name=${name}]`).check();else if(name==='pkShare')cy.get(`[name=${name}]`).invoke('val',value).trigger('input');else cy.get(`[name=${name}]`).clear().type(String(value));});
 function core(mode){
  cy.get(`[data-mode=${mode}]`).click();fill(mode==='pre'?{age:60,retirement:65}:{age:70});cy.get('#question').submit();
  fill({need:7500});cy.get('#question').submit();fill({canton:'',ahv:3430,pkRent:0,other:0,additional:0});
  cy.get('[data-metric=income]').should('contain',"− CHF 3'430").and('contain',"− CHF 41'160");
  cy.get('[data-metric=withdrawal]').should('contain',"= CHF 4'070").and('contain',"= CHF 48'840");
  cy.get('#question').submit();fill({free:650000});cy.get('.funding').should('be.visible');if(mode==='pre')cy.screenshot('guided-live-pre',{capture:'fullPage'});cy.get('#question').submit();
 }
 for(const mode of ['pre','post'])for(const width of [360,1280])it(`${mode} ${width}: first answer, grouped refinement, quality, reload and themes`,()=>{
  cy.viewport(width,900);cy.visit('/v2.html');
  cy.window().then(w=>w.localStorage.setItem('retirement-personal-snapshot-v1','legacy-preserved'));
  core(mode);
  cy.get('.quality-plan strong').should('contain','Erste Einschätzung');
  cy.get('.funding').should('have.attr','data-status','pending');
  cy.get('#app select').should('not.exist');
  cy.get('#v2Nav [data-nav=pension]').click();
  if(mode==='pre')cy.get('[data-open=pension]').click();
  if(mode==='pre'){
   cy.get('.segmented').should('not.exist');cy.get('.pension-impact').should('not.exist');
   cy.get('[name=pk]').should('be.visible');cy.get('[name=p3]').should('not.exist');
   fill({pk:550000,pkContrib:22000,pkShare:50});
   cy.get('[data-readout=capital] strong').invoke('text').should('not.equal','CHF 0');
   cy.get('[data-readout=rent] strong').invoke('text').should('not.equal','CHF 0');
   if(width===360)cy.screenshot('guided-pension-mobile',{capture:'fullPage'});
  }else{cy.get('[name=pk],[name=pkContrib],[name=p3]').should('not.exist');fill({reviewed:true});}
  cy.get('#question').submit();
  cy.window().then(w=>{
   const p=w.CheckV2.getPlan(),r=w.CheckV2.getResult();
   expect(r.yearlyProjection).to.deep.equal(w.RetirementEngine.simulate(w.RetirementCalculator.simulationInput(p)));
   if(mode==='pre')expect(r.incomeGross).to.equal(3430*12+w.RetirementCalculator.calculatePension(p).rent);
  });
  if(mode==='pre'){cy.get('#v2Nav [data-nav=pension]').click();cy.get('[data-open=pension3a]').click();fill({p3:120000,p3Contrib:7000});cy.get('#question').submit();}
  cy.get('[data-metric=income]').click();
  fill({canton:'AR',ahv:2350,other:80,additional:0,...(mode==='post'?{pkRent:1000}:{})});
  cy.get('#question').submit();cy.get('[data-metric=capital]').click();
  fill({cash:50000,securities:600000,...(mode==='pre'?{saving:10000}:{})});cy.get('#question').submit();
  cy.get('.quality-plan strong').should('contain','Gute Basis');
  cy.get('#v2Nav [data-nav=assumptions]').click();fill({reviewed:true});cy.get('#question').submit();
  cy.get('.quality-plan strong').should('contain','Gut abgestützt');
  let before;
  cy.window().then(w=>{
   before=JSON.stringify(w.CheckV2.getResult());
   expect(w.document.documentElement.scrollWidth).to.be.at.most(width);
   expect(w.localStorage.getItem('retirement-personal-snapshot-v1')).to.equal('legacy-preserved');
  });
  cy.get('[name=theme][value=dark]').check();cy.get('html').should('have.attr','data-theme','dark');
  cy.screenshot(`guided-${mode}-${width}-dark`,{capture:'fullPage'});
  cy.reload();cy.get('[name=theme][value=dark]').should('be.checked');cy.get('[data-resume]').click();
  cy.get('.quality-plan strong').should('contain','Gut abgestützt');
  cy.window().then(w=>expect(JSON.stringify(w.CheckV2.getResult())).to.equal(before));
  cy.get('[name=theme][value=light]').check();cy.screenshot(`guided-${mode}-${width}-light`,{capture:'fullPage'});
  cy.get('[name=theme][value=system]').check();
  cy.window().then(w=>expect(w.getComputedStyle(w.document.documentElement).colorScheme).to.equal(w.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  cy.get('[data-metric=need][data-open=need]').click();fill({need:7600});cy.get('#question').submit();
  cy.get('.quality-plan strong').should('contain','Gute Basis');
 });
 it('resumes only confirmed input and requires confirmation before a new plan',()=>{
  cy.viewport(360,850);cy.visit('/v2.html');cy.get('[data-mode=pre]').click();
  fill({age:70,retirement:65});cy.get('#question').submit();cy.get('[name=retirement]').should('have.attr','aria-invalid','true');
  fill({retirement:70});cy.get('#question').submit();fill({need:9999});cy.reload();
  cy.get('[data-resume]').click();cy.get('[name=need]').should('have.value','');
  fill({need:5000});cy.get('#question').submit();fill({canton:'',ahv:0,pkRent:0,other:0,additional:0});cy.get('#question').submit();fill({free:0});cy.get('#question').submit();
  cy.get('.funding').should('contain','bis Alter 70').and('contain','Es fehlen noch');
  cy.window().then(w=>cy.stub(w,'confirm').returns(false).as('confirmation'));
  cy.get('[data-nav=more]').click();cy.get('[data-new]').click();cy.get('h1').should('contain','Mehr');
  cy.get('@confirmation').should('have.been.calledOnce');
  cy.window().then(w=>w.confirm.returns(true));cy.get('[data-new]').click();cy.get('[data-mode]').should('have.length',2);
  cy.window().then(w=>expect(w.localStorage.getItem('retirement-v2-plan')).to.equal(null));
 });
 it('keeps unreadable data intact and reports write failures',()=>{
  cy.visit('/v2.html',{onBeforeLoad(w){w.localStorage.setItem('retirement-v2-plan','{broken');}});
  cy.get('#app').should('contain','nicht lesbar');cy.get('[name=theme][value=dark]').check();
  cy.window().then(w=>{expect(w.localStorage.getItem('retirement-v2-plan')).to.equal('{broken');cy.stub(w,'confirm').returns(true);});
  cy.get('[data-new]').click();cy.get('[data-mode=post]').click();
  cy.window().then(w=>cy.stub(w.Storage.prototype,'setItem').throws(new Error('quota')));
  fill({age:70});cy.get('#question').submit();cy.get('#saveStatus').should('contain','Speichern nicht möglich');
  cy.get('[name=need]').should('be.visible');cy.get('[data-home]').click();cy.get('[data-resume]').click();cy.get('[name=need]').should('be.visible');
  cy.window().then(w=>expect(w.CheckV2.getState().values.age).to.equal(70));
 });
});
