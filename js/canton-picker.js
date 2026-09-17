(() => {
  const upperCaseFiles = new Set(['AG', 'GR', 'NE', 'OW', 'SZ', 'ZH']);
  let openPicker = null;
  let nextId = 0;
  const coat = code => `assets/cantons/${upperCaseFiles.has(code) ? code : code.toLowerCase()}.svg`;
  const close = (returnFocus = false) => {
    if (!openPicker) return;
    openPicker.panel.hidden = true;
    openPicker.trigger.setAttribute('aria-expanded', 'false');
    if (returnFocus) openPicker.trigger.focus();
    openPicker = null;
  };
  function enhance(select) {
    if (select.dataset.cantonEnhanced) return;
    select.dataset.cantonEnhanced = 'true';
    const wrapper = document.createElement('div');
    wrapper.className = 'canton-picker';
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    select.classList.add('canton-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    const label = document.querySelector(`label[for="${select.id}"]`);
    const title = label?.textContent?.trim() || 'Wohnkanton';
    if (label) { label.removeAttribute('for'); label.id ||= `${select.id}-label`; }
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'canton-trigger';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', `${title} auswählen`);
    const panel = document.createElement('div');
    panel.id = `canton-options-${++nextId}`;
    panel.className = 'canton-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', title);
    trigger.setAttribute('aria-controls', panel.id);
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'canton-search';
    search.placeholder = 'Kanton suchen';
    search.setAttribute('aria-label', 'Kanton suchen');
    const list = document.createElement('div');
    list.className = 'canton-list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Kantone');
    const options = [...select.options].map(option => {
      const code = option.value;
      const name = code ? TaxModel.config.cantons[code].name : option.textContent;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'canton-option';
      button.setAttribute('role', 'option');
      button.dataset.code = code;
      button.dataset.search = `${code} ${name}`.toLocaleLowerCase('de-CH');
      if (code) {
        const image = document.createElement('img');
        image.src = coat(code);
        image.alt = '';
        image.setAttribute('aria-hidden', 'true');
        button.append(image);
      }
      const text = document.createElement('span');
      text.textContent = code ? `${code} · ${name}` : name;
      button.append(text);
      button.addEventListener('click', () => {
        select.value = code;
        select.dispatchEvent(new Event('input', {bubbles:true}));
        select.dispatchEvent(new Event('change', {bubbles:true}));
        sync();
        close(true);
      });
      list.append(button);
      return button;
    });
    panel.append(search, list);
    wrapper.append(trigger, panel);
    const sync = () => {
      const code = select.value;
      trigger.replaceChildren();
      if (code) {
        const image = document.createElement('img');
        image.src = coat(code);
        image.alt = '';
        image.setAttribute('aria-hidden', 'true');
        trigger.append(image);
      }
      const text = document.createElement('span');
      text.textContent = code ? `${code} · ${TaxModel.config.cantons[code].name}` : 'Noch offen · keine Steuerschätzung';
      trigger.append(text);
      const chevron = document.createElement('span');
      chevron.className = 'canton-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      chevron.textContent = '⌄';
      trigger.append(chevron);
      options.forEach(option => option.setAttribute('aria-selected', String(option.dataset.code === code)));
    };
    select.addEventListener('change', sync);
    sync();
    trigger.addEventListener('click', () => {
      if (openPicker?.panel === panel) { close(true); return; }
      close();
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      search.value = '';
      options.forEach(option => option.hidden = false);
      openPicker = {wrapper, panel, trigger};
      search.focus();
    });
    search.addEventListener('input', () => {
      const query = search.value.trim().toLocaleLowerCase('de-CH');
      options.forEach(option => option.hidden = !option.dataset.search.includes(query));
    });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const visible = options.filter(option => !option.hidden);
      if (!visible.length) return;
      event.preventDefault();
      const index = visible.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 : event.key === 'ArrowDown' ? Math.min(visible.length - 1, index + 1) : Math.max(0, index - 1);
      visible[next].focus();
    });
  }
  document.addEventListener('pointerdown', event => { if (openPicker && !openPicker.wrapper.contains(event.target)) close(); });
  document.addEventListener('focusin', event => { if (openPicker && !openPicker.wrapper.contains(event.target)) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && openPicker) close(true); });
  window.CantonPicker = {enhanceAll: root => root.querySelectorAll('select[name="canton"]').forEach(enhance)};
})();
