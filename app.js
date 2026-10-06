/* ==========================================================================
   Reliance 5Y Backtest Quant Dashboard - Application Logic
   Interactive 2D Chart.js Visualizations & Quant Analytics
   ========================================================================== */

let dashboardData = null;
let currentPage = 1;
const TRADES_PER_PAGE = 25;

// Currency Formatter
const formatINR = (val) => {
    if (val === undefined || val === null) return "₹0.00";
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
    }).format(val);
};

// Number Formatter
const formatNum = (val, dec = 2) => {
    if (val === undefined || val === null) return "0";
    return Number(val).toLocaleString('en-IN', {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec
    });
};

// Chart.js Global Dark Theme Configuration
function setupChartDefaults() {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
    Chart.defaults.plugins.tooltip.titleColor = '#f8fafc';
    Chart.defaults.plugins.tooltip.bodyColor = '#cbd5e1';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.1)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.boxPadding = 6;
    Chart.defaults.plugins.tooltip.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
}

// ==========================================================================
// Initialization & Data Fetching
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    setupChartDefaults();
    try {
        const res = await fetch('/api/data');
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        dashboardData = await res.json();
        
        renderHeaderBadges(dashboardData.metrics);
        renderKeyMetrics(dashboardData.metrics);
        renderEquityChart(dashboardData.equity, dashboardData.bh);
        renderDrawdownChart(dashboardData.dd);
        renderHistogramChart(dashboardData.hist);
        renderRegimeChart(dashboardData.regimes);
        renderMonthlyHeatmap(dashboardData.monthly);
        renderRollingSharpeChart(dashboardData.rolling);
        renderFormulas(dashboardData.formulas);
        renderTradesTable();

        // Dismiss loader
        const loader = document.getElementById('loader');
        if (loader) {
            loader.classList.add('hidden');
        }
    } catch (err) {
        console.error('Failed to load dashboard data:', err);
        const loader = document.getElementById('loader');
        if (loader) {
            loader.innerHTML = `
                <div style="text-align: center; color: #ef4444; padding: 20px;">
                    <h3>Failed to load dashboard data</h3>
                    <p style="color: #94a3b8; margin-top: 8px;">Ensure dashboard_server.py is running and reliance_last_5_years.csv is present.</p>
                </div>
            `;
        }
    }
});

// ==========================================================================
// Header Badges
// ==========================================================================
function renderHeaderBadges(m) {
    const periodBadge = document.getElementById('badge-period');
    const tradesBadge = document.getElementById('badge-trades');
    if (periodBadge) periodBadge.textContent = `${m.yrs} YRS (${m.tpy} TRADES/YR)`;
    if (tradesBadge) {
        tradesBadge.textContent = `${m.N} TRADES • ${m.wr}% WIN`;
        tradesBadge.classList.add('badge-cyan');
    }
}

