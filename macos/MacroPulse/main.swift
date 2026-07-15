import Cocoa
import WebKit
import Security

private enum AppConfig {
    static let name = "Macro Pulse"
    static let bundleIdentifier = "com.lijingchiu.macropulse"
    static let credentialMessageName = "credentialStore"
    static let adminURL = URL(string: "https://us-economic-event-alerts.jim1999110724660600.workers.dev/admin")!
}

private extension NSToolbarItem.Identifier {
    static let navigation = NSToolbarItem.Identifier("com.lijingchiu.macropulse.navigation")
    static let reload = NSToolbarItem.Identifier("com.lijingchiu.macropulse.reload")
    static let update = NSToolbarItem.Identifier("com.lijingchiu.macropulse.update")
}

private enum CredentialStore {
    private static let service = AppConfig.bundleIdentifier
    private static let account = "admin-token"

    private static var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }

    static func load() -> String? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data
        else {
            return nil
        }

        return String(data: data, encoding: .utf8)
    }

    static func save(_ token: String) {
        guard !token.isEmpty, let data = token.data(using: .utf8) else {
            clear()
            return
        }

        var attributes = baseQuery
        attributes[kSecValueData as String] = data
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock

        SecItemDelete(baseQuery as CFDictionary)
        SecItemAdd(attributes as CFDictionary, nil)
    }

    static func clear() {
        SecItemDelete(baseQuery as CFDictionary)
    }
}

