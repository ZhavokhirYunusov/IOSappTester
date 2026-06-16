import SwiftUI

struct DepositCalculatorView: View {
    @State private var principal = 10_000.0
    @State private var annualRate = 18.0
    @State private var termYears = 1
    @State private var termMonths = 0
    @State private var compoundingMode: CompoundingMode = .daily
    @State private var contributionAmount = 0.0
    @State private var contributionFrequency: ContributionFrequency = .monthly
    @State private var report: DepositReport?

    var body: some View {
        List {
            Section("Параметры вклада") {
                TextField("Начальная сумма", value: $principal, format: .number)
                    .keyboardType(.decimalPad)
                TextField("Годовая ставка, %", value: $annualRate, format: .number)
                    .keyboardType(.decimalPad)
                Stepper("Срок: \(termYears) лет", value: $termYears, in: 0...40)
                Stepper("Дополнительно: \(termMonths) мес.", value: $termMonths, in: 0...11)
            }

            Section("Капитализация") {
                Picker("Режим", selection: $compoundingMode) {
                    ForEach(CompoundingMode.allCases) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
            }

            Section("Пополнения") {
                TextField("Сумма пополнения", value: $contributionAmount, format: .number)
                    .keyboardType(.decimalPad)
                Picker("Периодичность", selection: $contributionFrequency) {
                    ForEach(ContributionFrequency.allCases) { frequency in
                        Text(frequency.title).tag(frequency)
                    }
                }
            }

            Section {
                Button {
                    report = DepositCalculator.calculate(
                        principal: principal,
                        annualRate: annualRate,
                        termMonths: termYears * 12 + termMonths,
                        compoundingMode: compoundingMode,
                        contributionAmount: contributionAmount,
                        contributionFrequency: contributionFrequency
                    )
                } label: {
                    Label("Рассчитать план", systemImage: "function")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(principal < 0 || annualRate < 0 || (termYears == 0 && termMonths == 0))
            }

            if let report {
                DepositReportView(report: report)
            }
        }
        .navigationTitle("Калькулятор вклада")
        .onAppear {
            if report == nil {
                report = DepositCalculator.calculate(
                    principal: principal,
                    annualRate: annualRate,
                    termMonths: termYears * 12 + termMonths,
                    compoundingMode: compoundingMode,
                    contributionAmount: contributionAmount,
                    contributionFrequency: contributionFrequency
                )
            }
        }
    }
}

enum CompoundingMode: String, CaseIterable, Identifiable {
    case daily
    case monthly

    var id: String { rawValue }

    var title: String {
        switch self {
        case .daily:
            return "Дневная"
        case .monthly:
            return "Месячная"
        }
    }
}

enum ContributionFrequency: String, CaseIterable, Identifiable {
    case none
    case daily
    case biweekly
    case monthly

    var id: String { rawValue }

    var title: String {
        switch self {
        case .none:
            return "Без пополнений"
        case .daily:
            return "Каждый день"
        case .biweekly:
            return "Каждые 2 недели"
        case .monthly:
            return "Каждый месяц"
        }
    }
}

struct DepositReport {
    let principal: Double
    let totalContributions: Double
    let totalInterest: Double
    let finalBalance: Double
    let rows: [DepositReportRow]
}

struct DepositReportRow: Identifiable {
    let id = UUID()
    let monthIndex: Int
    let contributions: Double
    let interest: Double
    let endingBalance: Double
}

enum DepositCalculator {
    static func calculate(
        principal: Double,
        annualRate: Double,
        termMonths: Int,
        compoundingMode: CompoundingMode,
        contributionAmount: Double,
        contributionFrequency: ContributionFrequency
    ) -> DepositReport {
        let calendar = Calendar.current
        let startDate = calendar.startOfDay(for: Date())
        let endDate = calendar.date(byAdding: .month, value: max(termMonths, 1), to: startDate) ?? startDate
        let dailyRate = annualRate / 100 / 365

        var date = startDate
        var dayIndex = 0
        var balance = max(principal, 0)
        var pendingMonthlyInterest = 0.0
        var totalContributions = 0.0
        var totalInterest = 0.0
        var monthRows: [DepositReportRow] = []
        var monthIndex = 1
        var monthContributions = 0.0
        var monthInterest = 0.0

        while date < endDate {
            if shouldAddContribution(on: date, dayIndex: dayIndex, calendar: calendar, startDate: startDate, frequency: contributionFrequency), contributionAmount > 0 {
                balance += contributionAmount
                totalContributions += contributionAmount
                monthContributions += contributionAmount
            }

            let dailyInterest = balance * dailyRate

            switch compoundingMode {
            case .daily:
                balance += dailyInterest
                totalInterest += dailyInterest
                monthInterest += dailyInterest
            case .monthly:
                pendingMonthlyInterest += dailyInterest
            }

            let nextDate = calendar.date(byAdding: .day, value: 1, to: date) ?? endDate
            let didFinishMonth = !calendar.isDate(date, equalTo: nextDate, toGranularity: .month)
            let didFinishTerm = nextDate >= endDate

            if compoundingMode == .monthly && (didFinishMonth || didFinishTerm) {
                balance += pendingMonthlyInterest
                totalInterest += pendingMonthlyInterest
                monthInterest += pendingMonthlyInterest
                pendingMonthlyInterest = 0
            }

            if didFinishMonth || didFinishTerm {
                monthRows.append(
                    DepositReportRow(
                        monthIndex: monthIndex,
                        contributions: monthContributions,
                        interest: monthInterest,
                        endingBalance: balance
                    )
                )
                monthIndex += 1
                monthContributions = 0
                monthInterest = 0
            }

            date = nextDate
            dayIndex += 1
        }

        return DepositReport(
            principal: principal,
            totalContributions: totalContributions,
            totalInterest: totalInterest,
            finalBalance: balance,
            rows: monthRows
        )
    }

    private static func shouldAddContribution(
        on date: Date,
        dayIndex: Int,
        calendar: Calendar,
        startDate: Date,
        frequency: ContributionFrequency
    ) -> Bool {
        switch frequency {
        case .none:
            false
        case .daily:
            true
        case .biweekly:
            dayIndex > 0 && dayIndex % 14 == 0
        case .monthly:
            dayIndex > 0 && calendar.component(.day, from: date) == calendar.component(.day, from: startDate)
        }
    }
}

private struct DepositReportView: View {
    let report: DepositReport

    var body: some View {
        Section("Итог") {
            ReportMetric(title: "Финальная сумма", value: report.finalBalance.moneyText, systemImage: "banknote")
            ReportMetric(title: "Внесено дополнительно", value: report.totalContributions.moneyText, systemImage: "plus.circle")
            ReportMetric(title: "Начисленные проценты", value: report.totalInterest.moneyText, systemImage: "percent")
        }

        Section("План по месяцам") {
            ForEach(report.rows) { row in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Месяц \(row.monthIndex)")
                            .font(.headline)
                        Spacer()
                        Text(row.endingBalance.moneyText)
                            .font(.headline)
                    }

                    HStack {
                        Label(row.contributions.moneyText, systemImage: "plus")
                        Spacer()
                        Label(row.interest.moneyText, systemImage: "percent")
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)
            }
        }
    }
}

private struct ReportMetric: View {
    let title: String
    let value: String
    let systemImage: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .frame(width: 28, height: 28)
                .foregroundStyle(.accentColor)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text(value)
                    .font(.headline)
            }
        }
    }
}
