import AppKit
import Foundation

guard CommandLine.arguments.count == 2 else {
    fputs("Usage: swift generate-icon.swift OUTPUT.iconset\n", stderr)
    exit(64)
}

let outputDirectory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
try FileManager.default.createDirectory(
    at: outputDirectory,
    withIntermediateDirectories: true
)

let variants: [(name: String, pixels: Int)] = [
    ("icon_16x16.png", 16),
    ("icon_16x16@2x.png", 32),
    ("icon_32x32.png", 32),
    ("icon_32x32@2x.png", 64),
    ("icon_128x128.png", 128),
    ("icon_128x128@2x.png", 256),
    ("icon_256x256.png", 256),
    ("icon_256x256@2x.png", 512),
    ("icon_512x512.png", 512),
    ("icon_512x512@2x.png", 1024),
]

func drawIcon(pixels: Int) throws -> Data {
    guard let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: pixels,
        pixelsHigh: pixels,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ), let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
        throw NSError(domain: "MacroPulseIcon", code: 1)
    }

    let size = CGFloat(pixels)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    context.shouldAntialias = true
    context.imageInterpolation = .high

    NSColor.clear.setFill()
    NSRect(x: 0, y: 0, width: size, height: size).fill()

    let inset = size * 0.055
    let tileRect = NSRect(
        x: inset,
        y: inset,
        width: size - inset * 2,
        height: size - inset * 2
    )
    let tile = NSBezierPath(
        roundedRect: tileRect,
        xRadius: size * 0.215,
        yRadius: size * 0.215
    )
    NSColor(calibratedRed: 0.17, green: 0.12, blue: 0.085, alpha: 1).setFill()
    tile.fill()

    let baselineY = size * 0.285
    let baseline = NSBezierPath()
    baseline.move(to: NSPoint(x: size * 0.25, y: baselineY))
    baseline.line(to: NSPoint(x: size * 0.75, y: baselineY))
    baseline.lineWidth = max(1, size * 0.035)
    baseline.lineCapStyle = .round
    NSColor(calibratedWhite: 0.96, alpha: 0.95).setStroke()
    baseline.stroke()

    let bars: [(x: CGFloat, height: CGFloat)] = [
        (0.29, 0.18),
        (0.415, 0.27),
        (0.54, 0.22),
        (0.665, 0.36),
    ]

    NSColor(calibratedWhite: 0.96, alpha: 0.95).setFill()
    for bar in bars {
        let width = size * 0.055
        let rect = NSRect(
            x: size * bar.x - width / 2,
            y: baselineY,
            width: width,
            height: size * bar.height
        )
        NSBezierPath(
            roundedRect: rect,
            xRadius: width * 0.3,
            yRadius: width * 0.3
        ).fill()
    }

    let linePoints = [
        NSPoint(x: size * 0.27, y: size * 0.54),
        NSPoint(x: size * 0.41, y: size * 0.64),
        NSPoint(x: size * 0.54, y: size * 0.59),
        NSPoint(x: size * 0.70, y: size * 0.73),
    ]

    let trend = NSBezierPath()
    trend.move(to: linePoints[0])
    linePoints.dropFirst().forEach { trend.line(to: $0) }
    trend.lineWidth = max(1, size * 0.038)
    trend.lineCapStyle = .round
    trend.lineJoinStyle = .round
    NSColor(calibratedRed: 0.88, green: 0.49, blue: 0.25, alpha: 1).setStroke()
    trend.stroke()

    let dotDiameter = max(2, size * 0.068)
    NSColor(calibratedRed: 0.95, green: 0.60, blue: 0.34, alpha: 1).setFill()
    for point in linePoints {
        NSBezierPath(
            ovalIn: NSRect(
                x: point.x - dotDiameter / 2,
                y: point.y - dotDiameter / 2,
                width: dotDiameter,
                height: dotDiameter
            )
        ).fill()
    }

    NSGraphicsContext.restoreGraphicsState()

    guard let png = bitmap.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "MacroPulseIcon", code: 2)
    }
    return png
}

for variant in variants {
    let data = try drawIcon(pixels: variant.pixels)
    try data.write(to: outputDirectory.appendingPathComponent(variant.name))
}
