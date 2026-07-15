import Foundation
import Darwin

private enum InstallerError: LocalizedError {
    case invalidArguments
    case commandFailed(String, Int32, String)
    case mountPointMissing
    case appMissing
    case invalidBundle
    case parentDidNotExit

    var errorDescription: String? {
        switch self {
        case .invalidArguments:
            return "The updater received invalid arguments."
        case let .commandFailed(command, status, output):
            let detail = output.trimmingCharacters(in: .whitespacesAndNewlines)
            return detail.isEmpty
                ? "\(command) failed with status \(status)."
                : "\(command) failed with status \(status): \(detail)"
        case .mountPointMissing:
            return "The update disk image could not be mounted."
        case .appMissing:
            return "Macro Pulse.app was not found in the update."
        case .invalidBundle:
            return "The downloaded application failed identity or signature verification."
        case .parentDidNotExit:
            return "Macro Pulse did not close in time."
        }
    }
}

private struct Arguments {
    let dmg: URL
    let destination: URL
    let parentPID: pid_t

    init() throws {
        let values = Array(CommandLine.arguments.dropFirst())
        guard values.count == 6,
              values[0] == "--dmg",
              values[2] == "--destination",
              values[4] == "--pid",
              let pid = pid_t(values[5])
        else {
            throw InstallerError.invalidArguments
        }
        dmg = URL(fileURLWithPath: values[1])
        destination = URL(fileURLWithPath: values[3], isDirectory: true)
        parentPID = pid
    }
}

@discardableResult
private func run(_ executable: String, _ arguments: [String], input: Data? = nil) throws -> Data {
    let process = Process()
    let output = Pipe()
    process.executableURL = URL(fileURLWithPath: executable)
    process.arguments = arguments
    process.standardOutput = output
    process.standardError = output

    if let input {
        let stdin = Pipe()
        process.standardInput = stdin
        try process.run()
        stdin.fileHandleForWriting.write(input)
        try stdin.fileHandleForWriting.close()
    } else {
        try process.run()
    }

    process.waitUntilExit()
    let data = output.fileHandleForReading.readDataToEndOfFile()
    guard process.terminationStatus == 0 else {
        let text = String(data: data, encoding: .utf8) ?? ""
        throw InstallerError.commandFailed(executable, process.terminationStatus, text)
    }
    return data
}

private func waitForExit(_ pid: pid_t) throws {
    for _ in 0..<300 {
        if kill(pid, 0) != 0, errno == ESRCH {
            return
        }
        usleep(100_000)
    }
    throw InstallerError.parentDidNotExit
}

private func mountedVolume(for dmg: URL) throws -> URL {
    let data = try run("/usr/bin/hdiutil", ["attach", "-nobrowse", "-readonly", "-plist", dmg.path])
    guard let plist = try PropertyListSerialization.propertyList(
        from: data,
        options: [],
        format: nil
    ) as? [String: Any],
    let entities = plist["system-entities"] as? [[String: Any]],
    let path = entities.compactMap({ $0["mount-point"] as? String }).last
    else {
        throw InstallerError.mountPointMissing
    }
    return URL(fileURLWithPath: path, isDirectory: true)
}

private func verifyApp(_ app: URL) throws {
    let plistURL = app.appendingPathComponent("Contents/Info.plist")
    let data = try Data(contentsOf: plistURL)
    guard let dictionary = try PropertyListSerialization.propertyList(
        from: data,
        options: [],
        format: nil
    ) as? [String: Any],
    dictionary["CFBundleIdentifier"] as? String == "com.lijingchiu.macropulse"
    else {
        throw InstallerError.invalidBundle
    }
    try run("/usr/bin/codesign", ["--verify", "--deep", "--strict", app.path])
}

private func shellQuote(_ value: String) -> String {
    "'" + value.replacingOccurrences(of: "'", with: "'\\''") + "'"
}

private func appleScriptQuote(_ value: String) -> String {
    value
        .replacingOccurrences(of: "\\", with: "\\\\")
        .replacingOccurrences(of: "\"", with: "\\\"")
}

