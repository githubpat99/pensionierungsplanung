/* Pure tax calculations. All rates and thresholds live in tax-config.js. */
(function(root){
  const config=(typeof module!=='undefined'?require('./tax-config.js'):root.TaxConfig).taxModel;
  const amount=value=>Number.isFinite(value)?Math.max(0,value):0;
  const canton=code=>config.cantons[code]||null;
  function getIncomeTaxLevel(value){
    return amount(value)<=config.incomeThresholds.lowMax?'low':amount(value)<=config.incomeThresholds.mediumMax?'medium':'high';
  }
  function getIncomeTaxRate(code,value){return canton(code)?.incomeTaxPct[getIncomeTaxLevel(value)]??null}
  function calculateEstimatedIncomeTax(code,value){const rate=getIncomeTaxRate(code,value);return rate===null?null:amount(value)*rate/100}
  function getCapitalWithdrawalTaxRate(code,value){
    const c=canton(code);if(!c)return null;
    value=amount(value);if(!value)return 0;
    const points=config.capitalTaxReferenceAmounts,rates=c.capitalWithdrawalTaxPct;
    if(value<=points[0])return rates[points[0]];
    for(let i=1;i<points.length;i++)if(value<=points[i]){
      const lo=points[i-1],hi=points[i];return rates[lo]+(rates[hi]-rates[lo])*(value-lo)/(hi-lo);
    }
    return rates[points.at(-1)];
  }
  function calculateCapitalWithdrawalTax(code,value){const rate=getCapitalWithdrawalTaxRate(code,value);return rate===null?null:amount(value)*rate/100}
  root.TaxModel={config,canton,getIncomeTaxLevel,getIncomeTaxRate,calculateEstimatedIncomeTax,getCapitalWithdrawalTaxRate,calculateCapitalWithdrawalTax};
  if(typeof module!=='undefined')module.exports=root.TaxModel;
})(globalThis);
