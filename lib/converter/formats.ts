import { OUTPUT_FORMATS, type OutputFormat } from "@/lib/converter/types"

export const formatDetails: Record<
  OutputFormat,
  {
    label: string
    extension: string
    mimeType: string
    description: string
    group: "web" | "specialty"
    quality: "lossless" | "adjustable"
  }
> = {
  png: {
    label: "PNG",
    extension: "png",
    mimeType: "image/png",
    description: "Lossless, transparency",
    group: "web",
    quality: "lossless",
  },
  jpeg: {
    label: "JPEG",
    extension: "jpg",
    mimeType: "image/jpeg",
    description: "Small, universal",
    group: "web",
    quality: "adjustable",
  },
  webp: {
    label: "WebP",
    extension: "webp",
    mimeType: "image/webp",
    description: "Modern, compact",
    group: "web",
    quality: "adjustable",
  },
  avif: {
    label: "AVIF",
    extension: "avif",
    mimeType: "image/avif",
    description: "Smallest, modern",
    group: "web",
    quality: "adjustable",
  },
  gif: {
    label: "GIF",
    extension: "gif",
    mimeType: "image/gif",
    description: "Static, 256 colors",
    group: "specialty",
    quality: "adjustable",
  },
  bmp: {
    label: "BMP",
    extension: "bmp",
    mimeType: "image/bmp",
    description: "Uncompressed, compatible",
    group: "specialty",
    quality: "lossless",
  },
  tiff: {
    label: "TIFF",
    extension: "tiff",
    mimeType: "image/tiff",
    description: "Lossless, archival",
    group: "specialty",
    quality: "lossless",
  },
  ico: {
    label: "ICO",
    extension: "ico",
    mimeType: "image/x-icon",
    description: "Favicon, up to 256 px",
    group: "specialty",
    quality: "lossless",
  },
  tga: {
    label: "TGA",
    extension: "tga",
    mimeType: "image/x-tga",
    description: "Textures, full alpha",
    group: "specialty",
    quality: "adjustable",
  },
  qoi: {
    label: "QOI",
    extension: "qoi",
    mimeType: "image/qoi",
    description: "Lossless, very fast",
    group: "specialty",
    quality: "lossless",
  },
}

export const formatGroups = [
  {
    label: "Web and everyday",
    formats: OUTPUT_FORMATS.filter(
      (format) => formatDetails[format].group === "web"
    ),
  },
  {
    label: "Specialty and archival",
    formats: OUTPUT_FORMATS.filter(
      (format) => formatDetails[format].group === "specialty"
    ),
  },
] as const

export const acceptedFileTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/x-icon",
  "image/svg+xml",
  "image/qoi",
  ".tif",
  ".tiff",
  ".ico",
  ".svg",
  ".tga",
  ".qoi",
].join(",")

const supportedInputExtensions = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "avif",
  "gif",
  "bmp",
  "tif",
  "tiff",
  "ico",
  "svg",
  "tga",
  "qoi",
])

export function isSupportedImage(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  return (
    file.type.startsWith("image/") || supportedInputExtensions.has(extension)
  )
}

export function canPreviewImage(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  return !["tif", "tiff", "tga", "qoi"].includes(extension)
}

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
