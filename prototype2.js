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
const backdrop     = document.getElementById('p2-backdrop');
const insightToggleBtn = document.getElementById('insight-toggle-btn');
const insightBody  = document.getElementById('result-insight');
const chartModal   = document.getElementById('chart-modal');
const openChartBtn = document.getElementById('open-chart-modal');
const closeChartBtn = document.getElementById('close-chart-modal');
const gapModal = document.getElementById('gap-modal');
const openGapBtn = document.getElementById('open-gap-modal');
const closeGapBtn = document.getElementById('close-gap-modal');
const smileyModal = document.getElementById('smiley-modal');
const closeSmileyModalBtn = document.getElementById('close-smiley-modal');
const smileyModalText = document.getElementById('smiley-modal-text');
const chartCard    = document.getElementById('chart-card');
const chartModeButtons = Array.from(document.querySelectorAll('[data-chart-mode]'));
const chartYearSlider = document.getElementById('chart-year-slider');
const gapYearSlider = document.getElementById('gap-year-slider');
const chartFocusLabel = document.getElementById('chart-focus-label');
const gapFocusLabel = document.getElementById('gap-focus-label');
const chartYearDetails = document.getElementById('chart-year-details');
const gapYearDetails = document.getElementById('gap-year-details');
const chartShareSlider = document.getElementById('chart-share-slider');
const gapShareSlider = document.getElementById('gap-share-slider');

const STEP_META = [
  {
    title: 'Persönliche Angaben',
    desc:  'Alter, Kanton und Lebenserwartung – Grundlage für die Projektion.',
  },
  {
    title: 'PK Simulation',
    desc:  'PK-Felder direkt eingeben. Kacheln tippen für Detaileingaben.',
  },
];

let currentStep = 0;
let latestInsightText = '';

const STORAGE_STEP    = 'p2-wizard-step';
const STORAGE_STARTED = 'p2-wizard-started';
const STORAGE_CHART_MODE = 'p2-chart-mode';
const STORAGE_FORM_STATE = 'p2-form-state-v1';
let chartMode = 'nominal';
let focusYear = 1;

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
  focusYear = Math.max(1, Math.min(safeMax, Math.round(focusYear || 1)));
  return focusYear;
}

function syncYearControls(scenario) {
  if (!scenario) return;
  const year = clampFocusYear(scenario.projYears);
  const age = scenario.retireAge + year;
  const label = `Jahr ${year} (Alter ${age})`;

  [chartYearSlider, gapYearSlider].forEach((slider) => {
    if (!slider) return;
    slider.max = String(Math.max(1, scenario.projYears));
    slider.value = String(year);
  });
  if (chartFocusLabel) chartFocusLabel.textContent = label;
  if (gapFocusLabel) gapFocusLabel.textContent = label;
}

// ============================================================
// Step navigation
// ============================================================

function showStep(n) {
  currentStep = n;
  saveStep(n);
  steps.forEach((s, i) => s.classList.toggle('active', i === n));
  if (p2Progress) p2Progress.textContent = `${n + 1} / ${steps.length}`;
  p2Title.textContent    = STEP_META[n].title;
  if (p2Desc) {
    p2Desc.textContent = STEP_META[n].desc;
    p2Desc.classList.add('hidden');
  }
  if (p2InfoBtn) p2InfoBtn.setAttribute('aria-expanded', 'false');

  p2Prev.textContent           = n === 0 ? 'T' : 'Zurück';
  p2Prev.title                 = n === 0 ? 'Testdaten laden' : '';
  p2Next.style.display         = n === steps.length - 1 ? 'none' : 'inline-flex';
  p2InfoBtn?.setAttribute('aria-expanded', 'false');

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
  updateDrawerChips();
}

