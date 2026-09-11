/* Versioned snapshots. No changes to the live state until validation succeeds. */
(function(root){
  const version=2;
  function merge(defaults,value){
    if(Array.isArray(defaults))return Array.isArray(value)?structuredClone(value):structuredClone(defaults);
    if(defaults&&typeof defaults==='object'){
      const result=structuredClone(value||{});
      for(const key of Object.keys(defaults))result[key]=merge(defaults[key],value?.[key]);
      return result;
    }
    return value===undefined?defaults:value;
  }
  function decode(raw,defaults){
    if(!raw)throw Error('Auf diesem Gerät ist noch kein persönlicher Stand gespeichert.');
    let saved;try{saved=JSON.parse(raw)}catch(_){throw Error('Der gespeicherte Stand ist beschädigt und konnte nicht geladen werden.')}
    if(![1,version].includes(saved?.version))throw Error('Diese Speicher-Version wird noch nicht unterstützt. Bitte die App aktualisieren.');
    if(!saved.state||!['pre','post'].includes(saved.state.mode))throw Error('Der gespeicherte Stand enthält keine gültige Planung.');
    const state=merge(defaults,saved.state);
    function validate(value,template){
      if(typeof template==='number'&&(!Number.isFinite(value)))throw Error('Der gespeicherte Stand enthält ungültige Zahlen.');
      if(template&&typeof template==='object')for(const key of Object.keys(template))validate(value?.[key],template[key]);
    }
    validate(state,defaults);
    if(state.plan){
      if(!Array.isArray(state.plan.returns)||state.plan.returns.length!==3||!state.plan.returns.every(Number.isFinite)||!Array.isArray(state.plan.extras)||!state.plan.timing)throw Error('Die gespeicherten Planungsannahmen sind unvollständig.');
      for(const key of ['phase2','phase3','need2','need3','repair'])if(!Number.isFinite(state.plan[key]))throw Error('Die gespeicherten Lebensphasen sind ungültig.');
    }
    if(state.planningAge<=(state.mode==='post'?state.currentAge:state.retirementAge))throw Error('Das gespeicherte Zielalter ist ungültig.');
    state.exampleValues=false;
    return {...saved,version,state};
  }
  root.PlanningStorage={version,decode};
  if(typeof module!=='undefined')module.exports=root.PlanningStorage;
})(globalThis);
function readLocal(key){try{return localStorage.getItem(key)}catch(_){globalThis.storageWarning='Lokaler Speicher ist nicht verfügbar. Bitte die Browsereinstellungen prüfen.';return null}}
function initialPlanningState(defaults){
  const raw=readLocal('retirementMvp5');if(!raw)return structuredClone(defaults);
  try{const state=JSON.parse(raw),saved=PlanningStorage.decode(JSON.stringify({version:1,state}),defaults);saved.state.exampleValues=state.exampleValues===true;return saved.state;}
  catch(error){globalThis.storageWarning=error.message;return structuredClone(defaults);}
}
