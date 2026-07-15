import Foundation
import SwiftUI
import WidgetKit

private struct ServiceHealth: Decodable {
    struct LastSuccessfulSync: Decodable {
        let provider: String
        let completedAt: String
        let acceptedCount: Int
    }

    let status: String
    let appTimezone: String
    let enabledProviders: [String]
    let lastSuccessfulSync: LastSuccessfulSync?
    let nextFiveUpcomingEventsCount: Int
    let nextThirtyDaysCount: Int
}

private struct MacroPulseEntry: TimelineEntry {
    let date: Date
    let health: ServiceHealth?
    let errorMessage: String?

    static let placeholder = MacroPulseEntry(
        date: Date(),
        health: ServiceHealth(
            status: "ok",
            appTimezone: "Asia/Taipei",
            enabledProviders: ["bls", "bea", "federal_reserve", "eia", "census", "ism", "umich"],
            lastSuccessfulSync: .init(
                provider: "umich",
                completedAt: "2026-07-15T07:38:11.646Z",
                acceptedCount: 4
            ),
            nextFiveUpcomingEventsCount: 5,
            nextThirtyDaysCount: 36
        ),
        errorMessage: nil
    )
}

private enum WidgetCopy {
    static let isChinese = Locale.preferredLanguages.first?.lowercased().hasPrefix("zh") == true

    static var title: String { "MACRO PULSE" }
    static var online: String { isChinese ? "雲端正常" : "Cloud online" }
    static var unavailable: String { isChinese ? "暫時無法連線" : "Temporarily unavailable" }
    static var upcoming: String { isChinese ? "未來 30 天" : "Next 30 days" }
    static var events: String { isChinese ? "個事件" : "events" }
    static var sources: String { isChinese ? "官方來源" : "official sources" }
    static var latestSync: String { isChinese ? "最近同步" : "Latest sync" }
    static var openDashboard: String { isChinese ? "開啟事件日曆" : "Open event calendar" }
    static var description: String {
        isChinese ? "顯示 Macro Pulse 雲端同步狀態與近期事件數量。" :
            "Shows Macro Pulse cloud sync status and upcoming event counts."
    }
}

private enum HealthClient {
    static let endpoint = URL(
        string: "https://us-economic-event-alerts.jim1999110724660600.workers.dev/health"
    )!

    static func fetch(completion: @escaping (MacroPulseEntry) -> Void) {
        var request = URLRequest(url: endpoint)
        request.timeoutInterval = 12
        request.cachePolicy = .reloadIgnoringLocalCacheData

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error {
                completion(MacroPulseEntry(date: Date(), health: nil, errorMessage: error.localizedDescription))
                return
            }

            guard let httpResponse = response as? HTTPURLResponse,
                  (200..<300).contains(httpResponse.statusCode),
                  let data,
                  let health = try? JSONDecoder().decode(ServiceHealth.self, from: data)
            else {
                completion(MacroPulseEntry(date: Date(), health: nil, errorMessage: "Invalid health response"))
                return
            }

            completion(MacroPulseEntry(date: Date(), health: health, errorMessage: nil))
        }.resume()
    }
}

private struct MacroPulseProvider: TimelineProvider {
    func placeholder(in context: Context) -> MacroPulseEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (MacroPulseEntry) -> Void) {
        completion(.placeholder)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MacroPulseEntry>) -> Void) {
        HealthClient.fetch { entry in
            let nextRefresh = Calendar.current.date(
                byAdding: .minute,
                value: 15,
                to: Date()
            ) ?? Date().addingTimeInterval(15 * 60)
            completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
        }
    }
}

