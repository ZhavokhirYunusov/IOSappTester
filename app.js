const STORAGE_KEY = "expense-pwa-state-v1";

const defaultCategories = [
  { id: crypto.randomUUID(), name: "Продукты", color: "#0f766e" },
  { id: crypto.randomUUID(), name: "Транспорт", color: "#2563eb" },
  { id: crypto.randomUUID(), name: "Дом", color: "#7c3aed" },
  { id: crypto.randomUUID(), name: "Кафе", color: "#c2410c" },
  { id: crypto.randomUUID(), name: "Здоровье", color: "#be123c" },
  { id: crypto.randomUUID(), name: "Другое", color: "#475569" }
];

const state = loadState();

const elements = {
  todayLabel: document.querySelector("#todayLabel"),
  monthTotal: document.querySelector("#monthTotal"),
  expenseCount: document.querySelector("#expenseCount"),
  expenseForm: document.querySelector("#expenseForm"),
  expenseTitle: document.querySelector("#expenseTitle"),
  expenseAmount: document.querySelector("#expenseAmount"),
  expenseDate: document.querySelector("#expenseDate"),
  expenseCategory: document.querySelector("#expenseCategory"),
  expenseList: document.querySelector("#expenseList"),
  clearExpensesButton: document.querySelector("#clearExpensesButton"),
  statsMonth: document.querySelector("#statsMonth"),
  statsTotal: document.querySelector("#statsTotal"),
  statsList: document.querySelector("#statsList"),
  categoryForm: document.querySelector("#categoryForm"),
  categoryName: document.querySelector("#categoryName"),
  categoryColor: document.querySelector("#categoryColor"),
  categoryList: document.querySelector("#categoryList"),
  depositForm: document.querySelector("#depositForm"),
  depositReport: document.querySelector("#depositReport"),
  exportButton: document.querySelector("#exportButton")
};

initialize();

function initialize() {
  const today = new Date();
  elements.todayLabel.textContent = today.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long"
  });
  elements.expenseDate.value = toDateInput(today);
  elements.statsMonth.value = toMonthInput(today);

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => showScreen(tab.dataset.screen));
  });

  elements.expenseForm.addEventListener("submit", addExpense);
  elements.categoryForm.addEventListener("submit", addCategory);
  elements.depositForm.addEventListener("submit", calculateDepositFromForm);
  elements.statsMonth.addEventListener("change", renderStats);
  elements.clearExpensesButton.addEventListener("click", clearExpenses);
  elements.exportButton.addEventListener("click", exportData);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
  }

  renderAll();
  calculateDepositFromForm();
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return { categories: defaultCategories, expenses: [] };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      categories: parsed.categories?.length ? parsed.categories : defaultCategories,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : []
    };
  } catch {
    return { categories: defaultCategories, expenses: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderAll() {
  renderCategoryOptions();
  renderExpenses();
  renderStats();
  renderCategories();
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.id === screenId);
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.screen === screenId);
  });
}