private func replaceWithPrivileges(stagedApp: URL, destination: URL) throws {
    let backup = destination.deletingLastPathComponent()
        .appendingPathComponent(".Macro Pulse.backup.app", isDirectory: true)
    let script = [
        "set -e",
        "rm -rf \(shellQuote(backup.path))",
        "if [ -e \(shellQuote(destination.path)) ]; then mv \(shellQuote(destination.path)) \(shellQuote(backup.path)); fi",
        "if /usr/bin/ditto \(shellQuote(stagedApp.path)) \(shellQuote(destination.path)) && /usr/bin/codesign --verify --deep --strict \(shellQuote(destination.path)); then",
        "  rm -rf \(shellQuote(backup.path))",
        "else",
        "  rm -rf \(shellQuote(destination.path))",
        "  if [ -e \(shellQuote(backup.path)) ]; then mv \(shellQuote(backup.path)) \(shellQuote(destination.path)); fi",
        "  exit 1",
        "fi",
    ].joined(separator: "\n")
    let source = "do shell script \"\(appleScriptQuote(script))\" with administrator privileges"
    try run("/usr/bin/osascript", ["-e", source])
}

private func replaceDirectly(stagedApp: URL, destination: URL) throws {
    let fileManager = FileManager.default
    let parent = destination.deletingLastPathComponent()
    try fileManager.createDirectory(at: parent, withIntermediateDirectories: true)
    let backup = parent.appendingPathComponent(".Macro Pulse.backup.app", isDirectory: true)

    if fileManager.fileExists(atPath: backup.path) {
        try fileManager.removeItem(at: backup)
    }
    if fileManager.fileExists(atPath: destination.path) {
        try fileManager.moveItem(at: destination, to: backup)
    }

    do {
        try run("/usr/bin/ditto", [stagedApp.path, destination.path])
        try verifyApp(destination)
        if fileManager.fileExists(atPath: backup.path) {
            try fileManager.removeItem(at: backup)
        }
    } catch {
        if fileManager.fileExists(atPath: destination.path) {
            try? fileManager.removeItem(at: destination)
        }
        if fileManager.fileExists(atPath: backup.path) {
            try? fileManager.moveItem(at: backup, to: destination)
        }
        throw error
    }
}

private func showFailure(_ message: String) {
    let safe = appleScriptQuote(message)
    try? run(
        "/usr/bin/osascript",
        ["-e", "display alert \"Macro Pulse update failed\" message \"\(safe)\" as critical"]
    )
}

var recoveryDestination: URL?
do {
    let arguments = try Arguments()
    recoveryDestination = arguments.destination
    try waitForExit(arguments.parentPID)

    let fileManager = FileManager.default
    let work = fileManager.temporaryDirectory
        .appendingPathComponent("MacroPulseUpdate-\(UUID().uuidString)", isDirectory: true)
    try fileManager.createDirectory(at: work, withIntermediateDirectories: true)
    defer {
        try? fileManager.removeItem(at: work)
        try? fileManager.removeItem(at: arguments.dmg)
    }

    var volume: URL?
    defer {
        if let volume {
            try? run("/usr/bin/hdiutil", ["detach", volume.path, "-quiet"])
        }
    }

    volume = try mountedVolume(for: arguments.dmg)
    guard let mountedApp = volume?.appendingPathComponent("Macro Pulse.app", isDirectory: true),
          fileManager.fileExists(atPath: mountedApp.path)
    else {
        throw InstallerError.appMissing
    }
    try verifyApp(mountedApp)

    let stagedApp = work.appendingPathComponent("Macro Pulse.app", isDirectory: true)
    try run("/usr/bin/ditto", [mountedApp.path, stagedApp.path])
    try verifyApp(stagedApp)

    let parent = arguments.destination.deletingLastPathComponent()
    if fileManager.isWritableFile(atPath: parent.path) {
        try replaceDirectly(stagedApp: stagedApp, destination: arguments.destination)
    } else {
        try replaceWithPrivileges(stagedApp: stagedApp, destination: arguments.destination)
        try verifyApp(arguments.destination)
    }

    try run("/usr/bin/open", ["-n", arguments.destination.path])
} catch {
    if let recoveryDestination,
       FileManager.default.fileExists(atPath: recoveryDestination.path) {
        try? run("/usr/bin/open", ["-n", recoveryDestination.path])
    }
    let message = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
    showFailure(message)
    exit(EXIT_FAILURE)
}
