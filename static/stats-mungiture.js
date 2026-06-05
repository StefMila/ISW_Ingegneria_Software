const SELECTED_AZIENDA_ID_KEY = 'selectedAziendaId';

const statsStatus = document.getElementById('statsStatus');
const filterDate = document.getElementById('filterDate');
const filterMonth = document.getElementById('filterMonth');
const filterMonthYear = document.getElementById('filterMonthYear');
const filterYear = document.getElementById('filterYear');
const compareYears = document.getElementById('compareYears');
const filterCow = document.getElementById('filterCow');
const refreshStatsBtn = document.getElementById('refreshStatsBtn');

const dailyTotalCard = document.getElementById('dailyTotalCard');
const monthlyTotalCard = document.getElementById('monthlyTotalCard');
const annualTotalCard = document.getElementById('annualTotalCard');
const dailyTrendChip = document.getElementById('dailyTrendChip');
const monthlyTrendChip = document.getElementById('monthlyTrendChip');
const dayTopCowList = document.getElementById('dayTopCowList');
const monthTopCowLabel = document.getElementById('monthTopCowLabel');
const yearTopCowLabel = document.getElementById('yearTopCowLabel');
const milkPerCowTableBody = document.getElementById('milkPerCowTableBody');

let allMungiture = [];
let animaliMap = new Map();
let yearsChart = null;
let monthTopCowChart = null;
let yearTopCowChart = null;

const getToken = () => (localStorage.getItem('token') || '').trim();
const getAziendaId = () => (localStorage.getItem(SELECTED_AZIENDA_ID_KEY) || '').trim();

