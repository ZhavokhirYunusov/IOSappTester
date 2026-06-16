const STORAGE_KEY = "expense-pwa-state-v2";
const LEGACY_STORAGE_KEY = "expense-pwa-state-v1";
const DEFAULT_BANK_BALANCE = 0;

const defaultCategories = [
  { id: crypto.randomUUID(), name: "Продукты", color: "#86a75c", icon: "П" },
  { id: crypto.randomUUID(), name: "Дом", color: "#b6a16e", icon: "Д" },
  { id: crypto.randomUUID(), name: "Кафе", color: "#df8052", icon: "К" },
  { id: crypto.randomUUID(), name: "Транспорт", color: "#64a69b", icon: "Т" },
  { id: crypto.randomUUID(), name: "Здоровье", color: "#d96b61", icon: "З" },
  { id: crypto.randomUUID(), name: "Другое", color: "#9b9488", icon: "•" }
];

const starterExpenses = [
  { title: "Супермаркет", amount: 642810, categoryName: "Продукты", dateOffset: 0 },
  { title: "Аренда", amount: 950000, categoryName: "Дом", dateOffset: -1 },
  { title: "Кофе", amount: 47500, categoryName: "Кафе", dateOffset: -1 },
  { title: "Такси", amount: 198770, categoryName: "Транспорт", dateOffset: -2 },
  { title: "Аптека", amount: 110450, categoryName: "Здоровье", dateOffset: -3 }
];

const state = loadState();
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  todayLabel: $("#todayLabel"),
  monthTotal: $("#monthTotal"),
  budgetLimit: $("#budgetLimit"),
  budgetRing: $("#budgetRing"),
  budgetPercent: $("#budgetPercent"),
  budgetBar: $("#budgetBar"),
  bankBalanceInput: $("#bankBalanceInput"),
  spentTotal: $("#spentTotal"),
  remainingTotal: $("#remainingTotal"),
  dailyAverage: $("#dailyAverage"),
  categoryCount: $("#categoryCount"),
  daysLeft: $("#daysLeft"),
  expenseForm: $("#expenseForm"),
  expenseTitle: $("#expenseTitle"),
  expenseAmount: $("#expenseAmount"),
  expenseDate: $("#expenseDate"),
  expenseCategory: $("#expenseCategory"),
  expenseList: $("#expenseList"),
  allExpenseList: $("#allExpenseList"),
  topCategories: $("#topCategories"),
  clearExpensesButton: $("#clearExpensesButton"),
  statsMonth: $("#statsMonth"),
  statsTotal: $("#statsTotal"),
  statsList: $("#statsList"),
  categoryForm: $("#categoryForm"),
  categoryName: $("#categoryName"),
  categoryColor: $("#categoryColor"),
  categoryList: $("#categoryList"),
  depositForm: $("#depositForm"),
  depositReport: $("#depositReport"),
  exportButton: $("#exportButton"),
  previewPrincipal: $("#previewPrincipal"),
  previewRate: $("#previewRate"),
  previewCompounding: $("#previewCompounding"),
  previewFinal: $("#previewFinal")
};

initialize();

function initialize() {
  const today = new Date();
  elements.todayLabel.textContent = today.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  elements.expenseDate.value = toDateInput(today);
  elements.statsMonth.value = toMonthInput(today);
  elements.budgetLimit.textContent = formatMoney(state.bankBalance ?? DEFAULT_BANK_BALANCE);

  $$(".tab").forEach((tab) => tab.addEventListener("click", () => showScreen(tab.dataset.screen)));
  $$("[data-screen-link]").forEach((button) => button.addEventListener("click", () => showScreen(button.dataset.screenLink)));

  elements.expenseForm.addEventListener("submit", addExpense);
  elements.categoryForm.addEventListener("submit", addCategory);
  elements.depositForm.addEventListener("submit", calculateDepositFromForm);
  elements.statsMonth.addEventListener("change", renderStats);
  elements.clearExpensesButton.addEventListener("click", clearExpenses);
  elements.exportButton.addEventListener("click", exportData);
  elements.bankBalanceInput.addEventListener("input", updateBankBalance);
  elements.bankBalanceInput.addEventListener("change", updateBankBalance);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
  }

  renderAll();
  calculateDepositFromForm();
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const categories = normalizeCategories(parsed.categories?.length ? parsed.categories : defaultCategories);
      const expenses = Array.isArray(parsed.expenses) ? parsed.expenses : seedExpenses(categories);
      const bankBalance = Number(parsed.bankBalance ?? DEFAULT_BANK_BALANCE);
      return { categories, expenses, bankBalance };
    } catch {
      return { categories: defaultCategories, expenses: seedExpenses(defaultCategories), bankBalance: DEFAULT_BANK_BALANCE };
    }
  }

  return { categories: defaultCategories, expenses: seedExpenses(defaultCategories), bankBalance: DEFAULT_BANK_BALANCE };
}

