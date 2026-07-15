import Cocoa
import CryptoKit

struct AppUpdate {
    let version: String
    let buildNumber: Int
    let tagName: String
    let downloadURL: URL
    let digest: String?
    let releasePageURL: URL
}

enum UpdateState {
    case idle
    case checking
    case current(String)
    case available(AppUpdate)
    case downloading(AppUpdate)
    case downloaded(AppUpdate, URL)
    case failed(String)
}

final class UpdateManager {
    var onStateChange: ((UpdateState) -> Void)?

    private(set) var state: UpdateState = .idle {
        didSet {
            onStateChange?(state)
        }
    }

    private let releasesURL = URL(
        string: "https://api.github.com/repos/lijingchiu/EconomicEvent/releases?per_page=50"
    )!
    private let assetName = "MacroPulse-macOS-Universal.dmg"
    private var checkTask: URLSessionDataTask?
    private var downloadTask: URLSessionDownloadTask?

    private var currentVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.0.0"
    }

    private var currentBuildNumber: Int {
        Int(Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "") ?? 0
    }

    func check() {
        guard checkTask == nil, downloadTask == nil else {
            return
        }

        state = .checking

        var request = URLRequest(url: releasesURL)
        request.timeoutInterval = 20
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("MacroPulse-macOS/\(currentVersion)", forHTTPHeaderField: "User-Agent")
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        request.setValue("2022-11-28", forHTTPHeaderField: "X-GitHub-Api-Version")

        let task = URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self else {
                return
            }

            let result: UpdateState
            do {
                if let error {
                    throw error
                }
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw UpdateError.invalidResponse
                }
                guard (200..<300).contains(httpResponse.statusCode) else {
                    throw UpdateError.httpStatus(httpResponse.statusCode)
                }
                guard let data else {
                    throw UpdateError.invalidResponse
                }

                let releases = try JSONDecoder().decode([GitHubRelease].self, from: data)
                if let update = self.newestUpdate(in: releases) {
                    result = .available(update)
                } else {
                    result = .current(self.currentVersion)
                }
            } catch {
                result = .failed(error.localizedDescription)
            }

            DispatchQueue.main.async {
                self.checkTask = nil
                self.state = result
            }
        }

        checkTask = task
        task.resume()
    }

    func downloadAvailableUpdate() {
        guard case let .available(update) = state,
              checkTask == nil,
              downloadTask == nil
        else {
            return
        }

        state = .downloading(update)

        var request = URLRequest(url: update.downloadURL)
        request.timeoutInterval = 120
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("MacroPulse-macOS/\(currentVersion)", forHTTPHeaderField: "User-Agent")
        request.setValue("application/octet-stream", forHTTPHeaderField: "Accept")

        let task = URLSession.shared.downloadTask(with: request) { [weak self] temporaryURL, response, error in
            guard let self else {
                return
            }

            let result: UpdateState
            do {
                if let error {
                    throw error
                }
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw UpdateError.invalidResponse
                }
                guard (200..<300).contains(httpResponse.statusCode) else {
                    throw UpdateError.httpStatus(httpResponse.statusCode)
                }
                guard let temporaryURL else {
                    throw UpdateError.invalidResponse
                }

                try self.verifyDownload(at: temporaryURL, expectedDigest: update.digest)
                let destination = try self.moveToDownloads(temporaryURL, version: update.version)
                result = .downloaded(update, destination)
            } catch {
                result = .failed(error.localizedDescription)
            }

            DispatchQueue.main.async {
                self.downloadTask = nil
                self.state = result
            }
        }

        downloadTask = task
        task.resume()
    }

    private func newestUpdate(in releases: [GitHubRelease]) -> AppUpdate? {
        let candidates = releases.compactMap { release -> AppUpdate? in
            guard !release.draft,
                  let releaseVersion = version(from: release.tagName),
                  isNewer(
                      version: releaseVersion.version,
                      buildNumber: releaseVersion.build
                  ),
                  let asset = release.assets.first(where: { $0.name == assetName })
            else {
                return nil
            }

            return AppUpdate(
                version: releaseVersion.version,
                buildNumber: releaseVersion.build,
                tagName: release.tagName,
                downloadURL: asset.browserDownloadURL,
                digest: asset.digest,
                releasePageURL: release.htmlURL
            )
        }

        return candidates.max {
            let versionComparison = compare($0.version, $1.version)
            if versionComparison == .orderedSame {
                return $0.buildNumber < $1.buildNumber
            }
            return versionComparison == .orderedAscending
        }
    }

    private func version(from tagName: String) -> (version: String, build: Int)? {
        let prefix = "macos-v"
        guard tagName.hasPrefix(prefix) else {
            return nil
        }

        let remainder = tagName.dropFirst(prefix.count)
        guard let separator = remainder.range(of: "-build-") else {
            return nil
        }

        let version = String(remainder[..<separator.lowerBound])
        let buildString = String(remainder[separator.upperBound...])
        let components = version.split(separator: ".")
        guard components.count >= 3,
              components.allSatisfy({ Int($0) != nil }),
              let build = Int(buildString)
        else {
            return nil
        }
        return (version: version, build: build)
    }

    private func isNewer(version: String, buildNumber: Int) -> Bool {
        let versionComparison = compare(version, currentVersion)
        if versionComparison == .orderedDescending {
            return true
        }
        if versionComparison == .orderedSame {
            return buildNumber > currentBuildNumber
        }
        return false
    }

    private func compare(_ lhs: String, _ rhs: String) -> ComparisonResult {
        let left = lhs.split(separator: ".").map { Int($0) ?? 0 }
        let right = rhs.split(separator: ".").map { Int($0) ?? 0 }

        for index in 0..<max(left.count, right.count) {
            let leftValue = index < left.count ? left[index] : 0
            let rightValue = index < right.count ? right[index] : 0
            if leftValue < rightValue {
                return .orderedAscending
            }
            if leftValue > rightValue {
                return .orderedDescending
            }
        }
        return .orderedSame
    }

    private func verifyDownload(at url: URL, expectedDigest: String?) throws {
        guard let expectedDigest,
              expectedDigest.lowercased().hasPrefix("sha256:")
        else {
            throw UpdateError.missingDigest
        }

        let expected = String(expectedDigest.dropFirst("sha256:".count)).lowercased()
        let data = try Data(contentsOf: url, options: .mappedIfSafe)
        let actual = SHA256.hash(data: data)
            .map { String(format: "%02x", $0) }
            .joined()

        guard actual == expected else {
            throw UpdateError.checksumMismatch
        }
    }

    private func moveToDownloads(_ temporaryURL: URL, version: String) throws -> URL {
        let fileManager = FileManager.default
        let downloadsDirectory = fileManager.urls(for: .downloadsDirectory, in: .userDomainMask).first
            ?? fileManager.temporaryDirectory
        try fileManager.createDirectory(
            at: downloadsDirectory,
            withIntermediateDirectories: true
        )

        let safeVersion = version.filter { $0.isNumber || $0 == "." || $0 == "-" }
        let destination = downloadsDirectory
            .appendingPathComponent("MacroPulse-\(safeVersion).dmg", isDirectory: false)

        if fileManager.fileExists(atPath: destination.path) {
            try fileManager.removeItem(at: destination)
        }
        try fileManager.copyItem(at: temporaryURL, to: destination)
        return destination
    }
}

private struct GitHubRelease: Decodable {
    let tagName: String
    let htmlURL: URL
    let draft: Bool
    let assets: [GitHubReleaseAsset]

    enum CodingKeys: String, CodingKey {
        case tagName = "tag_name"
        case htmlURL = "html_url"
        case draft
        case assets
    }
}

private struct GitHubReleaseAsset: Decodable {
    let name: String
    let browserDownloadURL: URL
    let digest: String?

    enum CodingKeys: String, CodingKey {
        case name
        case browserDownloadURL = "browser_download_url"
        case digest
    }
}

private enum UpdateError: LocalizedError {
    case invalidResponse
    case httpStatus(Int)
    case missingDigest
    case checksumMismatch

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "The update server returned an invalid response."
        case let .httpStatus(status):
            return "The update server returned HTTP \(status)."
        case .missingDigest:
            return "The update could not be verified because its SHA-256 digest is missing."
        case .checksumMismatch:
            return "The downloaded update failed SHA-256 verification and was not saved."
        }
    }
}
