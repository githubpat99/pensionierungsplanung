/* ============================================================
   prototype2.js – Pensionsplaner Variante 2
   Hub-and-Drawer: 2 Wizard-Steps + Bottom-Sheet Details
   ============================================================ */

// --- DOM refs ---
const steps        = Array.from(document.querySelectorAll('.p2-step'));
const p2Progress   = document.getElementById('p2-progress');
const p2Title      = document.getElementById('p2-title');
const p2InfoBtn    = document.getElementById('p2-info-btn');
const p2Desc       = document.getElementById('p2-desc');
const p2Prev       = document.getElementById('p2-prev');
const p2Next       = document.getElementById('p2-next');
const step1Cta     = document.getElementById('p2-step1-cta');
const p3CheckTile  = document.getElementById('p3-check-tile');
const p3QuestionsTile = document.getElementById('p3-questions-tile');
const p3QuestionsList = document.getElementById('p3-questions-list');
const p3StatusToggle = document.getElementById('p3-status-toggle');
const p3BackSlot   = document.getElementById('p3-back-slot');
const cantonSelect = document.getElementById('canton');
const cantonCrest  = document.getElementById('canton-crest');
const backdrop     = document.getElementById('p2-backdrop');
const insightToggleBtn = document.getElementById('insight-toggle-btn');
const insightBody  = document.getElementById('result-insight');
const chartModal   = document.getElementById('chart-modal');
const openChartBtn = document.getElementById('open-chart-modal');
const closeChartBtn = document.getElementById('close-chart-modal');
const chartInfoBtn = document.getElementById('chart-info-btn');
const gapModal = document.getElementById('gap-modal');
const openGapBtn = document.getElementById('open-gap-modal');
const closeGapBtn = document.getElementById('close-gap-modal');
const gapInfoBtn = document.getElementById('gap-info-btn');
const gapDetailsToggle = document.getElementById('gap-details-toggle');
const gapYearDetailsToggle = document.getElementById('gap-year-details-toggle');
const gapModalTotal = document.getElementById('gap-modal-total');
const smileyModal = document.getElementById('smiley-modal');
const closeSmileyModalBtn = document.getElementById('close-smiley-modal');
const smileyModalText = document.getElementById('smiley-modal-text');
const resultDetailTitle = document.getElementById('result-detail-title');
const resultDetailTotal = document.getElementById('result-detail-total');
const resultDetailPeriod = document.getElementById('result-detail-period');
const resultDetailSecondary = document.getElementById('result-detail-secondary');
const resultDetailSecondaryTotal = document.getElementById('result-detail-secondary-total');
const resultDetailKicker = document.getElementById('result-detail-kicker');
const resultDetailList = document.getElementById('result-detail-list');
const resultDetailNote = document.getElementById('result-detail-note');
const resultDetailEdit = document.getElementById('result-detail-edit');
let activeDetailKind = 'invested';
let activeEditKind = 'invested';
const chartCard    = document.getElementById('chart-card');
const chartModeButtons = Array.from(document.querySelectorAll('[data-chart-mode]'));
const chartYearSlider = document.getElementById('chart-year-slider');
const chartFocusLabel = document.getElementById('chart-focus-label');
const gapFocusLabel = document.getElementById('gap-focus-label');
const chartYearDetails = document.getElementById('chart-year-details');
const chartYearSummary = document.getElementById('chart-year-summary');
const chartYearDetailsToggle = document.getElementById('chart-year-details-toggle');
const gapYearDetails = document.getElementById('gap-year-details');
const gapSummaryIncome = document.getElementById('gap-summary-income');
const gapSummaryNeed = document.getElementById('gap-summary-need');
const gapCoverageBadge = document.getElementById('gap-coverage-badge');
const gapCoverageInfo = document.getElementById('gap-coverage-info');
const gapCoverageTip = document.getElementById('gap-coverage-tip');
const planStateOk = document.getElementById('plan-state-ok');
const planStatePartial = document.getElementById('plan-state-partial');
const planStateCritical = document.getElementById('plan-state-critical');
const planStateOkAge = document.getElementById('plan-state-ok-age');
const planStatePartialAge = document.getElementById('plan-state-partial-age');
const planStateCriticalAge = document.getElementById('plan-state-critical-age');
const planStateTip = document.getElementById('plan-state-tip');
const planBand = document.getElementById('plan-band');
const planStatus = document.getElementById('plan-status');
const assumptionsPanel = document.querySelector('.p2-assumptions');
const chartShareSlider = document.getElementById('chart-share-slider');

const STEP_META = [
  {
    title: 'Dein Ruhestands-Check',
    desc:  'Alter, Kanton und Lebenserwartung – Grundlage für die Projektion.',
  },
  {
    title: 'Dein Ruhestands-Check',
    desc:  'PK-Felder direkt eingeben. Kacheln tippen für Detaileingaben.',
  },
];

let currentStep = 0;
let latestInsightText = '';
const COVERAGE_GREEN = '#22c55e';

const STORAGE_STEP    = 'p3-wizard-step';
const STORAGE_STARTED = 'p3-wizard-started';
const STORAGE_CHART_MODE = 'p3-chart-mode';
const STORAGE_FORM_STATE = 'p3-form-state-v2';
let chartMode = 'nominal';
let focusYear = 0;
let showGapDetails = false;

function updateCantonCrest() {
  if (!cantonSelect || !cantonCrest) return;
  const canton = cantonSelect.value || 'CH';
  const cantonColours = {
    AG: ['#ffffff', '#111827'], AI: ['#ffffff', '#111827'], AR: ['#ffffff', '#dc2626'], BE: ['#dc2626', '#facc15'],
    BL: ['#dc2626', '#f8fafc'], BS: ['#ffffff', '#dc2626'], FR: ['#ffffff', '#111827'], GE: ['#dc2626', '#facc15'],
    GL: ['#dc2626', '#f8fafc'], GR: ['#ffffff', '#111827'], JU: ['#dc2626', '#f8fafc'], LU: ['#60a5fa', '#ffffff'],
    NE: ['#22c55e', '#dc2626'], NW: ['#60a5fa', '#f8fafc'], OW: ['#dc2626', '#ffffff'], SG: ['#22c55e', '#ffffff'],
    SH: ['#22c55e', '#dc2626'], SO: ['#ffffff', '#dc2626'], SZ: ['#dc2626', '#ffffff'], TG: ['#22c55e', '#ffffff'],
    TI: ['#dc2626', '#ffffff'], UR: ['#dc2626', '#facc15'], VD: ['#22c55e', '#ffffff'], VS: ['#dc2626', '#ffffff'],
    ZG: ['#60a5fa', '#ffffff'], ZH: ['#ffffff', '#60a5fa'], CH: ['#dc2626', '#ffffff'],
  };
  const [primary, secondary] = cantonColours[canton] || cantonColours.CH;
  cantonCrest.textContent = canton;
  cantonCrest.className = `p2-canton-crest canton-${canton.toLowerCase()}`;
  cantonCrest.style.background = `linear-gradient(145deg, ${primary} 0 48%, ${secondary} 48% 52%, ${primary} 52%)`;
  cantonCrest.style.color = primary === '#ffffff' ? '#0f172a' : '#ffffff';
}

// ============================================================
// Number formatting utilities
// ============================================================