private func javascriptLiteral(_ value: String?) -> String {
    guard let value,
          let data = try? JSONSerialization.data(withJSONObject: [value]),
          let encoded = String(data: data, encoding: .utf8)
    else {
        return "null"
    }

    return String(encoded.dropFirst().dropLast())
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, NSToolbarDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private weak var navigationControl: NSSegmentedControl!
    private weak var updateButton: NSButton!
    private var updateMenuItem: NSMenuItem?
    private let updateManager = UpdateManager()
    private var updateTimer: Timer?
    private var updateCheckWasManual = false
    private var updateActionWasUserInitiated = false
    private var updateInstallationStarted = false

    func applicationDidFinishLaunching(_ notification: Notification) {
        installMainMenu()
        configureUpdateManager()

        let userContentController = WKUserContentController()
        userContentController.add(self, name: AppConfig.credentialMessageName)
        userContentController.addUserScript(
            WKUserScript(
                source: credentialBridgeScript(),
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
        )
        userContentController.addUserScript(
            WKUserScript(
                source: liquidGlassInterfaceScript(),
                injectionTime: .atDocumentEnd,
                forMainFrameOnly: true
            )
        )

        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.userContentController = userContentController
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true

        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsMagnification = true
        webView.allowsBackForwardNavigationGestures = true
        webView.underPageBackgroundColor = .clear

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1320, height: 880),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = AppConfig.name
        window.subtitle = "Economic Events · Cloudflare"
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.toolbarStyle = .unified
        window.minSize = NSSize(width: 760, height: 560)
        window.collectionBehavior = [.fullScreenPrimary]
        window.tabbingMode = .disallowed
        window.isReleasedWhenClosed = false
        window.backgroundColor = .clear
        window.contentView = webView
        window.toolbar = makeToolbar()
        window.setFrameAutosaveName("MacroPulseMainWindow")
        window.center()
        window.makeKeyAndOrderFront(nil)

        loadDashboard()
        NSApp.activate(ignoringOtherApps: true)

        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            self?.checkForUpdatesInBackground()
        }
        updateTimer = Timer.scheduledTimer(
            timeInterval: 6 * 60 * 60,
            target: self,
            selector: #selector(checkForUpdatesInBackground),
            userInfo: nil,
            repeats: true
        )
    }

    func applicationWillTerminate(_ notification: Notification) {
        updateTimer?.invalidate()
        webView?.configuration.userContentController.removeScriptMessageHandler(
            forName: AppConfig.credentialMessageName
        )
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        return true
    }

    func application(_ application: NSApplication, open urls: [URL]) {
        guard urls.contains(where: { $0.scheme?.lowercased() == "macropulse" }) else {
            return
        }

        window.makeKeyAndOrderFront(nil)
        loadDashboard()
        NSApp.activate(ignoringOtherApps: true)
    }

    private func installMainMenu() {
        let mainMenu = NSMenu()

        let applicationMenuItem = NSMenuItem()
        mainMenu.addItem(applicationMenuItem)
        let applicationMenu = NSMenu()
        applicationMenuItem.submenu = applicationMenu

        let aboutItem = applicationMenu.addItem(
            withTitle: "About \(AppConfig.name)",
            action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)),
            keyEquivalent: ""
        )
        aboutItem.target = NSApp

        let checkForUpdatesItem = applicationMenu.addItem(
            withTitle: "Check for Updates…",
            action: #selector(updateButtonPressed(_:)),
            keyEquivalent: ""
        )
        checkForUpdatesItem.target = self
        updateMenuItem = checkForUpdatesItem

        applicationMenu.addItem(.separator())
        applicationMenu.addItem(
            withTitle: "Quit \(AppConfig.name)",
            action: #selector(NSApplication.terminate(_:)),
            keyEquivalent: "q"
        ).target = NSApp

        let editMenuItem = NSMenuItem()
        mainMenu.addItem(editMenuItem)
        let editMenu = NSMenu(title: "Edit")
        editMenuItem.submenu = editMenu

        let undoItem = editMenu.addItem(
            withTitle: "Undo",
            action: NSSelectorFromString("undo:"),
            keyEquivalent: "z"
        )
        undoItem.target = nil

        let redoItem = editMenu.addItem(
            withTitle: "Redo",
            action: NSSelectorFromString("redo:"),
            keyEquivalent: "z"
        )
        redoItem.keyEquivalentModifierMask = [.command, .shift]
        redoItem.target = nil

        editMenu.addItem(.separator())

        let cutItem = editMenu.addItem(
            withTitle: "Cut",
            action: NSSelectorFromString("cut:"),
            keyEquivalent: "x"
        )
        cutItem.target = nil

        let copyItem = editMenu.addItem(
            withTitle: "Copy",
            action: NSSelectorFromString("copy:"),
            keyEquivalent: "c"
        )
        copyItem.target = nil

        let pasteItem = editMenu.addItem(
            withTitle: "Paste",
            action: NSSelectorFromString("paste:"),
            keyEquivalent: "v"
        )
        pasteItem.target = nil

        let selectAllItem = editMenu.addItem(
            withTitle: "Select All",
            action: NSSelectorFromString("selectAll:"),
            keyEquivalent: "a"
        )
        selectAllItem.target = nil

        let navigationMenuItem = NSMenuItem()
        mainMenu.addItem(navigationMenuItem)
        let navigationMenu = NSMenu(title: "Navigate")
        navigationMenuItem.submenu = navigationMenu

        let backItem = navigationMenu.addItem(
            withTitle: "Back",
            action: #selector(goBack(_:)),
            keyEquivalent: "["
        )
        backItem.target = self

        let forwardItem = navigationMenu.addItem(
            withTitle: "Forward",
            action: #selector(goForward(_:)),
            keyEquivalent: "]"
        )
        forwardItem.target = self

        navigationMenu.addItem(.separator())
        let reloadItem = navigationMenu.addItem(
            withTitle: "Reload",
            action: #selector(reloadPage(_:)),
            keyEquivalent: "r"
        )
        reloadItem.target = self

        let openItem = navigationMenu.addItem(
            withTitle: "Open in Browser",
            action: #selector(openInBrowser(_:)),
            keyEquivalent: "o"
        )
        openItem.target = self

        NSApp.mainMenu = mainMenu
    }

    private func makeToolbar() -> NSToolbar {
        let toolbar = NSToolbar(identifier: "MacroPulseToolbar")
        toolbar.delegate = self
        toolbar.displayMode = .iconOnly
        toolbar.allowsUserCustomization = false
        toolbar.autosavesConfiguration = false
        return toolbar
    }

    func toolbarAllowedItemIdentifiers(_ toolbar: NSToolbar) -> [NSToolbarItem.Identifier] {
        [.navigation, .reload, .flexibleSpace, .update]
    }

    func toolbarDefaultItemIdentifiers(_ toolbar: NSToolbar) -> [NSToolbarItem.Identifier] {
        [.navigation, .reload, .flexibleSpace, .update]
    }

    func toolbar(
        _ toolbar: NSToolbar,
        itemForItemIdentifier itemIdentifier: NSToolbarItem.Identifier,
        willBeInsertedIntoToolbar flag: Bool
    ) -> NSToolbarItem? {
        switch itemIdentifier {
        case .navigation:
            let control = NSSegmentedControl(
                labels: ["", ""],
                trackingMode: .momentary,
                target: self,
                action: #selector(navigate(_:))
            )
            control.segmentStyle = .rounded
            control.setImage(NSImage(systemSymbolName: "chevron.left", accessibilityDescription: "Back"), forSegment: 0)
            control.setImage(NSImage(systemSymbolName: "chevron.right", accessibilityDescription: "Forward"), forSegment: 1)
            control.setWidth(34, forSegment: 0)
            control.setWidth(34, forSegment: 1)
            control.setEnabled(false, forSegment: 0)
            control.setEnabled(false, forSegment: 1)
            navigationControl = control

            let item = NSToolbarItem(itemIdentifier: itemIdentifier)
            item.label = "Navigate"
            item.paletteLabel = "Navigate"
            item.toolTip = "Back and Forward"
            item.view = control
            return item

        case .reload:
            let item = NSToolbarItem(itemIdentifier: itemIdentifier)
            item.label = "Reload"
            item.paletteLabel = "Reload"
            item.toolTip = "Reload Dashboard"
            item.image = NSImage(systemSymbolName: "arrow.clockwise", accessibilityDescription: "Reload")
            item.target = self
            item.action = #selector(reloadPage(_:))
            return item

        case .update:
            let button = NSButton(
                title: "Updates",
                target: self,
                action: #selector(updateButtonPressed(_:))
            )
            button.bezelStyle = .rounded
            button.controlSize = .small
            button.image = NSImage(
                systemSymbolName: "arrow.triangle.2.circlepath",
                accessibilityDescription: "Check for Updates"
            )
            button.imagePosition = .imageLeading
            button.toolTip = "Check for a newer Macro Pulse version"
            button.frame = NSRect(x: 0, y: 0, width: 104, height: 28)
            updateButton = button

            let item = NSToolbarItem(itemIdentifier: itemIdentifier)
            item.label = "Updates"
            item.paletteLabel = "Updates"
            item.view = button
            return item

        default:
            return nil
        }
    }

    private func configureUpdateManager() {
        updateManager.onStateChange = { [weak self] state in
            self?.applyUpdateState(state)
        }
    }

    @objc private func checkForUpdatesInBackground() {
        guard !updateActionWasUserInitiated else {
            return
        }
        updateManager.check()
    }

    @objc private func updateButtonPressed(_ sender: Any?) {
        switch updateManager.state {
        case let .available(update):
            updateActionWasUserInitiated = true
            updateManager.downloadAvailableUpdate()
            updateMenuItem?.title = "Downloading \(update.version)…"

        case let .downloaded(update, url):
            installDownloadedUpdate(update, at: url)

        case .checking, .downloading:
            break

        default:
            updateCheckWasManual = true
            updateManager.check()
        }
    }

    private func applyUpdateState(_ state: UpdateState) {
        switch state {
        case .idle:
            setUpdateButton(
                title: "Updates",
                symbol: "arrow.triangle.2.circlepath",
                enabled: true,
                toolTip: "Check for a newer Macro Pulse version"
            )

        case .checking:
            setUpdateButton(
                title: "Checking…",
                symbol: "arrow.triangle.2.circlepath",
                enabled: false,
                toolTip: "Checking GitHub Releases"
            )

        case let .current(version):
            setUpdateButton(
                title: "Updates",
                symbol: "checkmark.circle",
                enabled: true,
                toolTip: "Macro Pulse \(version) is up to date"
            )
            updateMenuItem?.title = "Check for Updates…"

            if updateCheckWasManual {
                updateCheckWasManual = false
                presentMessage(
                    title: "Macro Pulse is up to date",
                    message: "Version \(version) is the newest available version."
                )
            }

        case let .available(update):
            setUpdateButton(
                title: "Update \(update.version)",
                symbol: "arrow.down.circle.fill",
                enabled: true,
                toolTip: "Download Macro Pulse \(update.version)"
            )
            updateMenuItem?.title = "Download Update \(update.version)…"

            if updateCheckWasManual {
                updateCheckWasManual = false
                presentAvailableUpdate(update)
            }

        case let .downloading(update, progress):
            let percent = Int((progress * 100).rounded())
            setUpdateButton(
                title: "Downloading \(percent)%",
                symbol: "arrow.down.circle",
                enabled: false,
                toolTip: "Downloading Macro Pulse \(update.version)"
            )
            updateMenuItem?.title = "Downloading Update \(update.version) · \(percent)%"

        case let .downloaded(update, url):
            installDownloadedUpdate(update, at: url)

        case let .failed(message):
            setUpdateButton(
                title: "Retry Update",
                symbol: "exclamationmark.arrow.triangle.2.circlepath",
                enabled: true,
                toolTip: message
            )
            updateMenuItem?.title = "Check for Updates…"

            if updateCheckWasManual || updateActionWasUserInitiated {
                updateCheckWasManual = false
                updateActionWasUserInitiated = false
                presentMessage(title: "Update failed", message: message, style: .warning)
            }
        }
    }

    private func setUpdateButton(
        title: String,
        symbol: String,
        enabled: Bool,
        toolTip: String
    ) {
        updateButton?.title = title
        updateButton?.image = NSImage(
            systemSymbolName: symbol,
            accessibilityDescription: title
        )
        updateButton?.isEnabled = enabled
        updateButton?.toolTip = toolTip
    }

    private func presentAvailableUpdate(_ update: AppUpdate) {
        let alert = NSAlert()
        alert.messageText = "Macro Pulse \(update.version) is available"
        alert.informativeText = "Macro Pulse will securely download and verify the update, close this version, replace the installed app, then reopen automatically."
        alert.alertStyle = .informational
        alert.addButton(withTitle: "Download Update")
        alert.addButton(withTitle: "Later")
        alert.beginSheetModal(for: window) { [weak self] response in
            guard response == .alertFirstButtonReturn else {
                return
            }
            self?.updateActionWasUserInitiated = true
            self?.updateManager.downloadAvailableUpdate()
        }
    }

    private func installDownloadedUpdate(_ update: AppUpdate, at dmgURL: URL) {
        guard !updateInstallationStarted else {
            return
        }

        updateInstallationStarted = true
        updateActionWasUserInitiated = false
        setUpdateButton(
            title: "Installing…",
            symbol: "arrow.triangle.2.circlepath",
            enabled: false,
            toolTip: "Installing Macro Pulse \(update.version)"
        )
        updateMenuItem?.title = "Installing Macro Pulse \(update.version)…"

        do {
            let helperURL = Bundle.main.bundleURL
                .appendingPathComponent("Contents/Helpers/MacroPulseUpdater", isDirectory: false)
            guard FileManager.default.isExecutableFile(atPath: helperURL.path) else {
                throw NSError(
                    domain: AppConfig.bundleIdentifier,
                    code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "The automatic update helper is missing."]
                )
            }

            let runningBundle = Bundle.main.bundleURL.resolvingSymlinksInPath()
            let destination: URL
            if runningBundle.path.hasPrefix("/Volumes/") {
                destination = URL(fileURLWithPath: "/Applications/Macro Pulse.app", isDirectory: true)
            } else {
                destination = runningBundle
            }

            let process = Process()
            process.executableURL = helperURL
            process.arguments = [
                "--dmg", dmgURL.path,
                "--destination", destination.path,
                "--pid", String(ProcessInfo.processInfo.processIdentifier),
            ]
            process.standardOutput = FileHandle.nullDevice
            process.standardError = FileHandle.nullDevice
            try process.run()

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                NSApp.terminate(nil)
            }
        } catch {
            updateInstallationStarted = false
            setUpdateButton(
                title: "Retry Update",
                symbol: "exclamationmark.arrow.triangle.2.circlepath",
                enabled: true,
                toolTip: error.localizedDescription
            )
            updateMenuItem?.title = "Check for Updates…"
            presentMessage(
                title: "Unable to start the update",
                message: error.localizedDescription,
                style: .warning
            )
        }
    }

    private func presentMessage(
        title: String,
        message: String,
        style: NSAlert.Style = .informational
    ) {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = message
        alert.alertStyle = style
        alert.addButton(withTitle: "OK")
        alert.beginSheetModal(for: window)
    }

    private func credentialBridgeScript() -> String {
        let savedToken = javascriptLiteral(CredentialStore.load())

        return """
        (() => {
          const tokenKey = 'macro-pulse-admin-token';
          const initialToken = \(savedToken);
          const originalSetItem = Storage.prototype.setItem;
          const originalRemoveItem = Storage.prototype.removeItem;

          if (initialToken && !sessionStorage.getItem(tokenKey)) {
            originalSetItem.call(sessionStorage, tokenKey, initialToken);
          }

          Storage.prototype.setItem = function(key, value) {
            originalSetItem.call(this, key, value);
            if (this === sessionStorage && key === tokenKey) {
              try {
                window.webkit.messageHandlers.credentialStore.postMessage({
                  action: 'save',
                  value: String(value)
                });
              } catch (_) {}
            }
          };

          Storage.prototype.removeItem = function(key) {
            originalRemoveItem.call(this, key);
            if (this === sessionStorage && key === tokenKey) {
              try {
                window.webkit.messageHandlers.credentialStore.postMessage({
                  action: 'clear'
                });
              } catch (_) {}
            }
          };
        })();
        """
    }

    private func liquidGlassInterfaceScript() -> String {
        guard let url = Bundle.main.url(forResource: "liquid-glass", withExtension: "css"),
              let css = try? String(contentsOf: url, encoding: .utf8)
        else {
            return "document.documentElement.classList.add('native-macos-app');"
        }

        let stylesheet = javascriptLiteral(css)
        return """
        (() => {
          const root = document.documentElement;
          root.classList.add('native-macos-app');
          root.dataset.nativeShell = 'liquid-glass';

          let style = document.getElementById('macro-pulse-native-liquid-glass');
          if (!style) {
            style = document.createElement('style');
            style.id = 'macro-pulse-native-liquid-glass';
            document.head.appendChild(style);
          }
          style.textContent = \(stylesheet);

          let pointerFrame = 0;
          let pointerX = innerWidth / 2;
          let pointerY = innerHeight / 3;
          const paintLight = () => {
            pointerFrame = 0;
            document.body.style.setProperty('--glass-x', pointerX + 'px');
            document.body.style.setProperty('--glass-y', pointerY + 'px');
          };
          window.addEventListener('pointermove', (event) => {
            pointerX = event.clientX;
            pointerY = event.clientY;
            if (!pointerFrame) pointerFrame = requestAnimationFrame(paintLight);
          }, { passive: true });
        })();
        """
    }

    private func loadDashboard() {
        var request = URLRequest(url: AppConfig.adminURL)
        request.cachePolicy = .reloadRevalidatingCacheData
        request.timeoutInterval = 30
        webView.load(request)
    }

    private func updateNavigationControls() {
        navigationControl?.setEnabled(webView.canGoBack, forSegment: 0)
        navigationControl?.setEnabled(webView.canGoForward, forSegment: 1)
    }

    @objc private func navigate(_ sender: NSSegmentedControl) {
        if sender.selectedSegment == 0 {
            goBack(sender)
        } else if sender.selectedSegment == 1 {
            goForward(sender)
        }
    }

    @objc private func reloadPage(_ sender: Any?) {
        if webView.url == nil || webView.url?.scheme == "about" {
            loadDashboard()
        } else {
            webView.reload()
        }
    }

    @objc private func goBack(_ sender: Any?) {
        if webView.canGoBack {
            webView.goBack()
        }
    }

    @objc private func goForward(_ sender: Any?) {
        if webView.canGoForward {
            webView.goForward()
        }
    }

    @objc private func openInBrowser(_ sender: Any?) {
        NSWorkspace.shared.open(webView.url ?? AppConfig.adminURL)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == AppConfig.credentialMessageName,
              let payload = message.body as? [String: Any],
              let action = payload["action"] as? String
        else {
            return
        }

        if action == "save", let token = payload["value"] as? String {
            CredentialStore.save(token)
        } else if action == "clear" {
            CredentialStore.clear()
        }
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard navigationAction.navigationType == .linkActivated,
              let url = navigationAction.request.url
        else {
            decisionHandler(.allow)
            return
        }

        if url.scheme != "https" || url.host != AppConfig.adminURL.host {
            NSWorkspace.shared.open(url)
            decisionHandler(.cancel)
            return
        }

        decisionHandler(.allow)
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if navigationAction.targetFrame == nil, let url = navigationAction.request.url {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        updateNavigationControls()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        updateNavigationControls()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showConnectionError(error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        showConnectionError(error)
    }

    private func showConnectionError(_ error: Error) {
        let message = error.localizedDescription
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")

        let html = """
        <!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            :root { color-scheme: light dark; }
            body {
              margin: 0; min-height: 100vh; display: grid; place-items: center;
              background:
                radial-gradient(circle at 22% 18%, rgba(84, 164, 255, .28), transparent 34%),
                radial-gradient(circle at 78% 72%, rgba(255, 153, 102, .22), transparent 38%),
                #e9eef5;
              color: #162233;
              font: 15px -apple-system, BlinkMacSystemFont, sans-serif;
            }
            main {
              width: min(480px, calc(100% - 48px)); padding: 36px;
              background: rgba(255,255,255,.58);
              border: 1px solid rgba(255,255,255,.82);
              border-radius: 28px;
              box-shadow: 0 28px 90px rgba(35,59,85,.2);
              backdrop-filter: blur(36px) saturate(170%);
            }
            h1 { margin: 0 0 12px; font: 700 30px "New York", Georgia, serif; }
            p { color: #59687a; line-height: 1.7; }
            button {
              margin-top: 14px; padding: 11px 18px; border: 1px solid rgba(255,255,255,.75);
              border-radius: 999px; background: rgba(255,255,255,.64);
              color: #162233; font: 600 14px -apple-system, sans-serif; cursor: pointer;
              box-shadow: 0 8px 28px rgba(35,59,85,.16);
            }
            @media (prefers-color-scheme: dark) {
              body {
                background:
                  radial-gradient(circle at 22% 18%, rgba(57, 128, 214, .22), transparent 34%),
                  radial-gradient(circle at 78% 72%, rgba(176, 85, 57, .18), transparent 38%),
                  #0d1219;
                color: #edf5ff;
              }
              main { background: rgba(22,29,39,.64); border-color: rgba(255,255,255,.13); }
              p { color: #a7b4c4; }
              button { background: rgba(255,255,255,.12); color: #edf5ff; border-color: rgba(255,255,255,.18); }
            }
          </style>
        </head>
        <body>
          <main>
            <h1>Unable to reach Macro Pulse</h1>
            <p>The Cloudflare service could not be loaded. Check your internet connection and try again.</p>
            <p>\(message)</p>
            <button onclick="location.href='\(AppConfig.adminURL.absoluteString)'">Try Again</button>
          </main>
        </body>
        </html>
        """

        webView.loadHTMLString(html, baseURL: nil)
    }
}

private let application = NSApplication.shared
private let appDelegate = AppDelegate()
application.setActivationPolicy(.regular)
application.delegate = appDelegate
application.run()
