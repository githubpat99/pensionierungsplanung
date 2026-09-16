const fileInput = document.getElementById('file-input');
const resultsSection = document.getElementById('results');
const summaryEl = document.getElementById('summary');
const overviewBody = document.getElementById('overview-table-body');
const detailsEl = document.getElementById('details');
const questionsEl = document.getElementById('questions');

fileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const data = parseWorkbook(workbook);
  renderApp(data);
});

function parseWorkbook(workbook) {
  const overview = parseOverviewSheet(workbook.Sheets['Übersicht']);
  const yearSheets = Object.keys(workbook.Sheets)
    .filter((name) => /^Rente\s*\d{4}$/i.test(name))
    .map((name) => parseYearSheet(name, workbook.Sheets[name]))
    .filter(Boolean);
  return { overview, yearSheets };
}

function parseOverviewSheet(sheet) {
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
  const result = [];
  for (const row of rows) {
    const year = parseInt(String(row[0] || '').replace(/[^0-9]/g, ''), 10);
    if (!Number.isFinite(year) || year < 1900) continue;
    const afterTax = parseNumber(row[2]);
    const annualGap = parseNumber(row[4]);
    const monthlyGap = parseNumber(row[5]);
    result.push({ year, afterTax, annualGap, monthlyGap });
  }
  return result;
}

const categoryMap = {
  'aus PK': 'PK',
  'aus AHV': 'AHV',
  'AHV (13.)': 'AHV 13',
  'Kinderzulage': 'Kinderzulage',
  'Kinderrente': 'Kinderrente',
  'Total': 'Total',
};

function parseYearSheet(name, sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
  const yearMatch = name.match(/\d{4}/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : null;
  const data = { sheetName: name, year, items: [] };

  for (const row of rows) {
    const label = String(row[0] || '').replace(/\*.*$/, '').trim();
    const key = Object.keys(categoryMap).find((pattern) => label.toLowerCase().startsWith(pattern.toLowerCase()));
    if (!key) continue;
    const yearValue = parseNumber(row[1]);
    const monthValue = parseNumber(row[2]);
    data.items.push({ label: categoryMap[key], yearValue, monthValue });
  }

  return data;
}

function parseNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;
  let normalized = value.trim();
  if (!normalized) return null;
  normalized = normalized.replace(/['’\s]/g, '');

  const lastDot = normalized.lastIndexOf('.');
  const lastComma = normalized.lastIndexOf(',');

  if (lastDot >= 0 && lastComma >= 0) {
    if (lastDot > lastComma) {
      // format: 1,234.56 -> comma thousands, dot decimal
      normalized = normalized.replace(/,/g, '');
    } else {
      // format: 1.234,56 -> dot thousands, comma decimal
      normalized = normalized.replace(/\./g, '').replace(/,/g, '.');
    }
  } else if (lastComma >= 0) {
    const decimalPart = normalized.slice(lastComma + 1);
    if (/^\d{3}$/.test(decimalPart)) {
      // likely thousands separator 1,000
      normalized = normalized.replace(/,/g, '');
    } else {
      // likely decimal comma 1234,56
      normalized = normalized.replace(/,/g, '.');
    }
  } else if (lastDot >= 0) {
    const decimalPart = normalized.slice(lastDot + 1);
    if (/^\d{3}$/.test(decimalPart)) {
      // likely thousands separator 1.000
      normalized = normalized.replace(/\./g, '');
    }
  }

  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function renderApp(data) {
  resultsSection.classList.remove('hidden');
  renderSummary(data.overview);
  renderOverviewTable(data.overview);
  renderDetails(data.yearSheets);
  renderQuestions(data.overview, data.yearSheets);
}

function formatCurrency(value) {
  if (value == null || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(value);
}

function renderSummary(overview) {
  summaryEl.innerHTML = '';
  if (!overview.length) {
    summaryEl.innerHTML = '<p>Die Übersicht konnte nicht gelesen werden. Bitte prüfen Sie die Datei.</p>';
    return;
  }
  const latest = overview[overview.length - 1];
  const totalYearGap = overview.reduce((sum, row) => sum + (row.annualGap || 0), 0);
  const totalMonthGap = overview.reduce((sum, row) => sum + (row.monthlyGap || 0), 0);
  const cards = [
    { title: 'Letztes Jahr', value: latest.year },
    { title: 'Netto letztes Jahr', value: formatCurrency(latest.afterTax) },
    { title: 'Jahreslücke insgesamt', value: formatCurrency(totalYearGap) },
    { title: 'Monatslücke insgesamt', value: formatCurrency(totalMonthGap) },
  ];
  cards.forEach((card) => {
    const item = document.createElement('div');
    item.className = 'summary-card-item';
    item.innerHTML = `<h3>${card.title}</h3><p>${card.value}</p>`;
    summaryEl.appendChild(item);
  });
}

function renderOverviewTable(overview) {
  overviewBody.innerHTML = '';
  if (!overview.length) return;
  overview.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.year}</td>
      <td>${formatCurrency(row.afterTax)}</td>
      <td>${formatCurrency(row.annualGap)}</td>
      <td>${formatCurrency(row.monthlyGap)}</td>
    `;
    overviewBody.appendChild(tr);
  });
}

function renderDetails(yearSheets) {
  detailsEl.innerHTML = '';
  if (!yearSheets.length) {
    detailsEl.innerHTML = '<p>Keine Jahreseinstellungen gefunden.</p>';
    return;
  }
  yearSheets.forEach((sheet) => {
    const block = document.createElement('div');
    block.className = 'year-block';
    const title = document.createElement('h3');
    title.textContent = `Details: ${sheet.sheetName}`;
    block.appendChild(title);
    const table = document.createElement('table');
    table.className = 'details-table';
    table.innerHTML = `
      <thead>
        <tr><th>Position</th><th>Jahr</th><th>Monat</th></tr>
      </thead>
      <tbody>${sheet.items
        .map((item) => `
          <tr>
            <td>${item.label}</td>
            <td>${item.yearValue != null ? formatCurrency(item.yearValue) : '-'}</td>
            <td>${item.monthValue != null ? formatCurrency(item.monthValue) : '-'}</td>
          </tr>
        `)
        .join('')}</tbody>
    `;
    block.appendChild(table);
    detailsEl.appendChild(block);
  });
}

function renderQuestions(overview, yearSheets) {
  questionsEl.innerHTML = '';
  const questions = [];
  if (!overview.length) {
    questions.push('Die Übersichtsdaten konnten nicht geladen werden. Bitte überprüfen Sie die Datei und versuchen Sie es erneut.');
  } else {
    const latest = overview[overview.length - 1];
    questions.push(`Wie möchten Sie die Lücke von ${formatCurrency(latest.annualGap)} pro Jahr und ${formatCurrency(latest.monthlyGap)} pro Monat für ${latest.year} reduzieren?`);
    questions.push('Sind die AHV- und Pensionskassenwerte in der Quelle aktuell und vollständig erfasst?');
    questions.push('Gibt es zusätzliche Versicherungen, Vorsorgebeiträge oder Sparformen, die in der aktuellen Excel-Datei nicht erfasst sind?');
    if (yearSheets.length > 1) {
      questions.push('Wie hat sich die Vorsorgelücke über die Jahre verändert und welche Massnahmen sind deswegen sinnvoll?');
    }
  }
  questions.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    questionsEl.appendChild(li);
  });
}