function closeDrawer(id) {
  const target = id ? document.getElementById(id) : activeDrawer;
  if (!target) return;
  target.classList.remove('open');
  backdrop.classList.remove('open');
  activeDrawer = null;
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
  setText('d-inv-invested', `CHF ${formatCHF(pillar3a + investments + otherAssets + pkPayout)}`);
  setText('d-inv-return', `CHF ${formatCHF(invReturn)}`);
  setText('d-p3a', `CHF ${formatCHF(pillar3a)}`);
  setText('d-ws', `CHF ${formatCHF(investments)}`);
  setText('d-pk-capital', `CHF ${formatCHF(pkPayout)}`);
  setText('d-real-estate', `CHF ${formatCHF(realEstate)}`);
  setText('d-mortgage', `CHF ${formatCHF(mortgage)}`);
  setText('d-other-assets', `CHF ${formatCHF(otherAssets)}`);

  const ahv      = readField('ahv');
  const childAllowance = readField('child-allowance');
  const childPension = readField('child-pension');
  const otherIncome = readField('other-income');
  const pkCapital = readField('pk-capital');
  const conversion = readField('conversion-rate') / 100;
  const pkPayoutValue = Math.min(readField('pk-payout'), pkCapital);
  const pkPension = Math.round(Math.max(0, pkCapital - pkPayoutValue) * conversion);
  const zusatz = childAllowance + childPension + otherIncome;
  setText('d-ahv',      `CHF ${formatCHF(ahv)}`);
  setText('d-zusatz',   `CHF ${formatCHF(zusatz)}`);
  setText('d-pk-rente', `CHF ${formatCHF(pkPension)}`);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
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
}

