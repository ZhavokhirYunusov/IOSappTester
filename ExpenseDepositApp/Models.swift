import Foundation
import SwiftData
import SwiftUI

@Model
final class ExpenseCategory {
    var id: UUID
    var name: String
    var colorHex: String
    var symbolName: String
    var createdAt: Date

    init(name: String, colorHex: String = "2F855A", symbolName: String = "tag") {
        self.id = UUID()
        self.name = name
        self.colorHex = colorHex
        self.symbolName = symbolName
        self.createdAt = Date()
    }
}

@Model
final class ExpenseItem {
    var id: UUID
    var title: String
    var amount: Double
    var categoryName: String
    var spentAt: Date
    var note: String
    var createdAt: Date

    init(title: String, amount: Double, categoryName: String, spentAt: Date = Date(), note: String = "") {
        self.id = UUID()
        self.title = title
        self.amount = amount
        self.categoryName = categoryName
        self.spentAt = spentAt
        self.note = note
        self.createdAt = Date()
    }
}

extension Double {
    var moneyText: String {
        Self.currencyFormatter.string(from: NSNumber(value: self)) ?? "\(self)"
    }

    private static let currencyFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = Locale.current.currency?.identifier ?? "USD"
        formatter.maximumFractionDigits = 2
        return formatter
    }()
}

extension Color {
    init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&value)

        let red = Double((value >> 16) & 0xFF) / 255
        let green = Double((value >> 8) & 0xFF) / 255
        let blue = Double(value & 0xFF) / 255

        self.init(red: red, green: green, blue: blue)
    }
}

extension Calendar {
    func isDateInCurrentMonth(_ date: Date) -> Bool {
        isDate(date, equalTo: Date(), toGranularity: .month) && isDate(date, equalTo: Date(), toGranularity: .year)
    }
}