private struct MacroPulseWidgetView: View {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.widgetFamily) private var family

    let entry: MacroPulseEntry

    private var isOnline: Bool {
        entry.health?.status.lowercased() == "ok"
    }

    private var lastSyncDate: Date? {
        guard let value = entry.health?.lastSuccessfulSync?.completedAt else {
            return nil
        }

        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return fractional.date(from: value) ?? ISO8601DateFormatter().date(from: value)
    }

    private var accent: Color {
        isOnline ? Color(red: 0.23, green: 0.72, blue: 0.52) : Color(red: 0.95, green: 0.49, blue: 0.36)
    }

    private var background: some View {
        ZStack {
            LinearGradient(
                colors: colorScheme == .dark
                    ? [Color(red: 0.05, green: 0.08, blue: 0.12), Color(red: 0.08, green: 0.16, blue: 0.25)]
                    : [Color(red: 0.93, green: 0.97, blue: 1.0), Color(red: 0.79, green: 0.89, blue: 0.98)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            Circle()
                .fill(Color.blue.opacity(colorScheme == .dark ? 0.18 : 0.15))
                .frame(width: 130, height: 130)
                .blur(radius: 20)
                .offset(x: 70, y: -65)

            Circle()
                .fill(Color.orange.opacity(colorScheme == .dark ? 0.13 : 0.10))
                .frame(width: 110, height: 110)
                .blur(radius: 22)
                .offset(x: -85, y: 75)
        }
    }

    private var header: some View {
        HStack(spacing: 8) {
            Image(systemName: "waveform.path.ecg")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.blue)

            Text(WidgetCopy.title)
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .tracking(1.2)

            Spacer(minLength: 4)

            Circle()
                .fill(accent)
                .frame(width: 7, height: 7)
                .shadow(color: accent.opacity(0.55), radius: 4)
        }
    }

    private var smallContent: some View {
        VStack(alignment: .leading, spacing: 10) {
            header

            Spacer(minLength: 2)

            Text(isOnline ? WidgetCopy.online : WidgetCopy.unavailable)
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(isOnline ? .primary : .secondary)

            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("\(entry.health?.nextThirtyDaysCount ?? 0)")
                    .font(.system(size: 36, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                Text(WidgetCopy.events)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text(WidgetCopy.upcoming)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private var mediumContent: some View {
        HStack(spacing: 18) {
            VStack(alignment: .leading, spacing: 10) {
                header

                Spacer(minLength: 0)

                Text(isOnline ? WidgetCopy.online : WidgetCopy.unavailable)
                    .font(.system(size: 17, weight: .semibold, design: .rounded))

                Text(WidgetCopy.openDashboard)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Divider()
                .overlay(.white.opacity(colorScheme == .dark ? 0.12 : 0.35))

            VStack(alignment: .leading, spacing: 9) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("\(entry.health?.nextThirtyDaysCount ?? 0)")
                        .font(.system(size: 31, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                    Text(WidgetCopy.events)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Text(WidgetCopy.upcoming)
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                HStack(spacing: 6) {
                    Text("\(entry.health?.enabledProviders.count ?? 0)")
                        .font(.caption.weight(.semibold))
                        .monospacedDigit()
                    Text(WidgetCopy.sources)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                if let provider = entry.health?.lastSuccessfulSync?.provider {
                    HStack(spacing: 5) {
                        Text(provider.uppercased())
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                        if let lastSyncDate {
                            Text(lastSyncDate, style: .relative)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .accessibilityLabel(WidgetCopy.latestSync)
                }
            }
            .frame(width: 138, alignment: .leading)
        }
    }

    private var content: some View {
        Group {
            if family == .systemMedium {
                mediumContent
            } else {
                smallContent
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    var body: some View {
        Group {
            if #available(macOS 14.0, *) {
                content.containerBackground(for: .widget) {
                    background
                }
            } else {
                ZStack {
                    background
                    content
                }
            }
        }
        .widgetURL(URL(string: "macropulse://dashboard"))
        .accessibilityLabel(isOnline ? WidgetCopy.online : WidgetCopy.unavailable)
    }
}

@main
struct MacroPulseWidget: Widget {
    let kind = "com.lijingchiu.macropulse.status"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MacroPulseProvider()) { entry in
            MacroPulseWidgetView(entry: entry)
        }
        .configurationDisplayName("Macro Pulse")
        .description(WidgetCopy.description)
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
