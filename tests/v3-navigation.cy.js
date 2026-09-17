const money = value => `CHF ${Math.round(value).toLocaleString('de-CH').replace(/’/g, "'")}`;
const shares = [0, 50, 100];
function openMenu(page) {
  cy.get('.menu-button').click();
  cy.get(`[data-menu-page="${page}"]`).click();
}
function seed(mode, canton = '', extra = []) {
  cy.visit('/v3.html');
  cy.window().then(w => {
    const M = w.CheckV2State;
    let state = M.fresh(mode);
    state.riskProfile = 'growth'; // Editing a group must not reset the investment assumptions.
    for (const [group, values] of [
      ['time', mode === 'pre' ? {age:60, retirement:65} : {age:70}],
      ['regular', {canton, ahv:2500, other:200, additional:100}],
      ['need', {need:6500}], ['free', {free:650000}],
      ['assets', {cash:50000, securities:600000, saving:1000}],
      ...extra,
      ['pension', mode === 'pre' ? {pk:500000, pkContrib:20000, pkShare:45} : {pkRent:2000}],
      ['assumptions', {...M.defaults, targetAge:95, inflation:1.2, reviewed:true}]
    ]) state = M.apply(state, group, values);
    w.localStorage.setItem('retirement-v3-plan', JSON.stringify({version:1, state}));
    w.V3.load();
  });
  cy.get('h1').should('have.text', 'Mein Plan');
}
for (const width of [360, 1280]) {
  describe(`V3 Pensionskasse at ${width}px`, () => {
    beforeEach(() => cy.viewport(width, 900));
    it('opens source editors directly from Mein Plan and returns with current results', () => {
      seed('pre', 'ZH');
      for (const [selector, title] of [['.v3-income-sources [data-v3-next="ahv"]', 'AHV-Renten'], ['#previewReadout [data-v3-next="pension"]', 'Pensionskasse (PK)'], ['.v3-compact-summary [data-v3-next="need"]', 'Bedarf'], ['.v3-compact-summary [data-v3-next="assets"]', 'Vermögen']]) {
        cy.get(selector).click();
        cy.get('h1').should('have.text', title);
        cy.get('[data-back]').click();
        cy.get('h1').should('have.text', 'Mein Plan');
      }
      cy.get('.v3-source-detail summary').click();
      cy.get('.v3-source-detail').should('contain', 'Weitere Renten:');
      cy.get('.v3-rent-row [data-v3-next="extra"]').click();
      cy.get('h1').should('have.text', 'Weitere Einnahmen');
      cy.get('[data-back]').click();
      cy.get('.v3-income-total').should('contain', 'Einkommen netto');
      cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(width));
    });
    it('updates the one chosen share live and keeps it through comparison and reload', () => {
      seed('pre', 'ZH');
      cy.contains('Variante übernehmen').should('not.exist');
      for (const share of [0, 50, 100]) {
        cy.get('#shareRange').invoke('val', share).trigger('input');
        cy.get('#shareValue').should('have.text', String(share));
        cy.get('#chosenVariantLabel').should('contain', `${share} %`);
        cy.get(`[data-variant-index="${shares.indexOf(share)}"]`).should('have.attr', 'aria-pressed', 'true');
        cy.get('[data-save]').click();
        cy.window().then(w => {
          expect(JSON.parse(w.localStorage.getItem('retirement-v3-plan')).state.details.pension.pkShare).to.equal(share);
          const pk = w.RetirementCalculator.calculatePension(w.V3.planFor(share));
          cy.get('#previewReadout').should('contain', money(pk.rent / 12));
        });
      }
      cy.get('[data-compare]').click();
      cy.get('.v3-comparison-card.chosen').should('contain', '100 % Kapital');
      cy.get('.v3-chart polyline').should('have.attr', 'data-chart-share', '100');
      cy.get('[data-back]').click();
      cy.get('#shareRange').should('have.value', '100');
      cy.get('[data-save]').click();
      cy.reload();
      cy.window().then(w => w.V3.load());
      cy.get('#shareRange').should('have.value', '100');
    });
    it('uses all local canton coats and keeps the tax canton code', () => {
      seed('pre', 'ZH');
      openMenu('personal');
      cy.get('.canton-trigger').should('contain', 'ZH · Zürich').find('img').should('have.attr', 'src', 'assets/cantons/ZH.svg');
      cy.get('.canton-trigger').click();
      cy.get('.canton-option img').should('have.length', 26).each(image => {
        expect(image[0].naturalWidth).to.be.greaterThan(0);
        expect(image.attr('src')).to.match(/^assets\/cantons\/[A-Za-z]{2}\.svg$/);
      });
      cy.get('.canton-option[data-code="AR"]').should('contain', 'AR · Appenzell Ausserrhoden').find('img').should('have.attr', 'src', 'assets/cantons/ar.svg');
      cy.get('.canton-option[data-code="SG"]').should('contain', 'SG · St. Gallen').find('img').should('have.attr', 'src', 'assets/cantons/sg.svg');
      cy.get('.canton-search').type('SG');
      cy.get('.canton-option[data-code="SG"]').should('be.visible');
      cy.get('.canton-search').type('{downarrow}');
      cy.focused().should('have.attr', 'data-code', 'SG').type('{enter}');
      cy.get('[name="canton"]').should('have.value', 'SG');
      cy.get('.canton-trigger').should('contain', 'SG · St. Gallen');
      cy.get('.canton-trigger').click();
      cy.get('.canton-option[data-code="AR"] img').should('have.attr', 'src', 'assets/cantons/ar.svg');
      cy.get('body').type('{esc}');
      cy.get('.canton-panel').should('not.be.visible');
      cy.get('#v3DetailForm').submit();
      cy.window().then(w => expect(w.V3.planFor(45).person.canton).to.equal('SG'));
    });
    it('keeps target age 86 readable beside five-year ticks', () => {
      seed('pre', 'ZH');
      openMenu('assumptions');
      cy.get('[name="targetAge"]').clear().type('86');
      cy.get('#v3DetailForm').submit();
      cy.get('#shareRange').invoke('val', 50).trigger('input');
      cy.get('[data-compare]').click();
      cy.get('.v3-chart [data-chart-tick-age="86"]').should('be.visible');
      cy.get('.v3-chart [data-chart-tick-age="85"]').should('not.exist');
      cy.get('.v3-chart [data-chart-tick-age]').then(labels => {
        const boxes = [...labels].map(label => label.getBoundingClientRect());
        boxes.slice(1).forEach((box, index) => expect(box.left).to.be.greaterThan(boxes[index].right));
      });
      cy.get('.v3-chart polyline').should('have.attr', 'data-chart-share', '50');
    });
    it('keeps a freely chosen mixed share visible beside the three fixed curves', () => {
      seed('pre', 'ZH');
      cy.get('#shareRange').should('have.value', '45');
      cy.get('[data-compare]').click();
      cy.get('h2').first().should('contain', '45 % PK-Kapital');
      cy.get('.v3-chart polyline').should('have.attr', 'data-chart-share', '45');
      cy.get('#compareLines').check();
      cy.get('.v3-chart polyline').should('have.length', 4);
      cy.get('.v3-chart polyline[data-chart-share="45"]').should('have.attr', 'stroke-width', '3.5');
      cy.get('.v3-chosen-note').should('contain', '45 % Kapital');
      cy.get('[data-back]').click();
      cy.get('#shareRange').should('have.value', '45');
    });
    it('uses one chosen PK share and recalculates all benchmark variants without a canton', () => {
      seed('pre');
      cy.get('.menu-button').click();
      cy.get('#v3Menu button').then(buttons => expect([...buttons].map(b => b.textContent)).to.deep.equal(['Persönliche Angaben', 'AHV-Renten', 'Pensionskasse', 'Weitere Einnahmen', 'Bedarf', 'Vermögen', 'Annahmen']));
      cy.get('[data-menu-page="pension"]').click();
      cy.get('h1').should('have.text', 'Pensionskasse (PK)');
      cy.get('[name="pkShare"], #shareRange, [data-pk-net] input').should('not.exist');
      cy.get('[data-pk-tax], [data-pk-net]').each(el => expect(el.text()).to.equal('Steuern offen'));
      cy.get('[data-back]').click();
      cy.get('[data-variant-index="2"]').click();
      let before;
      cy.window().then(w => { before = shares.map(share => w.RetirementCalculator.evaluatePlan(w.V3.planFor(share))); });
      cy.get('[data-pk-breakdown]').should('contain', 'PK-Kapital brutto').and('contain', 'Steuern offen').click();
      cy.get('h1').should('have.text', 'Pensionskasse (PK)');
      cy.get('#pkBreakdown').should('be.focused');
      cy.get('#pkKapital').should('have.class', 'v3-focus-target');
      cy.get('[data-pk-split]').should('contain', '0 % Rente / 100 % Kapital');
      cy.get('[data-pk-rent]').should('have.text', money(0));
      cy.get('[name="pk"]').clear().type('600000');
      cy.get('[name="pkContrib"]').clear().type('25000');
      cy.get('#v3DetailForm').submit();
      cy.get('h1').should('have.text', 'Mein Plan');
      cy.get('#shareRange').should('have.value', '100');
      cy.get('[data-variant-index="2"]').parent().should('have.class', 'selected');
      cy.window().then(w => {
        shares.forEach((share, i) => {
          const plan = w.V3.planFor(share), result = w.RetirementCalculator.evaluatePlan(plan);
          expect(plan.riskProfile).to.equal('growth');
          expect(plan.assumptions.rates.inflation).to.equal(1.2);
          expect(plan.retirement.targetAge).to.equal(95);
          expect(plan.assets.pre.pk).to.equal(600000);
          expect(plan.assumptions.contributions.pkContrib).to.equal(25000);
          expect(result.yearlyProjection).not.to.deep.equal(before[i].yearlyProjection);
        });
      });
      cy.get('[data-save]').click();
      cy.window().then(w => {
        const saved = JSON.parse(w.localStorage.getItem('retirement-v3-plan'));
        expect(saved.state.details.pension.pkShare).to.equal(100);
        expect(saved.currentShare).to.equal(undefined);
        expect(saved.variants).to.equal(undefined);
        w.V3.load();
      });
      cy.get('#shareRange').should('have.value', '100');
      cy.get('[data-pk-breakdown]').click();
      cy.get('[name="pk"]').should('have.value', '600000').clear().type('700000');
      cy.get('[data-detail-back]').click();
      openMenu('pension');
      cy.get('[name="pk"]').should('have.value', '600000');
      cy.get('[data-back]').click();
      cy.get('[data-compare]').click();
      cy.get('h2').first().should('contain', '100 % PK-Kapital');
      cy.get('.v3-comparison-card.chosen').should('contain', '100 % Kapital');
      cy.get('.v3-chart polyline').should('have.length', 1);
      cy.get('.v3-chart polyline').should('have.attr', 'data-chart-share', '100');
      cy.get('.v3-comparison-card').should('have.length', 3);
      cy.window().then(w => {
        [0, 50, 100].forEach((share, index) => {
          const plan = w.V3.planFor(share), pk = w.RetirementCalculator.calculatePension(plan), result = w.RetirementCalculator.evaluatePlan(plan);
          cy.get('.v3-comparison-card').eq(index).should('contain', money(pk.rent / 12)).and('contain', money(result.availableCapital)).and('contain', money(result.capitalAtTargetAge));
        });
      });
      cy.get('.v3-chart-target').first().click();
      cy.get('.v3-chart-readout').should('contain', 'Alter 65');
      cy.get('#compareLines').check();
      cy.get('.v3-chart polyline').should('have.length', 3);
      cy.get('.v3-chart polyline[data-chart-share="100"]').should('have.attr', 'stroke-width', '3.5');
      cy.get('[data-back]').click();
      cy.get('h1').should('have.text', 'Mein Plan');
      cy.get('#shareRange').should('have.value', '100');
      cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(width));
    });
    it('uses calculator gross/tax/net, edits PK rates only here and preserves unrelated income', () => {
      seed('pre', 'ZH');
      for (const page of ['ahv', 'extra', 'need', 'assumptions', 'personal']) {
        openMenu(page);
        cy.get('#v3DetailForm [name="pk"], #v3DetailForm [name="pkContrib"], #v3DetailForm [name="pkRent"], #v3DetailForm [name="pkInterest"], #v3DetailForm [name="uws"]').should('not.exist');
        cy.get('[data-back]').click();
      }
      cy.get('[data-pk-breakdown]').should('contain', 'PK-Kapital netto').click();
      cy.window().then(w => {
        const pk = w.RetirementCalculator.calculatePension(w.V3.planFor(45));
        cy.get('[data-pk-gross]').should('have.text', money(pk.cap));
        cy.get('[data-pk-tax]').should('have.text', money(pk.capitalTax));
        cy.get('[data-pk-net]').should('have.text', money(pk.netCap));
      });
      cy.get('[name="uws"]').clear().type('6');
      cy.get('[name="pkInterest"]').clear().type('2');
      cy.get('#v3DetailForm').submit();
      cy.window().then(w => {
        const p = w.V3.planFor(45), pk = w.RetirementCalculator.calculatePension(p);
        expect(p.assumptions.rates.uws).to.equal(6);
        expect(p.assumptions.rates.pkInterest).to.equal(2);
        expect(p.income.pre).to.deep.equal({ahv:30000, other:2400, rent:1200});
        cy.get('[data-pk-breakdown] strong').should('have.text', money(pk.netCap));
      });
      openMenu('personal');
      cy.get('.canton-trigger').click();cy.get('.canton-option[data-code=""]').click();
      cy.get('#v3DetailForm').submit();
      cy.get('[data-pk-breakdown]').should('contain', 'PK-Kapital brutto').and('contain', 'Steuern offen');
    });
    it('edits only the actual pension after retirement without taxing existing capital again', () => {
      seed('post', 'ZH');
      cy.get('#shareRange, [data-pk-breakdown], [data-compare]').should('not.exist');
      openMenu('pension');
      cy.get('[name="pkRent"]').should('have.value', '2000');
      cy.get('[name="pk"], [name="pkShare"], [name="pkContrib"], [name="uws"], #pkBreakdown, #pkRente, #pkKapital').should('not.exist');
      cy.get('[name="pkRent"]').clear().type('2500');
      cy.get('#v3DetailForm').submit();
      cy.get('h1').should('have.text', 'Mein Plan');
      cy.window().then(w => {
        const plan = w.V3.planFor(90), capital = w.RetirementCalculator.calculateAvailableCapital(plan);
        expect(plan.income.post.pkRent).to.equal(30000);
        expect(capital.totalInvestableCapital).to.equal(650000);
        expect(capital.pkWithdrawalTax).to.equal(0);
        expect(w.RetirementCalculator.evaluatePlan(plan).incomeGross).to.equal(63600);
      });
      openMenu('pension');
      cy.get('[name="pkRent"]').should('have.value', '2500');
      cy.get('[data-back]').click();
      cy.get('#shareRange, [data-compare]').should('not.exist');
    });
    it('edits the available assets from the menu, keeps the Vorsorge amounts read-only and counts each amount once', () => {
      seed('pre', 'ZH', [['pension3a', {p3:120000, p3Contrib:7000}]]);
      let before;
      cy.window().then(w => { before = shares.map(share => w.RetirementCalculator.evaluatePlan(w.V3.planFor(share)).yearlyProjection); });
      openMenu('assets');
      cy.get('h1').should('have.text', 'Vermögen');
      cy.window().then(w => {
        const plan = w.V3.planFor(45), projected = w.RetirementCalculator.calculateRetirementStart(plan), capital = w.RetirementCalculator.calculateAvailableCapital(plan);
        cy.get('[data-asset="cash"] .v3-asset-value strong').should('have.text', money(50000));
        cy.get('[data-asset="securities"] .v3-asset-value strong').should('have.text', money(projected.sec));
        cy.get('[data-asset="otherAssets"] .v3-asset-value').should('contain', 'Noch nicht erfasst');
        cy.get('[data-open-vorsorge="pension3a"] .v3-asset-value').should('contain', money(projected.p3)).and('contain', 'aus Vorsorge');
        cy.get('[data-open-vorsorge="pension"] .v3-asset-value').should('contain', money(capital.netPkCapitalWithdrawal)).and('contain', 'aus Vorsorge');
        cy.get('.v3-asset-total dd').should('have.text', money(w.RetirementCalculator.evaluatePlan(plan).availableCapital));
        expect(projected.p3 + projected.sec + 50000 + capital.netPkCapitalWithdrawal).to.equal(w.RetirementCalculator.evaluatePlan(plan).availableCapital);
      });
      // Vorsorge amounts lead to their own input and are never free capital on this page.
      cy.get('#app [name="p3"], #app [name="pk"], #app #shareRange').should('not.exist');
      cy.get('.v3-bound-assets h2').should('have.text', 'Gebundenes Vermögen');
      cy.get('.v3-bound-assets .v3-hint').should('contain', 'nicht für laufende Entnahmen eingeplant');
      cy.get('[data-open-vorsorge="pension3a"]').click();
      cy.get('h1').should('have.text', 'Säule 3a');
      cy.get('[name="p3"]').should('have.value', '120000');
      cy.get('[data-detail-back]').click();
      cy.get('h1').should('have.text', 'Mein Plan');
      // Editing an amount recalculates the plan and all three variants.
      openMenu('assets');
      cy.get('[data-asset="otherAssets"]').click();
      cy.get('#asset-input-otherAssets').should('have.value', '').type('30000');
      cy.get('#asset-otherAssets').submit();
      cy.get('[data-asset="otherAssets"] .v3-asset-value strong').should('have.text', money(30000));
      cy.window().then(w => {
        shares.forEach((share, i) => {
          const plan = w.V3.planFor(share);
          expect(plan.assets.pre.cash).to.equal(80000); // Bank und weitere Vermögenswerte genau einmal
          expect(w.RetirementCalculator.evaluatePlan(plan).yearlyProjection).not.to.deep.equal(before[i]);
        });
      });
      // Abbrechen keeps the confirmed value.
      cy.get('[data-asset="cash"]').click();
      cy.get('#asset-input-cash').clear().type('999999');
      cy.get('[data-asset-cancel="cash"]').click();
      cy.get('[data-asset="cash"] .v3-asset-value strong').should('have.text', money(50000));
      // Speichern und Laden erhalten den erfassten Betrag.
      cy.get('[data-back]').click();
      cy.get('[data-save]').click();
      cy.window().then(w => {
        const saved = JSON.parse(w.localStorage.getItem('retirement-v3-plan'));
        expect(saved.state.details.assets.otherAssets).to.equal(30000);
        w.V3.load();
      });
      openMenu('assets');
      cy.get('[data-asset="otherAssets"] .v3-asset-value strong').should('have.text', money(30000));
      cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(width));
    });
    it('splits an existing aggregate over the asset page without counting it twice', () => {
      cy.visit('/v3.html');
      cy.window().then(w => {
        const M = w.CheckV2State;
        let state = M.fresh('pre'); state.riskProfile = 'balanced';
        for (const [group, values] of [
          ['time', {age:60, retirement:65}],
          ['regular', {canton:'ZH', ahv:2500, other:0, additional:0}],
          ['need', {need:6500}], ['free', {free:650000}],
          ['pension', {pk:500000, pkContrib:20000, pkShare:45}],
          ['assumptions', {...M.defaults, targetAge:95, reviewed:true}]
        ]) state = M.apply(state, group, values);
        w.localStorage.setItem('retirement-v3-plan', JSON.stringify({version:1, state}));
        w.V3.load();
      });
      cy.get('[data-v3-next="assets"]').click();
      cy.get('h1').should('have.text', 'Vermögen');
      cy.get('[data-asset="cash"] .v3-asset-value').should('contain', 'Noch nicht erfasst');
      cy.get('[data-asset="unallocated"] .v3-asset-value strong').should('have.text', money(650000));
      cy.window().then(w => { w.__raw = w.RetirementCalculator.evaluatePlan(w.V3.planFor(45)).availableCapital; });
      cy.get('[data-asset="cash"]').click();
      cy.get('#asset-input-cash').clear().type('50000');
      cy.get('#asset-cash').submit();
      cy.get('[data-asset="unallocated"] .v3-asset-value strong').should('have.text', money(600000));
      cy.window().then(w => {
        const plan = w.V3.planFor(45), result = w.RetirementCalculator.evaluatePlan(plan), capital = w.RetirementCalculator.calculateAvailableCapital(plan);
        expect(result.availableCapital).to.equal(w.__raw);
        // Bank, Rest und PK-Netto addieren sich genau einmal zum verfügbaren Kapital.
        expect(50000 + 600000 + capital.netPkCapitalWithdrawal).to.equal(result.availableCapital);
      });
      cy.get('[data-back]').click();
      cy.get('[data-save]').click();
      cy.window().then(w => {
        const saved = JSON.parse(w.localStorage.getItem('retirement-v3-plan'));
        expect(saved.state.details.assets.cash).to.equal(50000);
        expect(saved.state.details.assets.unallocated).to.equal(600000);
        w.V3.load();
      });
      openMenu('assets');
      cy.get('[data-asset="cash"] .v3-asset-value strong').should('have.text', money(50000));
      cy.get('[data-asset="unallocated"] .v3-asset-value strong').should('have.text', money(600000));
      cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(width));
    });
    it('jumps from a plan value straight to the matching section with one top back link', () => {
      seed('pre', 'ZH');
      const inView = el => {
        const box = el[0].getBoundingClientRect();
        expect(box.top).to.be.at.least(0);
        expect(box.bottom).to.be.at.most(el[0].ownerDocument.defaultView.innerHeight);
      };
      // Persönliche Angaben aus dem Plankopf öffnet den passenden Editor.
      cy.get('.v3-plan-meta').should('contain', 'Pensionierung mit 65').click();
      cy.get('h1').should('have.text', 'Persönliche Angaben');
      cy.get('[data-back]').should('have.length', 1);
      cy.get('[data-back]').click();
      // PK-Rente: Rente und Kapital gemeinsam, Aufteilung sichtbar, Werte wie im Plan.
      cy.get('#previewReadout [data-v3-next="pension"]').click();
      cy.get('h1').should('have.text', 'Pensionskasse (PK)');
      cy.get('#pkBreakdown').should('be.focused');
      cy.get('#pkRente').should('have.class', 'v3-focus-target');
      cy.get('[data-pk-split]').should('contain', '55 % Rente / 45 % Kapital');
      cy.window().then(w => {
        const pk = w.RetirementCalculator.calculatePension(w.V3.planFor(45));
        cy.get('[data-pk-rent]').should('have.text', money(pk.rent / 12));
        cy.get('[data-pk-gross]').should('have.text', money(pk.cap));
        cy.get('[data-pk-net]').should('have.text', money(pk.netCap));
      });
      cy.get('[data-pk-rent]').should(inView);
      cy.get('[data-pk-gross]').should(inView);
      cy.get('[data-back]').should('have.length', 1);
      cy.get('[data-back-plan]').should('not.exist');
      cy.get('[data-back]').click();
      cy.get('h1').should('have.text', 'Mein Plan');
      // PK-Kapital springt in denselben PK-Abschnitt und markiert das Kapital.
      cy.get('[data-pk-breakdown]').click();
      cy.get('#pkBreakdown').should('be.focused');
      cy.get('#pkKapital').should('have.class', 'v3-focus-target');
      cy.get('[data-pk-gross]').should(inView);
      cy.get('[data-back]').click();
      // AHV, Bedarf und verfügbares Vermögen.
      cy.get('.v3-income-sources [data-v3-next="ahv"]').click();
      cy.get('h1').should('have.text', 'AHV-Renten');
      cy.get('[name="ahv"]').should(inView);
      cy.get('[data-back]').click();
      cy.get('.v3-compact-summary [data-v3-next="need"]').click();
      cy.get('h1').should('have.text', 'Bedarf');
      cy.get('[name="need"]').should(inView);
      cy.get('[data-back]').click();
      cy.get('.v3-compact-summary [data-v3-next="assets"]').click();
      cy.get('h1').should('have.text', 'Vermögen');
      cy.get('#assetTotal').should('be.focused');
      cy.get('.v3-asset-total dd').should(inView);
      cy.get('[data-back]').click();
      cy.get('h1').should('have.text', 'Mein Plan');
      // Vergleich: nur die Rücknavigation oben, kein zweiter «Mein Plan»-Button unten.
      cy.get('[data-compare]').click();
      cy.get('h1').should('have.text', 'Varianten vergleichen');
      cy.get('[data-back]').should('have.length', 1);
      cy.get('.v3-full-button').should('not.exist');
      cy.get('[data-back]').click();
      cy.get('h1').should('have.text', 'Mein Plan');
      cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(width));
    });
  });
}
