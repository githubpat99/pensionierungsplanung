const form = document.getElementById('wizard-form');
const allSteps = Array.from(document.querySelectorAll('.wizard-step'));
const progress = document.getElementById('wizard-progress');
const restartButton = document.getElementById('restart-button');
const resultsSummary = document.getElementById('results-summary');
const resultsTable = document.getElementById('results-table');
const resultsNote = document.getElementById('results-note');
const resultsCanvas = document.getElementById('scenario-chart');
const partnerAgeField = document.getElementById('partner-age-field');
const profileType = document.getElementById('profile-type');
let currentStepIndex = 0;
let expertMode = false;
const container = document.querySelector('.wizard-card');

function getVisibleSteps() {
  return allSteps.filter((step) => expertMode || step.dataset.advanced !== 'true');
}

function fillTestData() {
  document.getElementById('profile-type').value = 'single';
  document.getElementById('age-main').value = 45;
  document.getElementById('planning-horizon').value = 20;
  document.querySelector('input[name="goal"][value="understand"]').checked = true;
  document.getElementById('asset-total').value = 650000;
  document.getElementById('income-total').value = 110000;
  document.getElementById('expense-total').value = 70000;
  document.getElementById('asset-cash').value = 50000;
  document.getElementById('asset-property').value = 400000;
  document.getElementById('asset-investments').value = 150000;
  document.getElementById('asset-pension').value = 80000;
  document.getElementById('asset-other').value = 20000;
  document.getElementById('expense-fixed').value = 30000;
  document.getElementById('expense-living').value = 25000;
  document.getElementById('expense-buffer').value = 5000;
  document.getElementById('expense-other').value = 4000;
  document.getElementById('event-capital-amount').value = 60000;
  document.getElementById('event-capital-year').value = 3;
  document.getElementById('event-inheritance-amount').value = 100000;
  document.getElementById('event-inheritance-year').value = 8;
  document.getElementById('event-purchase-amount').value = 25000;
  document.getElementById('event-purchase-year').value = 5;
  document.getElementById('assumption-rate').value = 2.0;
  document.getElementById('assumption-inflation').value = 1.5;
  document.getElementById('assumption-return').value = 4.0;
  document.getElementById('assumption-rent-growth').value = 1.0;
  document.getElementById('scenario-2-name').value = 'Alternative';
  document.getElementById('scenario-2-decision').value = 'more-savings';
}

profileType.addEventListener('change', () => {
  partnerAgeField.style.display = profileType.value === 'couple' ? 'grid' : 'none';
});

// Delegate clicks from the whole wizard container so header nav buttons work too
if (container) {
  container.addEventListener('click', (event) => {
    const action = event.target.dataset.action;
    if (!action) return;
    event.preventDefault();
    if (action === 'next') return goToStepIndex(currentStepIndex + 1);
    if (action === 'prev') return goToStepIndex(currentStepIndex - 1);
    if (action === 'fastpath') {
      expertMode = false;
      return goToStepIndex(1);
    }
    if (action === 'expert') {
      expertMode = true;
      return goToStepIndex(1);
    }
    if (action === 'sample') {
      fillTestData();
      return;
    }
  });
}

restartButton.addEventListener('click', () => {
  form.reset();
  expertMode = false;
  resultsSummary.innerHTML = '';
  resultsTable.innerHTML = '';
  resultsNote.textContent = '';
  goToStepIndex(0);
});

function getModeLabel() {
  return expertMode ? 'Expertenmodus' : 'Basismodus';
}

function goToStepIndex(index) {
  const visibleSteps = getVisibleSteps();
  if (index < 0 || index >= visibleSteps.length) return;
  currentStepIndex = index;
  const activeStep = visibleSteps[currentStepIndex];

  allSteps.forEach((section) => {
    section.classList.toggle('active', section === activeStep);
  });

  progress.textContent = `Schritt ${currentStepIndex + 1} von ${visibleSteps.length} • ${getModeLabel()}`;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (currentStepIndex === visibleSteps.length - 1) {
    renderResults();
  }
}

function parseNumber(id) {
  const element = document.getElementById(id);
  if (!element) return 0;
  const value = Number(element.value);
  return Number.isFinite(value) ? value : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(value);
}

function formatValue(value) {
  return typeof value === 'number' ? formatCurrency(value) : value;
}

