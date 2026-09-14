it('v2 pre mode flow at 360 and 1280', () => {
  cy.wrap([360, 1280]).each((width) => {
    cy.viewport(width, 900)
    cy.visit('/v2.html', {onBeforeLoad(w){w.localStorage.clear();}})
    cy.get('[data-mode="pre"]').click()
    cy.get('#v2Nav').should('be.visible')
    cy.get('[data-nav="pension"]').should('be.disabled')
    cy.get('[data-nav="plan"]').should('have.attr', 'aria-current', 'page')
    cy.get('input[name="age"]').type('60')
    cy.get('input[name="retirement"]').type('65')
    cy.get('#question').submit()
    cy.get('input[name="need"]').type('7500')
    cy.get('#question').submit()
    cy.get('[name=ahv]').type('3430')
    for(const name of ['pkRent','other','additional'])cy.get(`[name=${name}]`).type('0')
    cy.get('#question').submit()
    cy.get('input[name="free"]').type('650000')
    cy.get('#question').submit()
    cy.get('#v2Nav [data-nav="pension"]').click()
    cy.get('#v2Nav [data-nav="pension"]').should('have.attr', 'aria-current', 'page')
    cy.get('[data-open="pension"]').click()
    cy.get('[name="pk"]').type('123456')
    cy.get('#v2Nav [data-nav="assumptions"]').click()
    cy.get('#v2Nav [data-nav="assumptions"]').should('have.attr', 'aria-current', 'page')
    cy.get('#v2Nav [data-nav="pension"]').click()
    cy.get('[data-open="pension"]').click()
    cy.get('[name="pk"]').should('have.value', '123456')
    cy.window().then(w => expect(JSON.parse(w.localStorage.getItem('retirement-v2-plan')).state.details.pension).to.equal(undefined))
    cy.get('#v2Nav [data-nav="more"]').click()
    cy.get('h1').should('contain', 'Mehr')
    cy.get('#v2Nav [data-nav="plan"]').click()
    cy.get('.funding').should('be.visible')
    cy.get('#v2Nav [data-nav="plan"]').should('have.attr', 'aria-current', 'page')
  })
})

for(const width of [390,1280])it(`preserves the PK editor through the overview, and unrelated drafts at ${width}`,()=>{
 cy.viewport(width,844);cy.visit('/v2.html');
 cy.window().then(w=>{
  let s=w.CheckV2State.fresh('pre');
  for(const [g,v] of Object.entries({time:{age:60,retirement:65},need:{need:5000},regular:{canton:'',ahv:2500,pkRent:1500,other:0,additional:0},free:{free:200000},pension:{pk:500000,pkContrib:20000,pkShare:51}}))s=w.CheckV2State.apply(s,g,v);
  s.position='plan';w.CheckV2State.save(w.localStorage,s,'system');
 });cy.reload();cy.get('[data-resume]').click();
 cy.get('[data-nav=assumptions]').click();cy.get('[name=inflation]').clear().type('2');
 cy.get('[data-nav=pension]').click();cy.get('[data-nav=plan]').click();
 cy.get('[data-nav=pension]').click();cy.get('[data-open=pension]').click();
 cy.get('[name=pk]').should('have.value','500000');cy.get('[name=pkContrib]').should('have.value','20000');cy.get('[name=pkShare]').should('have.value','51');
 cy.get('[name=pk]').clear();cy.get('.pension-readout').should('contain','Guthaben und jährliche Sparbeiträge eingeben');
 cy.get('[name=pk]').type('600000');cy.get('[data-nav=pension]').click();
 cy.get('[data-open=pension3a]').click();cy.get('[name=p3]').type('100000');cy.get('[name=p3Contrib]').type('7000');
 cy.get('.p3-projection').should('contain',"CHF 162'913");cy.get('[data-nav=plan]').click();
 cy.get('[data-metric=need]').click();cy.get('[name=need]').clear().type('5100');cy.get('#question').submit();
 cy.get('[data-nav=pension]').click();cy.get('[data-open=pension]').click();cy.get('[name=pk]').should('have.value','600000');
 cy.get('[data-parent=vorsorge]').click();cy.get('[data-open=pension3a]').click();cy.get('[name=p3]').should('have.value','100000');
 cy.get('[data-parent=vorsorge]').click();cy.reload();cy.get('[data-resume]').click();cy.get('h1').should('have.text','Vorsorge');
 cy.get('[data-nav=more]').click();cy.reload();cy.get('[data-resume]').click();cy.get('h1').should('have.text','Mehr');
 cy.get('[data-nav=plan]').click();cy.get('[data-open=time]').click();cy.get('[name=age]').should('have.value','60');
});
