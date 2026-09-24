/* Read-only presentation model for the simplified tax assumptions.
 * Every amount is taken from the shared calculator (retirement-calculator.js) and the
 * annual engine (retirement-engine.js). This module performs no tax arithmetic of its
 * own, so the income detail, the tax details and the variant comparison always agree. */
(function(root){
  const calc=typeof module!=='undefined'?require('./retirement-calculator.js'):root.RetirementCalculator;
  const tax=typeof module!=='undefined'?require('./tax-model.js'):root.TaxModel;
  /* One-time withdrawal at retirement and the running tax of the first planning year. */
  function summary(plan,result=calc.evaluatePlan(plan)){
    const pre=plan.person.mode==='pre',year=result.yearlyProjection[0];
    const pension=calc.calculatePension(plan),capital=calc.calculateAvailableCapital(plan);
    const projected=pre?calc.calculateRetirementStart(plan):null;
    const sources=calc.incomeSourcesAtStart(plan).map(source=>({id:source.id,name:source.name,annual:source.annualIncome}));
    const canton=plan.person.canton||null;
    return {
      // One-time at retirement. A missing canton leaves tax and net capital explicitly open.
      once:pre?{share:plan.pensionDecision.capitalShare,pkGross:pension.cap,pkTax:pension.capitalTax,pkNet:pension.netCap,
        existingFreeCapital:capital.existingFreeCapital,startCapital:capital.totalInvestableCapital,taxOpen:pension.capitalTax===null}:null,
      // Running income tax of the first planning year. The engine applies the nominal
      // thresholds with a price factor that is exactly 1 in the first year, so
      // taxableAnnualIncome is already the real taxable income of that year.
      yearly:{sources,gross:result.incomeGross,taxable:year.taxableAnnualIncome,tax:result.incomeTax,net:result.incomeNet,
        rate:canton?tax.getIncomeTaxRate(canton,year.taxableAnnualIncome):null,canton,cantonName:canton?(tax.canton(canton)?.name??null):null,
        taxOpen:result.incomeTax===null},
      // Säule 3a: angenommen wird ein Bezug alles auf einmal ein Jahr vor dem PK-Bezug.
      // Die Bezugssteuer wird approximativ mit dem kantonalen Kapitalbezugsmodell geschätzt;
      // eine weitergehende Staffelung der Bezüge ist nicht modelliert.
      threeA:{has3a:!!(capital.p3&&capital.p3.grossTotal>0),projected:capital.p3?capital.p3.grossAtStart:0,
        withdrawalAge:capital.p3?capital.p3.withdrawalAge:null,gross:capital.p3?capital.p3.grossAtStart:0,
        tax:capital.p3?capital.p3.taxAtStart:0,net:capital.p3?capital.p3.netAtStart:0,
        projectedAtRetirement:projected?projected.p3:0,withdrawalTaxModelled:true,taxOpen:capital.p3?capital.p3.taxAtStart===null:false}
    };
  }
  root.TaxDetail={summary};
  if(typeof module!=='undefined')module.exports=root.TaxDetail;
})(globalThis);