function getScenarioModifier(decision, baseWealth, baseIncome, baseExpense) {
  switch (decision) {
    case 'amortization':
      return {
        incomeFactor: 1,
        expenseFactor: 1.08,
        oneTimeAmount: -baseWealth * 0.01,
        oneTimeYear: 1,
      };
    case 'capital-withdrawal':
      return {
        incomeFactor: 1.05,
        expenseFactor: 1,
        oneTimeAmount: -baseWealth * 0.1,
        oneTimeYear: 1,
      };
    case 'more-savings':
      return {
        incomeFactor: 1,
        expenseFactor: 0.92,
        oneTimeAmount: 0,
        oneTimeYear: 0,
      };
    case 'lower-expenses':
      return {
        incomeFactor: 1,
        expenseFactor: 0.85,
        oneTimeAmount: 0,
        oneTimeYear: 0,
      };
    default:
      return {
        incomeFactor: 1,
        expenseFactor: 1,
        oneTimeAmount: 0,
        oneTimeYear: 0,
      };
  }
}

function renderResults() {
  const inputs = {
    profileType: profileType.value,
    ageMain: parseNumber('age-main'),
    agePartner: parseNumber('age-partner'),
    planningHorizon: parseNumber('planning-horizon'),
    goal: document.querySelector('input[name="goal"]:checked')?.value || 'understand',
    retirementAge: parseNumber('retirement-age'),
    expectedPension: parseNumber('expected-pension'),
    incomeMain: parseNumber('income-main'),
    incomePartner: parseNumber('income-partner'),
    incomeDividend: parseNumber('income-dividend'),
    incomeRent: parseNumber('income-rent'),
    incomeOther: parseNumber('income-other'),
    assetCash: parseNumber('asset-cash'),
    assetProperty: parseNumber('asset-property'),
    assetInvestments: parseNumber('asset-investments'),
    assetPension: parseNumber('asset-pension'),
    assetOther: parseNumber('asset-other'),
    expenseFixed: parseNumber('expense-fixed'),
    expenseLiving: parseNumber('expense-living'),
    expenseBuffer: parseNumber('expense-buffer'),
    expenseOther: parseNumber('expense-other'),
    eventCapitalAmount: parseNumber('event-capital-amount'),
    eventCapitalYear: parseNumber('event-capital-year'),
    eventInheritanceAmount: parseNumber('event-inheritance-amount'),
    eventInheritanceYear: parseNumber('event-inheritance-year'),
    eventPurchaseAmount: parseNumber('event-purchase-amount'),
    eventPurchaseYear: parseNumber('event-purchase-year'),
    assumptionRate: parseNumber('assumption-rate') / 100,
    assumptionInflation: parseNumber('assumption-inflation') / 100,
    assumptionReturn: parseNumber('assumption-return') / 100,
    assumptionRentGrowth: parseNumber('assumption-rent-growth') / 100,
    scenario1: {
      name: document.getElementById('scenario-1-name').value || 'Basis',
      decision: document.getElementById('scenario-1-decision')?.value || 'status-quo',
    },
    scenario2: {
      name: document.getElementById('scenario-2-name').value || 'Alternative',
      decision: document.getElementById('scenario-2-decision')?.value || 'more-savings',
    },
  };

  const totalAssets = parseNumber('asset-total');
  const totalIncome = parseNumber('income-total');
  const totalExpense = parseNumber('expense-total');
  const detailAssets = inputs.assetCash + inputs.assetProperty + inputs.assetInvestments + inputs.assetPension + inputs.assetOther;
  const detailIncome = inputs.incomeMain + inputs.incomePartner + inputs.incomeDividend + inputs.incomeRent + inputs.incomeOther;
  const detailExpense = inputs.expenseFixed + inputs.expenseLiving + inputs.expenseBuffer + inputs.expenseOther;

  const baseWealth = totalAssets > 0 ? totalAssets : detailAssets;
  const baseIncome = totalIncome > 0 ? totalIncome : detailIncome;
  const baseExpense = totalExpense > 0 ? totalExpense : detailExpense;

  const scenarios = [inputs.scenario1, inputs.scenario2];
  const years = [5, 10, 15, 20];
  const events = {
    capitalAmount: inputs.eventCapitalAmount,
    capitalYear: inputs.eventCapitalYear,
    inheritanceAmount: inputs.eventInheritanceAmount,
    inheritanceYear: inputs.eventInheritanceYear,
    purchaseAmount: inputs.eventPurchaseAmount,
    purchaseYear: inputs.eventPurchaseYear,
  };
  const results = [];

  scenarios.forEach((scenario) => {
    const modifier = getScenarioModifier(scenario.decision, baseWealth, baseIncome, baseExpense);
    const adjustedEvents = {
      ...events,
      scenarioOneTimeAmount: modifier.oneTimeAmount,
      scenarioOneTimeYear: modifier.oneTimeYear,
    };

    years.forEach((year) => {
      const wealth = projectWealth(
        baseWealth,
        baseIncome * modifier.incomeFactor,
        baseExpense * modifier.expenseFactor,
        adjustedEvents,
        inputs.assumptionRate,
        inputs.assumptionInflation,
        inputs.assumptionReturn,
        inputs.assumptionRentGrowth,
        year
      );
      const surplus = projectSurplus(
        baseIncome * modifier.incomeFactor,
        baseExpense * modifier.expenseFactor,
        inputs.assumptionRate,
        inputs.assumptionInflation,
        year,
        inputs.retirementAge,
        inputs.expectedPension,
        inputs.ageMain
      );
      results.push({ scenario: scenario.name, year, wealth, surplus });
    });
  });

  resultsSummary.innerHTML = '';
  const summaryItems = [
    { title: 'Ziel', value: inputs.goal },
    { title: 'Planungszeitraum', value: `${inputs.planningHorizon} Jahre` },
    { title: 'Basis Vermögen', value: baseWealth },
    { title: 'Jahreseinkommen', value: baseIncome },
    { title: 'Jahresausgaben', value: baseExpense },
  ];
  summaryItems.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `<h3>${item.title}</h3><p>${formatValue(item.value)}</p>`;
    resultsSummary.appendChild(card);
  });

  if (resultsCanvas) {
    drawScenarioChart(resultsCanvas, scenarios, baseWealth, baseIncome, baseExpense, events, inputs, inputs.planningHorizon);
  }

  const decisionLabels = {
    'status-quo': 'Status quo',
    amortization: 'Mehr Amortisation',
    'capital-withdrawal': 'Kapitalbezug statt Rente',
    'more-savings': 'Mehr sparen',
    'lower-expenses': 'Niedrigere Ausgaben',
  };

  const goalMessages = {
    understand: `Das Basisszenario zeigt dir die Standardsituation. Vergleiche es mit dem Alternativszenario (${decisionLabels[inputs.scenario2.decision] || 'Alternative'}).`,
    stability: `Achte auf nachhaltige Vermögensentwicklung und Cashflow. Das Alternativszenario (${decisionLabels[inputs.scenario2.decision] || 'Alternative'}) zeigt mögliche Wirkungen deiner Finanzentscheidung.`,
    compare: `Das Basisszenario bleibt erhalten. Vergleiche die Szenarien in der Grafik und Tabelle für die ausgewählte Entscheidung (${decisionLabels[inputs.scenario2.decision] || 'Alternative'}).`,
  };

  resultsTable.innerHTML = results
    .map((row) => `
      <tr>
        <td>${row.year}</td>
        <td>${row.scenario}</td>
        <td>${formatCurrency(row.wealth)}</td>
        <td>${formatCurrency(row.surplus)}</td>
      </tr>
    `)
    .join('');

  resultsNote.textContent = goalMessages[inputs.goal] || `Die Projektion zeigt das erwartete Vermögen im Zeitverlauf. Das Basisszenario bleibt Referenz, das Alternativszenario (${decisionLabels[inputs.scenario2.decision] || 'Alternative'}) zeigt die Wirkung einer anderen Finanzentscheidung.`;
}

