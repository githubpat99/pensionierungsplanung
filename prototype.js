const form = document.getElementById('prototype-form');
const steps = Array.from(document.querySelectorAll('.wizard-step'));
const title = document.getElementById('wizard-title');
const description = document.getElementById('wizard-description');
const progress = document.getElementById('wizard-progress');
const startButton = document.getElementById('start-button');
const exampleButton = document.getElementById('example-button');
const chartCard = document.getElementById('chart-card');
const chartModal = document.getElementById('chart-modal');
const openChartModalButton = document.getElementById('open-chart-modal');
const closeChartModalButton = document.getElementById('close-chart-modal');
const step4Section = document.querySelector('.wizard-step[data-step="4"]');
const step4Cards = Array.from(document.querySelectorAll('.wizard-step[data-step="4"] .result-card'));
const page = document.querySelector('.page');
const wizardCard = document.getElementById('wizard-card');
const wizardInfoBtn = document.getElementById('wizard-info-btn');
const wizardDescPanel = document.getElementById('wizard-description');
const shareValue = (id) => document.getElementById(id)?.value;

// Parse Swiss-formatted numbers (1'234'567 or plain)
function parseFormatted(val) {
  if (typeof val !== 'string') val = String(val ?? '');
  const n = Number(val.replace(/[' ]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatThousands(n) {
  if (!Number.isFinite(n)) return '';
  return Math.round(n).toLocaleString('de-CH').replace(/\u202f/g, "'").replace(/,/g, "'");
}

// Read a number field that may be text-formatted
function readField(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  return parseFormatted(el.value);
}

const FORMATTED_FIELDS = ['pk-capital', 'pk-payout', 'pk-pension', 'capital-draw'];

function applyThousandsFormat(id) {
  const el = document.getElementById(id);
  if (!el || el === document.activeElement) return;
  const n = parseFormatted(el.value);
  if (n > 0) el.value = formatThousands(n);
}

function initFormattedFields() {
  FORMATTED_FIELDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    // Format initial value
    const n = parseFormatted(el.value);
    if (n > 0) el.value = formatThousands(n);
    // On blur: reformat
    el.addEventListener('blur', () => {
      const n2 = parseFormatted(el.value);
      el.value = n2 > 0 ? formatThousands(n2) : '';
    });
    // On focus: show raw number for easy editing
    el.addEventListener('focus', () => {
      const n2 = parseFormatted(el.value);
      if (n2 > 0) el.value = String(n2);
    });
  });
}
const storageKeys = {
  started: 'prototype-wizard-started',
  step: 'prototype-wizard-step',
};

const stepData = [
  { title: 'Persönliche Angaben', desc: 'Beginne mit deinen Grunddaten. Die Simulation wird direkt aktualisiert.' },
  { title: 'Vermögen', desc: 'Trage Säule 3a, Wertschriften, Immobilien und übriges Vermögen ein.' },
  { title: 'Einkommen', desc: 'Gib AHV, Kinderleistungen und weitere Einkommen ein.' },
  { title: 'PK-Varianten', desc: 'Passe PK-Auszahlung, Umwandlungssatz und Projektionsdauer bis zur Lebenserwartung an.' },
];

let currentStep = 0;

const prevButton = document.getElementById('header-prev');
const nextButton = document.getElementById('header-next');

function activateWizardMode() {
  if (page) {
    page.classList.add('wizard-started');
  }
  try {
    window.sessionStorage.setItem(storageKeys.started, '1');
  } catch (_) {
    // ignore storage failures
  }
}

function restoreWizardMode() {
  try {
    return window.sessionStorage.getItem(storageKeys.started) === '1';
  } catch (_) {
    return false;
  }
}

function saveCurrentStep(index) {
  try {
    window.sessionStorage.setItem(storageKeys.step, String(index));
  } catch (_) {
    // ignore storage failures
  }
}

function readStoredStep() {
  try {
    const raw = window.sessionStorage.getItem(storageKeys.step);
    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(value, 0), steps.length - 1);
  } catch (_) {
    return 0;
  }
}