function normalizeCategories(categories) {
  return categories.map((category) => ({
    id: category.id ?? crypto.randomUUID(),
    name: category.name ?? "Категория",
    color: category.color ?? "#86a75c",
    icon: category.icon ?? String(category.name ?? "К").slice(0, 1).toUpperCase()
  }));
}

function seedExpenses(categories) {
  const today = new Date();
  return starterExpenses.map((expense) => {
    const date = new Date(today);
    date.setDate(date.getDate() + expense.dateOffset);
    const category = categories.find((item) => item.name === expense.categoryName) ?? categories[0];
    return {
      id: crypto.randomUUID(),
      title: expense.title,
      amount: expense.amount,
      categoryId: category.id,
      categoryName: category.name,
      date: toDateInput(date),
      createdAt: date.toISOString()
    };
  });
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderAll() {
  renderCategoryOptions();
  renderDashboard();
  renderExpenses();
  renderStats();
  renderCategories();
}

function showScreen(screenId) {
  $$(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === screenId));
  $$(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.screen === screenId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function addExpense(event) {
  event.preventDefault();
  const title = elements.expenseTitle.value.trim();
  const amount = Number(elements.expenseAmount.value);
  const category = state.categories.find((item) => item.id === elements.expenseCategory.value) ?? state.categories[0];
  if (!title || !amount || amount <= 0 || !category) return;

  state.expenses.unshift({
    id: crypto.randomUUID(),
    title,
    amount,
    categoryId: category.id,
    categoryName: category.name,
    date: elements.expenseDate.value || toDateInput(new Date()),
    createdAt: new Date().toISOString()
  });

  elements.expenseForm.reset();
  elements.expenseDate.value = toDateInput(new Date());
  saveState();
  renderAll();
}

function clearExpenses() {
  if (state.expenses.length && confirm("Удалить все расходы?")) {
    state.expenses = [];
    saveState();
    renderAll();
  }
}

function deleteExpense(id) {
  state.expenses = state.expenses.filter((expense) => expense.id !== id);
  saveState();
  renderAll();
}

function updateBankBalance() {
  state.bankBalance = Math.max(0, Number(elements.bankBalanceInput.value) || 0);
  saveState();
  renderDashboard();
}

function addCategory(event) {
  event.preventDefault();
  const name = elements.categoryName.value.trim();
  if (!name) return;
  state.categories.push({ id: crypto.randomUUID(), name, color: elements.categoryColor.value, icon: name.slice(0, 1).toUpperCase() });
  elements.categoryForm.reset();
  elements.categoryColor.value = "#8a7a42";
  saveState();
  renderAll();
}

function deleteCategory(id) {
  if (state.categories.length <= 1) {
    alert("Нужна хотя бы одна категория.");
    return;
  }
  const fallback = state.categories.find((category) => category.id !== id);
  state.expenses = state.expenses.map((expense) => expense.categoryId === id
    ? { ...expense, categoryId: fallback.id, categoryName: fallback.name }
    : expense
  );
  state.categories = state.categories.filter((category) => category.id !== id);
  saveState();
  renderAll();
}

function renderCategoryOptions() {
  elements.expenseCategory.innerHTML = state.categories
    .map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`)
    .join("");
}

function renderDashboard() {
  const currentMonth = toMonthInput(new Date());
  const monthExpenses = state.expenses.filter((expense) => expense.date.startsWith(currentMonth));
  const monthTotal = sum(monthExpenses.map((expense) => expense.amount));
  const bankBalance = state.bankBalance ?? DEFAULT_BANK_BALANCE;
  const used = bankBalance > 0 ? Math.min(100, Math.round((monthTotal / bankBalance) * 100)) : 0;
  const dailyAverage = monthExpenses.length ? monthTotal / Math.max(1, new Date().getDate()) : 0;

  if (document.activeElement !== elements.bankBalanceInput) {
    elements.bankBalanceInput.value = String(bankBalance);
  }
  elements.budgetLimit.textContent = formatMoney(bankBalance);
  elements.monthTotal.textContent = formatMoney(monthTotal);
  elements.spentTotal.textContent = formatMoney(monthTotal);
  elements.remainingTotal.textContent = formatMoney(Math.max(0, bankBalance - monthTotal));
  elements.budgetPercent.textContent = `${used}%`;
  elements.budgetRing.style.setProperty("--value", used);
  elements.budgetBar.style.width = `${used}%`;
  elements.dailyAverage.textContent = formatMoney(dailyAverage);
  elements.categoryCount.textContent = String(state.categories.length);
  elements.daysLeft.textContent = `${daysLeftInMonth()} дн.`;
  renderTopCategories(monthExpenses, monthTotal);
}

function renderTopCategories(monthExpenses, monthTotal) {
  const categoryTotals = getCategoryTotals(monthExpenses).slice(0, 6);
  if (!categoryTotals.length) {
    elements.topCategories.innerHTML = `<div class="empty-state">Категории появятся после первой траты.</div>`;
    return;
  }
  elements.topCategories.innerHTML = categoryTotals.map((category) => {
    const percent = monthTotal ? Math.round((category.total / monthTotal) * 100) : 0;
    return `
      <article class="category-chip">
        <span class="chip-icon" style="background:${tint(category.color)}; color:${category.color}">${escapeHtml(category.icon ?? category.name[0])}</span>
        <strong>${escapeHtml(category.name)}</strong>
        <span>${formatMoney(category.total)}</span>
        <span>${percent}%</span>
      </article>
    `;
  }).join("");
}

function renderExpenses() {
  const rows = state.expenses.map(expenseRowHtml).join("");
  elements.expenseList.innerHTML = rows || `<div class="empty-state">Пока нет расходов. Добавьте первую трату выше.</div>`;
  elements.allExpenseList.innerHTML = rows || `<div class="empty-state">Пока нет расходов.</div>`;
  $$("[data-delete-expense]").forEach((button) => button.addEventListener("click", () => deleteExpense(button.dataset.deleteExpense)));
}

function expenseRowHtml(expense) {
  const category = state.categories.find((item) => item.id === expense.categoryId);
  const color = category?.color ?? "#2f7f4f";
  const icon = category?.icon ?? expense.categoryName?.[0] ?? "•";
  return `
    <article class="transaction-row">
      <span class="row-icon" style="background:${tint(color)}; color:${color}">${escapeHtml(icon)}</span>
      <div>
        <div class="row-title">${escapeHtml(expense.title)}</div>
        <div class="row-subtitle">${escapeHtml(expense.categoryName)} · ${formatDate(expense.date)}</div>
      </div>
      <div>
        <div class="amount">-${formatMoney(expense.amount)}</div>
        <button class="danger-button" type="button" data-delete-expense="${expense.id}">Удалить</button>
      </div>
    </article>
  `;
}

function renderStats() {
  const selectedMonth = elements.statsMonth.value || toMonthInput(new Date());
  const monthExpenses = state.expenses.filter((expense) => expense.date.startsWith(selectedMonth));
  const total = sum(monthExpenses.map((expense) => expense.amount));
  elements.statsTotal.textContent = formatMoney(total);

  const categoryTotals = getCategoryTotals(monthExpenses);
  elements.statsList.innerHTML = categoryTotals.length
    ? categoryTotals.map((category) => {
      const percent = total ? (category.total / total) * 100 : 0;
      return `
        <article class="stat-row">
          <span class="row-icon" style="background:${tint(category.color)}; color:${category.color}">${escapeHtml(category.icon ?? category.name[0])}</span>
          <div>
            <div class="row-title">${escapeHtml(category.name)}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${percent}%; background:${category.color}"></div></div>
          </div>
          <div class="amount">${formatMoney(category.total)}<div class="row-subtitle">${percent.toFixed(1)}%</div></div>
        </article>
      `;
    }).join("")
    : `<div class="empty-state">За выбранный месяц расходов пока нет.</div>`;
}

function renderCategories() {
  elements.categoryList.innerHTML = state.categories.map((category) => `
    <article class="transaction-row">
      <span class="row-icon" style="background:${tint(category.color)}; color:${category.color}">${escapeHtml(category.icon ?? category.name[0])}</span>
      <div>
        <div class="row-title">${escapeHtml(category.name)}</div>
        <div class="row-subtitle">${state.expenses.filter((expense) => expense.categoryId === category.id).length} трат</div>
      </div>
      <button class="danger-button" type="button" data-delete-category="${category.id}">Удалить</button>
    </article>
  `).join("");
  $$("[data-delete-category]").forEach((button) => button.addEventListener("click", () => deleteCategory(button.dataset.deleteCategory)));
}

function getCategoryTotals(expenses) {
  return state.categories
    .map((category) => ({
      ...category,
      total: sum(expenses.filter((expense) => expense.categoryId === category.id).map((expense) => expense.amount))
    }))
    .filter((category) => category.total > 0)
    .sort((a, b) => b.total - a.total);
}

function calculateDepositFromForm(event) {
  event?.preventDefault();
  const report = calculateDeposit({
    initial: numberValue("#depositInitial"),
    monthly: numberValue("#depositMonthly"),
    monthlyRate: numberValue("#depositRate"),
    termMonths: numberValue("#termMonths"),
  });
  renderDepositReport(report);
  elements.previewPrincipal.textContent = formatShort(numberValue("#depositInitial"));
  elements.previewRate.textContent = `${numberValue("#depositRate")}%`;
  elements.previewCompounding.textContent = "Ежемесячно";
  elements.previewFinal.textContent = formatMoney(report.finalBalance);
}

function calculateDeposit({ initial, monthly, monthlyRate, termMonths }) {
  const months = Math.max(1, Math.floor(termMonths || 1));
  const rate = Math.max(0, monthlyRate) / 100;
  let balance = Math.max(0, initial);
  let totalInterest = 0;
  const rows = [];

  for (let month = 1; month <= months; month += 1) {
    const balanceBefore = balance;
    const contribution = month === 1 ? 0 : Math.max(0, monthly);
    balance += contribution;
    const interest = balance * rate;
    balance += interest;
    totalInterest += interest;
    rows.push({ monthIndex: month, balanceBefore, contribution, interest, endingBalance: balance });
  }

  return {
    invested: Math.max(0, initial) + Math.max(0, monthly) * (months - 1),
    totalInterest,
    finalBalance: balance,
    rows
  };
}

function renderDepositReport(report) {
  elements.depositReport.innerHTML = `
    <div class="report-grid">
      <div class="metric highlight"><span>Итого к концу срока</span><strong>${formatMoney(report.finalBalance)}</strong></div>
      <div class="metric"><span>Вложено всего</span><strong>${formatMoney(report.invested)}</strong></div>
      <div class="metric"><span>Доход, проценты</span><strong>${formatMoney(report.totalInterest)}</strong></div>
    </div>
    <div class="table-wrap">
      <div class="table-title">По месяцам</div>
      <table class="deposit-table">
        <thead>
          <tr>
            <th>Месяц</th>
            <th>Баланс до</th>
            <th>+Пополн.</th>
            <th>Проценты</th>
            <th>Баланс после</th>
          </tr>
        </thead>
        <tbody>
          ${report.rows.map((row) => `
            <tr>
              <td>${row.monthIndex}</td>
              <td>${formatShort(row.balanceBefore)}</td>
              <td>${row.contribution > 0 ? `+${formatShort(row.contribution)}` : "—"}</td>
              <td class="td-profit">+${formatShort(row.interest)}</td>
              <td class="td-total">${formatShort(row.endingBalance)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function exportData() {
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `finance-backup-${toDateInput(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function numberValue(selector) {
  return Number($(selector).value) || 0;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function formatShort(value) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value || 0);
}

function formatMoney(value) {
  return `${formatShort(value)} сум`;
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function toDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function toMonthInput(date) {
  return date.toISOString().slice(0, 7);
}

function daysLeftInMonth() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
}

function tint(color) {
  return `${color || "#2f7f4f"}22`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