function projectWealth(baseWealth, baseIncome, baseExpense, events, rate, inflation, returnRate, rentGrowth, years) {
  let wealth = baseWealth;
  const annualNet = baseIncome - baseExpense;

  for (let i = 1; i <= years; i += 1) {
    wealth += annualNet;
    wealth *= 1 + rate;

    if (events.capitalYear === i) {
      wealth += events.capitalAmount;
    }
    if (events.inheritanceYear === i) {
      wealth += events.inheritanceAmount;
    }
    if (events.purchaseYear === i) {
      wealth -= events.purchaseAmount;
    }
    if (events.scenarioOneTimeYear === i) {
      wealth += events.scenarioOneTimeAmount;
    }
  }
  return wealth;
}

function projectWealthPath(baseWealth, baseIncome, baseExpense, events, rate, inflation, returnRate, rentGrowth, years) {
  const path = [];
  let wealth = baseWealth;
  const annualNet = baseIncome - baseExpense;

  for (let year = 0; year <= years; year += 1) {
    path.push({ year, wealth });
    if (year === years) break;
    wealth += annualNet;
    wealth *= 1 + rate;
    if (events.capitalYear === year + 1) {
      wealth += events.capitalAmount;
    }
    if (events.inheritanceYear === year + 1) {
      wealth += events.inheritanceAmount;
    }
    if (events.purchaseYear === year + 1) {
      wealth -= events.purchaseAmount;
    }
    if (events.scenarioOneTimeYear === year + 1) {
      wealth += events.scenarioOneTimeAmount;
    }
  }
  return path;
}