function setStep4CardExpanded(card, isExpanded) {
  if (!card) return;
  card.classList.toggle('expanded', isExpanded);
  card.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
}

function initializeStep4Cards() {
  if (!step4Cards.length) return;

  step4Cards.forEach((card) => {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-expanded', 'false');

    card.addEventListener('click', () => {
      const shouldOpen = !card.classList.contains('expanded');
      step4Cards.forEach((otherCard) => setStep4CardExpanded(otherCard, false));
      setStep4CardExpanded(card, shouldOpen);
    });

    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.click();
      }
    });
  });
}

function showStep(index) {
  currentStep = index;
  saveCurrentStep(index);
  steps.forEach((step, i) => step.classList.toggle('active', i === index));
  title.textContent = stepData[index].title;
  if (description) {
    description.textContent = stepData[index].desc;
    description.classList.add('hidden');
  }
  if (wizardInfoBtn) wizardInfoBtn.setAttribute('aria-expanded', 'false');
  progress.textContent = `Schritt ${index + 1} von ${steps.length}`;
  prevButton.disabled = false;
  prevButton.textContent = index === 0 ? 'Testdaten laden' : 'Zurueck';
  nextButton.disabled = index === steps.length - 1;
  nextButton.textContent = 'Weiter';
  nextButton.style.visibility = index === steps.length - 1 ? 'hidden' : 'visible';
  if (index === steps.length - 1) {
    updateResults();
  }
  if (window.innerWidth > 640) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function simulateProjection(initialCapital, securedIncome, variableReturnRate, draw, inflation, years) {
  const path = [Math.max(initialCapital, 0)];
  const rawPath = [initialCapital];
  const needs = [];
  const potentials = [];
  const returnAmounts = [];

  let current = initialCapital;
  for (let i = 1; i <= years; i += 1) {
    const need = draw * Math.pow(1 + inflation, i);
    const effectiveCapital = Math.max(current, 0);
    const dynamicReturn = effectiveCapital * variableReturnRate;
    const potential = securedIncome + dynamicReturn;
    const netCashflow = potential - need;
    current += netCashflow;
    rawPath.push(current);
    path.push(Math.max(current, 0));
    needs.push(need);
    potentials.push(potential);
    returnAmounts.push(dynamicReturn);
  }

  return { path, rawPath, needs, potentials, returnAmounts };
}

function updateChart() {
  const inflation = Number(shareValue('inflation')) / 100;
  const retireAge = Number(shareValue('retire-age'));
  const projectionYears = Math.max(1, Number(shareValue('projection-years')) || 1);
  const life = retireAge + projectionYears;
  const draw = Number(shareValue('capital-draw'));

  // include net real estate in assets (property value minus mortgage)
  const netRealEstate = Math.max(0, Number(shareValue('real-estate')) - Number(shareValue('mortgage')));
  const pkCapital = Number(shareValue('pk-capital'));
  const capital = pkCapital + Number(shareValue('pillar3a')) + Number(shareValue('investments')) + Number(shareValue('other-assets')) + netRealEstate;

  const years = projectionYears;

  const pkPayoutInput = Number(shareValue('pk-payout')) || 0;
  const takenCapital = Math.min(pkPayoutInput, pkCapital);
  const remainingPkCapital = Math.max(0, pkCapital - takenCapital);
  const conversionRate = Number(shareValue('conversion-rate')) / 100; // e.g. 5% -> 0.05

  // compute PK pension from remaining PK using the conversion rate
  const pkPensionFromRemaining = remainingPkCapital * conversionRate;

  // total annual pension income estimate (AHV + PK pension + Kinderleistungen + übrige Renten + Immobilien)
  const annualPension = Number(shareValue('ahv')) + Number(shareValue('child-allowance')) + Number(shareValue('child-pension')) + Number(shareValue('other-income')) + pkPensionFromRemaining + Number(shareValue('real-estate-income'));

  // compute expected investment yield from invested buckets (including any PK payout that is invested)
  const pillar3a = Number(shareValue('pillar3a')) || 0;
  const investments = Number(shareValue('investments')) || 0;
  const otherAssets = Number(shareValue('other-assets')) || 0;
  const pkPayout = Number(shareValue('pk-payout')) || 0;
  const pillar3aReturn = Number(shareValue('pillar3a-return')) / 100 || 0;
  const investmentsReturn = Number(shareValue('investments-return')) / 100 || 0;
  const otherAssetsReturn = Number(shareValue('return-rate')) / 100 || 0;
  const investmentReturn = pillar3a * pillar3aReturn + investments * investmentsReturn + otherAssets * otherAssetsReturn + pkPayout * otherAssetsReturn;

  const securedIncome = annualPension;
  const weightedReturnRate = (pillar3a * pillar3aReturn + investments * investmentsReturn + (otherAssets + pkPayout) * otherAssetsReturn) / Math.max(pillar3a + investments + otherAssets + pkPayout, 1);

  const projection = simulateProjection(capital - takenCapital, securedIncome, weightedReturnRate, draw, inflation, years);
  const path = projection.path;
  const needs = projection.needs;
  const potentials = projection.potentials;
  const returnAmounts = projection.returnAmounts;

  const canvas = document.getElementById('simulation-chart');
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = Math.max(canvas.clientWidth || canvas.width, 280);
  const cssHeight = chartCard && chartModal && !chartModal.classList.contains('hidden')
    ? Math.max(Math.round(cssWidth * 0.5), 240)
    : Math.max(Math.round(cssWidth * 0.42), 220);

  canvas.style.height = `${cssHeight}px`;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const drawWidth = cssWidth;
  const drawHeight = cssHeight;
  ctx.clearRect(0, 0, drawWidth, drawHeight);
  const capitalMax = Math.max(...path, capital - takenCapital, 1);
  const cashMin = Math.min(...needs, ...potentials, securedIncome, 0);
  const cashMax = Math.max(...needs, ...potentials, securedIncome, 1);
  const cashRange = Math.max(cashMax - cashMin, 1);
  const isMobile = drawWidth < 520;
  const topMargin = isMobile ? 42 : Math.max(56, Math.round(drawHeight * 0.22));
  const bottomMargin = isMobile ? 20 : Math.max(26, Math.round(drawHeight * 0.1));
  const leftMargin = isMobile ? 8 : 4;
  const gapBetweenPanels = isMobile ? 14 : 18;
  const availableHeight = Math.max(140, drawHeight - topMargin - bottomMargin - gapBetweenPanels);
  const capitalPanelHeight = Math.round(availableHeight * 0.68);
  const cashPanelHeight = availableHeight - capitalPanelHeight;
  const capitalTop = topMargin;
  const capitalBottom = capitalTop + capitalPanelHeight;
  const cashTop = capitalBottom + gapBetweenPanels;
  const cashBottom = cashTop + cashPanelHeight;
  const mapYCapital = (value) => capitalBottom - (value / capitalMax) * capitalPanelHeight;
  const mapYCash = (value) => cashBottom - ((value - cashMin) / cashRange) * cashPanelHeight;
  const mapX = (index) => leftMargin + ((drawWidth - leftMargin) / years) * index;

  ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
  ctx.fillRect(leftMargin, cashTop, drawWidth - leftMargin, cashPanelHeight);

  for (let year = 1; year <= years; year += 1) {
    const x0 = mapX(year - 1);
    const x1 = mapX(year);
    const yNeed = mapYCash(needs[year - 1]);
    const yPotential = mapYCash(potentials[year - 1]);
    const yTop = Math.min(yNeed, yPotential);
    const yBottom = Math.max(yNeed, yPotential);
    ctx.fillStyle = potentials[year - 1] >= needs[year - 1] ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.16)';
    ctx.fillRect(x0, yTop, Math.max(1, x1 - x0), Math.max(1, yBottom - yTop));
  }

  // capital path line stays on top
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  path.forEach((value, index) => {
    const x = mapX(index);
    const y = mapYCapital(value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = isMobile ? 1.2 : 1.5;
  ctx.setLineDash(isMobile ? [4, 4] : [6, 5]);
  ctx.beginPath();
  ctx.moveTo(leftMargin, mapYCash(securedIncome));
  ctx.lineTo(drawWidth, mapYCash(securedIncome));
  ctx.stroke();

  ctx.strokeStyle = '#10b981';
  ctx.beginPath();
  for (let year = 0; year <= years; year += 1) {
    const x = mapX(year);
    const potential = year === 0 ? (securedIncome + returnAmounts[0]) : potentials[year - 1];
    const y = mapYCash(potential);
    if (year === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = '#ef4444';
  ctx.beginPath();
  for (let year = 1; year <= years; year += 1) {
    const x = mapX(year);
    const y = mapYCash(needs[year - 1]);
    if (year === 1) ctx.moveTo(mapX(0), y);
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  const headerFontSize = isMobile ? 12 : 14;
  ctx.font = `${headerFontSize}px Inter, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('Kapitalverlauf', 10, isMobile ? 20 : 28);
  ctx.textAlign = 'right';
  if (!isMobile) {
    ctx.fillText(`Projektion bis Alter ${life}`, drawWidth - 14, 28);
  }
  ctx.textAlign = 'left';

  const xTickCount = isMobile ? 3 : 5;
  const yTickCountCapital = isMobile ? 3 : 4;
  const yTickCountCash = isMobile ? 2 : 3;
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.fillStyle = '#64748b';
  ctx.font = `${isMobile ? 10 : 11}px Inter, sans-serif`;

  for (let i = 0; i < xTickCount; i += 1) {
    const ratio = xTickCount === 1 ? 0 : i / (xTickCount - 1);
    const x = leftMargin + ratio * (drawWidth - leftMargin);
    const yearValue = Math.round(ratio * years);
    ctx.beginPath();
    ctx.moveTo(x, capitalTop);
    ctx.lineTo(x, cashBottom);
    ctx.stroke();
    ctx.textAlign = i === xTickCount - 1 ? 'right' : 'left';
    ctx.fillText(`+${yearValue}J`, x + (i === xTickCount - 1 ? -2 : 2), cashBottom + 14);
  }

  for (let i = 0; i < yTickCountCapital; i += 1) {
    const ratio = yTickCountCapital === 1 ? 0 : i / (yTickCountCapital - 1);
    const value = capitalMax * ratio;
    const y = capitalBottom - ratio * capitalPanelHeight;
    ctx.beginPath();
    ctx.moveTo(leftMargin, y);
    ctx.lineTo(drawWidth, y);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(value / 1000)}k`, leftMargin + 2, y - 4);
  }

  for (let i = 0; i < yTickCountCash; i += 1) {
    const ratio = yTickCountCash === 1 ? 0 : i / (yTickCountCash - 1);
    const value = cashMin + (cashRange * ratio);
    const y = cashBottom - ratio * cashPanelHeight;
    ctx.beginPath();
    ctx.moveTo(leftMargin, y);
    ctx.lineTo(drawWidth, y);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(value / 1000)}k`, drawWidth - 4, y - 4);
  }
}

function formatCHF(value) {
  return Number(value).toLocaleString('de-CH', { maximumFractionDigits: 0 });
}

function readNumber(id) {
  return readField(id);
}

function updateStepSummaries() {
  const pillar3a = readNumber('pillar3a');
  const investments = readNumber('investments');
  const otherAssets = readNumber('other-assets');
  const pkPayout = readNumber('pk-payout');
  const netRealEstate = Math.max(0, readNumber('real-estate') - readNumber('mortgage'));
  const totalAssets = pillar3a + investments + otherAssets + pkPayout + netRealEstate;

  const pillar3aReturn = readNumber('pillar3a-return') / 100;
  const investmentsReturn = readNumber('investments-return') / 100;
  const returnRate = readNumber('return-rate') / 100;
  const totalReturnMonetary = Math.round(
    (pillar3a * pillar3aReturn) +
    (investments * investmentsReturn) +
    (otherAssets * returnRate) +
    (pkPayout * returnRate)
  );

  const ahv = readNumber('ahv');
  const additionalIncome = readNumber('child-allowance') + readNumber('child-pension') + readNumber('other-income') + readNumber('real-estate-income');
  const totalIncome = ahv + additionalIncome;

  const step2AssetsEl = document.getElementById('step2-total-assets');
  const step2ReturnEl = document.getElementById('step2-total-return');
  const step3AhvEl = document.getElementById('step3-ahv-total');
  const step3AdditionalEl = document.getElementById('step3-additional-total');
  const step3IncomeEl = document.getElementById('step3-income-total');

  if (step2AssetsEl) step2AssetsEl.textContent = `CHF ${formatCHF(totalAssets)}`;
  if (step2ReturnEl) step2ReturnEl.textContent = `CHF ${formatCHF(totalReturnMonetary)}`;
  if (step3AhvEl) step3AhvEl.textContent = `CHF ${formatCHF(ahv)}`;
  if (step3AdditionalEl) step3AdditionalEl.textContent = `CHF ${formatCHF(additionalIncome)}`;
  if (step3IncomeEl) step3IncomeEl.textContent = `CHF ${formatCHF(totalIncome)}`;
}

function syncPkDisplays() {
  const pkCapital = readField('pk-capital');
  const pkShare = Number(shareValue('pk-share')) || 0;
  const pkPayoutEl = document.getElementById('pk-payout');
  // if user hasn't manually edited pk-payout, mirror slider
  if (pkPayoutEl && (!pkPayoutEl.dataset.userEdited || parseFormatted(pkPayoutEl.value) === 0)) {
    const implied = Math.round(pkCapital * (pkShare / 100));
    pkPayoutEl.value = document.activeElement === pkPayoutEl ? String(implied) : formatThousands(implied);
  }
  // compute and update PK pension (read-only)
  const pkPensionEl = document.getElementById('pk-pension');
  const pkPayoutVal = readField('pk-payout');
  const remainingPk = Math.max(0, pkCapital - pkPayoutVal);
  const conversion = Number(shareValue('conversion-rate')) / 100;
  const computedPension = Math.round(remainingPk * conversion);
  if (pkPensionEl) {
    pkPensionEl.value = document.activeElement === pkPensionEl ? String(computedPension) : formatThousands(computedPension);
  }
}

function updateResults() {
  const projectionYears = Math.max(1, Number(shareValue('projection-years')) || 1);
  const life = Number(shareValue('retire-age')) + projectionYears;
  const draw = readField('capital-draw');
  const netRealEstate = Math.max(0, readField('real-estate') - readField('mortgage'));
  const capital = readField('pk-capital') + readField('pillar3a') + readField('investments') + readField('other-assets') + netRealEstate;
  const years = projectionYears;

  const age = Number(shareValue('age'));
  const retireAge = Number(shareValue('retire-age'));
  const children = shareValue('children');

  const pkCapital = readField('pk-capital');
  const pkPayout = Math.min(readField('pk-payout'), pkCapital);
  const remainingPk = Math.max(0, pkCapital - pkPayout);
  const conversion = Number(shareValue('conversion-rate')) / 100;
  const pkPensionComputed = Math.round(remainingPk * conversion);
  const investedCapital = Math.round(
    readField('pillar3a') +
    readField('investments') +
    readField('other-assets') +
    pkPayout
  );
  const pillar3aReturn = readField('pillar3a-return') / 100;
  const investmentsReturn = readField('investments-return') / 100;
  const otherAssetsReturn = Number(shareValue('return-rate')) / 100;
  const weightedReturnRate = (
    (readField('pillar3a') * pillar3aReturn) +
    (readField('investments') * investmentsReturn) +
    ((readField('other-assets') + pkPayout) * otherAssetsReturn)
  ) / Math.max(investedCapital, 1);
  const securedIncome = Math.round(
    pkPensionComputed +
    readField('ahv') +
    readField('child-allowance') +
    readField('child-pension') +
    readField('other-income') +
    readField('real-estate-income')
  );
  const projection = simulateProjection(capital, securedIncome, weightedReturnRate, draw, Number(shareValue('inflation')) / 100 || 0, years);
  const firstYearReturn = Math.round(projection.returnAmounts[0] || 0);
  const firstYearPotentialIncome = Math.round((projection.potentials[0] || securedIncome));
  const annualInflatedNeed = draw * Math.pow(1 + (Number(shareValue('inflation')) / 100 || 0), 1);
  const gapToNeed = annualInflatedNeed - firstYearPotentialIncome;
  const firstDepletionYear = projection.rawPath.findIndex((value, index) => index > 0 && value <= 0);
  const resultAge = firstDepletionYear > 0 ? Number(shareValue('retire-age')) + firstDepletionYear : null;
  const ageIsUnlimited = draw <= 0 || resultAge === null || resultAge > 120;
  const ageValue = ageIsUnlimited ? null : resultAge;
  const resultAgeText = draw > 0
    ? (ageIsUnlimited ? '120+' : `${resultAge} Jahre`)
    : 'Unbegrenzt';
  const resultAgeDetailEl = document.getElementById('result-age-detail');
  const resultAgeEmojiEl = document.getElementById('result-age-emoji');

  document.getElementById('result-age').textContent = resultAgeText;

  // Emoji based on how long the capital lasts
  if (resultAgeEmojiEl) {
    if (ageIsUnlimited) {
      resultAgeEmojiEl.textContent = '🤩';
      resultAgeEmojiEl.title = 'Kapital reicht ueber den gesamten Horizont!';
    } else if (ageValue >= 90) {
      resultAgeEmojiEl.textContent = '😊';
      resultAgeEmojiEl.title = 'Sehr gut – Kapital reicht bis mindestens 90';
    } else {
      resultAgeEmojiEl.textContent = '🤔';
      resultAgeEmojiEl.title = 'Kapital reicht nicht bis 90 – Optimierungsbedarf';
    }
  }

  if (resultAgeDetailEl) {
    if (draw <= 0) {
      resultAgeDetailEl.textContent = `Kein Kapitalverzehr bei Bedarf CHF 0/Jahr. Projektion bis Alter ${life}.`;
    } else if (ageIsUnlimited) {
      resultAgeDetailEl.textContent = `Bei Bedarf CHF ${formatCHF(draw)}/Jahr reicht das Kapital ueber den Projekthorizont bis Alter ${life}.`;
    } else {
      resultAgeDetailEl.textContent = `Bei Bedarf CHF ${formatCHF(draw)}/Jahr wird Alter ${resultAge} erreicht.`;
    }
  }

  document.getElementById('result-invested').textContent = `CHF ${formatCHF(investedCapital)}`;
  document.getElementById('result-secured').textContent = `CHF ${formatCHF(securedIncome)}`;
  document.getElementById('result-return').textContent = `CHF ${formatCHF(firstYearReturn)}`;
  document.getElementById('result-total').textContent = `CHF ${formatCHF(firstYearPotentialIncome)}`;
  // breakdown of invested capital (mini views)
  document.getElementById('inv-3a-mini').textContent = `CHF ${formatCHF(Number(shareValue('pillar3a')) || 0)}`;
  document.getElementById('inv-ws-mini').textContent = `CHF ${formatCHF(Number(shareValue('investments')) || 0)}`;
  document.getElementById('inv-pk-mini').textContent = `CHF ${formatCHF(Number(shareValue('pk-payout')) || 0)}`;
  document.getElementById('inv-other-mini').textContent = `CHF ${formatCHF(Number(shareValue('other-assets')) || 0)}`;
  document.getElementById('sec-ahv').textContent = `CHF ${formatCHF(Number(shareValue('ahv')) || 0)}`;
  document.getElementById('sec-pk').textContent = `CHF ${formatCHF(pkPensionComputed || 0)}`;
  document.getElementById('sec-real-estate').textContent = `CHF ${formatCHF(Number(shareValue('real-estate-income')) || 0)}`;
  document.getElementById('sec-other').textContent = `CHF ${formatCHF((Number(shareValue('child-allowance')) || 0) + (Number(shareValue('child-pension')) || 0) + (Number(shareValue('other-income')) || 0))}`;
  document.getElementById('result-return-percent').textContent = `${(Math.round(weightedReturnRate * 10000) / 100).toFixed(2)}%`;
  const lastYearNeed = draw * Math.pow(1 + (Number(shareValue('inflation')) / 100 || 0), Math.max(years, 1));
  const lastYearPotentialIncome = projection.potentials[projection.potentials.length - 1] || firstYearPotentialIncome;
  const firstYearGap = firstYearPotentialIncome - annualInflatedNeed;
  const lastYearGap = lastYearPotentialIncome - lastYearNeed;
  let insight = `Mit keinem jährlichen Kapitalbezug bleibt Kapital erhalten. Alter ${age}, Pension ab ${retireAge}. Kinder: ${children}.`;

  if (draw > 0) {
    if (firstYearGap >= 0 && lastYearGap >= 0) {
      insight = `Alter ${age} -> Pension ab ${retireAge}. Potentielles Einkommen ${formatCHF(firstYearPotentialIncome)} liegt während des gesamten Horizonts über dem inflationsbereinigten Bedarf. Der Anfangsüberschuss beträgt ${formatCHF(firstYearGap)} pro Jahr. Kinder: ${children}.`;
    } else if (firstYearGap >= 0 && lastYearGap < 0) {
      insight = `Alter ${age} -> Pension ab ${retireAge}. Zu Beginn besteht ein Überschuss von ${formatCHF(firstYearGap)} pro Jahr, später steigt der inflationsbereinigte Bedarf jedoch über das Einkommen. Dadurch entsteht in späteren Jahren Kapitalverzehr. Kinder: ${children}.`;
    } else {
      insight = `Alter ${age} -> Pension ab ${retireAge}. Bereits zu Beginn liegt der inflationsbereinigte Bedarf um ${formatCHF(Math.abs(firstYearGap))} pro Jahr über dem potentiellen Einkommen, dadurch entsteht Kapitalverzehr. Kinder: ${children}.`;
    }
  }

  document.getElementById('result-insight').textContent = insight;

  const methodNote = document.getElementById('chart-method-note');
  if (methodNote) {
    methodNote.textContent = `So wird gerechnet: Jährlich wird der Bedarf mit Inflation erhöht. Die Kapitalrendite wird als Rendite auf das jeweils verbleibende Kapital berechnet (Zinseszins). Überschüsse werden dem Kapital zugeschlagen, Defizite vom Kapital abgezogen. Aktuelle Annahmen: Startkapital CHF ${formatCHF(capital)}, gesichertes Einkommen CHF ${formatCHF(securedIncome)}, Start-Renditesatz ${(Math.round(weightedReturnRate * 10000) / 100).toFixed(2)}%, Inflation ${(Number(shareValue('inflation')) || 0).toFixed(1)}%.`;
  }

  updateStepSummaries();
}

function fillExample() {
  // fill the visible form fields with example values and update UI
  document.getElementById('age').value = 56;
  document.getElementById('retire-age').value = 65;
  document.getElementById('canton').value = 'ZH';
  document.getElementById('marital-status').value = 'verheiratet';
  document.getElementById('children').value = 'ja';
  document.getElementById('life-expectancy').value = 92;
  document.getElementById('pk-capital').value = '1\'100\'000';
  document.getElementById('conversion-rate').value = 5.2;
  document.getElementById('pk-pension').value = '45\'000';
  document.getElementById('pk-payout').value = '300\'000';
  document.getElementById('pk-share').value = 50;
  document.getElementById('pk-share-value').textContent = '50%';
  document.getElementById('pillar3a').value = 85000;
  document.getElementById('pillar3a-return').value = 2.5;
  document.getElementById('investments').value = 15000;
  document.getElementById('investments-return').value = 5;
  document.getElementById('real-estate').value = 1600000;
  document.getElementById('mortgage').value = 930000;
  document.getElementById('real-estate-income').value = 10000;
  document.getElementById('other-assets').value = 0;
  document.getElementById('ahv').value = 32760;
  document.getElementById('child-allowance').value = 5520;
  document.getElementById('child-pension').value = 11376;
  document.getElementById('other-income').value = 0;
  document.getElementById('pk-share').value = 50;
  document.getElementById('pk-share-value').textContent = '50%';
  document.getElementById('return-rate').value = 5;
  document.getElementById('inflation').value = 1.1;
  document.getElementById('projection-years').value = 27;
  document.getElementById('capital-draw').value = '120\'000';
  // mark that pk-payout was not manually edited so slider sync can set it
  const pkPayoutEl = document.getElementById('pk-payout');
  if (pkPayoutEl) delete pkPayoutEl.dataset.userEdited;
  syncPkDisplays();
  updateStepSummaries();
  updateChart();
  updateResults();
}

function attachEvents() {
  startButton.addEventListener('click', () => {
    activateWizardMode();
    showStep(0);
    wizardCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  exampleButton.addEventListener('click', () => {
    activateWizardMode();
    fillExample();
    showStep(0);
    wizardCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.querySelectorAll('input, select').forEach((control) => {
    control.addEventListener('input', () => {
      if (control.id.endsWith('-share')) {
        const valueEl = document.getElementById(`${control.id}-value`);
        if (valueEl) valueEl.textContent = `${control.value}`;
      }
      // if pk-payout input edited by user mark it
      if (control.id === 'pk-payout') control.dataset.userEdited = '1';
      if (FORMATTED_FIELDS.includes(control.id)) {
        // allow typing freely – only format on blur (handled in initFormattedFields)
      }
      if (control.id === 'pk-share' || control.id === 'pk-capital' || control.id === 'pk-payout') syncPkDisplays();
      updateStepSummaries();
      if (chartModal && !chartModal.classList.contains('hidden')) updateChart();
      if (currentStep === steps.length - 1) updateResults();
    });
  });

  if (openChartModalButton && chartModal) {
    openChartModalButton.addEventListener('click', () => {
      chartModal.classList.remove('hidden');
      updateChart();
    });
  }

  if (closeChartModalButton && chartModal) {
    closeChartModalButton.addEventListener('click', () => {
      chartModal.classList.add('hidden');
    });
  }

  if (chartModal) {
    chartModal.addEventListener('click', (event) => {
      if (event.target === chartModal) {
        chartModal.classList.add('hidden');
      }
    });
  }

  if (step4InfoButton && step4Section) {
    step4InfoButton.addEventListener('click', () => {
      const isOpen = step4Section.classList.contains('details-open');
      setStep4DetailsVisibility(!isOpen);
    });
  }

  if (wizardInfoBtn && wizardDescPanel) {
    wizardInfoBtn.addEventListener('click', () => {
      const isOpen = !wizardDescPanel.classList.contains('hidden');
      wizardDescPanel.classList.toggle('hidden', isOpen);
      wizardInfoBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && chartModal && !chartModal.classList.contains('hidden')) {
      chartModal.classList.add('hidden');
    }
  });

  window.addEventListener('resize', () => {
    if (chartModal && !chartModal.classList.contains('hidden')) {
      updateChart();
    }
  });

  document.querySelectorAll('[data-action="next"]').forEach((button) => {
    button.addEventListener('click', () => {
      activateWizardMode();
      showStep(Math.min(steps.length - 1, currentStep + 1));
    });
  });
  document.querySelectorAll('[data-action="prev"]').forEach((button) => {
    button.addEventListener('click', () => {
      if (currentStep === 0) {
        activateWizardMode();
        fillExample();
        showStep(0);
        return;
      }
      showStep(Math.max(0, currentStep - 1));
    });
  });
}

if (restoreWizardMode()) {
  activateWizardMode();
}

initFormattedFields();
initializeStep4Cards();
showStep(readStoredStep());
attachEvents();
updateStepSummaries();
updateResults();