// ==========================================================================
// Top Key Metrics Cards
// ==========================================================================
function renderKeyMetrics(m) {
    const container = document.getElementById('metrics-grid');
    if (!container) return;

    const cards = [
        {
            title: "Total Net P&L",
            icon: "💰",
            val: formatINR(m.pnl),
            sub: `Return: ${m.ret >= 0 ? '+' : ''}${m.ret}% (Cap: ${formatINR(m.capF)})`,
            cls: m.pnl >= 0 ? "profit" : "loss"
        },
        {
            title: "Win Rate",
            icon: "🎯",
            val: `${m.wr}%`,
            sub: `${m.W} Won / ${m.L} Lost`,
            cls: m.wr >= 50 ? "profit" : "cyan"
        },
        {
            title: "Profit Factor",
            icon: "⚖️",
            val: formatNum(m.pf, 2),
            sub: `Win/Loss Ratio: ${formatNum(m.wlr, 2)}x`,
            cls: m.pf >= 1.5 ? "profit" : m.pf >= 1.0 ? "cyan" : "loss"
        },
        {
            title: "CAGR",
            icon: "📈",
            val: `${m.cagr}%`,
            sub: `Annualized growth rate`,
            cls: m.cagr >= 20 ? "profit" : "cyan"
        },
        {
            title: "Sharpe Ratio",
            icon: "📐",
            val: formatNum(m.sharpe, 2),
            sub: `Risk-free rate: 6.0%`,
            cls: m.sharpe >= 1.5 ? "profit" : m.sharpe >= 1.0 ? "cyan" : "purple"
        },
        {
            title: "Sortino Ratio",
            icon: "🛡️",
            val: formatNum(m.sortino, 2),
            sub: `Downside risk penalization`,
            cls: m.sortino >= 2.0 ? "profit" : "cyan"
        },
        {
            title: "Max Drawdown",
            icon: "📉",
            val: `-${m.mdd}%`,
            sub: `Max trough: -${formatINR(m.mdd_abs)}`,
            cls: "loss"
        },
        {
            title: "Calmar Ratio",
            icon: "⚡",
            val: formatNum(m.calmar, 2),
            sub: `CAGR / Max Drawdown`,
            cls: m.calmar >= 2 ? "profit" : "cyan"
        },
        {
            title: "Trade Expectancy",
            icon: "🎲",
            val: formatINR(m.exp),
            sub: `Kelly Fraction: ${m.kelly}%`,
            cls: m.exp >= 0 ? "profit" : "loss"
        },
        {
            title: "Avg Win / Loss",
            icon: "📊",
            val: `${formatINR(m.aw)}`,
            sub: `Avg Loss: -${formatINR(m.al)}`,
            cls: "cyan"
        },
        {
            title: "Consecutive Streaks",
            icon: "🔥",
            val: `W: ${m.mcw} / L: ${m.mcl}`,
            sub: `Max consecutive runs`,
            cls: "purple"
        },
        {
            title: "Annualized Volatility",
            icon: "🌊",
            val: `${m.vol}%`,
            sub: `Skew: ${m.skew} | Kurt: ${m.kurt}`,
            cls: "cyan"
        }
    ];

    container.innerHTML = cards.map(c => `
        <div class="metric-card">
            <div class="metric-header">
                <span class="metric-title">${c.title}</span>
                <span class="metric-icon">${c.icon}</span>
            </div>
            <div class="metric-value ${c.cls || ''}">${c.val}</div>
            <div class="metric-sub">${c.sub}</div>
        </div>
    `).join('');
}