const renderStatus = (text, color = '#1f2937') => {
	if (!statsStatus) return;
	statsStatus.textContent = text;
	statsStatus.style.color = color;
};
// Funzione per eseguire escaping(protezione dati) dei valori HTML
const escapeHtml = (value) => String(value || '')
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;')
	.replace(/'/g, '&#39;');

const toValidDate = (value) => {
	const date = new Date(value || '');
	return Number.isNaN(date.getTime()) ? null : date;
};
//ottiene la quantità di latte.
const getQuantity = (item) => (typeof item?.quantity === 'number' ? item.quantity : 0);
// Filtra solo le mungiture completate
const getCompletedItems = (items) => items.filter((item) => item?.status === 'completata');
// Popola le opzioni del filtro mese
const populateMonthOptions = () => {
	if (!filterMonth || filterMonth.options.length > 0) {
		return;
	}

	const monthNames = [
		'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
		'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
	];

	const fragment = document.createDocumentFragment();

	const allOption = document.createElement('option');
	allOption.value = '';
	allOption.textContent = 'Tutti';
	fragment.appendChild(allOption);

	monthNames.forEach((label, index) => {
		const option = document.createElement('option');
		option.value = String(index);
		option.textContent = label;
		fragment.appendChild(option);
	});

	filterMonth.appendChild(fragment);
};
// Carica gli animali dell'azienda e popola il filtro delle mucche
const loadAnimali = async () => {
	const aziendaId = getAziendaId();
	const token = getToken();

	const response = await fetch(`/api/animali/aziende/${aziendaId}/animali?limit=200`, {
		headers: { Authorization: `Bearer ${token}` }
	});

	if (!response.ok) {
		animaliMap = new Map();
		filterCow.innerHTML = '<option value="">Tutte le mucche</option>';
		return;
	}

	const payload = await response.json().catch(() => ({}));
	const items = Array.isArray(payload?.items) ? payload.items : [];

	animaliMap = new Map(
		items
			.filter((item) => item && item._id)
			.map((item) => {
				const name = String(item.name || '').trim();
				const matricola = String(item.matricola || '').trim();
				const label = [name, matricola].filter(Boolean).join(' - ') || String(item._id);
				return [String(item._id), label];
			})
	);

	const options = Array.from(animaliMap.entries())
		.sort((a, b) => a[1].localeCompare(b[1], 'it'))
		.map(([id, label]) => `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`)
		.join('');

	filterCow.innerHTML = `<option value="">Tutte le mucche</option>${options}`;
};
// Carica tutte le mungiture completate dell'azienda
const loadMungiture = async () => {
	const aziendaId = getAziendaId();
	const token = getToken();

	const params = new URLSearchParams({ aziendaId });
	const response = await fetch(`/api/mungiture?${params.toString()}`, {
		headers: { Authorization: `Bearer ${token}` }
	});

	if (!response.ok) {
		throw new Error('Errore durante il caricamento delle mungiture');
	}

	const items = await response.json().catch(() => []);
	allMungiture = Array.isArray(items) ? items : [];
};
// Popola il filtro degli anni basato sulle mungiture disponibili
const populateYearFilter = () => {
	const currentYear = new Date().getFullYear();
	const years = new Set([currentYear]);

	allMungiture.forEach((item) => {
		const date = toValidDate(item?.startedAt);
		if (date) years.add(date.getFullYear());
	});

	const sortedYears = Array.from(years).sort((a, b) => b - a);
	const currentYearValue = filterYear?.value || '';
	const currentMonthYearValue = filterMonthYear?.value || '';
	const currentCompareYears = compareYears
		? new Set(Array.from(compareYears.selectedOptions).map((option) => Number(option.value)))
		: new Set();
	const optionsMarkup = sortedYears
		.map((year) => `<option value="${year}">${year}</option>`)
		.join('');

	if (filterYear) {
		filterYear.innerHTML = optionsMarkup;
	}

	if (filterMonthYear) {
		filterMonthYear.innerHTML = optionsMarkup;
	}

	if (filterYear) {
		if (currentYearValue && sortedYears.includes(Number(currentYearValue))) {
			filterYear.value = currentYearValue;
		} else {
			filterYear.value = String(currentYear);
		}
	}

	if (filterMonthYear) {
		if (currentMonthYearValue && sortedYears.includes(Number(currentMonthYearValue))) {
			filterMonthYear.value = currentMonthYearValue;
		} else {
			filterMonthYear.value = String(currentYear);
		}
	}

	if (compareYears) {
		compareYears.innerHTML = optionsMarkup;
		const defaultYears = [currentYear, currentYear - 1, currentYear - 2];

		Array.from(compareYears.options).forEach((option) => {
			const year = Number(option.value);
			option.selected = currentCompareYears.size > 0
				? currentCompareYears.has(year)
				: defaultYears.includes(year);
		});
	}
};
// Ottiene le mungiture filtrate in base ai criteri selezionati
const getFilteredItems = () => {
	const selectedCow = (filterCow.value || '').trim();
	const selectedYear = Number(filterYear.value);

	return getCompletedItems(allMungiture).filter((item) => {
		const date = toValidDate(item?.startedAt);
		if (!date) return false;

		if (selectedCow && String(item?.animaleId || '') !== selectedCow) {
			return false;
		}

		if (!Number.isNaN(selectedYear) && date.getFullYear() !== selectedYear) {
			return false;
		}

		return true;
	});
};
// Calcola il totale giornaliero in base alla data e alla mucca selezionata
const getDailyTotal = () => {
	if (!filterDate.value) return 0;

	return getCompletedItems(allMungiture)
		.filter((item) => {
			const date = toValidDate(item?.startedAt);
			if (!date) return false;

			const sameDay = date.toISOString().slice(0, 10) === filterDate.value;
			const sameCow = !filterCow.value || String(item?.animaleId || '') === filterCow.value;

			return sameDay && sameCow;
		})
		.reduce((sum, item) => sum + getQuantity(item), 0);
};
// Calcola il totale mensile in base al mese, all'anno e alla mucca selezionata
const getMonthlyTotal = () => {
	const selectedYear = Number(filterMonthYear?.value);
	const selectedMonth = filterMonth.value === '' ? null : Number(filterMonth.value);
	if (Number.isNaN(selectedYear) || selectedMonth === null) return 0;

	return getCompletedItems(allMungiture)
		.filter((item) => {
			const date = toValidDate(item?.startedAt);
			if (!date) return false;

			const sameYear = date.getFullYear() === selectedYear;
			const sameMonth = date.getMonth() === selectedMonth;
			const sameCow = !filterCow.value || String(item?.animaleId || '') === filterCow.value;

			return sameYear && sameMonth && sameCow;
		})
		.reduce((sum, item) => sum + getQuantity(item), 0);
};

const getAnnualTotal = () => {
	const selectedYear = Number(filterYear?.value);
	if (Number.isNaN(selectedYear)) return 0;

	return getCompletedItems(allMungiture)
		.filter((item) => {
			const date = toValidDate(item?.startedAt);
			if (!date) return false;

			const sameYear = date.getFullYear() === selectedYear;
			const sameCow = !filterCow.value || String(item?.animaleId || '') === filterCow.value;

			return sameYear && sameCow;
		})
		.reduce((sum, item) => sum + getQuantity(item), 0);
};

const getDayItems = () => {
	if (!filterDate?.value) return [];

	return getCompletedItems(allMungiture).filter((item) => {
		const date = toValidDate(item?.startedAt);
		if (!date) return false;

		const sameDay = date.toISOString().slice(0, 10) === filterDate.value;
		const sameCow = !filterCow.value || String(item?.animaleId || '') === filterCow.value;

		return sameDay && sameCow;
	});
};

const getCowRanking = (items, limit = 3) => {
	const byCow = new Map();

	items.forEach((item) => {
		const animaleId = String(item?.animaleId || '').trim();
		if (!animaleId) return;

		byCow.set(animaleId, (byCow.get(animaleId) || 0) + getQuantity(item));
	});

	return Array.from(byCow.entries())
		.map(([animaleId, liters]) => ({
			animaleId,
			label: animaliMap.get(animaleId) || animaleId,
			liters
		}))
		.sort((left, right) => right.liters - left.liters)
		.slice(0, limit);
};

const renderDayTopCowList = () => {
	if (!dayTopCowList) {
		return;
	}

	const ranking = getCowRanking(getDayItems(), 3);
	if (ranking.length === 0) {
		dayTopCowList.innerHTML = '<li class="stats-topcow-empty">Nessun dato disponibile</li>';
		return;
	}

	dayTopCowList.innerHTML = ranking.map((entry, index) => `
		<li class="stats-topcow-item">
			<span class="stats-topcow-rank">${index + 1}</span>
			<span class="stats-topcow-name">${escapeHtml(entry.label)}</span>
			<span class="stats-topcow-value">${entry.liters.toFixed(2)} L</span>
		</li>
	`).join('');
};

const getMonthItems = () => {
	const selectedYear = Number(filterMonthYear?.value);
	const selectedMonth = filterMonth?.value === '' ? null : Number(filterMonth?.value);
	if (Number.isNaN(selectedYear) || selectedMonth === null) return [];

	return getCompletedItems(allMungiture).filter((item) => {
		const date = toValidDate(item?.startedAt);
		if (!date) return false;

		const sameYear = date.getFullYear() === selectedYear;
		const sameMonth = date.getMonth() === selectedMonth;
		const sameCow = !filterCow.value || String(item?.animaleId || '') === filterCow.value;

		return sameYear && sameMonth && sameCow;
	});
};

const getYearItems = () => {
	const selectedYear = Number(filterYear?.value);
	if (Number.isNaN(selectedYear)) return [];

	return getCompletedItems(allMungiture).filter((item) => {
		const date = toValidDate(item?.startedAt);
		if (!date) return false;

		const sameYear = date.getFullYear() === selectedYear;
		const sameCow = !filterCow.value || String(item?.animaleId || '') === filterCow.value;

		return sameYear && sameCow;
	});
};

const buildPieChart = (canvas, existingChart, breakdown, labelElement) => {
	if (!canvas || typeof Chart === 'undefined') {
		return existingChart;
	}

	if (existingChart) {
		existingChart.destroy();
	}

	if (!breakdown) {
		if (labelElement) {
			labelElement.textContent = 'Nessun dato disponibile';
		}

		return new Chart(canvas, {
			type: 'doughnut',
			data: {
				labels: ['Nessun dato'],
				datasets: [{
					data: [1],
					backgroundColor: ['#d1d5db'],
					borderWidth: 0
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: { enabled: false }
				},
				cutout: '62%'
			}
		});
	}

	const { topCowLabel, topCowLiters, others } = breakdown;
	if (labelElement) {
		labelElement.textContent = `${topCowLabel} - ${topCowLiters.toFixed(2)} L`;
	}

	return new Chart(canvas, {
		type: 'doughnut',
		data: {
			labels: [topCowLabel, 'Altre mucche'],
			datasets: [{
				data: [topCowLiters, others],
				backgroundColor: ['#3f7f1f', '#b9c4cf'],
				borderWidth: 0
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: false },
				tooltip: {
					callbacks: {
						label: (context) => `${context.label}: ${Number(context.parsed).toFixed(2)} L`
					}
				}
			},
			cutout: '62%'
		}
	});
};

const renderTopCowPieCharts = () => {
	const monthCanvas = document.getElementById('monthTopCowChart');
	const yearCanvas = document.getElementById('yearTopCowChart');

	const monthBreakdown = getCowRanking(getMonthItems(), 2);
	const yearBreakdown = getCowRanking(getYearItems(), 2);

	const monthChartData = monthBreakdown.length === 0
		? null
		: {
			topCowLabel: monthBreakdown[0].label,
			topCowLiters: monthBreakdown[0].liters,
			others: Math.max(monthBreakdown.reduce((sum, item) => sum + item.liters, 0) - monthBreakdown[0].liters, 0)
		};

	const yearChartData = yearBreakdown.length === 0
		? null
		: {
			topCowLabel: yearBreakdown[0].label,
			topCowLiters: yearBreakdown[0].liters,
			others: Math.max(yearBreakdown.reduce((sum, item) => sum + item.liters, 0) - yearBreakdown[0].liters, 0)
		};

	monthTopCowChart = buildPieChart(monthCanvas, monthTopCowChart, monthChartData, monthTopCowLabel);
	yearTopCowChart = buildPieChart(yearCanvas, yearTopCowChart, yearChartData, yearTopCowLabel);
};

const getPreviousDayTotal = () => {
	if (!filterDate.value) return 0;

	const selectedDate = new Date(`${filterDate.value}T00:00:00`);
	if (Number.isNaN(selectedDate.getTime())) return 0;

	const previousDate = new Date(selectedDate);
	previousDate.setDate(previousDate.getDate() - 1);
	const previousIso = previousDate.toISOString().slice(0, 10);

	return getCompletedItems(allMungiture)
		.filter((item) => {
			const date = toValidDate(item?.startedAt);
			if (!date) return false;

			const sameDay = date.toISOString().slice(0, 10) === previousIso;
			const sameCow = !filterCow.value || String(item?.animaleId || '') === filterCow.value;

			return sameDay && sameCow;
		})
		.reduce((sum, item) => sum + getQuantity(item), 0);
};

const getPreviousMonthTotal = () => {
	const selectedYear = Number(filterMonthYear?.value);
	const selectedMonth = filterMonth.value === '' ? null : Number(filterMonth.value);
	if (Number.isNaN(selectedYear) || selectedMonth === null) return 0;

	const currentDate = new Date(selectedYear, selectedMonth, 1);
	const previousDate = new Date(currentDate);
	previousDate.setMonth(previousDate.getMonth() - 1);

	const previousYear = previousDate.getFullYear();
	const previousMonth = previousDate.getMonth();

	return getCompletedItems(allMungiture)
		.filter((item) => {
			const date = toValidDate(item?.startedAt);
			if (!date) return false;

			const sameYear = date.getFullYear() === previousYear;
			const sameMonth = date.getMonth() === previousMonth;
			const sameCow = !filterCow.value || String(item?.animaleId || '') === filterCow.value;

			return sameYear && sameMonth && sameCow;
		})
		.reduce((sum, item) => sum + getQuantity(item), 0);
};

const formatTrend = (currentValue, previousValue) => {
	if (currentValue === 0 && previousValue === 0) {
		return { label: '↔ 0.00%', className: 'stats-trend-chip is-flat' };
	}

	if (previousValue === 0) {
		return { label: '↑ 100.00%', className: 'stats-trend-chip is-up' };
	}

	const delta = ((currentValue - previousValue) / previousValue) * 100;
	const absDelta = Math.abs(delta).toFixed(2);

	if (delta > 0) {
		return { label: `↑ ${absDelta}%`, className: 'stats-trend-chip is-up' };
	}

	if (delta < 0) {
		return { label: `↓ ${absDelta}%`, className: 'stats-trend-chip is-down' };
	}

	return { label: '↔ 0.00%', className: 'stats-trend-chip is-flat' };
};

const renderTrendChips = (dailyTotal, monthlyTotal) => {
	if (dailyTrendChip) {
		const dailyTrend = formatTrend(dailyTotal, getPreviousDayTotal());
		dailyTrendChip.textContent = dailyTrend.label;
		dailyTrendChip.className = dailyTrend.className;
	}

	if (monthlyTrendChip) {
		const monthlyTrend = formatTrend(monthlyTotal, getPreviousMonthTotal());
		monthlyTrendChip.textContent = monthlyTrend.label;
		monthlyTrendChip.className = monthlyTrend.className;
	}
};
// Aggiorna le card dei totali giornaliero e mensile
const renderCards = () => {
	const dailyTotal = getDailyTotal();
	const monthlyTotal = getMonthlyTotal();
	const annualTotal = getAnnualTotal();

	dailyTotalCard.textContent = `${dailyTotal.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
	monthlyTotalCard.textContent = `${monthlyTotal.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
	if (annualTotalCard) {
		annualTotalCard.textContent = `${annualTotal.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
	}
	renderTrendChips(dailyTotal, monthlyTotal);
};
// Renderizza la tabella del latte per mucca basata sui filtri selezionati
const renderMilkPerCowTable = () => {
	const items = getFilteredItems();
	const grouped = new Map();

	items.forEach((item) => {
		const animaleId = String(item?.animaleId || '').trim();
		if (!animaleId) return;

		const current = grouped.get(animaleId) || { count: 0, total: 0 };
		current.count += 1;
		current.total += getQuantity(item);
		grouped.set(animaleId, current);
	});

	const rows = Array.from(grouped.entries())
		.map(([animaleId, stats]) => {
			const label = animaliMap.get(animaleId) || animaleId;
			return {
				label,
				count: stats.count,
				total: stats.total,
				avg: stats.count > 0 ? stats.total / stats.count : 0
			};
		})
		.sort((a, b) => b.total - a.total);

	if (rows.length === 0) {
		milkPerCowTableBody.innerHTML = `
			<tr>
				<td colspan="4" class="status">Nessun dato disponibile per i filtri selezionati.</td>
			</tr>
		`;
		return;
	}

	const totalMungiture = rows.reduce((sum, row) => sum + row.count, 0);
	const totalLitri = rows.reduce((sum, row) => sum + row.total, 0);
	const totalAvg = totalMungiture > 0 ? totalLitri / totalMungiture : 0;

	milkPerCowTableBody.innerHTML = `${rows.map((row) => `
		<tr>
			<td>${escapeHtml(row.label)}</td>
			<td>${row.count}</td>
			<td>${row.total.toFixed(2)} L</td>
			<td>${row.avg.toFixed(2)} L</td>
		</tr>
	`).join('')}
		<tr class="stats-table-total-row">
			<td>Totale</td>
			<td>${totalMungiture}</td>
			<td>${totalLitri.toFixed(2)} L</td>
			<td>${totalAvg.toFixed(2)} L</td>
		</tr>`;
};

const getMonthlySeriesByYear = () => {
	const yearsToDisplay = compareYears
		? Array.from(compareYears.selectedOptions).map((option) => Number(option.value)).filter((year) => !Number.isNaN(year))
		: [];

	const seriesMap = new Map(yearsToDisplay.map((year) => [year, Array(12).fill(0)]));

	getCompletedItems(allMungiture).forEach((item) => {
		const date = toValidDate(item?.startedAt);
		if (!date) return;

		if (filterCow.value && String(item?.animaleId || '') !== filterCow.value) {
			return;
		}

		const year = date.getFullYear();
		const month = date.getMonth();
		if (!seriesMap.has(year)) {
			return;
		}

		seriesMap.get(year)[month] += getQuantity(item);
	});

	return Array.from(seriesMap.entries());
};

// Renderizza il grafico di confronto annuale con andamento mensile su più anni
const renderYearsChart = () => {
	const canvas = document.getElementById('yearsComparisonChart');
	if (!canvas || typeof Chart === 'undefined') {
		return;
	}
	const labels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
	const palette = ['#3f7f1f', '#9a6a3a', '#6f8497', '#974f86', '#2a7a89', '#6f6f6f'];
	const series = getMonthlySeriesByYear();

	if (yearsChart) {
		yearsChart.destroy();
		yearsChart = null;
	}

	const datasets = series.map(([year, monthValues], index) => ({
		label: String(year),
		data: monthValues.map((value) => Number(value.toFixed(2))),
		borderColor: palette[index % palette.length],
		backgroundColor: palette[index % palette.length],
		pointRadius: 3,
		pointHoverRadius: 5,
		borderWidth: 2,
		tension: 0.32,
		fill: false
	}));

	if (datasets.length === 0) {
		yearsChart = new Chart(canvas, {
			type: 'line',
			data: {
				labels,
				datasets: [{
					label: 'Nessun anno selezionato',
					data: Array(12).fill(0),
					borderColor: '#9ca3af',
					backgroundColor: '#9ca3af',
					pointRadius: 0,
					borderWidth: 1,
					tension: 0.2,
					fill: false
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: { enabled: false }
				},
				scales: {
					x: { grid: { display: false } },
					y: { beginAtZero: true }
				}
			}
		});
		return;
	}

	yearsChart = new Chart(canvas, {
		type: 'line',
		data: {
			labels,
			datasets
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					display: true,
					position: 'top',
					labels: {
						boxWidth: 18,
						color: '#e8f8e8'
					}
				},
				tooltip: {
					callbacks: {
						label: (context) => `${context.parsed.y.toFixed(2)} L`
					}
				}
			},
			scales: {
				x: {
					ticks: { color: '#d7eed6' },
					grid: { display: false }
				},
				y: {
					beginAtZero: true,
					ticks: {
						color: '#d7eed6',
						callback: (value) => `${Number(value).toFixed(0)} L`
					},
					grid: {
						color: 'rgba(215, 238, 214, 0.2)'
					}
				}
			}
		}
	});
};
// Funzione principale per aggiornare tutte le statistiche e i grafici
const refreshStats = () => {
	renderCards();
	renderDayTopCowList();
	renderTopCowPieCharts();
	renderMilkPerCowTable();
	renderYearsChart();
	renderStatus('✔ Statistiche aggiornate.', '#1f7a1f');
};
// carica i dati iniziali 
const bootstrap = async () => {
	const aziendaId = getAziendaId();
	const token = getToken();

	if (!aziendaId) {
		renderStatus('Seleziona prima un\'azienda dalla home.', '#b45309');
		return;
	}

	if (!token) {
		renderStatus('Sessione non valida. Effettua di nuovo il login.', 'red');
		return;
	}

	try {
		renderStatus('Caricamento statistiche...');
		populateMonthOptions();
		await loadAnimali();
		await loadMungiture();
		populateYearFilter();

		if (!filterDate.value) {
			filterDate.value = new Date().toISOString().slice(0, 10);
		}

		if (filterMonth.value === '') {
			filterMonth.value = String(new Date().getMonth());
		}

		if (filterMonthYear && !filterMonthYear.value) {
			filterMonthYear.value = String(new Date().getFullYear());
		}

		refreshStats();
	} catch (error) {
		renderStatus(error.message || 'Errore durante il caricamento.', 'red');
	}
};

refreshStatsBtn?.addEventListener('click', refreshStats);

[filterCow, filterDate, filterMonth, filterMonthYear, filterYear, compareYears].forEach((element) => {
	element?.addEventListener('change', refreshStats);
});

document.addEventListener('DOMContentLoaded', bootstrap);
