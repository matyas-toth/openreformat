import type { OutputFormat } from "@/lib/converter/types"

export const formatDetails: Record<
  OutputFormat,
  { label: string; extension: string; mimeType: string; description: string }
> = {
  png: {
    label: "PNG",
    extension: "png",
    mimeType: "image/png",
    description: "Lossless · transparency",
  },
  jpeg: {
    label: "JPEG",
    extension: "jpg",
    mimeType: "image/jpeg",
    description: "Small · universal",
  },
  webp: {
    label: "WebP",
    extension: "webp",
    mimeType: "image/webp",
    description: "Modern · compact",
  },
  avif: {
    label: "AVIF",
    extension: "avif",
    mimeType: "image/avif",
    description: "Smallest · modern",
  },
}

export const acceptedFileTypes =
  "image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp"

export function outputName(fileName: string, format: OutputFormat) {
  const stem = fileName.includes(".")
    ? fileName.slice(0, fileName.lastIndexOf("."))
    : fileName

  return `${stem}.${formatDetails[format].extension}`
}

export function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"

  const units = ["B", "KB", "MB", "GB"]
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const value = bytes / 1024 ** unitIndex

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`
}