// ==========================================================================
// Chart 1: Equity Curve vs Buy & Hold
// ==========================================================================
function renderEquityChart(equity, bh) {
    const ctx = document.getElementById('equity-chart');
    if (!ctx) return;

    const labels = equity.map(p => `Trade ${p.x}`);
    const strategyData = equity.map(p => p.y);
    const bhData = bh && bh.length ? [equity[0].y, ...bh] : [];

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.00)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Strategy Equity (₹)',
                    data: strategyData,
                    borderColor: '#06b6d4',
                    borderWidth: 2,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#06b6d4',
                    pointHoverBorderColor: '#ffffff'
                },
                ...(bhData.length ? [{
                    label: 'Buy & Hold Baseline (₹)',
                    data: bhData,
                    borderColor: '#a78bfa',
                    borderWidth: 1.5,
                    borderDash: [5, 4],
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#a78bfa'
                }] : [])
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { maxTicksLimit: 12 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        callback: val => '₹' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val)
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${formatINR(ctx.raw)}`
                    }
                }
            }
        }
    });
}

// ==========================================================================
// Chart 2: Drawdown Profile
// ==========================================================================
function renderDrawdownChart(dd) {
    const ctx = document.getElementById('drawdown-chart');
    if (!ctx) return;

    const labels = dd.map(p => `Trade ${p.x}`);
    const data = dd.map(p => p.y);

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.00)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0.40)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Underwater Drawdown (%)',
                data: data,
                borderColor: '#ef4444',
                borderWidth: 1.8,
                backgroundColor: gradient,
                fill: true,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { maxTicksLimit: 12 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { callback: val => `${val}%` }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => `Drawdown: ${ctx.raw}%`
                    }
                }
            }
        }
    });
}

// ==========================================================================
// Chart 3: P&L Distribution Histogram
// ==========================================================================
function renderHistogramChart(hist) {
    const ctx = document.getElementById('histogram-chart');
    if (!ctx || !hist) return;

    const backgroundColors = hist.labels.map(lbl => {
        const val = parseFloat(lbl);
        return val >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)';
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hist.labels.map(l => `₹${l}`),
            datasets: [{
                label: 'Trade Count',
                data: hist.counts,
                backgroundColor: backgroundColors,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { maxTicksLimit: 10 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// ==========================================================================
// Chart 4: Regime Performance
// ==========================================================================
function renderRegimeChart(regimes) {
    const ctx = document.getElementById('regime-chart');
    if (!ctx || !regimes) return;

    const labels = Object.keys(regimes);
    const pnlData = labels.map(r => regimes[r].pnl);
    const wrData = labels.map(r => regimes[r].wr);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Net P&L (₹)',
                    data: pnlData,
                    backgroundColor: pnlData.map(v => v >= 0 ? 'rgba(6, 182, 212, 0.75)' : 'rgba(239, 68, 68, 0.75)'),
                    yAxisID: 'y',
                    borderRadius: 6
                },
                {
                    label: 'Win Rate (%)',
                    data: wrData,
                    type: 'line',
                    borderColor: '#f59e0b',
                    borderWidth: 2,
                    pointBackgroundColor: '#f59e0b',
                    pointRadius: 4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { display: false }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        callback: val => '₹' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val)
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { callback: val => `${val}%` },
                    min: 0,
                    max: 100
                }
            }
        }
    });
}

// ==========================================================================
// Chart 5: Rolling Sharpe Ratio
// ==========================================================================
function renderRollingSharpeChart(rolling) {
    const ctx = document.getElementById('rolling-sharpe-chart');
    if (!ctx || !rolling) return;

    const labels = rolling.map(p => `Trade ${p.x}`);
    const values = rolling.map(p => p.y);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '50-Trade Rolling Sharpe',
                data: values,
                borderColor: '#60a5fa',
                borderWidth: 1.8,
                fill: false,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { maxTicksLimit: 12 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            }
        }
    });
}

// ==========================================================================
// Monthly Heatmap Table
// ==========================================================================
function renderMonthlyHeatmap(monthly) {
    const container = document.getElementById('heatmap-container');
    if (!container || !monthly) return;

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Group monthly keys into years
    const yearsSet = new Set();
    Object.keys(monthly).forEach(k => {
        yearsSet.add(k.split('-')[0]);
    });
    const years = Array.from(yearsSet).sort();

    let html = `
        <table class="heatmap-table">
            <thead>
                <tr>
                    <th>Year</th>
                    ${months.map(m => `<th>${m}</th>`).join('')}
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
    `;

    years.forEach(yr => {
        let yrPnl = 0;
        let yrPctSum = 0;
        let cellsHtml = '';

        for (let m = 1; m <= 12; m++) {
            const mKey = `${yr}-${String(m).padStart(2, '0')}`;
            const item = monthly[mKey];
            if (item) {
                yrPnl += item.pnl;
                yrPctSum += item.pct;
                const isPos = item.pct >= 0;
                const alpha = Math.min(Math.abs(item.pct) / 10 + 0.15, 0.85).toFixed(2);
                const bg = isPos ? `rgba(16, 185, 129, ${alpha})` : `rgba(239, 68, 68, ${alpha})`;
                const textCol = Math.abs(item.pct) > 3 ? '#ffffff' : (isPos ? '#34d399' : '#f87171');
                
                cellsHtml += `
                    <td style="background: ${bg}; color: ${textCol};" title="${mKey}: ${formatINR(item.pnl)} (${item.n} trades)">
                        ${isPos ? '+' : ''}${item.pct}%
                    </td>
                `;
            } else {
                cellsHtml += `<td class="empty-cell">-</td>`;
            }
        }

        const yrPos = yrPctSum >= 0;
        cellsHtml += `
            <td class="total-col" style="color: ${yrPos ? 'var(--profit-green)' : 'var(--loss-red)'}">
                ${yrPos ? '+' : ''}${yrPctSum.toFixed(2)}%
            </td>
        `;

        html += `
            <tr>
                <td class="year-col">${yr}</td>
                ${cellsHtml}
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ==========================================================================
// Quant Formulas Section
// ==========================================================================
function renderFormulas(formulas) {
    const container = document.getElementById('formulas-grid');
    if (!container || !formulas) return;

    const verdictClass = (v) => {
        const val = String(v).toLowerCase();
        if (val.includes('good') || val.includes('strong') || val.includes('excellent') || val.includes('low') || val.includes('edge')) {
            return 'verdict-good';
        }
        if (val.includes('accept') || val.includes('moderate')) {
            return 'verdict-acceptable';
        }
        if (val.includes('below') || val.includes('marginal') || val.includes('conserv')) {
            return 'verdict-warning';
        }
        return 'verdict-poor';
    };

    container.innerHTML = formulas.map(f => `
        <div class="formula-card">
            <div class="formula-card-top">
                <div class="formula-title-row">
                    <span class="formula-name">${f.name}</span>
                    <span class="verdict-badge ${verdictClass(f.verdict)}">${f.verdict}</span>
                </div>
                <div class="formula-eq">${f.formula}</div>
                <div class="formula-desc">${f.desc}</div>
            </div>
            <div class="formula-val-row">
                <span class="formula-val-label">Calculated Metric</span>
                <span class="formula-val">${f.value}</span>
            </div>
        </div>
    `).join('');
}

