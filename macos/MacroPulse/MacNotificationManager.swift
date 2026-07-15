import Cocoa
import UserNotifications

struct MacNotificationStatus {
    let enabled: Bool
    let authorization: String
}

final class MacNotificationManager: NSObject, UNUserNotificationCenterDelegate {
    var tokenProvider: (() -> String?)?
    var onStatusChange: ((MacNotificationStatus) -> Void)?

    private struct Overview: Decodable {
        let events: [ReleaseEvent]
        let settings: AppSettings?
    }

    private struct AppSettings: Decodable {
        let reminderMinutes: [Int]?
    }

    private struct ReleaseEvent: Decodable {
        let id: String
        let provider: String
        let name: String
        let eventTimeUtc: String
        let actualValue: String?
        let forecastValue: String?
        let previousValue: String?
        let valueUnit: String?
        let sourceUpdatedAt: String?
        let impact: String?
        let category: String?
        let localDisplayTimezone: String?
        let affectedMarketsJson: String?
    }

    private let center = UNUserNotificationCenter.current()
    private let enabledKey = "macNotificationsEnabled"
    private let deliveredKey = "macNotificationDeliveredResults"
    private let reminderDeliveredKey = "macNotificationDeliveredReminders"
    private let overviewURL = URL(
        string: "https://us-economic-event-alerts.jim1999110724660600.workers.dev/admin/overview"
    )!
    private var authorization = "notDetermined"
    private var pollWorkItem: DispatchWorkItem?
    private var pollTask: URLSessionDataTask?
    private var pendingKeys = Set<String>()
    private var sentStartupNotification = false

    private var isEnabled: Bool {
        get {
            guard UserDefaults.standard.object(forKey: enabledKey) != nil else {
                return true
            }
            return UserDefaults.standard.bool(forKey: enabledKey)
        }
        set {
            UserDefaults.standard.set(newValue, forKey: enabledKey)
        }
    }

    func start() {
        center.delegate = self
        refreshAuthorization(requestIfNeeded: isEnabled)
    }

    func stop() {
        pollWorkItem?.cancel()
        pollTask?.cancel()
        pollWorkItem = nil
        pollTask = nil
    }

    func credentialsDidChange() {
        guard isEnabled, authorizationAllowsDelivery else {
            return
        }
        schedulePoll(after: 0)
    }

    func publishStatus() {
        onStatusChange?(MacNotificationStatus(enabled: isEnabled, authorization: authorization))
    }

    func setEnabled(_ enabled: Bool) {
        isEnabled = enabled
        if enabled {
            refreshAuthorization(requestIfNeeded: true)
        } else {
            stop()
            publishStatus()
        }
    }

    func sendTestNotification() {
        guard isEnabled, authorizationAllowsDelivery else {
            refreshAuthorization(requestIfNeeded: true)
            return
        }
        deliver(
            identifier: "macropulse-test-\(UUID().uuidString)",
            title: "Macro Pulse",
            subtitle: "Mac 通知測試",
            body: "通知已啟用。數據公布後將包含 Actual / Forecast / Prior。",
            sound: true
        )
    }

    func openNotificationSettings() {
        guard let url = URL(
            string: "x-apple.systempreferences:com.apple.Notifications-Settings.extension"
        ) else {
            return
        }
        NSWorkspace.shared.open(url)
    }

    private var authorizationAllowsDelivery: Bool {
        authorization == "authorized" || authorization == "provisional"
    }

    private func refreshAuthorization(requestIfNeeded: Bool) {
        center.getNotificationSettings { [weak self] settings in
            DispatchQueue.main.async {
                guard let self else {
                    return
                }
                self.authorization = Self.authorizationName(settings.authorizationStatus)
                if requestIfNeeded, settings.authorizationStatus == .notDetermined {
                    self.requestAuthorization()
                    return
                }
                self.applyAuthorizationState()
            }
        }
    }

    private func requestAuthorization() {
        center.requestAuthorization(options: [.alert, .sound, .badge]) { [weak self] _, _ in
            DispatchQueue.main.async {
                self?.refreshAuthorization(requestIfNeeded: false)
            }
        }
    }

