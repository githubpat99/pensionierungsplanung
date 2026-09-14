/* Theme storage is separate from personal data and applies before first paint. */
(() => {
 let theme='system';
 try{const saved=localStorage.getItem('retirement-v2-theme');if(['system','light','dark'].includes(saved))theme=saved;}catch(_){}
 document.documentElement.dataset.theme=theme;
 document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[name=theme]').forEach(radio=>{
   radio.checked=radio.value===theme;
   radio.addEventListener('change',()=>{
    if(!radio.checked)return;
    theme=radio.value;document.documentElement.dataset.theme=theme;
    try{localStorage.setItem('retirement-v2-theme',theme);window.dispatchEvent(new Event('v2-theme-changed'));}
    catch(_){window.dispatchEvent(new Event('v2-theme-error'));}
   });
  });
 });
})();