// ==========================================================================
// Trade Log Table & Pagination
// ==========================================================================
function renderTradesTable() {
    if (!dashboardData || !dashboardData.trades) return;
    const trades = dashboardData.trades;
    const totalPages = Math.ceil(trades.length / TRADES_PER_PAGE);
    
    const startIdx = (currentPage - 1) * TRADES_PER_PAGE;
    const endIdx = Math.min(startIdx + TRADES_PER_PAGE, trades.length);
    const pageTrades = trades.slice(startIdx, endIdx);

    const tbody = document.getElementById('trades-body');
    if (tbody) {
        tbody.innerHTML = pageTrades.map(t => `
            <tr>
                <td>#${t.id}</td>
                <td>${t.en}</td>
                <td>${t.ex || '-'}</td>
                <td>₹${formatNum(t.ep, 2)}</td>
                <td>₹${formatNum(t.xp, 2)}</td>
                <td>${t.u}</td>
                <td><span class="tag-regime">${t.rg || 'Default'}</span></td>
                <td class="${t.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}">${t.pnl >= 0 ? '+' : ''}${formatINR(t.pnl)}</td>
                <td class="${t.pct >= 0 ? 'pnl-positive' : 'pnl-negative'}">${t.pct >= 0 ? '+' : ''}${formatNum(t.pct, 2)}%</td>
                <td>${formatINR(t.bal)}</td>
            </tr>
        `).join('');
    }

    // Pagination Controls
    const pagContainer = document.getElementById('pagination');
    if (pagContainer) {
        pagContainer.innerHTML = `
            <button id="btn-prev" ${currentPage <= 1 ? 'disabled' : ''}>&larr; Prev</button>
            <span class="page-indicator">Page ${currentPage} of ${totalPages}</span>
            <button id="btn-next" ${currentPage >= totalPages ? 'disabled' : ''}>Next &rarr;</button>
        `;

        document.getElementById('btn-prev')?.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTradesTable();
            }
        });

        document.getElementById('btn-next')?.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderTradesTable();
            }
        });
    }
}
