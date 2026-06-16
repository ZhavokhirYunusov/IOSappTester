import SwiftData
import SwiftUI

struct ExpensesView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \ExpenseItem.spentAt, order: .reverse) private var expenses: [ExpenseItem]
    @Query(sort: \ExpenseCategory.name) private var categories: [ExpenseCategory]
    @State private var presentedSheet: ExpenseSheet?

    var monthTotal: Double {
        expenses
            .filter { Calendar.current.isDateInCurrentMonth($0.spentAt) }
            .reduce(0) { $0 + $1.amount }
    }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Расходы за месяц")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text(monthTotal.moneyText)
                        .font(.system(.largeTitle, design: .rounded, weight: .bold))
                    Text("\(expenses.count) записей всего")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 8)
            }

            Section("Последние траты") {
                if expenses.isEmpty {
                    ContentUnavailableView("Пока нет трат", systemImage: "tray", description: Text("Добавьте первую трату кнопкой плюс."))
                } else {
                    ForEach(expenses) { expense in
                        ExpenseRow(expense: expense, category: categories.first { $0.name == expense.categoryName })
                    }
                    .onDelete(perform: deleteExpenses)
                }
            }
        }
        .navigationTitle("Учет расходов")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    presentedSheet = .categories
                } label: {
                    Label("Категории", systemImage: "tag")
                }
            }

            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    presentedSheet = .addExpense
                } label: {
                    Label("Добавить", systemImage: "plus")
                }
            }
        }
        .sheet(item: $presentedSheet) { sheet in
            NavigationStack {
                switch sheet {
                case .addExpense:
                    AddExpenseView()
                case .categories:
                    CategoriesView()
                }
            }
        }
    }

    private func deleteExpenses(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(expenses[index])
        }
    }
}

private enum ExpenseSheet: Identifiable {
    case addExpense
    case categories

    var id: String {
        switch self {
        case .addExpense:
            return "addExpense"
        case .categories:
            return "categories"
        }
    }
}

private struct ExpenseRow: View {
    let expense: ExpenseItem
    let category: ExpenseCategory?

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color(hex: category?.colorHex ?? "4A5568").opacity(0.16))
                Image(systemName: category?.symbolName ?? "tag")
                    .foregroundStyle(Color(hex: category?.colorHex ?? "4A5568"))
            }
            .frame(width: 42, height: 42)

            VStack(alignment: .leading, spacing: 4) {
                Text(expense.title)
                    .font(.headline)
                Text(expense.categoryName)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(expense.amount.moneyText)
                    .font(.headline)
                Text(expense.spentAt, style: .date)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

struct AddExpenseView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \ExpenseCategory.name) private var categories: [ExpenseCategory]

    @State private var title = ""
    @State private var amount = 0.0
    @State private var selectedCategoryName = ""
    @State private var spentAt = Date()
    @State private var note = ""

    var body: some View {
        Form {
            Section("Трата") {
                TextField("Название", text: $title)
                TextField("Сумма", value: $amount, format: .number)
                    .keyboardType(.decimalPad)
                DatePicker("Дата", selection: $spentAt, displayedComponents: .date)
            }

            Section("Категория") {
                Picker("Категория", selection: $selectedCategoryName) {
                    ForEach(categories) { category in
                        Label(category.name, systemImage: category.symbolName)
                            .tag(category.name)
                    }
                }
            }

            Section("Заметка") {
                TextField("Необязательно", text: $note, axis: .vertical)
                    .lineLimit(2...4)
            }
        }
        .navigationTitle("Новая трата")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Отмена") {
                    dismiss()
                }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Сохранить") {
                    save()
                }
                .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || amount <= 0 || selectedCategoryName.isEmpty)
            }
        }
        .onAppear {
            if selectedCategoryName.isEmpty {
                selectedCategoryName = categories.first?.name ?? ""
            }
        }
    }

    private func save() {
        modelContext.insert(
            ExpenseItem(
                title: title.trimmingCharacters(in: .whitespacesAndNewlines),
                amount: amount,
                categoryName: selectedCategoryName,
                spentAt: spentAt,
                note: note.trimmingCharacters(in: .whitespacesAndNewlines)
            )
        )
        dismiss()
    }
}

struct CategoriesView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \ExpenseCategory.name) private var categories: [ExpenseCategory]
    @State private var newName = ""
    @State private var selectedSymbol = "tag"
    @State private var selectedColor = "2F855A"

    private let symbols = ["tag", "cart", "car", "house", "cup.and.saucer", "cross.case", "gift", "airplane", "gamecontroller", "square.grid.2x2"]
    private let colors = ["2F855A", "2B6CB0", "805AD5", "C05621", "C53030", "D69E2E", "319795", "4A5568"]

    var body: some View {
        List {
            Section("Новая категория") {
                TextField("Название", text: $newName)

                Picker("Иконка", selection: $selectedSymbol) {
                    ForEach(symbols, id: \.self) { symbol in
                        Image(systemName: symbol).tag(symbol)
                    }
                }

                Picker("Цвет", selection: $selectedColor) {
                    ForEach(colors, id: \.self) { hex in
                        Circle()
                            .fill(Color(hex: hex))
                            .frame(width: 20, height: 20)
                            .tag(hex)
                    }
                }

                Button {
                    addCategory()
                } label: {
                    Label("Добавить категорию", systemImage: "plus.circle.fill")
                }
                .disabled(newName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }

            Section("Категории") {
                ForEach(categories) { category in
                    Label {
                        Text(category.name)
                    } icon: {
                        Image(systemName: category.symbolName)
                            .foregroundStyle(Color(hex: category.colorHex))
                    }
                }
                .onDelete(perform: deleteCategories)
            }
        }
        .navigationTitle("Категории")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Готово") {
                    dismiss()
                }
            }
        }
    }

    private func addCategory() {
        modelContext.insert(ExpenseCategory(name: newName.trimmingCharacters(in: .whitespacesAndNewlines), colorHex: selectedColor, symbolName: selectedSymbol))
        newName = ""
    }

    private func deleteCategories(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(categories[index])
        }
    }
}
