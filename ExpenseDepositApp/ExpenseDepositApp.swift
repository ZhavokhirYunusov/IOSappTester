import SwiftData
import SwiftUI

@main
struct ExpenseDepositApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(for: [ExpenseItem.self, ExpenseCategory.self])
    }
}

struct RootView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \ExpenseCategory.name) private var categories: [ExpenseCategory]

    var body: some View {
        TabView {
            NavigationStack {
                ExpensesView()
            }
            .tabItem {
                Label("Траты", systemImage: "list.bullet.rectangle")
            }

            NavigationStack {
                StatisticsView()
            }
            .tabItem {
                Label("Статистика", systemImage: "chart.pie")
            }

            NavigationStack {
                DepositCalculatorView()
            }
            .tabItem {
                Label("Вклад", systemImage: "percent")
            }
        }
        .task {
            seedDefaultCategoriesIfNeeded()
        }
    }

    private func seedDefaultCategoriesIfNeeded() {
        guard categories.isEmpty else { return }

        [
            ExpenseCategory(name: "Продукты", colorHex: "2F855A", symbolName: "cart"),
            ExpenseCategory(name: "Транспорт", colorHex: "2B6CB0", symbolName: "car"),
            ExpenseCategory(name: "Дом", colorHex: "805AD5", symbolName: "house"),
            ExpenseCategory(name: "Кафе", colorHex: "C05621", symbolName: "cup.and.saucer"),
            ExpenseCategory(name: "Здоровье", colorHex: "C53030", symbolName: "cross.case"),
            ExpenseCategory(name: "Другое", colorHex: "4A5568", symbolName: "square.grid.2x2")
        ].forEach(modelContext.insert)
    }
}
