import Cocoa
import WebKit
import Security

private enum AppConfig {
    static let name = "Macro Pulse"
    static let bundleIdentifier = "com.lijingchiu.macropulse"
    static let credentialMessageName = "credentialStore"
    static let adminURL = URL(string: "https://us-economic-event-alerts.jim1999110724660600.workers.dev/admin")!
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

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    private var window: NSWindow!
    private var webView: WKWebView!

    func applicationDidFinishLaunching(_ notification: Notification) {
        installMainMenu()

        let userContentController = WKUserContentController()
        userContentController.add(self, name: AppConfig.credentialMessageName)
        userContentController.addUserScript(
            WKUserScript(
                source: credentialBridgeScript(),
                injectionTime: .atDocumentStart,
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

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1280, height: 840),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = AppConfig.name
        window.minSize = NSSize(width: 860, height: 600)
        window.collectionBehavior = [.fullScreenPrimary]
        window.tabbingMode = .disallowed
        window.isReleasedWhenClosed = false
        window.contentView = webView
        window.center()
        window.makeKeyAndOrderFront(nil)

        loadDashboard()
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationWillTerminate(_ notification: Notification) {
        webView?.configuration.userContentController.removeScriptMessageHandler(
            forName: AppConfig.credentialMessageName
        )
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
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
        applicationMenu.addItem(.separator())
        applicationMenu.addItem(
            withTitle: "Quit \(AppConfig.name)",
            action: #selector(NSApplication.terminate(_:)),
            keyEquivalent: "q"
        ).target = NSApp

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

        NSApp.mainMenu = mainMenu
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

    private func loadDashboard() {
        var request = URLRequest(url: AppConfig.adminURL)
        request.cachePolicy = .reloadRevalidatingCacheData
        request.timeoutInterval = 30
        webView.load(request)
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
              background: #f3f0e9; color: #2d2119;
              font: 15px -apple-system, BlinkMacSystemFont, sans-serif;
            }
            main {
              width: min(460px, calc(100% - 48px)); padding: 34px;
              background: rgba(255,255,255,.75); border: 1px solid #c8bfb5;
              border-radius: 20px; box-shadow: 0 20px 70px rgba(52,35,23,.14);
            }
            h1 { margin: 0 0 12px; font: 700 28px Georgia, serif; }
            p { color: #75695f; line-height: 1.7; }
            button {
              margin-top: 14px; padding: 11px 18px; border: 0; border-radius: 10px;
              background: #2d2119; color: white; font: inherit; cursor: pointer;
            }
            @media (prefers-color-scheme: dark) {
              body { background: #151310; color: #f3ede6; }
              main { background: #211d19; border-color: #443b33; }
              p { color: #b5aaa0; }
              button { background: #d9965b; color: #21160e; }
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
