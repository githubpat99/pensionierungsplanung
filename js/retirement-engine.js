/* Annual planning in CHF of today's purchasing power. No browser dependencies. */
(function(root){
  const tax=typeof module!=='undefined'?require('./tax-model.js'):root.TaxModel;
  function simulate(p, scenario='base'){
    const horizon=p.end+(scenario==='longlife'?5:0), rows=[];
    const inflation=p.inflation/100;
    // Nettozuflüsse aus Vorsorge-Kapitalbezügen (Säule 3a, später bezogenes Kapital) je Alter.
    const injections=p.capitalInjections||{};
    let capital=Math.max(0,p.capital), previous=[0,0,0];
    function cashflow(age){
      const phase=p.phases.filter(x=>age>=x.from).at(-1)||p.phases[0];
      let income=0, rental=0, taxable=0, taxableRental=0;
      // Einnahmen je Quelle, damit die Jahresansicht keine zweite Rechnung braucht.
      const sources=[];
      for(const s of p.sources){
        if(age<(s.from??p.start)||age>=(s.until??Infinity))continue;
        const quoteAge=s.quoteAge??p.today;
        const value=s.amount*Math.pow(1+(s.indexed?inflation:0),age-quoteAge)/Math.pow(1+inflation,age-quoteAge);
        income+=value;if(s.rental)rental+=value;
        if(s.taxable!==false){taxable+=value;if(s.rental)taxableRental+=value;}
        sources.push({id:s.id,name:s.name,rental:!!s.rental,gross:value,taxable:s.taxable!==false});
      }
      const stressed=(scenario==='property'||scenario==='combined')&&age===p.start;
      if(stressed)income-=rental;
      if(stressed)taxable-=taxableRental;
      if(stressed)sources.forEach(entry=>{if(entry.rental)entry.gross=0;});
      // Apply nominal thresholds, then express the tax in the same purchasing power as income.
      const priceFactor=Math.pow(1+inflation,age-p.start);
      const taxableAnnualIncome=Math.max(0,taxable)*priceFactor;
      const incomeTax=tax.calculateEstimatedIncomeTax(p.canton,taxableAnnualIncome);
      const estimatedIncomeTax=incomeTax===null?null:incomeTax/priceFactor;
      const grossIncome=income;income-=estimatedIncomeTax??0;
      const special=stressed?p.repair:0;
      return {need:phase.need,income,grossIncome,estimatedIncomeTax,taxableAnnualIncome,special,withdrawal:Math.max(0,phase.need+special-income),sources};
    }
    for(let age=p.start;age<horizon;age++){
      // Ein 3a-Bezug wird erst in seinem Bezugsjahr zu verfügbarem Kapital: vorher finanzierte er nichts.
      const injection=Math.max(0,Number(injections[age]??0));
      capital+=injection;
      const c=cashflow(age), reserve=cashflow(age+1).withdrawal+cashflow(age+2).withdrawal;
      /* Preisbasis: intern wird in heutiger Kaufkraft gerechnet (Bedarf real konstant,
         nominal feste Einnahmen verlieren an Kaufkraft). Für die Anzeige wird jede Zeile
         mit genau diesem Faktor in nominale CHF ihres Jahres umgerechnet – eine Zahlenwelt,
         eine Quelle. */
      const factor=Math.pow(1+inflation,age-p.start);
      const cash=Math.min(capital,c.withdrawal), bonds=Math.min(Math.max(0,capital-cash),reserve);
      const buckets=[cash,bonds,Math.max(0,capital-cash-bonds)];
      const transfers=buckets.map((v,i)=>v-previous[i]);
      const gap=Math.max(0,c.withdrawal-capital);
      let spending=Math.min(c.withdrawal,capital);
      // Entnahme je Topf mitschreiben, damit die Jahresansicht sie nicht nachrechnen muss.
      const takes=buckets.map(v=>{const take=Math.min(v,spending);spending-=take;return take});
      const after=buckets.map((v,i)=>v-takes[i]);
      after[0]+=Math.max(0,c.income-c.need-c.special);
      const rates=p.returns.map(x=>x/100);
      const t=age-p.start;
      if((scenario==='crash'||scenario==='combined')&&t===0)rates[2]=p.growthShocks?.crash??-.30;
      if(scenario==='weak'&&t<5){rates[2]=t===0?(p.growthShocks?.weak??-.15):0;rates[1]=t===0?-.08:0;}
      if(Array.isArray(p.equityReturns)&&t<p.equityReturns.length)rates[2]=p.equityReturns[t]/100;
      const gains=after.map((v,i)=>v*rates[i]);
      const endBuckets=after.map((v,i)=>Math.max(0,v+gains[i]));
      const end=endBuckets.reduce((a,b)=>a+b,0);
      const sum=gains.reduce((a,b)=>a+b,0);
      /* Nominale Sicht derselben Zeile: jeder Betrag dieses Jahres in CHF des Jahres. */
      const nominal={factor,free:capital*factor,bound:p.bound,end:end*factor,
        buckets:buckets.map(v=>v*factor),endBuckets:endBuckets.map(v=>v*factor),
        takes:takes.map(v=>v*factor),gains:gains.map(v=>v*factor),transfers:transfers.map(v=>v*factor),
        need:c.need*factor,rent:c.income*factor,grossIncome:c.grossIncome*factor,
        estimatedIncomeTax:c.estimatedIncomeTax===null?null:c.estimatedIncomeTax*factor,
        taxableAnnualIncome:c.taxableAnnualIncome,withdrawal:c.withdrawal*factor,special:c.special*factor,
        ret:sum*factor,net:(end-capital)*factor,injection:injection*factor,
        sources:c.sources.map(entry=>({...entry,gross:entry.gross*factor}))};
      rows.push({age,free:capital,bound:p.bound,total:capital+p.bound,need:c.need,rent:c.income,
        grossIncome:c.grossIncome,estimatedIncomeTax:c.estimatedIncomeTax,taxableAnnualIncome:c.taxableAnnualIncome,
        sources:c.sources,ret:sum,gains,net:end-capital,gap,withdrawal:c.withdrawal,
        special:c.special,buckets,takes,transfers,endBuckets,end,reserve,injection,factor,nominal,currency:'nominal'});
      capital=end;previous=endBuckets;
    }
    rows.push({age:horizon,free:capital,bound:p.bound,total:capital+p.bound,need:0,rent:0,ret:0,net:0,gap:0,withdrawal:0,buckets:previous,endBuckets:previous,end:capital,terminal:true,factor:Math.pow(1+inflation,horizon-p.start),nominal:{factor:Math.pow(1+inflation,horizon-p.start),free:capital*Math.pow(1+inflation,horizon-p.start),end:capital*Math.pow(1+inflation,horizon-p.start),bound:p.bound,buckets:previous.map(v=>v*Math.pow(1+inflation,horizon-p.start)),endBuckets:previous.map(v=>v*Math.pow(1+inflation,horizon-p.start))}});
    return rows;
  }
  root.RetirementEngine={simulate};
  if(typeof module!=='undefined')module.exports=root.RetirementEngine;
})(globalThis);
