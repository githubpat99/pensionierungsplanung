/* Rates are fractions here (0.025 = 2.5%); the annual engine accepts percent. */
(function(root){
  const profiles=Object.freeze({
    cautious:Object.freeze({label:'Vorsichtig',expectedRealReturn:0.025,volatilityFactor:0.45,description:'Weniger Schwankungen, dafür geringere erwartete Rendite.'}),
    balanced:Object.freeze({label:'Ausgewogen',expectedRealReturn:0.045,volatilityFactor:0.70,description:'Mittlere Schwankungen und mittlere erwartete Rendite.'}),
    growth:Object.freeze({label:'Chancenorientiert',expectedRealReturn:0.06,volatilityFactor:1,description:'Grössere Gewinnchancen, aber auch deutlich stärkere Wertschwankungen.'})
  });
  const defaultProfile='balanced';
  function getRiskProfile(key=defaultProfile){
    key=key==='bold'?'growth':key;
    if(!profiles[key])throw Error('Unbekanntes Anlageprofil: '+key);
    return {key,...profiles[key]};
  }
  function buildProfileReturnSeries(historicalReturns,expectedRealReturn,volatilityFactor){
    if(!Array.isArray(historicalReturns)||!historicalReturns.length||historicalReturns.some(r=>!Number.isFinite(r)||r<=-1))throw Error('Ungültige historische Renditereihe.');
    if(!Number.isFinite(expectedRealReturn)||expectedRealReturn<=-1||!Number.isFinite(volatilityFactor)||volatilityFactor<0)throw Error('Ungültige Profilparameter.');
    const logs=historicalReturns.map(Math.log1p),mean=logs.reduce((a,b)=>a+b,0)/logs.length;
    return logs.map(r=>Math.expm1(Math.log1p(expectedRealReturn)+volatilityFactor*(r-mean)));
  }
  const buildFavourableSequence=returns=>[...returns].sort((a,b)=>b-a);
  const buildUnfavourableSequence=returns=>[...returns].sort((a,b)=>a-b);
  // Shocks retain their adverse direction; do not re-centre a crash to a positive target.
  const scaleShock=(loss,factor)=>Math.expm1(Math.log1p(loss)*factor);
  root.RiskProfiles={defaultProfile,profiles,getRiskProfile,buildProfileReturnSeries,buildFavourableSequence,buildUnfavourableSequence,scaleShock};
  if(typeof module!=='undefined')module.exports=root.RiskProfiles;
})(globalThis);