function syncChartShareControls(scenario) {
  const share = Math.max(0, Math.min(100, readField('pk-share')));
  const controls = [
    { slider: chartShareSlider, value: 'chart-share-value', rent: 'chart-rent-value', capital: 'chart-capital-value' },
    { slider: gapShareSlider, value: 'gap-share-value', rent: 'gap-rent-value', capital: 'gap-capital-value' },
  ];
  controls.forEach(({ slider, value, rent, capital }) => {
    if (slider) slider.value = String(share);
    setText(value, `${share}% Kapital / ${100 - share}% Rente`);
    setText(rent, `CHF ${formatCHF(scenario?.pkPension || 0)}/J.`);
    setText(capital, `CHF ${formatCHF(scenario?.pkPayout || 0)}`);
    const track = slider?.previousElementSibling?.querySelector('span');
    if (track) track.style.width = `${share}%`;
  });
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
  const totalCapital    = investedCapital + netRealEstate;

  const p3aRet  = readField('pillar3a-return') / 100;
  const wsRet   = readField('investments-return') / 100;
  const baseRet = readField('return-rate') / 100;
  const p3aIncome = Math.round(pillar3a * p3aRet);
  const wsIncome = Math.round(investments * wsRet);
  const otherAssetsIncome = Math.round(otherAssets * baseRet);
  const pkCapitalIncome = Math.round(pkPayout * baseRet);

  const realEstateIncome = readField('real-estate-income');
  const weightedReturn = totalCapital > 0
    ? (p3aIncome + wsIncome + otherAssetsIncome + pkCapitalIncome + realEstateIncome) / totalCapital
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

  const projection = simulateProjection(totalCapital, securedIncome, weightedReturn, draw, inflation, projYears);

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

function simulateProjection(initialCapital, securedIncome, returnRate, draw, inflation, years) {
  const path = [Math.max(initialCapital, 0)];
  const rawPath = [initialCapital];
  const needs = [], potentials = [], returnAmounts = [];
  let current = initialCapital;
  for (let i = 1; i <= years; i++) {
    const need          = draw * Math.pow(1 + inflation, i);
    const effectiveCap  = Math.max(current, 0);
    const dynamicReturn = effectiveCap * returnRate;
    const securedIncomeYear = securedIncome * Math.pow(1 + inflation, i);
    const potential     = securedIncomeYear + dynamicReturn;
    current += potential - need;
    rawPath.push(current);
    path.push(Math.max(current, 0));
    needs.push(need);
    potentials.push(potential);
    returnAmounts.push(dynamicReturn);
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
    projection: proj,
  } = scenario;

  const firstReturn    = Math.round(proj.returnAmounts[0] || 0);
  const firstPotential = Math.round(proj.potentials[0] || securedIncome);
  const inflatedNeed   = draw * Math.pow(1 + inflation, 1);
  const investIncome   = firstReturn + Math.round(realEstateIncome);

  const depletionIdx  = proj.rawPath.findIndex((v, i) => i > 0 && v <= 0);
  const depletionAge  = depletionIdx > 0 ? retireAge + depletionIdx : null;
  const unlimited     = draw <= 0 || depletionAge === null || depletionAge > 120;
  const ageText       = draw > 0
    ? (unlimited ? '120+' : `${depletionAge} Jahre`)
    : 'Unbegrenzt';

  // --- Cards ---
  setText('result-invested',        `CHF ${formatCHF(totalCapital)}`);
  setText('result-invested-amount', `CHF ${formatCHF(investedCapital)}`);
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

  // Smiley:
  //   🤩  capital lasts full projection AND (≥50% of start capital remains OR ≥20 years of need left at end)
  //   🙂  capital lasts full projection but more significantly consumed
  //   🤔  capital runs out before the projection ends
  const finalCapital = proj.rawPath[proj.rawPath.length - 1] ?? 0;
  const annualDrawAtEnd = draw > 0 ? draw * Math.pow(1 + inflation, projYears) : 0;
  const yearsOfCapitalLeft = annualDrawAtEnd > 0 ? finalCapital / annualDrawAtEnd : Infinity;
  const capitalLastsTerm = draw <= 0 || depletionAge === null || depletionAge >= life;
  const capitalWellPreserved = draw <= 0 || finalCapital >= totalCapital * 0.5 || yearsOfCapitalLeft >= 20;

  let statusEmoji, statusTitle;
  if (!capitalLastsTerm) {
    statusEmoji = '🤔';
    statusTitle = `Kapital reicht nur bis Alter ${depletionAge} – Planungsziel nicht erreicht.`;
  } else if (capitalWellPreserved) {
    statusEmoji = '🤩';
    statusTitle = yearsOfCapitalLeft === Infinity
      ? 'Kein Kapitalbezug nötig – Kapital bleibt erhalten!'
      : `Sehr gut – am Ende noch Kapital für ca. ${Math.round(yearsOfCapitalLeft)} Jahre (${Math.round(finalCapital / totalCapital * 100)}% des Startkapitals).`;
  } else {
    statusEmoji = '🙂';
    statusTitle = `Kapital reicht bis zum Planungsziel, aber stark verzehrt (noch ${Math.round(finalCapital / totalCapital * 100)}% am Ende).`;
  }

  const emojiEl = document.getElementById('result-age-emoji');
  if (emojiEl) {
    emojiEl.textContent = statusEmoji;
    emojiEl.title = statusTitle;
  }

  if (p2InfoBtn) {
    p2InfoBtn.textContent = statusEmoji;
    p2InfoBtn.title = statusTitle;
  }

  latestInsightText = `${insight} ${netLine} ${thresholdText}`;
  if (insightBody) insightBody.textContent = latestInsightText;

  syncYearControls(scenario);
  updateAnnualGapGallery(scenario);

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
  const { age, retireAge, projYears, life, totalCapital, securedIncome, weightedReturn: wRet, projection: proj } = scenario;
  const inflation = Math.max(0, readField('inflation') / 100);
  const inflationFactor = (yearIndex) => (chartMode === 'real' ? Math.pow(1 + inflation, yearIndex) : 1);
  const { path, needs, potentials } = proj;

  const capitalSeries = path.map((value, index) => value / inflationFactor(index));
  const incomeSeries = [];
  const needSeries = [];
  const visibleYears = Math.min(projYears, Math.max(potentials.length, needs.length));

  for (let i = 0; i <= visibleYears; i++) {
    const incomeValue = i === 0
      ? securedIncome + (proj.returnAmounts[0] || 0)
      : (potentials[i - 1] ?? potentials[potentials.length - 1] ?? securedIncome);
    const needValue = i === 0
      ? (needs[0] ?? 0)
      : (needs[i - 1] ?? needs[needs.length - 1] ?? 0);
    incomeSeries.push(incomeValue / inflationFactor(i));
    needSeries.push(needValue / inflationFactor(i));
  }

  const gapSeries = incomeSeries.map((value, index) => value - (needSeries[index] || 0));
  const capitalFlowSeries = capitalSeries.slice(1).map((value, index) => value - capitalSeries[index]);
  const thresholdYearIndex = gapSeries.findIndex((g) => g < 0);
  const consumptionYearIndex = capitalFlowSeries.findIndex((delta) => delta < 0);
  const focusIndex = Math.min(visibleYears, clampFocusYear(visibleYears));

  const canvas = document.getElementById('simulation-chart');
  if (!canvas) return;
  const dpr      = window.devicePixelRatio || 1;
  const cssW     = Math.max(canvas.clientWidth || canvas.width, 280);
  const cssH     = Math.max(Math.round(cssW * 0.5), 240);
  canvas.style.height = `${cssH}px`;
  canvas.width   = Math.round(cssW * dpr);
  canvas.height  = Math.round(cssH * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const capMax  = Math.max(...capitalSeries, totalCapital, 1);
  const cashMin = Math.min(...needSeries, ...incomeSeries, 0);
  const cashMax = Math.max(...needSeries, ...incomeSeries, 1);
  const cashRng = Math.max(cashMax - cashMin, 1);
  const flowAbsMax = Math.max(...capitalFlowSeries.map((value) => Math.abs(value)), 1);

  const mob    = cssW < 520;
  const tM = mob ? 34 : 46;
  const bM = mob ? 22 : 26;
  const lM = 12;
  const gap = 14;
  const avail  = Math.max(120, cssH - tM - bM - gap);
  const capH   = Math.round(avail * 0.68);
  const cashH  = avail - capH;
  const capTop = tM, capBot = capTop + capH;
  const casTop = capBot + gap, casBot = casTop + cashH;

  const mapYC = v => capBot  - (v / capMax)               * capH;
  const mapX  = i => lM + ((cssW - lM) / projYears) * i;
  const deltaBaseline = casTop + cashH / 2;
  const deltaScale = Math.max((cashH / 2) - 14, 1);
  const mapYDelta = (value) => deltaBaseline - (value / flowAbsMax) * deltaScale;
  const mapYK = v => casBot - ((v - cashMin) / cashRng) * cashH;

  function formatKCHF(value) {
    return `KCHF ${Math.round(value / 1000)}`;
  }

  function drawTag(text, x, y, color) {
    ctx.font = `${mob ? 9 : 10}px Inter,sans-serif`;
    const tagWidth = ctx.measureText(text).width + 10;
    const tagHeight = mob ? 14 : 16;
    const drawX = Math.max(3, Math.min(x, cssW - tagWidth - 3));
    const drawY = Math.max(tagHeight + 1, Math.min(y, cssH - 2));
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(drawX, drawY - tagHeight + 2, tagWidth, tagHeight);
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(text, drawX + 5, drawY);
  }

  // Panel backgrounds
  ctx.fillStyle = 'rgba(148, 163, 184, 0.06)';
  ctx.fillRect(lM, capTop, cssW - lM, capH);
  ctx.fillRect(lM, casTop, cssW - lM, cashH);

  // Soft fill under capital line for a calmer top panel
  ctx.beginPath();
  capitalSeries.forEach((value, index) => {
    const x = mapX(index);
    const y = mapYC(value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(mapX(projYears), capBot);
  ctx.lineTo(mapX(0), capBot);
  ctx.closePath();
  ctx.fillStyle = 'rgba(37, 99, 235, 0.05)';
  ctx.fill();

  // Threshold marker where undercoverage starts
  if (thresholdYearIndex >= 0) {
    const thresholdX = mapX(thresholdYearIndex + 1);
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(thresholdX, capTop);
    ctx.lineTo(thresholdX, casBot);
    ctx.stroke();
    ctx.setLineDash([]);
    drawTag('Schwelle', thresholdX + 4, capTop + 11, '#a16207');
  }

  // Focus marker controlled by year slider
  if (focusIndex > 0) {
    const focusX = mapX(focusIndex);
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(focusX, capTop);
    ctx.lineTo(focusX, casBot);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Capital development line
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2.3;
  ctx.setLineDash([]);
  ctx.beginPath();
  capitalSeries.forEach((v, i) => {
    const x = mapX(i), y = mapYC(v);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Lower panel: total income vs. need with filled gap
  ctx.strokeStyle = 'rgba(148,163,184,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(lM, casTop + cashH / 2);
  ctx.lineTo(cssW, casTop + cashH / 2);
  ctx.stroke();

  for (let y = 1; y < incomeSeries.length; y++) {
    const x0 = mapX(y - 1);
    const x1 = mapX(y);
    const incomeY0 = mapYK(incomeSeries[y - 1]);
    const incomeY1 = mapYK(incomeSeries[y]);
    const needY0 = mapYK(needSeries[y - 1]);
    const needY1 = mapYK(needSeries[y]);
    ctx.fillStyle = incomeSeries[y] >= needSeries[y]
      ? 'rgba(16,185,129,0.18)'
      : 'rgba(245, 158, 11, 0.18)';
    ctx.beginPath();
    ctx.moveTo(x0, Math.min(incomeY0, needY0));
    ctx.lineTo(x1, Math.min(incomeY1, needY1));
    ctx.lineTo(x1, Math.max(incomeY1, needY1));
    ctx.lineTo(x0, Math.max(incomeY0, needY0));
    ctx.closePath();
    ctx.fill();
  }

  // Income line
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = mob ? 1.5 : 1.8;
  ctx.setLineDash([]);
  ctx.beginPath();
  for (let y = 0; y < incomeSeries.length; y++) {
    const x = mapX(y);
    if (y === 0) ctx.moveTo(x, mapYK(incomeSeries[y]));
    else ctx.lineTo(x, mapYK(incomeSeries[y]));
  }
  ctx.stroke();

  // Need line
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = mob ? 1.5 : 1.7;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  for (let y = 0; y < needSeries.length; y++) {
    const x = mapX(y);
    if (y === 0) ctx.moveTo(x, mapYK(needSeries[y]));
    else ctx.lineTo(x, mapYK(needSeries[y]));
  }
  ctx.stroke();
  ctx.setLineDash([]);

  if (consumptionYearIndex >= 0) {
    const firstConsumptionX = mapX(consumptionYearIndex + 1);
    drawTag('Kapitalverzehr', firstConsumptionX + 4, casTop + 12, '#a16207');
  }

  // Direct labels (legend removed)
  const capEndX = mapX(Math.max(0, capitalSeries.length - 1));
  const capEndY = mapYC(capitalSeries[capitalSeries.length - 1]);
  drawTag('Kapitalentwicklung', capEndX - 108, capEndY - 8, '#2563eb');

  const finalGap = gapSeries[gapSeries.length - 1] || 0;
  const finalIncomeY = mapYK(incomeSeries[incomeSeries.length - 1] || 0);
  const finalNeedY = mapYK(needSeries[needSeries.length - 1] || 0);
  drawTag(finalGap >= 0 ? 'Überschuss' : 'Unterdeckung', cssW - 118, Math.min(finalIncomeY, finalNeedY) - 6, finalGap >= 0 ? '#10b981' : '#b45309');

  if (focusIndex > 0) {
    const capY = mapYC(capitalSeries[focusIndex] || 0);
    const needY = mapYK(needSeries[focusIndex] || 0);
    const incomeY = mapYK(incomeSeries[focusIndex] || 0);
    const focusX = mapX(focusIndex);
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.arc(focusX, capY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(focusX, incomeY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(focusX, needY, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#0f172a';
  ctx.font = `${mob ? 10 : 12}px Inter,sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(`bis Alter ${life}`, cssW - 8, mob ? 14 : 18);

  // Grid and axis labels
  ctx.strokeStyle = 'rgba(148,163,184,0.25)'; ctx.fillStyle = '#94a3b8';
  ctx.font = `${mob ? 8 : 10}px Inter,sans-serif`;
  const xT = mob ? 4 : 5;
  for (let i = 0; i < xT; i++) {
    const r = xT === 1 ? 0 : i / (xT - 1);
    const x = lM + r * (cssW - lM);
    const year = Math.round(r * projYears);
    const ageAtTick = retireAge + year;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x, capTop); ctx.lineTo(x, casBot); ctx.stroke();
    ctx.textAlign = i === xT - 1 ? 'right' : 'left';
    ctx.fillText(`Alter ${ageAtTick}`, x + (i === xT-1 ? -2 : 2), casBot + 12);
  }

  const yTC = mob ? 3 : 4;
  for (let i = 0; i < yTC; i++) {
    const r = yTC === 1 ? 0 : i / (yTC - 1);
    const y = capBot - r * capH;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(lM, y); ctx.lineTo(cssW, y); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillText(formatKCHF(capMax * r), lM + 2, y - 3);
  }

  // Lower panel axis labels
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'left';
  ctx.fillText(chartMode === 'real' ? 'Gesamteinkommen / Bedarf (heutige Kaufkraft)' : 'Gesamteinkommen / Bedarf', lM, casTop + 10);
  ctx.fillText(formatKCHF(cashMax), lM + 2, casTop + 18);
  ctx.textAlign = 'right';
  ctx.fillText(formatKCHF(cashMin), cssW - 3, casBot - 3);

  // Method note
  const noteEl = document.getElementById('chart-method-note');
  if (noteEl) {
    const thresholdAge = thresholdYearIndex >= 0 ? retireAge + thresholdYearIndex : null;
    const thresholdNote = thresholdAge == null
      ? `Schwelle: kein Defizit bis Alter ${life}.`
      : `Schwelle ab Alter ${thresholdAge} (Bedarf > Einkommen).`;
    const modeLabel = chartMode === 'real'
      ? 'Real = Werte in heutiger Kaufkraft, inflationsbereinigt.'
      : 'Nominal = laufende Franken ohne Inflationsabzug.';
    noteEl.textContent =
      `${modeLabel} Oben: Kapitalentwicklung. Unten: Gesamteinkommen gegen Bedarf. Grün = Überschuss, Orange = Unterdeckung/Kapitalverzehr. ` +
      `Startkapital CHF ${formatCHF(totalCapital)}, ges. Einkommen CHF ${formatCHF(securedIncome)}, ` +
      `Rendite ${(Math.round(wRet * 10000) / 100).toFixed(2)}%, Inflation ${readField('inflation').toFixed(1)}% (gleichzeitig Indexierung fuer Bedarf und Renteneinkommen). ${thresholdNote}`;
  }

  if (chartYearDetails) {
    const ageAtFocus = retireAge + focusIndex;
    const capAtFocus = Math.round(capitalSeries[focusIndex] || 0);
    const incomeAtFocus = Math.round(incomeSeries[focusIndex] || 0);
    const needAtFocus = Math.round(needSeries[focusIndex] || 0);
    const gapAtFocus = incomeAtFocus - needAtFocus;
    chartYearDetails.textContent =
      `Alter ${ageAtFocus}: Kapital CHF ${formatCHF(capAtFocus)}, Einkommen CHF ${formatCHF(incomeAtFocus)}, Bedarf CHF ${formatCHF(needAtFocus)}, ` +
      `${gapAtFocus >= 0 ? 'Ueberschuss' : 'Luecke'} ${gapAtFocus >= 0 ? '+' : '-'}CHF ${formatCHF(Math.abs(gapAtFocus))}.`;
  }
}

function updateGapChart() {
  const scenario = buildScenarioData();
  const { retireAge, projYears, life, securedIncome, projection: proj } = scenario;
  const inflation = Math.max(0, readField('inflation') / 100);
  const inflationFactor = (yearIndex) => (chartMode === 'real' ? Math.pow(1 + inflation, yearIndex) : 1);

  const years = Math.min(projYears, Math.max(proj.potentials.length, proj.needs.length));
  const focusIndex = Math.min(years, clampFocusYear(years));
  const incomeSeries = [];
  const needSeries = [];
  for (let i = 1; i <= years; i++) {
    const income = (proj.potentials[i - 1] ?? securedIncome) / inflationFactor(i);
    const need = (proj.needs[i - 1] ?? 0) / inflationFactor(i);
    incomeSeries.push(income);
    needSeries.push(need);
  }
  const gapSeries = incomeSeries.map((value, i) => value - (needSeries[i] || 0));
  const thresholdIndex = gapSeries.findIndex((v) => v < 0);

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
  const top = mob ? 24 : 30;
  const bottom = cssH - (mob ? 28 : 32);
  const left = 12;
  const right = 8;
  const h = Math.max(120, bottom - top);
  const maxY = Math.max(1, ...incomeSeries, ...needSeries);
  const xStep = (cssW - left - right) / Math.max(1, years + 1);
  const barW = Math.max(4, Math.min(12, Math.floor(xStep * 0.28)));
  const mapY = (v) => bottom - (v / maxY) * h;
  const mapX = (year) => left + xStep * year;

  ctx.strokeStyle = 'rgba(148,163,184,0.28)';
  ctx.fillStyle = '#94a3b8';
  ctx.font = `${mob ? 8 : 10}px Inter,sans-serif`;
  for (let i = 0; i < 4; i++) {
    const r = i / 3;
    const y = bottom - r * h;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(cssW - right, y);
    ctx.stroke();
    ctx.fillText(`KCHF ${Math.round((maxY * r) / 1000)}`, left + 2, y - 3);
  }

  for (let i = 1; i <= years; i++) {
    const x = mapX(i);
    const need = needSeries[i - 1] || 0;
    const income = incomeSeries[i - 1] || 0;
    const needY = mapY(need);
    const incomeY = mapY(income);

    ctx.fillStyle = '#fb923c';
    ctx.fillRect(x - barW - 2, needY, barW, bottom - needY);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(x + 2, incomeY, barW, bottom - incomeY);

    if (need > income) {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.24)';
      ctx.fillRect(x - 1, incomeY, 2, needY - incomeY);
    } else if (income > need) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.24)';
      ctx.fillRect(x - 1, needY, 2, incomeY - needY);
    }

    if (i === focusIndex) {
      const groupTop = Math.min(needY, incomeY) - 5;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(x - barW - 6, groupTop, barW * 2 + 12, bottom - groupTop + 4);
      ctx.setLineDash([]);
    }
  }

  const tickCount = mob ? 4 : 6;
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'left';
  for (let t = 0; t < tickCount; t++) {
    const r = tickCount === 1 ? 0 : t / (tickCount - 1);
    const y = Math.max(1, Math.round(r * (years - 1))) + 1;
    const x = mapX(y);
    ctx.fillText(`A${retireAge + y}`, x - 8, bottom + 14);
  }

  const note = document.getElementById('gap-chart-note');
  if (note) {
    const thresholdAge = thresholdIndex >= 0 ? retireAge + thresholdIndex + 1 : null;
    const thresholdText = thresholdAge == null
      ? `Kein Defizit bis Alter ${life}.`
      : `Defizit ab Alter ${thresholdAge}.`;
    note.textContent =
      `${chartMode === 'real' ? 'Real' : 'Nominal'}: Orange = Bedarf, Gruen = Einkommen. Markierter Balken = Jahresregler. ${thresholdText}`;
  }

  if (gapYearDetails) {
    const need = Math.round(needSeries[focusIndex - 1] || 0);
    const income = Math.round(incomeSeries[focusIndex - 1] || 0);
    const gap = income - need;
    gapYearDetails.textContent =
      `Alter ${retireAge + focusIndex}: Bedarf CHF ${formatCHF(need)}, Einkommen CHF ${formatCHF(income)}, ` +
      `${gap >= 0 ? 'Ueberschuss' : 'Luecke'} ${gap >= 0 ? '+' : '-'}CHF ${formatCHF(Math.abs(gap))}.`;
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
  // Step navigation
  p2Prev.addEventListener('click', () => {
    saveStarted();
    if (currentStep === 0) {
      fillExample();
    } else {
      showStep(currentStep - 1);
    }
  });
  p2Next.addEventListener('click', () => {
    saveStarted();
    showStep(Math.min(steps.length - 1, currentStep + 1));
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

  // Card tap → open drawers
  const cardInvested = document.getElementById('card-invested');
  const cardSecured  = document.getElementById('card-secured');
  cardInvested?.addEventListener('click', () => openDrawer('drawer-invested'));
  cardSecured?.addEventListener('click',  () => openDrawer('drawer-income'));
  [cardInvested, cardSecured].forEach((card) => {
    card?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
    });
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
    gapModal?.classList.add('hidden');
    chartModal?.classList.remove('hidden');
    updateResults();
    updateChart();
  });
  closeChartBtn?.addEventListener('click', () => chartModal?.classList.add('hidden'));
  chartModal?.addEventListener('click', (e) => {
    if (e.target === chartModal) chartModal.classList.add('hidden');
  });

  // Gap modal
  openGapBtn?.addEventListener('click', () => {
    chartModal?.classList.add('hidden');
    gapModal?.classList.remove('hidden');
    updateResults();
    updateGapChart();
  });
  closeGapBtn?.addEventListener('click', () => gapModal?.classList.add('hidden'));
  gapModal?.addEventListener('click', (e) => {
    if (e.target === gapModal) gapModal.classList.add('hidden');
  });

  function onYearSliderInput(value) {
    focusYear = Number(value) || 1;
    updateResults();
  }
  chartYearSlider?.addEventListener('input', (e) => onYearSliderInput(e.target.value));
  gapYearSlider?.addEventListener('input', (e) => onYearSliderInput(e.target.value));

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
  gapShareSlider?.addEventListener('input', (e) => onShareSliderInput(e.target.value));

  chartModeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const nextMode = button.dataset.chartMode === 'real' ? 'real' : 'nominal';
      if (chartMode === nextMode) return;
      chartMode = nextMode;
      saveChartMode(chartMode);
      syncChartModeButtons();
      if (chartModal && !chartModal.classList.contains('hidden')) updateChart();
      if (gapModal && !gapModal.classList.contains('hidden')) updateGapChart();
    });
  });

  // Keyboard escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
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
    el.addEventListener('input', () => {
      if (el.id === 'pk-payout') el.dataset.userEdited = '1';
      if (['pk-share', 'pk-capital', 'pk-payout', 'conversion-rate'].includes(el.id)) {
        syncPkDisplays();
      }
      updateResults();
      if (activeDrawer) updateDrawerChips();
      saveFormState();
    });
    el.addEventListener('change', () => {
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

initFormattedFields();
loadFormState();
chartMode = loadChartMode();
syncChartModeButtons();
syncPkDisplays();
initDrawerSwipe('drawer-invested');
initDrawerSwipe('drawer-income');
showStep(loadStep());
attachEvents();
updateResults();
saveFormState();