function parseFormatted(val) {
  if (typeof val !== 'string') val = String(val ?? '');
  const n = Number(val.replace(/['\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatThousands(n) {
  if (!Number.isFinite(n) || n === 0) return '0';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

function readField(id) {
  if (id === 'marital-status' || id === 'children') {
    const selected = document.querySelector(`input[name="${id}"]:checked`);
    return selected ? selected.value : '';
  }
  const el = document.getElementById(id);
  if (!el) return 0;
  if (id === 'projection-years') {
    const retireAge = Number(document.getElementById('retire-age')?.value) || 65;
    return Math.max(1, (Number(el.value) || retireAge + 1) - retireAge);
  }
  if (el.type === 'number' || el.type === 'range') return Number(el.value) || 0;
  return parseFormatted(el.value);
}

function formatCHF(value) {
  return Number(value).toLocaleString('de-CH', { maximumFractionDigits: 0 });
}

const FORMATTED_IDS = ['pk-capital', 'pk-payout', 'pk-pension', 'capital-draw'];

function initFormattedFields() {
  FORMATTED_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const n = parseFormatted(el.value);
    el.value = formatThousands(n);

    el.addEventListener('blur', () => {
      const n2 = parseFormatted(el.value);
      el.value = formatThousands(n2);
    });
    el.addEventListener('focus', () => {
      const n2 = parseFormatted(el.value);
      if (n2 > 0) el.value = String(n2);
    });
  });
}

// ============================================================
// Session storage
// ============================================================

function saveStep(n) {
  try { sessionStorage.setItem(STORAGE_STEP, String(n)); } catch (_) {}
}
function loadStep() {
  try {
    const v = parseInt(sessionStorage.getItem(STORAGE_STEP), 10);
    return Number.isFinite(v) ? Math.min(Math.max(v, 0), steps.length - 1) : 0;
  } catch (_) { return 0; }
}
function saveStarted() {
  try { sessionStorage.setItem(STORAGE_STARTED, '1'); } catch (_) {}
}

function loadChartMode() {
  try {
    const stored = sessionStorage.getItem(STORAGE_CHART_MODE);
    return stored === 'real' ? 'real' : 'nominal';
  } catch (_) {
    return 'nominal';
  }
}

function saveChartMode(mode) {
  try { sessionStorage.setItem(STORAGE_CHART_MODE, mode); } catch (_) {}
}

function setPersistentState(key, value) {
  try {
    localStorage.setItem(key, value);
    return;
  } catch (_) {}
  try {
    sessionStorage.setItem(key, value);
  } catch (_) {}
}

function getPersistentState(key) {
  try {
    const v = localStorage.getItem(key);
    if (v != null) return v;
  } catch (_) {}
  try {
    const v = sessionStorage.getItem(key);
    if (v != null) return v;
  } catch (_) {}
  return null;
}

function saveFormState() {
  try {
    const state = {};
    document.querySelectorAll('input, select').forEach((el) => {
      if (!el.id) return;
      if (el.type === 'radio') return;
      if (el.type === 'checkbox') {
        state[el.id] = !!el.checked;
      } else {
        state[el.id] = el.value;
      }
    });

    const marital = document.querySelector('input[name="marital-status"]:checked');
    const children = document.querySelector('input[name="children"]:checked');
    state['marital-status'] = marital ? marital.value : '';
    state['children'] = children ? children.value : '';
    state.pkPayoutUserEdited = !!document.getElementById('pk-payout')?.dataset.userEdited;

    setPersistentState(STORAGE_FORM_STATE, JSON.stringify(state));
  } catch (_) {}
}

function loadFormState() {
  try {
    const raw = getPersistentState(STORAGE_FORM_STATE);
    if (!raw) return;
    const state = JSON.parse(raw);
    if (!state || typeof state !== 'object') return;

    document.querySelectorAll('input, select').forEach((el) => {
      if (!el.id || !(el.id in state)) return;
      if (el.type === 'radio') return;
      if (el.type === 'checkbox') {
        el.checked = !!state[el.id];
      } else {
        el.value = state[el.id];
      }
    });

    if (state['marital-status']) {
      const ms = document.querySelector(`input[name="marital-status"][value="${state['marital-status']}"]`);
      if (ms) ms.checked = true;
    }
    if (state['children']) {
      const ch = document.querySelector(`input[name="children"][value="${state['children']}"]`);
      if (ch) ch.checked = true;
    }

    const pkPayoutEl = document.getElementById('pk-payout');
    if (pkPayoutEl) {
      if (state.pkPayoutUserEdited) pkPayoutEl.dataset.userEdited = '1';
      else delete pkPayoutEl.dataset.userEdited;
    }
  } catch (_) {}
}

function syncChartModeButtons() {
  chartModeButtons.forEach((button) => {
    const active = button.dataset.chartMode === chartMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function clampFocusYear(maxYears) {
  const safeMax = Math.max(1, Number(maxYears) || 1);
  focusYear = Math.max(0, Math.min(safeMax, Math.round(focusYear || 0)));
  return focusYear;
}

function syncYearControls(scenario) {
  if (!scenario) return;
  const year = clampFocusYear(scenario.projYears);
  const age = scenario.retireAge + year;
  const label = `Alter ${age}`;

  if (chartYearSlider) {
    chartYearSlider.max = String(Math.max(1, scenario.projYears));
    chartYearSlider.value = String(year);
  }
  if (chartFocusLabel) chartFocusLabel.textContent = label;
  if (gapFocusLabel) gapFocusLabel.textContent = label;
}

// ============================================================
// Step navigation
// ============================================================

function showStep(n) {
  currentStep = n;
  saveStep(n);
  document.activeElement?.blur();
  if (assumptionsPanel) assumptionsPanel.open = false;
  document.body.classList.toggle('p2-show-simulation', n === steps.length - 1);
  steps.forEach((s, i) => s.classList.toggle('active', i === n));
  if (p2Progress) p2Progress.textContent = `${n + 1} / ${steps.length}`;
  p2Title.textContent    = STEP_META[n].title;
  if (p2Desc) {
    p2Desc.textContent = STEP_META[n].desc;
    p2Desc.classList.add('hidden');
  }
  if (p2InfoBtn) p2InfoBtn.setAttribute('aria-expanded', 'false');

  p2Prev.textContent           = '←';
  p2Prev.title                 = n === 0 ? '' : 'Zurück';
  p2Prev.style.display         = n === 0 ? 'none' : 'inline-flex';
  p2Next.style.display         = 'none';
  p2Next.textContent            = n === 0 ? 'Zur Simulation' : 'Weiter';
  p2InfoBtn?.setAttribute('aria-expanded', 'false');

  requestAnimationFrame(() => window.scrollTo(0, 0));

  if (n === steps.length - 1) updateResults();
}

// ============================================================
// Drawer management
// ============================================================

let activeDrawer = null;

function openDrawer(id) {
  const drawer = document.getElementById(id);
  if (!drawer) return;
  if (activeDrawer && activeDrawer !== drawer) {
    activeDrawer.classList.remove('open');
  }
  activeDrawer = drawer;
  drawer.classList.add('open');
  backdrop.classList.add('open');
  document.body.classList.add('drawer-open');
  updateDrawerChips();
}

function closeDrawer(id) {
  const target = id ? document.getElementById(id) : activeDrawer;
  if (!target) return;
  target.classList.remove('open');
  backdrop.classList.remove('open');
  activeDrawer = null;
  document.body.classList.remove('drawer-open');
}

function updateDrawerChips() {
  const pillar3a      = readField('pillar3a');
  const investments   = readField('investments');
  const otherAssets   = readField('other-assets');
  const pkPayout      = readField('pk-payout');
  const realEstate    = readField('real-estate');
  const mortgage      = readField('mortgage');
  const netRealEstate = Math.max(0, readField('real-estate') - readField('mortgage'));
  const invTotal      = pillar3a + investments + otherAssets + netRealEstate + pkPayout;

  const pillar3aReturn    = readField('pillar3a-return') / 100;
  const investmentsReturn = readField('investments-return') / 100;
  const otherReturn       = readField('return-rate') / 100;
  const realEstateIncome = readField('real-estate-income');
  const pkCapitalIncome = Math.round(pkPayout * otherReturn);
  const invReturn = Math.round(
    pillar3a * pillar3aReturn +
    investments * investmentsReturn +
    otherAssets * otherReturn +
    pkCapitalIncome +
    realEstateIncome
  );

  setText('d-inv-total',  `CHF ${formatCHF(invTotal)}`);
  setText('d-free-total', `CHF ${formatCHF(pillar3a + investments + otherAssets + pkPayout)}`);
  setText('d-edit-invest-income', `CHF ${formatCHF(invReturn)}`);
  setText('d-bound-total', `CHF ${formatCHF(Math.max(0, realEstate - mortgage))}`);
  setText('d-available-p3a', `CHF ${formatCHF(pillar3a)}`);
  setText('d-available-p3a-income', `CHF ${formatCHF(Math.round(pillar3a * pillar3aReturn))}`);
  setText('d-available-investments', `CHF ${formatCHF(investments)}`);
  setText('d-available-investments-income', `CHF ${formatCHF(Math.round(investments * investmentsReturn))}`);
  setText('d-available-pk', `CHF ${formatCHF(pkPayout)}`);
  setText('d-available-pk-income', `CHF ${formatCHF(pkCapitalIncome)}`);
  setText('d-available-pk-edit-income', `CHF ${formatCHF(pkCapitalIncome)}`);
  setText('d-available-pk-capital', `CHF ${formatCHF(pkPayout)}`);
  setText('d-available-other-assets', `CHF ${formatCHF(otherAssets)}`);
  setText('d-available-other-assets-income', `CHF ${formatCHF(Math.round(otherAssets * otherReturn))}`);
  setText('d-available-direct-income', `CHF ${formatCHF(realEstateIncome)}`);
  setText('d-available-total', `CHF ${formatCHF(pillar3a + investments + otherAssets + pkPayout)}`);
  setText('d-available-income-total', `CHF ${formatCHF(invReturn)}`);
  setText('d-inv-invested', `CHF ${formatCHF(pillar3a + investments + otherAssets + pkPayout)}`);
  setText('d-inv-return', `CHF ${formatCHF(invReturn)}`);
  setText('d-inv-return-section', `CHF ${formatCHF(invReturn)}`);
  setText('d-inv-invested-section', `CHF ${formatCHF(pillar3a + investments + pkPayout)}`);
  setText('d-other-total', `CHF ${formatCHF(Math.max(0, realEstate - mortgage) + otherAssets)}`);
  setText('d-p3a', `CHF ${formatCHF(pillar3a)}`);
  setText('d-ws', `CHF ${formatCHF(investments)}`);
  setText('d-pk-capital', `CHF ${formatCHF(pkPayout)}`);
  setText('d-available-pk-capital', `CHF ${formatCHF(pkPayout)}`);
  setText('d-real-estate', `CHF ${formatCHF(realEstate)}`);
  setText('d-mortgage', `CHF ${formatCHF(mortgage)}`);
  setText('d-other-assets', `CHF ${formatCHF(otherAssets)}`);
  setText('d-p3a-return', `CHF ${formatCHF(Math.round(pillar3a * pillar3aReturn))}`);
  setText('d-ws-return', `CHF ${formatCHF(Math.round(investments * investmentsReturn))}`);
  setText('d-real-estate-income-return', `CHF ${formatCHF(realEstateIncome)}`);
  setText('d-pk-rate', `${(otherReturn * 100).toFixed(1)}%`);
  setText('d-pk-return', `CHF ${formatCHF(pkCapitalIncome)}`);
  setText('d-other-return', `CHF ${formatCHF(Math.round(realEstateIncome + otherAssets * otherReturn))}`);

  const ahv      = readField('ahv');
  const childAllowance = readField('child-allowance');
  const childPension = readField('child-pension');
  const otherIncome = readField('other-income');
  const pkCapital = readField('pk-capital');
  const conversion = readField('conversion-rate') / 100;
  const pkPayoutValue = Math.min(readField('pk-payout'), pkCapital);
  const pkPension = Math.round(Math.max(0, pkCapital - pkPayoutValue) * conversion);
  const zusatz = childAllowance + childPension + otherIncome;
  const rentTotal = ahv + zusatz + pkPension;
  setText('d-income-total', `CHF ${formatCHF(invReturn + rentTotal)}`);
  setText('d-income-edit-total', `CHF ${formatCHF(rentTotal)}`);
  setText('d-income-capital', `CHF ${formatCHF(invReturn)}`);
  setText('d-income-rent', `CHF ${formatCHF(rentTotal)}`);
  setText('d-income-capital-section', `CHF ${formatCHF(invReturn)}`);
  setText('d-income-rent-section', `CHF ${formatCHF(rentTotal)}`);
  setText('d-income-pk-capital', `CHF ${formatCHF(pkCapitalIncome)}`);
  setText('d-income-p3a', `CHF ${formatCHF(Math.round(pillar3a * pillar3aReturn))}`);
  setText('d-income-investments', `CHF ${formatCHF(Math.round(investments * investmentsReturn))}`);
  setText('d-income-other', `CHF ${formatCHF(Math.round(realEstateIncome + otherAssets * otherReturn))}`);
  setText('d-ahv',      `CHF ${formatCHF(ahv)}`);
  setText('d-zusatz',   `CHF ${formatCHF(zusatz)}`);
  setText('d-pk-rente', `CHF ${formatCHF(pkPension)}`);
}

function updateResultDetails(scenario) {
  const values = {
    invested: {
      title: 'Verfügbares Kapital / Ertrag', total: scenario.freeCapital, secondary: scenario.totalInvestIncome, period: 'für die Planung verfügbar', kicker: 'Zusammensetzung', edit: 'drawer-invested',
      rows: [['Säule 3a', readField('pillar3a')], ['Wertschriften', readField('investments')], ['Kapital aus PK', scenario.pkPayout], ['Übriges Vermögen', readField('other-assets')]],
      note: 'Dieses Kapital steht für die Finanzierung des Ruhestands zur Verfügung.',
    },
    bound: {
      title: 'Kapital gebunden', total: scenario.boundCapital, period: 'gebundenes Nettovermögen', kicker: 'Immobilien und Schulden', edit: 'drawer-invested',
      rows: [['Immobilien', readField('real-estate')], ['Schulden / Hypotheken', -Math.abs(readField('mortgage'))], ['Netto gebunden', scenario.boundCapital]],
      note: 'Das gebundene Kapital ist in Immobilien gebunden und wird nicht als frei verfügbares Kapital gerechnet.',
    },
    'capital-income': {
      title: 'Verfügbares Kapital / Ertrag', total: scenario.freeCapital, secondary: scenario.totalInvestIncome, period: 'für die Planung verfügbar', kicker: 'Zusammensetzung', edit: 'drawer-invested',
      rows: [['PK-Kapitalertrag', scenario.pkCapitalIncome], ['Säule 3a', scenario.p3aIncome], ['Wertschriften', scenario.wsIncome], ['Weitere Erträge', scenario.otherAssetsIncome + scenario.realEstateIncome]],
      note: 'Diese Erträge fliessen in die jährliche Einkommensprojektion ein.',
    },
    'rent-income': {
      title: 'Einkommen aus Rente', total: scenario.rentIncome, period: 'pro Jahr, gesichert', kicker: 'Gesicherte Renten', edit: 'drawer-income',
      rows: [['AHV', readField('ahv')], ['Zusätze', readField('child-allowance') + readField('child-pension') + readField('other-income')], ['PK-Rente', scenario.pkPension]],
      note: 'Die PK-Rente wird über die PK-Kapital-/Rentenverteilung angepasst.',
    },
  };
  const detail = values[activeDetailKind] || values.invested;
  resultDetailTitle.textContent = detail.title;
  resultDetailTotal.textContent = `CHF ${formatCHF(detail.total)}`;
  resultDetailPeriod.textContent = detail.period;
  resultDetailSecondary.classList.toggle('hidden', detail.secondary == null);
  if (detail.secondary != null) resultDetailSecondaryTotal.textContent = `CHF ${formatCHF(detail.secondary)}`;
  resultDetailKicker.textContent = detail.kicker;
  resultDetailList.innerHTML = detail.rows.map(([label, value]) => `<div class="p2-result-detail-row"><span>${label}</span><strong>CHF ${formatCHF(value)}</strong></div>`).join('');
  resultDetailNote.textContent = detail.note;
  resultDetailEdit.dataset.drawer = detail.edit;
}

function setEditMode(kind) {
  updateDrawerChips();
  const drawer = document.getElementById('drawer-invested');
  const isBound = kind === 'bound';
  const isCapitalIncome = kind === 'capital-income';
  drawer?.classList.toggle('capital-bound-edit-mode', isBound);
  drawer?.classList.toggle('capital-income-edit-mode', isCapitalIncome);
  const title = document.getElementById('capital-edit-title');
  const period = document.getElementById('capital-edit-period');
  const total = document.getElementById('d-inv-total');
  if (title) title.textContent = isBound ? 'Details zum Bearbeiten' : 'Verfügbares Kapital / Ertrag';
  if (period) period.textContent = isBound ? 'gebundenes Nettovermögen' : 'für die Planung verfügbar';
  if (total) total.textContent = (isBound ? document.getElementById('d-bound-total') : document.getElementById('d-free-total'))?.textContent || '–';
  document.getElementById('p2-edit-income-summary')?.classList.toggle('hidden', isBound);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function syncLinkedRanges() {
  document.querySelectorAll('[data-sync-range]').forEach((input) => {
    const range = document.getElementById(input.dataset.syncRange);
    if (range) range.value = (input.id === 'capital-draw' || input.id === 'pk-capital') ? parseFormatted(input.value) : input.value;
  });
  updatePkCapitalDisplay();
  updateCapitalDrawDisplay();
  updateFactorDisplays();
  updateProjectionYearsDisplay();
}

function updatePkCapitalDisplay() {
  const input = document.getElementById('pk-capital');
  const range = document.getElementById('pk-capital-range');
  const display = document.getElementById('pk-capital-display');
  const fill = document.getElementById('pk-capital-track-fill');
  if (!input || !range) return;
  const value = parseFormatted(input.value);
  if (display) display.textContent = formatThousands(value);
  if (fill) {
    const min = Number(range.min) || 0;
    const max = Number(range.max) || 1;
    fill.style.width = `${Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))}%`;
  }
}

function updateCapitalDrawDisplay() {
  const input = document.getElementById('capital-draw');
  const range = document.getElementById('capital-draw-range');
  const display = document.getElementById('capital-draw-display');
  const fill = document.getElementById('capital-draw-track-fill');
  if (!input || !range) return;
  const value = parseFormatted(input.value);
  if (display) display.textContent = formatThousands(value);
  if (fill) {
    const min = Number(range.min) || 0;
    const max = Number(range.max) || 1;
    fill.style.width = `${Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))}%`;
  }
}

function updateProjectionYearsDisplay() {
  const input = document.getElementById('projection-years');
  const range = document.getElementById('projection-years-range');
  const display = document.getElementById('projection-years-display');
  const fill = document.getElementById('projection-years-track-fill');
  if (!input || !range) return;
  const targetAge = Math.max(75, Number(input.value) || 92);
  const retireAge = Number(document.getElementById('retire-age')?.value) || 65;
  const value = Math.max(1, targetAge - retireAge);
  if (display) display.textContent = String(targetAge);
  if (fill) {
    const min = Number(range.min) || 1;
    const max = Number(range.max) || 60;
    fill.style.width = `${Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))}%`;
  }
}

function syncPlanningFields(sourceId) {
  const retireAge = Number(document.getElementById('retire-age')?.value) || 65;
  const lifeInput = document.getElementById('life-expectancy');
  const projectionInput = document.getElementById('projection-years');
  const projectionRange = document.getElementById('projection-years-range');
  if (!lifeInput || !projectionInput) return;

  const sourceInput = sourceId === 'life-expectancy' ? lifeInput : projectionInput;
  if (sourceInput && sourceInput.value === '') return;
  if ((sourceId === 'life-expectancy' || sourceId === 'projection-years') && Number(sourceInput.value) < 75) return;

  let targetAge;
  let projectionYears;
  if (sourceId === 'projection-years-range') {
    projectionYears = Math.max(1, Number(projectionRange?.value) || 1);
    targetAge = retireAge + projectionYears;
  } else {
    targetAge = sourceId === 'life-expectancy' || sourceId === 'life-expectancy-range'
      ? Number(lifeInput.value)
      : Number(projectionInput.value);
    targetAge = Math.max(75, targetAge || 92);
    projectionYears = Math.max(1, targetAge - retireAge);
  }
  lifeInput.value = targetAge;
  projectionInput.value = targetAge;
  if (projectionRange) projectionRange.value = projectionYears;
  updateProjectionYearsDisplay();
}

function normalizePlanningField(input) {
  if (!input || input.value !== '') return;
  const retireAge = Number(document.getElementById('retire-age')?.value) || 65;
  input.value = input.id === 'life-expectancy' || input.id === 'projection-years'
    ? retireAge + 1
    : input.value;
  syncPlanningFields(input.id);
}

function updateFactorDisplay(inputId, rangeId, displayId, fillId) {
  const input = document.getElementById(inputId);
  const range = document.getElementById(rangeId);
  const display = document.getElementById(displayId);
  const fill = document.getElementById(fillId);
  if (!input || !range) return;
  const value = Number(input.value) || 0;
  if (display) display.textContent = value.toFixed(1);
  if (fill) {
    const min = Number(range.min) || 0;
    const max = Number(range.max) || 1;
    fill.style.width = `${Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))}%`;
  }
}

function updateFactorDisplays() {
  updateFactorDisplay('conversion-rate', 'conversion-rate-range', 'conversion-rate-display', 'conversion-rate-track-fill');
  updateFactorDisplay('return-rate', 'return-rate-range', 'return-rate-display', 'return-rate-track-fill');
  updateFactorDisplay('inflation', 'inflation-range', 'inflation-display', 'inflation-track-fill');
}

function syncInputValue(source, target) {
  if (!target) return;
  target.value = target.id === 'capital-draw'
    ? formatThousands(Number(source.value) || 0)
    : source.value;
  if (target.id === 'pk-capital') updatePkCapitalDisplay();
  if (target.id === 'capital-draw') updateCapitalDrawDisplay();
  if (target.id === 'conversion-rate' || target.id === 'return-rate' || target.id === 'inflation') updateFactorDisplays();
  if (target.id === 'projection-years') updateProjectionYearsDisplay();
}

function hideGapCoverageTip() {
  if (gapCoverageTip) gapCoverageTip.classList.add('hidden');
  if (gapCoverageInfo) gapCoverageInfo.setAttribute('aria-expanded', 'false');
}

function hidePlanStateTip() {
  if (planStateTip) planStateTip.classList.add('hidden');
  [planStateOk, planStatePartial, planStateCritical].forEach((button) => {
    button?.setAttribute('aria-expanded', 'false');
  });
}

function classifyCoverage(deficit, startCapital, endCapital, yearIndex) {
  if (deficit <= 0) {
    return { state: 'ok', label: 'Bedarf vollständig gedeckt', hint: 'In diesem Jahr decken gesicherte Rente und Kapitalertrag den Bedarf ohne zusätzlichen Kapitalabbau.' };
  }
  if (startCapital <= 0) {
    return {
      state: 'critical',
      label: 'Lücke ungedeckt',
      hint: 'Kein verfügbares Kapital mehr: Die Lücke öffnet sich weiter und kann nicht mehr über Kapitalabbau finanziert werden (-> Kapitalentwicklung).',
    };
  }
  if (startCapital < deficit || (yearIndex > 0 && endCapital <= 0)) {
    return {
      state: 'partial',
      label: 'Lücke nur teilweise gedeckt',
      hint: 'Das verfügbare Kapital reicht in diesem Jahr nur noch teilweise zur Deckung der Lücke. Ab Folgejahr ist die Lücke nicht mehr finanzierbar (-> Kapitalentwicklung).',
    };
  }
  return {
    state: 'ok',
    label: 'Lücke vollständig gedeckt',
    hint: 'In diesem Jahr kann die Lücke vollständig durch verfügbares Kapital gedeckt werden.',
  };
}

function buildCoverageTimeline(scenario, incomeSeries, needSeries) {
  const years = Math.min(scenario.projYears, Math.max(scenario.projection.potentials.length, scenario.projection.needs.length));
  const entries = [];
  for (let index = 0; index <= years; index++) {
    const income = Math.round(incomeSeries[index] || 0);
    const need = Math.round(needSeries[index] || 0);
    const deficit = Math.max(0, need - income);
    const startCapital = index > 0
      ? Math.max(0, Math.round(scenario.projection.rawPath[index - 1] || 0))
      : Math.max(0, Math.round(scenario.projection.rawPath[0] || 0));
    const endCapital = index > 0
      ? Math.max(0, Math.round(scenario.projection.rawPath[index] || 0))
      : startCapital;
    const coverage = classifyCoverage(deficit, startCapital, endCapital, index);
    entries.push({
      index,
      age: scenario.retireAge + index,
      deficit,
      startCapital,
      endCapital,
      state: coverage.state,
      label: coverage.label,
      hint: coverage.hint,
    });
  }

  const firstPartial = entries.find((entry) => entry.state === 'partial') || null;
  const firstCritical = entries.find((entry) => entry.state === 'critical') || null;
  const fullUntilAge = firstPartial
    ? Math.max(scenario.retireAge, firstPartial.age - 1)
    : (firstCritical ? Math.max(scenario.retireAge, firstCritical.age - 1) : scenario.life);

  return {
    years,
    entries,
    fullUntilAge,
    firstPartial,
    firstCritical,
  };
}

// ============================================================
// Swipe-to-close drawer (touch)
// ============================================================

function initDrawerSwipe(drawerId) {
  const drawer = document.getElementById(drawerId);
  if (!drawer) return;
  const handle = drawer.querySelector('.p2-drawer-handle');
  const header = drawer.querySelector('.p2-drawer-header');
  if (!handle && !header) return;

  let startY = 0, lastY = 0, dragging = false;

  function onStart(e) {
    startY   = e.touches ? e.touches[0].clientY : e.clientY;
    lastY    = startY;
    dragging = true;
    drawer.style.transition = 'none';
  }
  function onMove(e) {
    if (!dragging) return;
    lastY = e.touches ? e.touches[0].clientY : e.clientY;
    const delta = Math.max(0, lastY - startY);
    drawer.style.transform = `translateY(${delta}px)`;
  }
  function onEnd() {
    if (!dragging) return;
    dragging = false;
    drawer.style.transition = '';
    const delta = lastY - startY;
    if (delta > 80) {
      drawer.style.transform = '';
      closeDrawer(drawerId);
    } else {
      drawer.style.transform = '';
    }
  }

  [handle, header].forEach((el) => {
    if (!el) return;
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove',  onMove,  { passive: true });
    el.addEventListener('touchend',   onEnd);
  });
}

// ============================================================
// PK sync (slider ↔ payout, payout → pension)
// ============================================================

function syncPkDisplays() {
  const pkCapital   = readField('pk-capital');
  const pkShare     = readField('pk-share');
  const shareLabel  = document.getElementById('pk-share-value');
  if (shareLabel) shareLabel.textContent = `${pkShare}%`;
  setText('pk-capital-share-value', `CHF ${formatCHF(Math.round(pkCapital * pkShare / 100))}`);
  const shareFill = document.querySelector('.p2-mix-track span');
  if (shareFill) shareFill.style.width = `${pkShare}%`;

  const pkPayoutEl = document.getElementById('pk-payout');
  if (pkPayoutEl && !pkPayoutEl.dataset.userEdited) {
    const implied = Math.round(pkCapital * pkShare / 100);
    pkPayoutEl.value = document.activeElement === pkPayoutEl
      ? String(implied)
      : formatThousands(implied);
  }

  const pkPayoutVal = readField('pk-payout');
  const remainingPk = Math.max(0, pkCapital - pkPayoutVal);
  const conversion  = readField('conversion-rate') / 100;
  const computed    = Math.round(remainingPk * conversion);
  const pensionEl   = document.getElementById('pk-pension');
  if (pensionEl) {
    pensionEl.value = document.activeElement === pensionEl
      ? String(computed)
      : formatThousands(computed);
  }
  setText('pk-rent-share-value', `CHF ${formatCHF(computed)}/J.`);
  setText('pk-return-share-value', 'Einkommen –');

  const splitPct = `${Math.max(0, Math.min(100, pkShare))}%`;
  ['pk-share', 'chart-share-slider', 'gap-share-slider'].forEach((id) => {
    const slider = document.getElementById(id);
    if (slider) slider.style.setProperty('--share-split', splitPct);
  });
}

function syncChartShareControls(scenario) {
  const share = Math.max(0, Math.min(100, readField('pk-share')));
  const controls = [
    { slider: chartShareSlider, shareCapital: 'chart-share-capital', shareRent: 'chart-share-rent', rent: 'chart-rent-value', capital: 'chart-capital-value', capitalShare: 'chart-capital-share', rentShare: 'chart-rent-share' },
    { slider: document.getElementById('gap-share-slider'), shareCapital: 'gap-share-capital', shareRent: 'gap-share-rent', rent: 'gap-rent-value', capital: 'gap-capital-value', capitalShare: 'gap-capital-share', rentShare: 'gap-rent-share' },
  ];
  controls.forEach(({ slider, shareCapital, shareRent, rent, capital, capitalShare, rentShare }) => {
    if (slider) slider.value = String(share);
    setText(shareCapital, `${share}% Kapital`);
    setText(shareRent, `${100 - share}% Rente`);
    setText(capitalShare, `${share}%`);
    setText(rentShare, `${100 - share}%`);
    setText(rent, `CHF ${formatCHF(scenario?.pkPension || 0)}/J.`);
    setText(capital, `CHF ${formatCHF(scenario?.pkPayout || 0)}`);
    const track = slider?.previousElementSibling?.querySelector('span');
    if (track) track.style.width = `${share}%`;
  });
  setText('pk-return-share-value', `Einkommen CHF ${formatCHF(scenario?.totalInvestIncome || 0)}/J.`);
  setText('pk-total-rent-share-value', `Rente CHF ${formatCHF(scenario?.securedIncome || 0)}/J.`);
  setText('chart-capital-return-value', `CHF ${formatCHF(scenario?.totalInvestIncome || 0)}/J.`);
  setText('gap-capital-return-value', `CHF ${formatCHF((scenario?.totalInvestIncome || 0) - (scenario?.realEstateIncome || 0))}/J.`);
  setText('gap-other-income', `CHF ${formatCHF(scenario?.realEstateIncome || 0)}/J.`);
  setText('gap-total-income', `CHF ${formatCHF(scenario?.totalIncome || 0)}/J.`);
  setText('chart-total-rent', `CHF ${formatCHF(scenario?.securedIncome || 0)}/J.`);
  setText('gap-total-rent', `CHF ${formatCHF(scenario?.securedIncome || 0)}/J.`);
  setText('gap-modal-total', `CHF ${formatCHF(scenario?.totalIncome || 0)} / Jahr`);
  setText('chart-other-free-value', `CHF ${formatCHF(scenario?.freeCapital || 0)}`);
  setText('chart-bound-capital-value', `CHF ${formatCHF(scenario?.boundCapital || 0)}`);
  setText('chart-total-capital-value', `CHF ${formatCHF(scenario?.totalCapital || 0)}`);
  setText('gap-free-value', `CHF ${formatCHF(scenario?.freeCapital || 0)}`);
  setText('gap-bound-capital-value', `CHF ${formatCHF(scenario?.boundCapital || 0)}`);
  setText('gap-total-capital-value', `CHF ${formatCHF(scenario?.totalCapital || 0)}`);
}

function buildScenarioData() {
  const projYears  = Math.max(1, readField('projection-years') || 27);
  const retireAge  = readField('retire-age');
  const life       = retireAge + projYears;
  const draw       = readField('capital-draw');
  const age        = readField('age');
  const inflation  = readField('inflation') / 100;

  const pkCapital   = readField('pk-capital');
  const pkPayout    = Math.min(readField('pk-payout'), pkCapital);
  const remainingPk = Math.max(0, pkCapital - pkPayout);
  const conversion  = readField('conversion-rate') / 100;
  const pkPension   = Math.round(remainingPk * conversion);

  const pillar3a      = readField('pillar3a');
  const investments   = readField('investments');
  const otherAssets   = readField('other-assets');
  const netRealEstate = Math.max(0, readField('real-estate') - readField('mortgage'));

  const investedCapital = Math.round(pillar3a + investments + otherAssets + pkPayout);
  const freeCapital     = investedCapital;
  const boundCapital    = netRealEstate;
  const totalCapital    = freeCapital + boundCapital;

  const p3aRet  = readField('pillar3a-return') / 100;
  const wsRet   = readField('investments-return') / 100;
  const baseRet = readField('return-rate') / 100;
  const p3aIncome = Math.round(pillar3a * p3aRet);
  const wsIncome = Math.round(investments * wsRet);
  const otherAssetsIncome = Math.round(otherAssets * baseRet);
  const pkCapitalIncome = Math.round(pkPayout * baseRet);

  const realEstateIncome = readField('real-estate-income');
  const weightedReturn = freeCapital > 0
    ? (p3aIncome + wsIncome + otherAssetsIncome + pkCapitalIncome) / freeCapital
    : baseRet;
  const totalInvestIncome = p3aIncome + wsIncome + otherAssetsIncome + pkCapitalIncome + realEstateIncome;
  const rentIncome = Math.round(
    readField('ahv') +
    readField('child-allowance') +
    readField('child-pension') +
    readField('other-income') +
    pkPension
  );
  const securedIncome = rentIncome;
  const totalIncome = rentIncome + totalInvestIncome;

  const projection = simulateProjection(freeCapital, securedIncome, weightedReturn, realEstateIncome, draw, inflation, projYears);

  return {
    projYears,
    retireAge,
    life,
    draw,
    age,
    inflation,
    pkCapital,
    pkPayout,
    remainingPk,
    conversion,
    pkPension,
    p3aIncome,
    wsIncome,
    otherAssetsIncome,
    pkCapitalIncome,
    totalInvestIncome,
    totalIncome,
    investedCapital,
    freeCapital,
    boundCapital,
    totalCapital,
    weightedReturn,
    securedIncome,
    realEstateIncome,
    rentIncome,
    projection,
  };
}

// ============================================================
// Simulation engine
// ============================================================

function simulateProjection(initialCapital, securedIncome, returnRate, fixedIncome, draw, inflation, years) {
  const path = [Math.max(initialCapital, 0)];
  const rawPath = [initialCapital];
  const needs = [], potentials = [], returnAmounts = [];
  let current = initialCapital;
  for (let i = 1; i <= years; i++) {
    const inflationYears = i - 1;
    const need          = draw * Math.pow(1 + inflation, inflationYears);
    const effectiveCap  = Math.max(current, 0);
    const dynamicReturn = effectiveCap * returnRate;
    const fixedIncomeYear = fixedIncome * Math.pow(1 + inflation, inflationYears);
    const securedIncomeYear = securedIncome * Math.pow(1 + inflation, inflationYears);
    const potential     = securedIncomeYear + fixedIncomeYear + dynamicReturn;
    current += potential - need;
    rawPath.push(current);
    path.push(Math.max(current, 0));
    needs.push(need);
    potentials.push(potential);
    returnAmounts.push(dynamicReturn + fixedIncomeYear);
  }
  return { path, rawPath, needs, potentials, returnAmounts };
}

function updateAnnualGapGallery(scenario) {
  const gallery = document.getElementById('annual-gap-gallery');
  if (!gallery) return;

  const { retireAge, projection: proj } = scenario;
  const years = Math.min(proj.needs.length, proj.potentials.length);
  const selectedYear = clampFocusYear(years);
  if (!years) {
    gallery.innerHTML = '';
    return;
  }

  const maxSeries = Math.max(
    1,
    ...proj.needs.map((v) => Math.abs(v)),
    ...proj.potentials.map((v) => Math.abs(v))
  );

  const cards = [];
  for (let i = 0; i < years; i++) {
    const age = retireAge + i + 1;
    const income = Math.round(proj.potentials[i] || 0);
    const need = Math.round(proj.needs[i] || 0);
    const gap = income - need;
    const incomeHeight = Math.max(2, Math.round((Math.abs(income) / maxSeries) * 100));
    const needHeight = Math.max(2, Math.round((Math.abs(need) / maxSeries) * 100));
    const topNeedRatio = needHeight > 0 ? Math.round((Math.max(0, needHeight - incomeHeight) / needHeight) * 100) : 0;
    const topIncomeRatio = incomeHeight > 0 ? Math.round((Math.max(0, incomeHeight - needHeight) / incomeHeight) * 100) : 0;

    cards.push(`
      <article class="p2-gap-year ${selectedYear === (i + 1) ? 'p2-gap-year-active' : ''}" aria-label="Jahr Alter ${age}">
        <h5>Alter ${age}</h5>
        <div class="p2-gap-compare">
          <div class="p2-gap-col">
            <div class="p2-gap-col-head"><span>Bedarf</span></div>
            <div class="p2-gap-stick">
              <div class="p2-gap-fill p2-gap-fill-need" style="height:${needHeight}%">
                ${topNeedRatio > 0 ? `<div class="p2-gap-top-segment need" style="height:${topNeedRatio}%"></div>` : ''}
              </div>
            </div>
            <div class="p2-gap-col-value">CHF ${formatCHF(need)}</div>
          </div>
          <div class="p2-gap-col">
            <div class="p2-gap-col-head"><span>Einkommen</span></div>
            <div class="p2-gap-stick">
              <div class="p2-gap-fill p2-gap-fill-income" style="height:${incomeHeight}%">
                ${topIncomeRatio > 0 ? `<div class="p2-gap-top-segment income" style="height:${topIncomeRatio}%"></div>` : ''}
              </div>
            </div>
            <div class="p2-gap-col-value">CHF ${formatCHF(income)}</div>
          </div>
        </div>
        <div class="p2-gap-footer">
          <strong class="${gap >= 0 ? 'pos' : 'neg'}">${gap >= 0 ? 'Ueberschuss' : 'Luecke'} ${gap >= 0 ? '+' : '-'} CHF ${formatCHF(Math.abs(gap))}</strong>
          <small>pro Jahr</small>
        </div>
      </article>
    `);
  }

  gallery.innerHTML = cards.join('');
}

// ============================================================
// Results
// ============================================================

function updateResults() {
  const scenario = buildScenarioData();
  syncChartShareControls(scenario);
  const {
    projYears,
    retireAge,
    life,
    draw,
    age,
    inflation,
    investedCapital,
    totalCapital,
    weightedReturn,
    securedIncome,
    rentIncome,
    realEstateIncome,
    p3aIncome,
    wsIncome,
    otherAssetsIncome,
    pkCapitalIncome,
    totalInvestIncome,
    totalIncome,
    freeCapital,
    boundCapital,
    projection: proj,
  } = scenario;

  const firstReturn    = Math.round(proj.returnAmounts[0] || 0);
  const firstPotential = Math.round(proj.potentials[0] || securedIncome);
  const inflatedNeed   = draw * Math.pow(1 + inflation, 1);

  const depletionIdx  = proj.rawPath.findIndex((v, i) => i > 0 && v <= 0);
  const depletionAge  = depletionIdx > 0 ? retireAge + depletionIdx : null;
  const unlimited     = draw <= 0 || depletionAge === null || depletionAge > 120;
  const ageText       = draw > 0
    ? (unlimited ? '120+' : `${depletionAge} Jahre`)
    : 'Unbegrenzt';

  // --- Cards ---
  setText('result-invested',        `CHF ${formatCHF(freeCapital)}`);
  setText('result-bound',           `CHF ${formatCHF(boundCapital)}`);
  setText('result-capital-income',  `CHF ${formatCHF(totalInvestIncome)}`);
  setText('result-rent-income',     `CHF ${formatCHF(rentIncome)}`);
  setText('chart-action-capital-total', `CHF ${formatCHF(totalCapital)}`);
  setText('chart-action-income-total', `CHF ${formatCHF(totalIncome)}`);
  setText('chart-action-need-total', `CHF ${formatCHF(draw)}`);
  updateResultDetails(scenario);
  setText('result-invested-amount', `frei CHF ${formatCHF(freeCapital)}`);
  setText('result-invest-return',   `CHF ${formatCHF(totalInvestIncome)}`);
  setText('result-total',           `CHF ${formatCHF(totalIncome)}`);
  setText('result-rent-income',     `CHF ${formatCHF(rentIncome)}`);
  setText('result-invest-income',   `CHF ${formatCHF(totalInvestIncome)}`);
  setText('result-age',             ageText);

  const ageCard = document.getElementById('card-age');
  if (ageCard) {
    ageCard.classList.remove('status-super', 'status-ok', 'status-think');
    if (unlimited) {
      ageCard.classList.add('status-super');
    } else if (depletionAge >= 90) {
      ageCard.classList.add('status-ok');
    } else {
      ageCard.classList.add('status-think');
    }
  }

  // Age detail
  const ageDetailEl = document.getElementById('result-age-detail');
  if (ageDetailEl) {
    if (draw <= 0) {
      ageDetailEl.textContent = `Kein Kapitalbezug. Projektion bis Alter ${life}.`;
    } else if (unlimited) {
      ageDetailEl.textContent = `CHF ${formatCHF(draw)}/Jahr – reicht über Alter ${life} hinaus.`;
    } else {
      ageDetailEl.textContent = `CHF ${formatCHF(draw)}/Jahr – Kapital bis Alter ${depletionAge}.`;
    }
  }

  // Insight text
  const gaps = proj.potentials.map((pot, idx) => pot - (proj.needs[idx] || 0));
  const firstGap   = gaps[0] ?? (firstPotential - inflatedNeed);
  const minGap     = gaps.length ? Math.min(...gaps) : firstGap;
  const hasAnyDeficit = minGap < 0;
  const thresholdYearIndex = gaps.findIndex((g) => g < 0);
  const thresholdAge = thresholdYearIndex >= 0 ? retireAge + thresholdYearIndex + 1 : null;
  const thresholdText = thresholdAge == null
    ? `Schwelle: kein Defizit im Horizont bis Alter ${life}.`
    : `Schwelle: ab Alter ${thresholdAge} entsteht Defizit (Bedarf > Einkommen).`;
  const netLine = `Netto im 1. Jahr (Einkommen + Rendite - Bedarf): CHF ${formatCHF(firstGap)}.`;
  let insight = `Kein jährlicher Kapitalbezug – Kapital bleibt erhalten. Alter ${age}, Pension ab ${retireAge}.`;
  if (draw > 0) {
    if (!hasAnyDeficit) {
      insight = `Alter ${age} → Pension ab ${retireAge}. Einkommen CHF ${formatCHF(firstPotential)} liegt stets über dem Bedarf. Anfangsüberschuss CHF ${formatCHF(firstGap)}/Jahr.`;
    } else if (firstGap >= 0) {
      insight = `Alter ${age} → Pension ab ${retireAge}. Anfangs Überschuss CHF ${formatCHF(firstGap)}/Jahr. Später übersteigt der inflationsbereinigte Bedarf das Einkommen – Kapitalverzehr in späteren Jahren.`;
    } else {
      insight = `Alter ${age} → Pension ab ${retireAge}. Bedarf liegt bereits zu Beginn um CHF ${formatCHF(Math.abs(firstGap))}/Jahr über dem Einkommen – sofortiger Kapitalverzehr.`;
    }
  }

  latestInsightText = `${insight} ${netLine} ${thresholdText}`;
  if (insightBody) insightBody.textContent = latestInsightText;

  const inflationFactor = (yearIndex) => (chartMode === 'real' ? Math.pow(1 + inflation, yearIndex) : 1);
  const timelineYears = Math.min(projYears, Math.max(proj.potentials.length, proj.needs.length));
  const incomeSeries = [];
  const needSeries = [];
  for (let i = 0; i <= timelineYears; i++) {
    const income = (i === 0
      ? securedIncome + (proj.returnAmounts[0] || 0)
      : (proj.potentials[i - 1] ?? securedIncome)) / inflationFactor(i);
    const need = (i === 0 ? draw : (proj.needs[i - 1] ?? 0)) / inflationFactor(i);
    incomeSeries.push(income);
    needSeries.push(need);
  }
  const timeline = buildCoverageTimeline(scenario, incomeSeries, needSeries);
  const focusIndex = Math.min(timeline.years, clampFocusYear(timeline.years));
  const focusEntry = timeline.entries[focusIndex] || timeline.entries[0];

  const setPlanState = (button, labelEl, ageText, indexValue, disabled, isCurrent, tipText, stateClass) => {
    if (!button || !labelEl) return;
    labelEl.textContent = ageText;
    button.dataset.year = String(Math.max(0, indexValue || 0));
    button.dataset.tip = tipText || '';
    button.disabled = !!disabled;
    button.classList.remove('is-current');
    button.classList.toggle('is-disabled', !!disabled);
    button.classList.toggle('is-current', !disabled && isCurrent);
    button.classList.toggle('is-hidden', !!disabled && stateClass !== 'ok');
    button.setAttribute('aria-label', tipText || `Zustand ${stateClass}`);
  };

  const partialIndex = timeline.firstPartial ? timeline.firstPartial.index : -1;
  const criticalIndex = timeline.firstCritical ? timeline.firstCritical.index : -1;
  const fullIndex = timeline.firstPartial
    ? Math.max(0, timeline.firstPartial.index - 1)
    : (timeline.firstCritical ? Math.max(0, timeline.firstCritical.index - 1) : timeline.years);
  const hasTransitionStates = !!timeline.firstPartial || !!timeline.firstCritical;
  if (planBand) {
    const totalYears = Math.max(1, timeline.years);
    const greenEndPct = hasTransitionStates
      ? Math.max(4, Math.min(96, (Math.max(0, fullIndex) / totalYears) * 100))
      : 100;
    const yellowEndIndex = criticalIndex >= 0 ? criticalIndex : Math.min(totalYears, Math.max(0, partialIndex + 1));
    const yellowEndPct = hasTransitionStates
      ? Math.max(greenEndPct + 1.5, Math.min(98, (Math.max(0, yellowEndIndex) / totalYears) * 100))
      : 100;
    planBand.style.setProperty('--plan-green-end', `${greenEndPct.toFixed(2)}%`);
    planBand.style.setProperty('--plan-yellow-end', `${yellowEndPct.toFixed(2)}%`);
    planBand.style.setProperty('--plan-red-start', `${criticalIndex >= 0 ? yellowEndPct.toFixed(2) : '100'}%`);
    planBand.classList.toggle('is-all-ok', !hasTransitionStates);
  }

  // Smiley follows the same green/yellow/red assessment as the timeline.
  const statusEmoji = timeline.firstCritical ? '🤔' : (timeline.firstPartial ? '😐' : '😀');
  const smileyTone = timeline.firstCritical ? 'think' : (timeline.firstPartial ? 'neutral' : 'happy');
  const statusTitle = timeline.firstCritical
    ? `Ab Alter ${timeline.firstCritical.age} bleibt eine Lücke ungedeckt.`
    : (timeline.firstPartial
      ? `Ab Alter ${timeline.firstPartial.age} ist die Lücke nur teilweise finanzierbar.`
      : 'Sehr gut – die Lücke ist im gesamten Planungszeitraum gedeckt.');

  const emojiEl = document.getElementById('result-age-emoji');
  if (emojiEl) {
    emojiEl.textContent = statusEmoji;
    emojiEl.title = statusTitle;
  }

  if (p2InfoBtn) {
    p2InfoBtn.textContent = statusEmoji;
    p2InfoBtn.title = statusTitle;
    p2InfoBtn.classList.remove('p2-smiley-status-think', 'p2-smiley-status-neutral', 'p2-smiley-status-happy');
    p2InfoBtn.classList.add(`p2-smiley-status-${smileyTone}`);
  }

  const focusState = focusEntry?.state || 'ok';
  const okTip = `Bis Alter ${timeline.fullUntilAge} kann die Lücke vollständig über verfügbares Kapital geschlossen werden.`;
  const partialTip = timeline.firstPartial
    ? `Ab Alter ${timeline.firstPartial.age} ist die Lücke nur teilweise finanzierbar. Danach kippt der Zustand in rot.`
    : `Im aktuellen Horizont gibt es kein separates Übergangsjahr mit teilweiser Finanzierung.`;
  const criticalTip = timeline.firstCritical
    ? `Ab Alter ${timeline.firstCritical.age} ist kein weiterer Kapitalabbau möglich. Die Lücke bleibt ungedeckt (-> Kapitalentwicklung).`
    : `Im aktuellen Horizont wird kein roter Zustand erreicht.`;

  if (planStatus) {
    const statusText = timeline.firstCritical
      ? `Bis Alter ${timeline.fullUntilAge} gedeckt. Ab Alter ${timeline.firstCritical.age} bleibt eine Lücke ungedeckt.`
      : (timeline.firstPartial
        ? `Bis Alter ${timeline.fullUntilAge} gedeckt. Ab Alter ${timeline.firstPartial.age} nur teilweise finanzierbar.`
          : `Die Lücke ist bis Alter ${timeline.fullUntilAge} vollständig gedeckt.`);
    const statusClass = timeline.firstCritical ? 'is-critical' : (timeline.firstPartial ? 'is-partial' : 'is-ok');
    planStatus.textContent = statusText;
    planStatus.className = `p2-plan-status ${statusClass}`;
  }

  const p3StatusCopy = document.querySelector('.p3-status-copy');
  const p3GuideAvatar = document.querySelector('.p3-guide-avatar');
  const p3SimulationStatus = document.getElementById('p3-simulation-status');
  if (p3StatusCopy) {
    const statusTone = timeline.firstCritical ? 'is-critical' : (timeline.firstPartial ? 'is-partial' : 'is-ok');
    const statusHeading = timeline.firstCritical ? 'Achtung' : (timeline.firstPartial ? 'Im Blick behalten' : 'Sehr gut!');
    const statusDescription = timeline.firstCritical
      ? `Ab Alter ${timeline.firstCritical.age} bleibt eine Lücke ungedeckt.`
      : (timeline.firstPartial ? `Bis Alter ${timeline.fullUntilAge} vollständig gedeckt.` : `Deine Planung ist bis Alter ${timeline.fullUntilAge} vollständig gedeckt.`);
    p3StatusCopy.className = `p3-status-copy ${statusTone}`;
    p3StatusCopy.querySelector('strong')?.replaceChildren(document.createTextNode(statusHeading));
    p3StatusCopy.querySelector('p')?.replaceChildren(document.createTextNode(statusDescription));
    p3GuideAvatar?.classList.remove('is-ok', 'is-partial', 'is-critical');
    p3GuideAvatar?.classList.add(statusTone);
    const simulationMessage = timeline.firstCritical
      ? 'Hier sind Massnahmen erforderlich.'
      : (timeline.firstPartial ? 'Prüf bitte deine Angaben.' : 'Das sieht aber gut aus.');
    if (p3SimulationStatus) {
      p3SimulationStatus.textContent = simulationMessage;
      p3SimulationStatus.className = `p3-simulation-status ${statusTone}`;
    }
  }
  setText('p3-current-age', readField('age'));
  setText('p3-planned-age', timeline.fullUntilAge);
  setText('p3-target-age', scenario.life);

  setPlanState(
    planStateOk,
    planStateOkAge,
    '',
    fullIndex,
    false,
    focusState === 'ok',
    okTip,
    'ok',
  );
  setPlanState(
    planStatePartial,
    planStatePartialAge,
    timeline.firstPartial ? String(timeline.firstPartial.age) : '–',
    partialIndex,
    !timeline.firstPartial,
    focusState === 'partial',
    partialTip,
    'partial',
  );
  setPlanState(
    planStateCritical,
    planStateCriticalAge,
    '',
    criticalIndex,
    !timeline.firstCritical,
    focusState === 'critical',
    criticalTip,
    'critical',
  );

  if (planStateTip) {
    if (focusState === 'critical') {
      planStateTip.className = 'p2-plan-tip hidden is-critical';
      planStateTip.textContent = criticalTip;
    } else if (focusState === 'partial') {
      planStateTip.className = 'p2-plan-tip hidden is-partial';
      planStateTip.textContent = partialTip;
    } else {
      planStateTip.className = 'p2-plan-tip hidden is-ok';
      planStateTip.textContent = okTip;
    }
    hidePlanStateTip();
  }

  syncYearControls(scenario);
  // Sync chart + drawer chips if visible
  if (chartModal && !chartModal.classList.contains('hidden')) updateChart();
  if (gapModal && !gapModal.classList.contains('hidden')) updateGapChart();
  if (activeDrawer) updateDrawerChips();
}

// ============================================================
// Chart
// ============================================================

function updateChart() {
  const scenario = buildScenarioData();
  const { retireAge, projYears, freeCapital, boundCapital, pkPayout, totalCapital, securedIncome, weightedReturn: wRet, projection: proj } = scenario;
  const inflation = Math.max(0, readField('inflation') / 100);
  const inflationFactor = (yearIndex) => (chartMode === 'real' ? Math.pow(1 + inflation, yearIndex) : 1);
  const visibleYears = Math.min(projYears, Math.max(0, proj.path.length - 1));
  const freeSeries = proj.path
    .slice(0, visibleYears + 1)
    .map((value, index) => (value || 0) / inflationFactor(index));
  const boundSeries = Array.from({ length: visibleYears + 1 }, (_, index) => (boundCapital || 0) / inflationFactor(index));
  const pkShare = freeCapital > 0 ? Math.max(0, Math.min(1, pkPayout / freeCapital)) : 0;
  const pkSeries = freeSeries.map((value) => value * pkShare);
  const otherFreeSeries = freeSeries.map((value, index) => Math.max(0, value - pkSeries[index]));
  const midSeries = boundSeries.map((value, index) => value + otherFreeSeries[index]);
  const capitalSeries = boundSeries.map((value, index) => value + freeSeries[index]);
  const focusIndex = Math.min(visibleYears, clampFocusYear(visibleYears));
  const incomeSeries = [];
  const needSeries = [];
  for (let i = 0; i <= visibleYears; i++) {
    const income = (i === 0
      ? securedIncome + (proj.returnAmounts[0] || 0)
      : (proj.potentials[i - 1] ?? securedIncome)) / inflationFactor(i);
    const need = (i === 0 ? readField('capital-draw') : (proj.needs[i - 1] ?? 0)) / inflationFactor(i);
    incomeSeries.push(income);
    needSeries.push(need);
  }
  const coverageTimeline = buildCoverageTimeline(scenario, incomeSeries, needSeries);

  const canvas = document.getElementById('simulation-chart');
  if (!canvas) return;
  const dpr      = window.devicePixelRatio || 1;
  const cssW     = Math.max(canvas.clientWidth || canvas.width, 280);
  const cssH     = Math.max(Math.round(cssW * (cssW < 520 ? 0.52 : 0.39)), 228);
  canvas.style.height = `${cssH}px`;
  canvas.width   = Math.round(cssW * dpr);
  canvas.height  = Math.round(cssH * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const capMax  = Math.max(...capitalSeries, totalCapital, 1) * 1.06;

  const mob    = cssW < 520;
  const tM = mob ? 18 : 20;
  const bM = mob ? 30 : 32;
  const lM = mob ? 10 : 14;
  const rM = mob ? 14 : 18;
  const capH = Math.max(140, cssH - tM - bM);
  const capTop = tM;
  const capBot = capTop + capH;
  const plotW = cssW - lM - rM;

  const mapYC = (value) => capBot - (value / Math.max(1, capMax)) * capH;
  const mapX = (index) => lM + (plotW / Math.max(1, visibleYears)) * index;

  function formatBadgeCHF(value) {
    return `CHF ${formatCHF(Math.round(value || 0))}`;
  }

  function traceSmoothSeries(series) {
    if (!series.length) return;
    ctx.beginPath();
    ctx.moveTo(mapX(0), mapYC(series[0] || 0));
    for (let index = 1; index < series.length; index++) {
      const prevX = mapX(index - 1);
      const prevY = mapYC(series[index - 1] || 0);
      const currX = mapX(index);
      const currY = mapYC(series[index] || 0);
      const midX = (prevX + currX) / 2;
      const midY = (prevY + currY) / 2;
      ctx.quadraticCurveTo(prevX, prevY, midX, midY);
      if (index === series.length - 1) ctx.quadraticCurveTo(currX, currY, currX, currY);
    }
  }

  function fillAreaBetweenSeries(lowerSeries, upperSeries, color) {
    if (!lowerSeries.length || !upperSeries.length) return;
    ctx.beginPath();
    upperSeries.forEach((value, index) => {
      const x = mapX(index);
      const y = mapYC(value);
      index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    for (let index = lowerSeries.length - 1; index >= 0; index--) {
      ctx.lineTo(mapX(index), mapYC(lowerSeries[index] || 0));
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawBadge(lines, x, y, align = 'left') {
    const lineGap = mob ? 13 : 14;
    const padX = mob ? 8 : 10;
    const padY = mob ? 7 : 8;
    const radius = 8;
    ctx.font = `700 ${mob ? 10.5 : 11.5}px Inter,sans-serif`;
    const textWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
    const width = textWidth + padX * 2;
    const height = lines.length * lineGap + padY * 2 - 2;
    const drawX = align === 'right' ? Math.max(6, x - width) : Math.min(cssW - width - 6, x);
    const drawY = Math.max(6, Math.min(cssH - height - 6, y));

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(drawX + radius, drawY);
    ctx.lineTo(drawX + width - radius, drawY);
    ctx.arcTo(drawX + width, drawY, drawX + width, drawY + radius, radius);
    ctx.lineTo(drawX + width, drawY + height - radius);
    ctx.arcTo(drawX + width, drawY + height, drawX + width - radius, drawY + height, radius);
    ctx.lineTo(drawX + radius, drawY + height);
    ctx.arcTo(drawX, drawY + height, drawX, drawY + height - radius, radius);
    ctx.lineTo(drawX, drawY + radius);
    ctx.arcTo(drawX, drawY, drawX + radius, drawY, radius);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#2563eb';
    ctx.textAlign = 'left';
    lines.forEach((line, index) => {
      ctx.fillText(line, drawX + padX, drawY + padY + 9 + index * lineGap);
    });
  }

  function drawFocusAgeBadge(age, x, y) {
    const label = String(age);
    ctx.font = `700 ${mob ? 12 : 13}px Inter,sans-serif`;
    const width = Math.max(mob ? 34 : 38, ctx.measureText(label).width + 16);
    const height = mob ? 28 : 30;
    const drawX = Math.max(4, Math.min(cssW - width - 4, x - width / 2));
    const drawY = Math.max(4, Math.min(cssH - height - 4, y));
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, width, height, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(label, drawX + width / 2, drawY + height / 2 + 4);
  }

  ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
  ctx.fillRect(lM, capTop, plotW, capH);

  const yTicks = mob ? 3 : 4;
  const xTicks = mob ? 4 : 5;

  ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
  ctx.lineWidth = 1;
  for (let index = 0; index < yTicks; index++) {
    const ratio = yTicks === 1 ? 0 : index / (yTicks - 1);
    const y = capBot - ratio * capH;
    ctx.beginPath();
    ctx.moveTo(lM, y);
    ctx.lineTo(cssW - rM, y);
    ctx.stroke();
  }

  ctx.setLineDash([3, 5]);
  for (let index = 0; index < xTicks; index++) {
    const ratio = xTicks === 1 ? 0 : index / (xTicks - 1);
    const year = Math.round(ratio * visibleYears);
    const x = mapX(year);
    ctx.beginPath();
    ctx.moveTo(x, capTop);
    ctx.lineTo(x, capBot);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const drawMilestoneMarker = (entry, color) => {
    if (!entry || entry.index <= 0 || entry.index > visibleYears) return;
    const x = mapX(entry.index);
    const isGreen = color === COVERAGE_GREEN;
    ctx.setLineDash(isGreen ? [] : [3, 4]);
    ctx.strokeStyle = color;
    ctx.lineWidth = isGreen ? 2.2 : 1.1;
    ctx.beginPath();
    ctx.moveTo(x, capTop);
    ctx.lineTo(x, capBot);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const fullCoverageYears = coverageTimeline.firstPartial
    ? Math.max(0, coverageTimeline.firstPartial.index - 1)
    : (coverageTimeline.firstCritical ? Math.max(0, coverageTimeline.firstCritical.index - 1) : visibleYears);
  drawMilestoneMarker({ index: fullCoverageYears }, COVERAGE_GREEN);
  drawMilestoneMarker(coverageTimeline.firstPartial, '#f59e0b');
  drawMilestoneMarker(coverageTimeline.firstCritical, '#ef4444');

  traceSmoothSeries(boundSeries);
  ctx.lineTo(mapX(boundSeries.length - 1), capBot);
  ctx.lineTo(mapX(0), capBot);
  ctx.closePath();
  ctx.fillStyle = 'rgba(51, 65, 85, 0.30)';
  ctx.fill();

  fillAreaBetweenSeries(boundSeries, midSeries, 'rgba(191, 219, 254, 0.72)');
  fillAreaBetweenSeries(midSeries, capitalSeries, 'rgba(59, 130, 246, 0.38)');

  traceSmoothSeries(midSeries);
  ctx.strokeStyle = 'rgba(147, 197, 253, 0.95)';
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // Focus marker controlled by year slider
  const focusX = mapX(focusIndex);
  ctx.setLineDash([2, 4]);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.75;
  ctx.beginPath();
  ctx.moveTo(focusX, capTop);
  ctx.lineTo(focusX, capBot);
  ctx.stroke();
  ctx.setLineDash([]);

  // Capital development line
  traceSmoothSeries(capitalSeries);
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = mob ? 2.4 : 2.8;
  ctx.stroke();

  const startX = mapX(0);
  const startY = mapYC(capitalSeries[0] || 0);
  const endIndex = Math.max(0, capitalSeries.length - 1);
  const endX = mapX(endIndex);
  const endY = mapYC(capitalSeries[endIndex] || 0);
  const focusY = mapYC(capitalSeries[focusIndex] || 0);

  ctx.strokeStyle = '#93c5fd';
  ctx.lineWidth = mob ? 2.2 : 2.6;
  ctx.fillStyle = '#eff6ff';
  [[startX, startY], [focusX, focusY], [endX, endY]].forEach(([pointX, pointY]) => {
    ctx.beginPath();
    ctx.arc(pointX, pointY, mob ? 3.8 : 4.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // Grid and axis labels
  for (let index = 0; index < xTicks; index++) {
    const ratio = xTicks === 1 ? 0 : index / (xTicks - 1);
    const year = Math.round(ratio * visibleYears);
    const x = mapX(year);
    const isFocusYear = year === focusIndex;
    const label = String(retireAge + year);
    if (isFocusYear) continue;
    ctx.fillStyle = '#334155';
    ctx.font = `${isFocusYear ? '700' : '500'} ${mob ? 11.5 : 12.5}px Inter,sans-serif`;
    ctx.textAlign = index === 0 ? 'left' : (index === xTicks - 1 ? 'right' : 'center');
    ctx.fillText(label, x, capBot + 18);
  }

  drawFocusAgeBadge(retireAge + focusIndex, focusX, capBot + 21);

  drawBadge([`Start ${formatBadgeCHF(capitalSeries[0] || 0)}`], startX + 10, startY - 30);
  drawBadge([
    `Ende ${formatBadgeCHF(capitalSeries[endIndex] || 0)}`,
  ], Math.min(cssW - 10, endX - 10), endY - 30, 'right');

  // Method note
  const noteEl = document.getElementById('chart-method-note');
  if (noteEl) {
    const modeLabel = chartMode === 'real'
      ? 'Real = Werte in heutiger Kaufkraft, inflationsbereinigt.'
      : 'Nominal = laufende Franken ohne Inflationsabzug.';
    noteEl.textContent =
      `${modeLabel} Dunkelgrau = gebundenes Kapital, Hellblau = freies Kapital, Blau = Gesamtkapital. ` +
      `Die gesicherten Renten und Erträge werden in der Einkommenssicht zusammen mit Bedarf und Lücke dargestellt. ` +
      `Gesamtkapital Start CHF ${formatCHF(totalCapital)}, Rendite ${(Math.round(wRet * 10000) / 100).toFixed(2)}%, ` +
      `Inflation ${readField('inflation').toFixed(1)}%.`;
  }

  const capitalCaption = document.getElementById('chart-capital-caption');
  if (capitalCaption) {
    capitalCaption.textContent =
      `Die Rente läuft ab Alter ${retireAge}. Festgelegter Jahresbedarf: CHF ${formatCHF(readField('capital-draw'))}. ` +
      'Die Kurve zeigt den verbleibenden Kapitalbestand, der zusätzlich für diesen Bedarf eingesetzt wird.';
  }

  if (chartYearDetails) {
    const boundStart = Math.round(focusIndex > 0 ? (boundSeries[focusIndex - 1] || 0) : (boundSeries[0] || 0));
    const boundEnd = Math.round(boundSeries[focusIndex] || 0);
    const freeStart = Math.round(focusIndex > 0 ? (freeSeries[focusIndex - 1] || 0) : (freeSeries[0] || 0));
    const freeEnd = Math.round(freeSeries[focusIndex] || 0);
    const totalStart = boundStart + freeStart;
    const totalEnd = boundEnd + freeEnd;
    const freeDelta = freeEnd - freeStart;
    const boundDelta = boundEnd - boundStart;
    const totalDelta = totalEnd - totalStart;
    const freeDepleted = freeStart <= 0 && freeEnd <= 0;
    const insufficientDrawdown = freeStart > 0 && freeEnd <= 0 && focusIndex < visibleYears;
    const isCriticalDrawdown = freeDepleted || insufficientDrawdown;
    const freeDeltaClass = isCriticalDrawdown
      ? 'p2-capital-year-change is-critical'
      : (freeDelta > 0 ? 'p2-capital-year-change is-gain' : (freeDelta < 0 ? 'p2-capital-year-change is-loss' : 'p2-capital-year-change is-flat'));
    const totalDeltaClass = isCriticalDrawdown
      ? 'p2-capital-year-change is-critical'
      : (totalDelta > 0 ? 'p2-capital-year-change is-gain' : (totalDelta < 0 ? 'p2-capital-year-change is-loss' : 'p2-capital-year-change is-flat'));
    const freeDeltaPrefix = freeDelta > 0 ? '+ ' : (freeDelta < 0 ? '- ' : '');
    const totalDeltaPrefix = totalDelta > 0 ? '+ ' : (totalDelta < 0 ? '- ' : '');
    const freeDeltaValue = freeDepleted ? '' : `${freeDeltaPrefix}CHF ${formatCHF(Math.abs(freeDelta))}`;
    const totalDeltaValue = freeDepleted ? '' : `${totalDeltaPrefix}CHF ${formatCHF(Math.abs(totalDelta))}`;
    const boundDeltaValue = '';
    const boundDeltaCellClass = 'p2-chart-focus-line p2-capital-year-value';
    const coverageEntry = coverageTimeline.entries[focusIndex];
    const gapAmount = Math.max(0, coverageEntry?.deficit || 0);
    const coveredByCapital = Math.min(gapAmount, Math.max(0, coverageEntry?.startCapital || 0));
    const uncoveredAmount = Math.max(0, gapAmount - coveredByCapital);
    const capitalStatus = gapAmount > 0 && coverageEntry?.state === 'ok'
      ? `Lücke CHF ${formatCHF(gapAmount)} – vollständig durch Kapital gedeckt.`
      : (gapAmount > 0
        ? `Lücke CHF ${formatCHF(gapAmount)} – durch Kapital gedeckt CHF ${formatCHF(coveredByCapital)}, ungedeckt CHF ${formatCHF(uncoveredAmount)}.`
        : '');
    const capitalStatusClass = coverageEntry?.state === 'ok' ? 'is-success' : 'is-critical';
    chartYearDetails.innerHTML =
      `<div class="p2-capital-year-grid">` +
      `<span></span><span class="p2-capital-year-colhead">Verfügbar</span><span class="p2-capital-year-colhead">Gebunden</span><span class="p2-capital-year-colhead">Gesamt</span>` +
      `<span class="p2-capital-year-label">1.1.</span><span class="p2-chart-focus-line p2-capital-year-value p2-capital-year-free">CHF ${formatCHF(freeStart)}</span><span class="p2-chart-focus-line p2-capital-year-value p2-capital-year-bound">CHF ${formatCHF(boundStart)}</span><span class="p2-chart-focus-line p2-capital-year-value p2-capital-year-total">CHF ${formatCHF(totalStart)}</span>` +
      `<span class="p2-capital-year-label"> </span><span class="p2-chart-focus-line p2-capital-year-value ${freeDeltaClass}">${freeDeltaValue}</span><span class="${boundDeltaCellClass}">${boundDeltaValue}</span><span class="p2-chart-focus-line p2-capital-year-value ${totalDeltaClass}">${totalDeltaValue}</span>` +
      `<span class="p2-capital-year-label">31.12.</span><span class="p2-chart-focus-line p2-capital-year-value p2-capital-year-free">CHF ${formatCHF(freeEnd)}</span><span class="p2-chart-focus-line p2-capital-year-value p2-capital-year-bound">CHF ${formatCHF(boundEnd)}</span><span class="p2-chart-focus-line p2-capital-year-value p2-capital-year-total">CHF ${formatCHF(totalEnd)}</span>` +
      `</div>${capitalStatus ? `<div class="p2-capital-year-status ${capitalStatusClass}">${capitalStatus}</div>` : ''}`;
    if (chartYearSummary) {
      chartYearSummary.innerHTML =
        `<div class="p2-year-card-head"><strong>Alter ${retireAge + focusIndex}</strong></div>` +
        `<div class="p2-year-card-values"><span><small>Verfügbar</small><strong>CHF ${formatCHF(freeEnd)}</strong></span>` +
        `<span><small>Gebunden</small><strong>CHF ${formatCHF(boundEnd)}</strong></span>` +
        `<span><small>Gesamt</small><strong>CHF ${formatCHF(totalEnd)}</strong></span></div>`;
    }
  }
}

function updateGapChart() {
  const scenario = buildScenarioData();
  const { retireAge, projYears, securedIncome, projection: proj } = scenario;
  const inflation = Math.max(0, readField('inflation') / 100);
  const inflationFactor = (yearIndex) => (chartMode === 'real' ? Math.pow(1 + inflation, yearIndex) : 1);

  const years = Math.min(projYears, Math.max(proj.potentials.length, proj.needs.length));
  const focusIndex = Math.min(years, clampFocusYear(years));
  const incomeSeries = [];
  const rentSeries = [];
  const returnSeries = [];
  const needSeries = [];
  for (let i = 0; i <= years; i++) {
    const income = (i === 0
      ? securedIncome + (proj.returnAmounts[0] || 0)
      : (proj.potentials[i - 1] ?? securedIncome)) / inflationFactor(i);
    const rent = (securedIncome * Math.pow(1 + inflation, i)) / inflationFactor(i);
    const need = (i === 0 ? readField('capital-draw') : (proj.needs[i - 1] ?? 0)) / inflationFactor(i);
    const capitalReturn = Math.max(0, income - rent);
    incomeSeries.push(income);
    rentSeries.push(rent);
    returnSeries.push(capitalReturn);
    needSeries.push(need);
  }
  const gapSeries = incomeSeries.map((value, i) => value - (needSeries[i] || 0));
  const coverageTimeline = buildCoverageTimeline(scenario, incomeSeries, needSeries);

  const canvas = document.getElementById('gap-simulation-chart');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = Math.max(canvas.clientWidth || canvas.width, 280);
  const cssH = Math.max(Math.round(cssW * 0.5), 230);
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const mob = cssW < 520;
  const top = mob ? 22 : 28;
  const bottom = cssH - (mob ? 28 : 32);
  const left = mob ? 16 : 24;
  const right = mob ? 28 : 18;
  const h = Math.max(120, bottom - top);
  const maxY = Math.max(1, ...incomeSeries, ...needSeries);
  const xStep = (cssW - left - right) / Math.max(1, years);
  const mapY = (value) => bottom - (value / maxY) * h;
  const mapX = (index) => left + xStep * index;

  ctx.strokeStyle = 'rgba(148,163,184,0.28)';
  ctx.fillStyle = '#94a3b8';
  ctx.font = `${mob ? 12 : 14}px Inter,sans-serif`;
  for (let i = 0; i < 4; i++) {
    const r = i / 3;
    const y = bottom - r * h;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(cssW - right, y);
    ctx.stroke();
  }

  function fillAreaToBaseline(series, color) {
    if (!series.length) return;
    ctx.beginPath();
    series.forEach((value, index) => {
      const x = mapX(index);
      const y = mapY(value);
      index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(mapX(series.length - 1), bottom);
    ctx.lineTo(mapX(0), bottom);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function fillAreaBetween(lowerSeries, upperSeries, color, predicate) {
    if (!lowerSeries.length || !upperSeries.length) return;
    for (let index = 1; index < lowerSeries.length; index++) {
      const lowerPrev = lowerSeries[index - 1] || 0;
      const lowerCurr = lowerSeries[index] || 0;
      const upperPrev = upperSeries[index - 1] || 0;
      const upperCurr = upperSeries[index] || 0;
      if (predicate && !predicate(index - 1, index)) continue;
      ctx.beginPath();
      ctx.moveTo(mapX(index - 1), mapY(lowerPrev));
      ctx.lineTo(mapX(index), mapY(lowerCurr));
      ctx.lineTo(mapX(index), mapY(upperCurr));
      ctx.lineTo(mapX(index - 1), mapY(upperPrev));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  function drawSeriesLine(series, color, width, dashed = false) {
    if (!series.length) return;
    ctx.beginPath();
    series.forEach((value, index) => {
      const x = mapX(index);
      const y = mapY(value);
      index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dashed ? [5, 4] : []);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawGapEndpointBadge(label, value, x, y, align, offset, color = '#2563eb') {
    const text = `CHF ${formatCHF(Math.round(value || 0))}`;
    ctx.font = `700 ${mob ? 9.5 : 11}px Inter,sans-serif`;
    const width = ctx.measureText(text).width + 14;
    const height = mob ? 22 : 25;
    const drawX = align === 'right' ? Math.max(4, x - width - 8) : Math.min(cssW - width - 4, x + 8);
    const drawY = Math.max(4, Math.min(cssH - height - 4, y + offset));
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = color === '#64748b' ? '#94a3b8' : '#93c5fd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, width, height, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(text, drawX + 7, drawY + height / 2 + 3.5);
  }

  function drawGapFocusAgeBadge(age, x, y) {
    const label = String(age);
    ctx.font = `700 ${mob ? 12 : 13}px Inter,sans-serif`;
    const width = Math.max(mob ? 34 : 38, ctx.measureText(label).width + 16);
    const height = mob ? 28 : 30;
    const drawX = Math.max(4, Math.min(cssW - width - 4, x - width / 2));
    const drawY = Math.max(4, Math.min(cssH - height - 4, y));
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, width, height, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(label, drawX + width / 2, drawY + height / 2 + 4);
  }

  if (showGapDetails) {
    fillAreaToBaseline(rentSeries, 'rgba(217, 154, 0, 0.18)');
    fillAreaBetween(rentSeries, incomeSeries, 'rgba(37, 99, 235, 0.18)');
  } else {
    fillAreaToBaseline(incomeSeries, 'rgba(37, 99, 235, 0.16)');
  }
  fillAreaBetween(incomeSeries, needSeries, 'rgba(217, 154, 0, 0.12)', (prev, curr) => {
    const needPrev = needSeries[prev] || 0;
    const needCurr = needSeries[curr] || 0;
    const incomePrev = incomeSeries[prev] || 0;
    const incomeCurr = incomeSeries[curr] || 0;
    const prevCovered = coverageTimeline.entries[prev]?.state === 'ok';
    const currCovered = coverageTimeline.entries[curr]?.state === 'ok';
    return (needPrev > incomePrev || needCurr > incomeCurr) && (prevCovered || currCovered);
  });
  fillAreaBetween(incomeSeries, needSeries, 'rgba(229, 72, 77, 0.12)', (prev, curr) => {
    const needPrev = needSeries[prev] || 0;
    const needCurr = needSeries[curr] || 0;
    const incomePrev = incomeSeries[prev] || 0;
    const incomeCurr = incomeSeries[curr] || 0;
    const prevUncovered = coverageTimeline.entries[prev]?.state !== 'ok';
    const currUncovered = coverageTimeline.entries[curr]?.state !== 'ok';
    return (needPrev > incomePrev || needCurr > incomeCurr) && (prevUncovered || currUncovered);
  });
  fillAreaBetween(needSeries, incomeSeries, 'rgba(22, 163, 106, 0.18)', (prev, curr) => {
    const needPrev = needSeries[prev] || 0;
    const needCurr = needSeries[curr] || 0;
    const incomePrev = incomeSeries[prev] || 0;
    const incomeCurr = incomeSeries[curr] || 0;
    return incomePrev >= needPrev && incomeCurr >= needCurr;
  });

  const tickCount = mob ? 4 : 5;
  ctx.strokeStyle = 'rgba(148,163,184,0.34)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 5]);
  for (let t = 0; t < tickCount; t++) {
    const r = tickCount === 1 ? 0 : t / (tickCount - 1);
    const index = Math.round(r * years);
    const x = mapX(index);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const drawMilestoneMarker = (entry, color) => {
    if (!entry || entry.index <= 0) return;
    const x = mapX(entry.index);
    const isGreen = color === COVERAGE_GREEN;
    ctx.setLineDash(isGreen ? [] : [3, 4]);
    ctx.strokeStyle = color;
    ctx.lineWidth = isGreen ? 2.2 : 1.1;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!isGreen) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, top + 5, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const fullCoverageYears = coverageTimeline.firstPartial
    ? Math.max(0, coverageTimeline.firstPartial.index - 1)
    : (coverageTimeline.firstCritical ? Math.max(0, coverageTimeline.firstCritical.index - 1) : years);
  drawMilestoneMarker({ index: fullCoverageYears }, COVERAGE_GREEN);
  drawMilestoneMarker(coverageTimeline.firstPartial, '#f59e0b');
  drawMilestoneMarker(coverageTimeline.firstCritical, '#ef4444');

  const focusX = mapX(focusIndex);
  ctx.setLineDash([2, 4]);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.35;
  ctx.beginPath();
  ctx.moveTo(focusX, top);
  ctx.lineTo(focusX, bottom);
  ctx.stroke();
  ctx.setLineDash([]);

  if (showGapDetails) drawSeriesLine(rentSeries, '#d99a00', mob ? 2.1 : 2.4, true);
  if (showGapDetails) drawSeriesLine(returnSeries, '#2563eb', mob ? 2.1 : 2.4);
  drawSeriesLine(incomeSeries, '#2563eb', mob ? 2.5 : 3);

  // Bedarf reference line across the chart.
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = mob ? 1.8 : 2;
  ctx.beginPath();
  needSeries.forEach((value, index) => {
    const x = mapX(index);
    const y = mapY(value);
    index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  const focusIncomeY = mapY(incomeSeries[focusIndex] || 0);
  const focusNeedY = mapY(needSeries[focusIndex] || 0);
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.arc(focusX, focusIncomeY, 3, 0, Math.PI * 2);
  ctx.fill();
  const focusRentY = mapY(rentSeries[focusIndex] || 0);
  ctx.fillStyle = '#d99a00';
  ctx.beginPath();
  ctx.arc(focusX, focusRentY, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.arc(focusX, focusNeedY, 2.8, 0, Math.PI * 2);
  ctx.fill();

  const endpointLabels = [
    { label: 'Einkommen', value: incomeSeries[0] || 0, y: mapY(incomeSeries[0] || 0), color: '#2563eb' },
    { label: 'Bedarf', value: needSeries[0] || 0, y: mapY(needSeries[0] || 0), color: '#64748b' },
  ].sort((a, b) => a.y - b.y);
  endpointLabels.forEach((entry, index) => {
    ctx.fillStyle = entry.color;
    ctx.beginPath();
    ctx.arc(mapX(0), entry.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    drawGapEndpointBadge('Start ' + entry.label, entry.value, mapX(0), entry.y, 'left', index === 0 ? -28 : 8, entry.color);
  });
  const endEndpointLabels = [
    { label: 'Einkommen', value: incomeSeries[years] || 0, y: mapY(incomeSeries[years] || 0), color: '#2563eb' },
    { label: 'Bedarf', value: needSeries[years] || 0, y: mapY(needSeries[years] || 0), color: '#64748b' },
  ].sort((a, b) => a.y - b.y);
  endEndpointLabels.forEach((entry, index) => {
    ctx.fillStyle = entry.color;
    ctx.beginPath();
    ctx.arc(mapX(years), entry.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    drawGapEndpointBadge('Ende ' + entry.label, entry.value, mapX(years), entry.y, 'right', index === 0 ? -28 : 8, entry.color);
  });

  drawGapFocusAgeBadge(retireAge + focusIndex, focusX, bottom + 18);

  ctx.textAlign = 'left';
  for (let t = 0; t < tickCount; t++) {
    const r = tickCount === 1 ? 0 : t / (tickCount - 1);
    const index = Math.round(r * years);
    const x = mapX(index);
    const isFocusYear = index === focusIndex;
    if (isFocusYear) continue;
    ctx.fillStyle = isFocusYear ? '#0f172a' : '#64748b';
    ctx.font = `${isFocusYear ? '700' : '500'} ${mob ? 12 : 14}px Inter,sans-serif`;
    ctx.fillText(String(retireAge + index), x - 8, bottom + 14);
  }

  const note = document.getElementById('gap-chart-note');
  if (note) {
    note.textContent =
      'Nominal: Goldfläche unten = gesicherte Rente, Blauflaeche darüber = Kapitalertrag und weitere Erträge, Dunkelblau = Gesamteinkommen, Grau = Bedarf, Amber = gemanagte Lücke, helles Coral = ungedeckter Rest. Jahresauswahl durch Antippen der Jahreslinie.';
  }

  const gapCaption = document.getElementById('gap-chart-caption');
  if (gapCaption) {
    gapCaption.textContent =
      `Gesamteinkommen aus gesicherter Rente, Kapitalertrag und weiteren Erträgen. Festgelegter Jahresbedarf: CHF ${formatCHF(readField('capital-draw'))}.`;
  }

  if (gapYearDetails) {
    const need = Math.round(needSeries[focusIndex] || 0);
    const income = Math.round(incomeSeries[focusIndex] || 0);
    const rent = Math.round(rentSeries[focusIndex] || 0);
    const capitalReturn = Math.max(0, income - rent);
    const gap = income - need;
    const focusCoverage = coverageTimeline.entries[focusIndex] || coverageTimeline.entries[0];
    const gapAmount = Math.max(0, focusCoverage?.deficit || 0);
    const coveredByCapital = Math.min(gapAmount, Math.max(0, focusCoverage?.startCapital || 0));
    const uncoveredAmount = Math.max(0, gapAmount - coveredByCapital);
    const gapClass = gap >= 0
      ? 'p2-chart-focus-gap p2-chart-focus-surplus'
      : (uncoveredAmount > 0 ? 'p2-chart-focus-gap' : 'p2-chart-focus-gap p2-chart-focus-gap-covered');
    gapYearDetails.innerHTML =
      `<span class="p2-chart-focus-line p2-chart-focus-rent">Rente CHF ${formatCHF(rent)}</span>` +
      `<span class="p2-chart-focus-line p2-chart-focus-return">Ertrag CHF ${formatCHF(capitalReturn)}</span>` +
      `<span class="p2-chart-focus-line ${gapClass}">${gap >= 0 ? 'Überschuss' : 'Lücke'} CHF ${formatCHF(Math.abs(gap))}</span>` +
      `<span class="p2-chart-focus-line p2-chart-focus-need">Bedarf CHF ${formatCHF(need)}</span>` +
      (gap < 0
        ? `<span class="p2-chart-focus-line p2-chart-focus-covered">Gedeckt CHF ${formatCHF(coveredByCapital)}</span>` +
          (uncoveredAmount > 0 ? `<span class="p2-chart-focus-line p2-chart-focus-uncovered">Ungedeckt CHF ${formatCHF(uncoveredAmount)}</span>` : '')
        : '');
    if (gapSummaryIncome) gapSummaryIncome.textContent = `CHF ${formatCHF(income)}`;
    if (gapSummaryNeed) gapSummaryNeed.textContent = `CHF ${formatCHF(need)}`;
  }

  if (gapCoverageBadge && gapCoverageInfo && gapCoverageTip) {
    const focusCoverage = coverageTimeline.entries[focusIndex] || coverageTimeline.entries[0];
    const statusClass = focusCoverage?.state === 'critical' ? 'is-critical' : (focusCoverage?.state === 'partial' ? 'is-partial' : 'is-ok');
    const statusLabel = focusCoverage?.label || 'Lücke vollständig schliessbar';
    const statusHint = focusCoverage?.hint || 'In diesem Jahr kann die Lücke vollständig durch verfügbares Kapital gedeckt werden.';

    gapCoverageBadge.className = `p2-gap-coverage-badge ${statusClass}`;
    gapCoverageInfo.className = `p2-gap-coverage-info ${statusClass}`;
    gapCoverageTip.className = `p2-gap-coverage-tip hidden ${statusClass}`;
    gapCoverageBadge.textContent = statusLabel;
    gapCoverageTip.textContent = statusHint;
    gapCoverageInfo.dataset.tip = statusHint;
    gapCoverageInfo.setAttribute('aria-label', `${statusLabel}. Hinweis einblenden.`);
    hideGapCoverageTip();
  }
}

// ============================================================
// Fill example data
// ============================================================

function fillExample() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };

  set('age', 56); set('retire-age', 65); set('canton', 'SG');
  const ms = document.querySelector('input[name="marital-status"][value="verheiratet"]');
  if (ms) ms.checked = true;
  const ch = document.querySelector('input[name="children"][value="ja"]');
  if (ch) ch.checked = true;
  set('life-expectancy', 92);

  set('pillar3a', 85000);      set('pillar3a-return', 4.5);
  set('investments', 15000);   set('investments-return', 5);
  set('real-estate', 1600000); set('real-estate-income', 10000);
  set('mortgage', 930000);     set('other-assets', 0);
  set('ahv', 32760);           set('child-allowance', 5520);
  set('child-pension', 11376); set('other-income', 0);
  set('return-rate', 6.9);     set('inflation', 1.4);
  set('projection-years', 27); set('conversion-rate', 5.2);

  const pkCapEl = document.getElementById('pk-capital');
  if (pkCapEl) pkCapEl.value = formatThousands(950000);

  const pkShareEl = document.getElementById('pk-share');
  if (pkShareEl) pkShareEl.value = 50;

  const pkPayoutEl = document.getElementById('pk-payout');
  if (pkPayoutEl) {
    delete pkPayoutEl.dataset.userEdited;
    pkPayoutEl.value = formatThousands(550000);
  }

  const drawEl = document.getElementById('capital-draw');
  if (drawEl) drawEl.value = formatThousands(120000);

  syncPkDisplays();
  updateResults();
  saveFormState();
}

// ============================================================
// Event wiring
// ============================================================

function attachEvents() {
  cantonSelect?.addEventListener('change', updateCantonCrest);

  // Step navigation
  p2Prev.addEventListener('click', () => {
    saveStarted();
    if (currentStep > 0) showStep(currentStep - 1);
  });
  p2Next.addEventListener('click', () => {
    saveStarted();
    showStep(Math.min(steps.length - 1, currentStep + 1));
  });
  step1Cta?.addEventListener('click', () => {
    saveStarted();
    showStep(1);
  });
  p3CheckTile?.addEventListener('click', () => step1Cta?.click());
  p3StatusToggle?.addEventListener('click', () => {
    const isHidden = planStateTip?.classList.toggle('hidden');
    p3StatusToggle.setAttribute('aria-expanded', String(!isHidden));
  });
  p3BackSlot?.addEventListener('click', () => showStep(0));
  planBand?.addEventListener('click', (event) => {
    if (currentStep !== 0) return;
    const segment = event.target.closest('.p2-plan-segment');
    if (!segment || segment.disabled || !planStateTip) return;
    planStateTip.textContent = segment.dataset.tip || '';
    planStateTip.classList.toggle('hidden');
    segment.setAttribute('aria-expanded', String(!planStateTip.classList.contains('hidden')));
  });

  // Header smiley popup
  p2InfoBtn?.addEventListener('click', () => {
    if (!smileyModal || !smileyModalText) return;
    const modalText = currentStep === 0
      ? STEP_META[0].desc
      : (latestInsightText || STEP_META[1].desc);
    smileyModalText.textContent = modalText;
    smileyModal.classList.remove('hidden');
    p2InfoBtn.setAttribute('aria-expanded', 'true');
  });
  closeSmileyModalBtn?.addEventListener('click', () => {
    smileyModal?.classList.add('hidden');
    p2InfoBtn?.setAttribute('aria-expanded', 'false');
  });
  smileyModal?.addEventListener('click', (e) => {
    if (e.target === smileyModal) {
      smileyModal.classList.add('hidden');
      p2InfoBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  // Card tap -> open read-only result details
  document.querySelectorAll('.p2-result-card').forEach((card) => {
    card?.addEventListener('click', () => {
      activeDetailKind = card.id === 'card-bound' ? 'bound'
        : (card.id === 'card-capital-income' ? 'capital-income'
          : (card.id === 'card-rent-income' ? 'rent-income' : 'invested'));
      updateResultDetails(buildScenarioData());
      openDrawer('drawer-result-detail');
    });
    card?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
    });
  });
  resultDetailEdit?.addEventListener('click', () => {
    const drawer = resultDetailEdit.dataset.drawer;
    closeDrawer('drawer-result-detail');
    activeEditKind = activeDetailKind;
    if (drawer) {
      openDrawer(drawer);
      if (drawer === 'drawer-invested') setEditMode(activeEditKind);
    }
  });

  // Drawer close buttons
  document.querySelectorAll('.p2-drawer-close').forEach((btn) => {
    btn.addEventListener('click', () => closeDrawer(btn.dataset.drawer));
  });

  // Backdrop click → close drawer or chart
  backdrop.addEventListener('click', () => {
    if (activeDrawer) closeDrawer();
  });

  // Chart modal
  openChartBtn?.addEventListener('click', () => {
    chartModal?.classList.remove('hidden');
    updateResults();
    updateChart();
  });
  closeChartBtn?.addEventListener('click', () => chartModal?.classList.add('hidden'));
  chartYearDetailsToggle?.addEventListener('click', () => {
    const isOpen = chartYearDetailsToggle.getAttribute('aria-expanded') === 'true';
    chartYearDetailsToggle.setAttribute('aria-expanded', String(!isOpen));
    chartYearDetailsToggle.textContent = isOpen ? 'Details anzeigen' : 'Details ausblenden';
    chartYearDetails?.classList.toggle('hidden', isOpen);
  });
  chartInfoBtn?.addEventListener('click', () => {
    const help = chartInfoBtn.parentElement;
    const isOpen = help?.classList.toggle('is-open') || false;
    chartInfoBtn.setAttribute('aria-expanded', String(isOpen));
  });
  chartModal?.addEventListener('click', (e) => {
    if (e.target === chartModal) chartModal.classList.add('hidden');
  });

  openGapBtn?.addEventListener('click', () => {
    chartModal?.classList.add('hidden');
    gapModal?.classList.remove('hidden');
    updateResults();
    updateGapChart();
  });
  closeGapBtn?.addEventListener('click', () => gapModal?.classList.add('hidden'));
  gapInfoBtn?.addEventListener('click', () => {
    const help = gapInfoBtn.parentElement;
    const isOpen = help?.classList.toggle('is-open') || false;
    gapInfoBtn.setAttribute('aria-expanded', String(isOpen));
  });
  gapDetailsToggle?.addEventListener('click', () => {
    showGapDetails = !showGapDetails;
    gapDetailsToggle.setAttribute('aria-expanded', String(showGapDetails));
    gapDetailsToggle.textContent = showGapDetails ? 'Details ausblenden' : 'Details anzeigen';
    document.querySelectorAll('.gap-detail-legend, .gap-income-detail').forEach((item) => item.classList.toggle('hidden', !showGapDetails));
    if (gapModal && !gapModal.classList.contains('hidden')) updateGapChart();
  });
  gapYearDetailsToggle?.addEventListener('click', () => {
    const isOpen = gapYearDetailsToggle.getAttribute('aria-expanded') === 'true';
    gapYearDetailsToggle.setAttribute('aria-expanded', String(!isOpen));
    gapYearDetailsToggle.textContent = isOpen ? 'Jahresdetails anzeigen' : 'Jahresdetails ausblenden';
    gapYearDetails?.classList.toggle('hidden', isOpen);
  });
  gapModal?.addEventListener('click', (e) => {
    if (e.target === gapModal) gapModal.classList.add('hidden');
  });

  const simulationCanvas = document.getElementById('simulation-chart');
  simulationCanvas?.addEventListener('click', (event) => {
    const scenario = buildScenarioData();
    const years = Math.min(scenario.projYears, Math.max(0, scenario.projection.path.length - 1));
    const rect = simulationCanvas.getBoundingClientRect();
    const cssW = Math.max(simulationCanvas.clientWidth || rect.width, 280);
    const mob = rect.width < 520;
    const leftMargin = mob ? 10 : 14;
    const rightMargin = mob ? 14 : 18;
    const plotWidth = Math.max(1, cssW - leftMargin - rightMargin);
    const offsetX = Number.isFinite(event.offsetX) ? event.offsetX : (event.clientX - rect.left);
    const ratio = Math.max(0, Math.min(1, (offsetX - leftMargin) / plotWidth));
    focusYear = Math.max(0, Math.min(years, Math.round(ratio * years)));
    updateResults();
  });

  const gapCanvas = document.getElementById('gap-simulation-chart');
  gapCanvas?.addEventListener('click', (event) => {
    const scenario = buildScenarioData();
    const rect = gapCanvas.getBoundingClientRect();
    const cssW = Math.max(gapCanvas.clientWidth || rect.width, 280);
    const years = Math.min(scenario.projYears, Math.max(scenario.projection.potentials.length, scenario.projection.needs.length));
    const mob = rect.width < 520;
    const leftMargin = mob ? 16 : 24;
    const rightMargin = mob ? 28 : 18;
    const plotWidth = Math.max(1, cssW - leftMargin - rightMargin);
    const offsetX = Number.isFinite(event.offsetX) ? event.offsetX : (event.clientX - rect.left);
    const ratio = Math.max(0, Math.min(1, (offsetX - leftMargin) / plotWidth));
    focusYear = Math.max(0, Math.min(years, Math.round(ratio * years)));
    updateResults();
  });

  function onShareSliderInput(value) {
    const share = Math.max(0, Math.min(100, Number(value) || 0));
    const pkShare = document.getElementById('pk-share');
    if (!pkShare) return;
    pkShare.value = String(share);
    const payout = document.getElementById('pk-payout');
    if (payout) delete payout.dataset.userEdited;
    syncPkDisplays();
    updateResults();
    saveFormState();
  }
  chartShareSlider?.addEventListener('input', (e) => onShareSliderInput(e.target.value));
  document.getElementById('gap-share-slider')?.addEventListener('input', (e) => onShareSliderInput(e.target.value));

  gapCoverageInfo?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!gapCoverageTip) return;
    const isOpen = gapCoverageInfo.getAttribute('aria-expanded') === 'true';
    if (isOpen) {
      hideGapCoverageTip();
      return;
    }
    gapCoverageTip.textContent = gapCoverageInfo.dataset.tip || '';
    gapCoverageTip.classList.remove('hidden');
    gapCoverageInfo.setAttribute('aria-expanded', 'true');
  });
  document.addEventListener('click', (e) => {
    if (!gapCoverageInfo || !gapCoverageTip) return;
    const target = e.target;
    if (gapCoverageInfo.contains(target) || gapCoverageTip.contains(target)) return;
    hideGapCoverageTip();
  });

  [planStateOk, planStatePartial, planStateCritical].forEach((button) => {
    button?.addEventListener('click', () => {
      if (button.disabled) return;
      const year = Number(button.dataset.year);
      if (!Number.isFinite(year) || year < 0) return;
      const stateClass = button.classList.contains('is-critical')
        ? 'is-critical'
        : (button.classList.contains('is-partial') ? 'is-partial' : 'is-ok');
      const tip = button.dataset.tip || '';
      focusYear = Math.round(year);
      updateResults();
      hidePlanStateTip();
      if (planStateTip) {
        planStateTip.className = `p2-plan-tip ${stateClass}`;
        planStateTip.textContent = tip;
        planStateTip.classList.remove('hidden');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });
  document.addEventListener('click', (e) => {
    if (!planStateTip) return;
    const target = e.target;
    const isPlanTarget = (planStateOk && planStateOk.contains(target))
      || (planStatePartial && planStatePartial.contains(target))
      || (planStateCritical && planStateCritical.contains(target))
      || planStateTip.contains(target);
    if (isPlanTarget) return;
    hidePlanStateTip();
  });

  chartModeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const nextMode = button.dataset.chartMode === 'real' ? 'real' : 'nominal';
      if (chartMode === nextMode) return;
      chartMode = nextMode;
      saveChartMode(chartMode);
      syncChartModeButtons();
      if (chartModal && !chartModal.classList.contains('hidden')) updateChart();
    });
  });

  // Keyboard escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hidePlanStateTip();
      if (smileyModal && !smileyModal.classList.contains('hidden')) {
        smileyModal.classList.add('hidden');
        p2InfoBtn?.setAttribute('aria-expanded', 'false');
      } else if (chartModal && !chartModal.classList.contains('hidden')) {
        chartModal.classList.add('hidden');
      } else if (gapModal && !gapModal.classList.contains('hidden')) {
        gapModal.classList.add('hidden');
      } else if (activeDrawer) {
        closeDrawer();
      }
    }
  });

  // Resize: redraw chart
  window.addEventListener('resize', () => {
    if (chartModal && !chartModal.classList.contains('hidden')) updateChart();
    if (gapModal && !gapModal.classList.contains('hidden')) updateGapChart();
  });

  // Mobile browsers can skip late input events before refresh/navigation.
  // Persist once more when the page is being hidden.
  window.addEventListener('pagehide', () => {
    saveFormState();
  });

  // Live recalc on every input/select change
  document.querySelectorAll('input, select').forEach((el) => {
    el.addEventListener('focus', () => {
      if (el.id === 'capital-draw' || el.id === 'pk-capital') el.select();
    });
    el.addEventListener('blur', () => {
      if (['life-expectancy', 'projection-years'].includes(el.id)) normalizePlanningField(el);
      if (el.id === 'capital-draw' || el.id === 'pk-capital') {
        el.value = formatThousands(parseFormatted(el.value));
        if (el.id === 'capital-draw') updateCapitalDrawDisplay();
        if (el.id === 'pk-capital') updatePkCapitalDisplay();
      }
    });
    el.addEventListener('input', () => {
      if (el.dataset.syncTarget) {
        const target = document.getElementById(el.dataset.syncTarget);
        syncInputValue(el, target);
      }
      if (el.dataset.syncRange) {
        const range = document.getElementById(el.dataset.syncRange);
        if (range) range.value = (el.id === 'capital-draw' || el.id === 'pk-capital') ? parseFormatted(el.value) : el.value;
        if (el.id === 'pk-capital') updatePkCapitalDisplay();
        if (el.id === 'capital-draw') updateCapitalDrawDisplay();
        if (el.id === 'conversion-rate' || el.id === 'return-rate' || el.id === 'inflation') updateFactorDisplays();
        if (el.id === 'projection-years') updateProjectionYearsDisplay();
      }
      if (['life-expectancy', 'life-expectancy-range', 'projection-years', 'projection-years-range', 'retire-age', 'retire-age-range'].includes(el.id)) {
        syncPlanningFields(el.id);
      }
      if (el.id === 'pk-payout') el.dataset.userEdited = '1';
      if (['pk-share', 'pk-capital', 'pk-payout', 'conversion-rate'].includes(el.id)) {
        syncPkDisplays();
      }
      updateResults();
      if (activeDrawer) updateDrawerChips();
      saveFormState();
    });
    el.addEventListener('change', () => {
      if (el.dataset.syncTarget) {
        const target = document.getElementById(el.dataset.syncTarget);
        syncInputValue(el, target);
      }
      if (el.dataset.syncRange) {
        const range = document.getElementById(el.dataset.syncRange);
        if (range) range.value = (el.id === 'capital-draw' || el.id === 'pk-capital') ? parseFormatted(el.value) : el.value;
        if (el.id === 'pk-capital') updatePkCapitalDisplay();
        if (el.id === 'capital-draw') updateCapitalDrawDisplay();
        if (el.id === 'conversion-rate' || el.id === 'return-rate' || el.id === 'inflation') updateFactorDisplays();
        if (el.id === 'projection-years') updateProjectionYearsDisplay();
      }
      if (['life-expectancy', 'life-expectancy-range', 'projection-years', 'projection-years-range', 'retire-age', 'retire-age-range'].includes(el.id)) {
        syncPlanningFields(el.id);
      }
      if (el.id === 'pk-payout') el.dataset.userEdited = '1';
      if (['pk-share', 'pk-capital', 'pk-payout', 'conversion-rate'].includes(el.id)) {
        syncPkDisplays();
      }
      updateResults();
      if (activeDrawer) updateDrawerChips();
      saveFormState();
    });
  });

  // Radio buttons fire 'change' reliably across mobile browsers
  document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      updateResults();
      if (activeDrawer) updateDrawerChips();
      saveFormState();
    });
  });
}

// ============================================================
// Init
// ============================================================

window.p2TestApi = {
  buildScenarioData,
  simulateProjection,
  syncPkDisplays,
  updateResults,
};

initFormattedFields();
loadFormState();
syncLinkedRanges();
syncPlanningFields('life-expectancy');
chartMode = 'nominal';
syncChartModeButtons();
syncPkDisplays();
updateCantonCrest();
initDrawerSwipe('drawer-invested');
initDrawerSwipe('drawer-income');
showStep(loadStep());
attachEvents();
updateResults();
saveFormState();