function drawScenarioChart(canvas, scenarios, baseWealth, baseIncome, baseExpense, events, inputs, horizon) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const plotYears = Array.from({ length: horizon + 1 }, (_, i) => i);
  const series = scenarios.map((scenario) => {
    const modifier = getScenarioModifier(scenario.decision, baseWealth, baseIncome, baseExpense);
    const adjustedEvents = {
      ...events,
      scenarioOneTimeAmount: modifier.oneTimeAmount,
      scenarioOneTimeYear: modifier.oneTimeYear,
    };

    return {
      name: scenario.name,
      path: projectWealthPath(
        baseWealth,
        baseIncome * modifier.incomeFactor,
        baseExpense * modifier.expenseFactor,
        adjustedEvents,
        inputs.assumptionRate,
        inputs.assumptionInflation,
        inputs.assumptionReturn,
        inputs.assumptionRentGrowth,
        horizon
      ),
    };
  });

  const values = series.flatMap((serie) => serie.path.map((point) => point.wealth));
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const margin = 40;
  const chartWidth = width - margin * 2;
  const chartHeight = height - margin * 2;
  const colors = ['#2563eb', '#f97316', '#10b981'];

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, margin);
  ctx.lineTo(margin, height - margin);
  ctx.lineTo(width - margin, height - margin);
  ctx.stroke();

  const labelCount = Math.min(5, plotYears.length);
  for (let i = 0; i < labelCount; i += 1) {
    const x = margin + (chartWidth * i) / (labelCount - 1);
    const yearLabel = Math.round((horizon * i) / (labelCount - 1));
    ctx.fillStyle = '#475569';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText(yearLabel, x - 8, height - margin + 20);
  }

  for (let i = 0; i < 5; i += 1) {
    const y = margin + (chartHeight * i) / 4;
    const valueLabel = formatCurrency(Math.round(maxValue - ((maxValue - minValue) * i) / 4));
    ctx.fillStyle = '#64748b';
    ctx.fillText(valueLabel, 4, y + 4);
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(width - margin, y);
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();
  }

  series.forEach((serie, index) => {
    ctx.strokeStyle = colors[index % colors.length];
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    serie.path.forEach((point, idx) => {
      const x = margin + (chartWidth * point.year) / horizon;
      const y = height - margin - ((point.wealth - minValue) / (maxValue - minValue || 1)) * chartHeight;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    serie.path.forEach((point) => {
      const x = margin + (chartWidth * point.year) / horizon;
      const y = height - margin - ((point.wealth - minValue) / (maxValue - minValue || 1)) * chartHeight;
      ctx.fillStyle = colors[index % colors.length];
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  const legendX = margin;
  const legendY = 10;
  series.forEach((serie, index) => {
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(legendX + index * 130, legendY, 10, 10);
    ctx.fillStyle = '#0f172a';
    ctx.fillText(serie.name, legendX + index * 130 + 16, legendY + 10);
  });
}

function projectSurplus(baseIncome, baseExpense, rate, inflation, years, retirementAge, expectedPension, currentAge) {
  const ageAtYear = currentAge + years;
  let income = baseIncome;
  if (retirementAge > 0 && ageAtYear >= retirementAge) {
    income = expectedPension;
  }
  const inflationFactor = Math.pow(1 + inflation, years);
  const adjustedExpense = baseExpense * inflationFactor;
  return income - adjustedExpense;
}

goToStepIndex(0);