    private func applyAuthorizationState() {
        publishStatus()
        guard isEnabled, authorizationAllowsDelivery else {
            stop()
            return
        }

        if !sentStartupNotification {
            sentStartupNotification = true
            deliver(
                identifier: "macropulse-startup-\(UUID().uuidString)",
                title: "Macro Pulse",
                subtitle: "經濟數據監控已啟動",
                body: "App 正在監控公布窗口；取得當期結果後會立即推播。",
                sound: false
            )
        }
        schedulePoll(after: 0)
    }

    private func schedulePoll(after interval: TimeInterval) {
        pollWorkItem?.cancel()
        let item = DispatchWorkItem { [weak self] in
            self?.poll()
        }
        pollWorkItem = item
        DispatchQueue.main.asyncAfter(deadline: .now() + interval, execute: item)
    }

    private func poll() {
        guard pollTask == nil, isEnabled, authorizationAllowsDelivery else {
            return
        }
        guard let token = tokenProvider?(), !token.isEmpty else {
            schedulePoll(after: 10)
            return
        }

        var request = URLRequest(url: overviewURL)
        request.timeoutInterval = 20
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("MacroPulse-macOS-notifications", forHTTPHeaderField: "User-Agent")

        let task = URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                guard let self else {
                    return
                }
                self.pollTask = nil

                guard error == nil,
                      let response = response as? HTTPURLResponse,
                      (200..<300).contains(response.statusCode),
                      let data,
                      let overview = try? JSONDecoder().decode(Overview.self, from: data)
                else {
                    self.schedulePoll(after: 15)
                    return
                }

                let reminderMinutes = overview.settings?.reminderMinutes ?? [60, 30, 15, 5]
                let nextInterval = self.process(overview.events, reminderMinutes: reminderMinutes)
                self.schedulePoll(after: nextInterval)
            }
        }
        pollTask = task
        task.resume()
    }

    private func process(_ events: [ReleaseEvent], reminderMinutes: [Int]) -> TimeInterval {
        let now = Date()
        var isNearUnresolvedRelease = false
        let reminders = reminderMinutes.filter { $0 > 0 }.sorted(by: >)

        for event in events {
            guard let releaseDate = ISO8601DateFormatter().date(from: event.eventTimeUtc) else { continue }
            let secondsUntilRelease = releaseDate.timeIntervalSince(now)
            let actual = event.actualValue?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

            if actual.isEmpty {
                if abs(secondsUntilRelease) <= 15 * 60 { isNearUnresolvedRelease = true }
                for minutes in reminders {
                    let threshold = TimeInterval(minutes * 60)
                    guard secondsUntilRelease >= max(0, threshold - 90),
                          secondsUntilRelease <= threshold + 90 else { continue }
                    notifyReminder(event, minutesBeforeRelease: minutes, releaseDate: releaseDate)
                }
                continue
            }

            let secondsFromRelease = now.timeIntervalSince(releaseDate)
            guard secondsFromRelease >= -5 * 60, secondsFromRelease <= 60 * 60 else { continue }
            notifyResult(event, actual: actual, releaseDate: releaseDate)
        }
        return isNearUnresolvedRelease ? 5 : 60
    }

    private func notifyReminder(_ event: ReleaseEvent, minutesBeforeRelease: Int, releaseDate: Date) {
        let key = [event.id, event.eventTimeUtc, String(minutesBeforeRelease)].joined(separator: "|")
        let delivered = Set(UserDefaults.standard.stringArray(forKey: reminderDeliveredKey) ?? [])
        guard !delivered.contains(key), !pendingKeys.contains(key) else { return }
        pendingKeys.insert(key)

        let content = UNMutableNotificationContent()
        content.title = event.name
        content.subtitle = event.provider.uppercased() + " · 提前 " + String(minutesBeforeRelease) + " 分鐘提醒"
        content.body = notificationDetails(
            event,
            releaseDate: releaseDate,
            prefix: "距離公布約 " + String(minutesBeforeRelease) + " 分鐘"
        )
        content.sound = .default
        content.threadIdentifier = "economic-release-reminders"
        content.userInfo = ["eventID": event.id, "reminderMinutes": minutesBeforeRelease]

        let request = UNNotificationRequest(
            identifier: "reminder-" + UUID().uuidString,
            content: content,
            trigger: nil
        )
        center.add(request) { [weak self] error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.pendingKeys.remove(key)
                guard error == nil else { return }
                var stored = Set(UserDefaults.standard.stringArray(forKey: self.reminderDeliveredKey) ?? [])
                stored.insert(key)
                UserDefaults.standard.set(Array(stored.suffix(250)), forKey: self.reminderDeliveredKey)
            }
        }
    }

    private func notifyResult(_ event: ReleaseEvent, actual: String, releaseDate: Date) {
        let key = [
            event.id,
            actual,
            event.sourceUpdatedAt ?? "",
        ].joined(separator: "|")

        let delivered = Set(UserDefaults.standard.stringArray(forKey: deliveredKey) ?? [])
        guard !delivered.contains(key), !pendingKeys.contains(key) else {
            return
        }
        pendingKeys.insert(key)

        let actualText = formatted(actual, unit: event.valueUnit)
        let forecastText = formatted(event.forecastValue, unit: event.valueUnit)
        let priorText = formatted(event.previousValue, unit: event.valueUnit)
        let content = UNMutableNotificationContent()
        content.title = event.name
        content.subtitle = "\(event.provider.uppercased()) · 當期數據已公布"
        content.body = notificationDetails(
            event,
            releaseDate: releaseDate,
            prefix: "Actual 當期 " + actualText + " · Forecast 預期 " + forecastText + " · Prior 前值 " + priorText
        )
        content.sound = .default
        content.threadIdentifier = "economic-release-results"
        content.userInfo = ["eventID": event.id, "actual": actual]

        let request = UNNotificationRequest(
            identifier: "release-\(UUID().uuidString)",
            content: content,
            trigger: nil
        )
        center.add(request) { [weak self] error in
            DispatchQueue.main.async {
                guard let self else {
                    return
                }
                self.pendingKeys.remove(key)
                guard error == nil else {
                    return
                }
                var stored = Set(UserDefaults.standard.stringArray(forKey: self.deliveredKey) ?? [])
                stored.insert(key)
                UserDefaults.standard.set(Array(stored.suffix(250)), forKey: self.deliveredKey)
            }
        }
    }

    private func notificationDetails(_ event: ReleaseEvent, releaseDate: Date, prefix: String) -> String {
        let timezone = TimeZone(identifier: event.localDisplayTimezone ?? "") ?? .current
        let formatter = DateFormatter()
        formatter.dateFormat = "MM/dd HH:mm"
        formatter.timeZone = timezone
        let releaseText = formatter.string(from: releaseDate)
        let category = event.category?.isEmpty == false ? event.category! : "經濟數據"
        let impact = event.impact?.isEmpty == false ? event.impact! : "—"
        return [
            prefix,
            "公布時間 " + releaseText,
            "分類 " + category + " · 影響 " + impact,
            "可能影響 " + marketLabels(from: event.affectedMarketsJson),
        ].joined(separator: "\n")
    }

    private func marketLabels(from json: String?) -> String {
        guard let json, let data = json.data(using: .utf8),
              let markets = try? JSONSerialization.jsonObject(with: data) as? [String] else { return "—" }
        let labels = markets.map { market in
            switch market.uppercased() {
            case "GOLD": return "黃金"
            case "CRUDE_OIL", "OIL": return "原油"
            case "USD", "DXY": return "美元"
            case "NQ", "SPX", "STOCKS": return "股市"
            case "RATES": return "利率"
            default: return market
            }
        }
        return labels.isEmpty ? "—" : labels.joined(separator: "、")
    }

    private func formatted(_ value: String?, unit: String?) -> String {
        guard let value = value?.trimmingCharacters(in: .whitespacesAndNewlines),
              !value.isEmpty
        else {
            return "—"
        }
        guard let unit = unit?.trimmingCharacters(in: .whitespacesAndNewlines),
              !unit.isEmpty,
              !value.hasSuffix(unit)
        else {
            return value
        }
        return "\(value)\(unit)"
    }

    private func deliver(
        identifier: String,
        title: String,
        subtitle: String,
        body: String,
        sound: Bool
    ) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.subtitle = subtitle
        content.body = body
        if sound {
            content.sound = .default
        }
        center.add(UNNotificationRequest(identifier: identifier, content: content, trigger: nil))
    }

    private static func authorizationName(_ status: UNAuthorizationStatus) -> String {
        switch status {
        case .notDetermined:
            return "notDetermined"
        case .denied:
            return "denied"
        case .authorized:
            return "authorized"
        case .provisional:
            return "provisional"
        case .ephemeral:
            return "ephemeral"
        @unknown default:
            return "unknown"
        }
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .list, .sound])
    }
}
