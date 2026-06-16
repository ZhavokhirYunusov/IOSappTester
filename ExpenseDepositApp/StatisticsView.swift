import SwiftData
import SwiftUI

struct StatisticsView: View {
    @Query(sort: \ExpenseItem.spentAt, order: .reverse) private var expenses: [ExpenseItem]
    @State private var selectedDate = Date()

    private var monthExpenses: [ExpenseItem] {
        expenses.filter {
            Calendar.current.isDate($0.spentAt, equalTo: selectedDate, toGranularity: .month) &&
            Calendar.current.isDate($0.spentAt, equalTo: selectedDate, toGranularity: .year)
        }
    }

    private var total: Double {
        monthExpenses.reduce(0) { $0 + $1.amount }
    }

    private var categoryTotals: [(name: String, total: Double)] {
        Dictionary(grouping: monthExpenses, by: \.categoryName)
            .map { ($0.key, $0.value.reduce(0) { $0 + $1.amount }) }
            .sorted { $0.total > $1.total }
    }

    var body: some View {
        List {
            Section {
                DatePicker("Месяц", selection: $selectedDate, displayedComponents: [.date])
                VStack(alignment: .leading, spacing: 8) {
                    Text("Итого")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text(total.moneyText)
                        .font(.system(.largeTitle, design: .rounded, weight: .bold))
                }
                .padding(.vertical, 8)
            }

            Section("По категориям") {
                if categoryTotals.isEmpty {
                    ContentUnavailableView("Нет данных", systemImage: "chart.pie", description: Text("За выбранный месяц трат пока нет."))
                } else {
                    ForEach(categoryTotals, id: \.name) { item in
                        CategoryStatRow(name: item.name, amount: item.total, total: total)
                    }
                }
            }
        }
        .navigationTitle("Статистика")
    }
}

private struct CategoryStatRow: View {
    let name: String
    let amount: Double
    let total: Double

    private var share: Double {
        guard total > 0 else { return 0 }
        return amount / total
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(name)
                    .font(.headline)
                Spacer()
                Text(amount.moneyText)
                    .font(.headline)
            }

            ProgressView(value: share)
                .tint(.accentColor)

            Text(share.formatted(.percent.precision(.fractionLength(1))))
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}