function addExpense(event) {
  event.preventDefault();

  const title = elements.expenseTitle.value.trim();
  const amount = Number(elements.expenseAmount.value);
  const categoryId = elements.expenseCategory.value;
  const category = state.categories.find((item) => item.id === categoryId) ?? state.categories[0];

  if (!title || !amount || amount <= 0 || !category) {
    return;
  }

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
  if (!state.expenses.length) {
    return;
  }

  if (confirm("Удалить все траты?")) {
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

function addCategory(event) {
  event.preventDefault();

  const name = elements.categoryName.value.trim();
  if (!name) {
    return;
  }

  state.categories.push({
    id: crypto.randomUUID(),
    name,
    color: elements.categoryColor.value
  });

  elements.categoryForm.reset();
  elements.categoryColor.value = "#0f766e";
  saveState();
  renderAll();
}

function deleteCategory(id) {
  if (state.categories.length <= 1) {
    alert("Нужна хотя бы одна категория.");
    return;
  }

  const fallback = state.categories.find((category) => category.id !== id);
  state.expenses = state.expenses.map((expense) => {
    if (expense.categoryId !== id) {
      return expense;
    }
    return {
      ...expense,
      categoryId: fallback.id,
      categoryName: fallback.name
    };
  });
  state.categories = state.categories.filter((category) => category.id !== id);
  saveState();
  renderAll();
}

function renderCategoryOptions() {
  elements.expenseCategory.innerHTML = state.categories
    .map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`)
    .join("");
}

function renderExpenses() {
  const currentMonth = toMonthInput(new Date());
  const monthExpenses = state.expenses.filter((expense) => expense.date.startsWith(currentMonth));
  const monthTotal = sum(monthExpenses.map((expense) => expense.amount));

  elements.monthTotal.textContent = formatMoney(monthTotal);
  elements.expenseCount.textContent = String(state.expenses.length);

  if (!state.expenses.length) {
    elements.expenseList.innerHTML = `<div class="empty-state">Пока нет расходов. Добавьте первую трату выше.</div>`;
    return;
  }

  elements.expenseList.innerHTML = state.expenses
    .map((expense) => {
      const category = state.categories.find((item) => item.id === expense.categoryId);
      return `
        <article class="row">
          <span class="color-dot" style="background:${category?.color ?? "#475569"}"></span>
          <div>
            <p class="row-title">${escapeHtml(expense.title)}</p>
            <p class="row-subtitle">${escapeHtml(expense.categoryName)} · ${formatDate(expense.date)}</p>
          </div>
          <div>
            <div class="amount">${formatMoney(expense.amount)}</div>
            <button class="danger-button" type="button" data-delete-expense="${expense.id}">Удалить</button>
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll("[data-delete-expense]").forEach((button) => {
    button.addEventListener("click", () => deleteExpense(button.dataset.deleteExpense));
  });
}

function renderStats() {
  const selectedMonth = elements.statsMonth.value || toMonthInput(new Date());
  const monthExpenses = state.expenses.filter((expense) => expense.date.startsWith(selectedMonth));
  const total = sum(monthExpenses.map((expense) => expense.amount));

  elements.statsTotal.textContent = formatMoney(total);

  if (!monthExpenses.length) {
    elements.statsList.innerHTML = `<div class="empty-state">За выбранный месяц пока нет расходов.</div>`;
    return;
  }

  const categoryTotals = state.categories
    .map((category) => {
      const categoryExpenses = monthExpenses.filter((expense) => expense.categoryId === category.id);
      return {
        ...category,
        total: sum(categoryExpenses.map((expense) => expense.amount))
      };
    })
    .filter((category) => category.total > 0)
    .sort((a, b) => b.total - a.total);

  elements.statsList.innerHTML = categoryTotals
    .map((category) => {
      const percent = total ? (category.total / total) * 100 : 0;
      return `
        <article class="report-row">
          <header>
            <strong>${escapeHtml(category.name)}</strong>
            <strong>${formatMoney(category.total)}</strong>
          </header>
          <div class="bar-track">
            <div class="bar-fill" style="width:${percent}%; background:${category.color}"></div>
          </div>
          <footer>
            <span>${percent.toFixed(1)}%</span>
          </footer>
        </article>
      `;
    })
    .join("");
}

function renderCategories() {
  elements.categoryList.innerHTML = state.categories
    .map(
      (category) => `
        <article class="row">
          <span class="color-dot" style="background:${category.color}"></span>
          <div>
            <p class="row-title">${escapeHtml(category.name)}</p>
            <p class="row-subtitle">${state.expenses.filter((expense) => expense.categoryId === category.id).length} трат</p>
          </div>
          <button class="danger-button" type="button" data-delete-category="${category.id}">Удалить</button>
        </article>
      `
    )
    .join("");

  document.querySelectorAll("[data-delete-category]").forEach((button) => {
    button.addEventListener("click", () => deleteCategory(button.dataset.deleteCategory));
  });
}

function calculateDepositFromForm(event) {
  event?.preventDefault();

  const report = calculateDeposit({
    principal: numberValue("#principal"),
    annualRate: numberValue("#annualRate"),
    termMonths: numberValue("#termYears") * 12 + numberValue("#termMonths"),
    compoundingMode: document.querySelector("#compoundingMode").value,
    contributionAmount: numberValue("#contributionAmount"),
    contributionFrequency: document.querySelector("#contributionFrequency").value
  });

  renderDepositReport(report);
}

function calculateDeposit({ principal, annualRate, termMonths, compoundingMode, contributionAmount, contributionFrequency }) {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + Math.max(1, termMonths));

  let date = new Date(startDate);
  let dayIndex = 0;
  let balance = Math.max(0, principal);
  let pendingMonthlyInterest = 0;
  let totalContributions = 0;
  let totalInterest = 0;
  let monthContributions = 0;
  let monthInterest = 0;
  let monthIndex = 1;
  const rows = [];
  const dailyRate = annualRate / 100 / 365;

  while (date < endDate) {
    if (shouldContribute(date, dayIndex, startDate, contributionFrequency) && contributionAmount > 0) {
      balance += contributionAmount;
      totalContributions += contributionAmount;
      monthContributions += contributionAmount;
    }

    const dailyInterest = balance * dailyRate;
    if (compoundingMode === "daily") {
      balance += dailyInterest;
      totalInterest += dailyInterest;
      monthInterest += dailyInterest;
    } else {
      pendingMonthlyInterest += dailyInterest;
    }

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const didFinishMonth = date.getMonth() !== nextDate.getMonth();
    const didFinishTerm = nextDate >= endDate;

    if (compoundingMode === "monthly" && (didFinishMonth || didFinishTerm)) {
      balance += pendingMonthlyInterest;
      totalInterest += pendingMonthlyInterest;
      monthInterest += pendingMonthlyInterest;
      pendingMonthlyInterest = 0;
    }

    if (didFinishMonth || didFinishTerm) {
      rows.push({
        monthIndex,
        contributions: monthContributions,
        interest: monthInterest,
        endingBalance: balance
      });
      monthIndex += 1;
      monthContributions = 0;
      monthInterest = 0;
    }

    date = nextDate;
    dayIndex += 1;
  }

  return {
    principal,
    totalContributions,
    totalInterest,
    finalBalance: balance,
    rows
  };
}

function shouldContribute(date, dayIndex, startDate, frequency) {
  if (frequency === "none") return false;
  if (frequency === "daily") return true;
  if (frequency === "biweekly") return dayIndex > 0 && dayIndex % 14 === 0;
  if (frequency === "monthly") return dayIndex > 0 && date.getDate() === startDate.getDate();
  return false;
}

function renderDepositReport(report) {
  elements.depositReport.innerHTML = `
    <div class="report-grid">
      <div class="metric">
        <span>Финальная сумма</span>
        <strong>${formatMoney(report.finalBalance)}</strong>
      </div>
      <div class="metric">
        <span>Пополнения</span>
        <strong>${formatMoney(report.totalContributions)}</strong>
      </div>
      <div class="metric">
        <span>Проценты</span>
        <strong>${formatMoney(report.totalInterest)}</strong>
      </div>
    </div>
    ${report.rows
      .map(
        (row) => `
          <article class="report-row">
            <header>
              <strong>Месяц ${row.monthIndex}</strong>
              <strong>${formatMoney(row.endingBalance)}</strong>
            </header>
            <footer>
              <span>Пополнения: ${formatMoney(row.contributions)}</span>
              <span>Проценты: ${formatMoney(row.interest)}</span>
            </footer>
          </article>
        `
      )
      .join("")}
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
  return Number(document.querySelector(selector).value) || 0;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function formatMoney(value) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0) + " сум";
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short"
  });
}

function toDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function toMonthInput(date) {
  return date.toISOString().slice(0, 7);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
