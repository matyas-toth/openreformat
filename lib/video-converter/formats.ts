import type {
  AudioCodec,
  VideoCodec,
  VideoFrameRate,
  VideoOutputFormat,
  VideoQuality,
  VideoResolution,
  VideoSettings,
} from "@/lib/video-converter/types"

export const acceptedVideoFileTypes = [
  "video/*",
  ".3gp",
  ".avi",
  ".gif",
  ".m2ts",
  ".m4v",
  ".mkv",
  ".mov",
  ".mp4",
  ".mpeg",
  ".mpg",
  ".mts",
  ".ogv",
  ".ts",
  ".webm",
].join(",")

export const videoFormatDetails: Record<
  VideoOutputFormat,
  { label: string; description: string; mimeType: string }
> = {
  mp4: {
    label: "MP4",
    description: "Universal, H.264",
    mimeType: "video/mp4",
  },
  webm: {
    label: "WebM",
    description: "Modern, compact",
    mimeType: "video/webm",
  },
  mov: {
    label: "MOV",
    description: "Editing, Apple-friendly",
    mimeType: "video/quicktime",
  },
  mkv: {
    label: "MKV",
    description: "Flexible, high quality",
    mimeType: "video/x-matroska",
  },
  gif: {
    label: "GIF",
    description: "Animated, no audio",
    mimeType: "image/gif",
  },
}

export const videoCodecOptions: Record<
  VideoOutputFormat,
  { value: VideoCodec; label: string }[]
> = {
  mp4: [
    { value: "auto", label: "Automatic (H.264)" },
    { value: "h264", label: "H.264" },
  ],
  webm: [
    { value: "auto", label: "Automatic (VP9)" },
    { value: "vp9", label: "VP9" },
  ],
  mov: [
    { value: "auto", label: "Automatic (H.264)" },
    { value: "h264", label: "H.264" },
  ],
  mkv: [
    { value: "auto", label: "Automatic (H.264)" },
    { value: "h264", label: "H.264" },
    { value: "vp9", label: "VP9" },
  ],
  gif: [{ value: "auto", label: "GIF palette" }],
}

export const audioCodecOptions: Record<
  VideoOutputFormat,
  { value: AudioCodec; label: string }[]
> = {
  mp4: [
    { value: "auto", label: "Automatic (AAC)" },
    { value: "aac", label: "AAC" },
  ],
  webm: [
    { value: "auto", label: "Automatic (Opus)" },
    { value: "opus", label: "Opus" },
  ],
  mov: [
    { value: "auto", label: "Automatic (AAC)" },
    { value: "aac", label: "AAC" },
  ],
  mkv: [
    { value: "auto", label: "Automatic (AAC)" },
    { value: "aac", label: "AAC" },
    { value: "opus", label: "Opus" },
  ],
  gif: [{ value: "auto", label: "No audio" }],
}

export const resolutionOptions: { value: VideoResolution; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "1080", label: "1080p" },
  { value: "720", label: "720p" },
  { value: "480", label: "480p" },
  { value: "custom", label: "Custom" },
]

export const frameRateOptions: { value: VideoFrameRate; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "60", label: "60 fps" },
  { value: "30", label: "30 fps" },
  { value: "24", label: "24 fps" },
  { value: "custom", label: "Custom" },
]

export const qualityOptions: { value: VideoQuality; label: string }[] = [
  { value: "small", label: "Smaller file" },
  { value: "balanced", label: "Balanced" },
  { value: "high", label: "Higher quality" },
  { value: "custom", label: "Custom" },
]

type VideoQualityPreset = Exclude<VideoQuality, "custom">

const h264Crf: Record<VideoQualityPreset, number> = {
  small: 30,
  balanced: 23,
  high: 18,
}

const vp9Crf: Record<VideoQualityPreset, number> = {
  small: 40,
  balanced: 32,
  high: 24,
}

const gifPaletteColors: Record<VideoQualityPreset, number> = {
  small: 96,
  balanced: 192,
  high: 256,
}

export const customResolutionBounds = { min: 2, max: 16_384 }
export const customFrameRateBounds = { min: 1, max: 360 }

export function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function resolveVideoCodec(
  settings: VideoSettings
): Exclude<VideoCodec, "auto"> {
  if (settings.videoCodec !== "auto") return settings.videoCodec
  return settings.format === "webm" ? "vp9" : "h264"
}

export function getCustomQualityControl(settings: VideoSettings) {
  if (settings.format === "gif") {
    return {
      label: "Palette colors",
      description: "More colors improve gradients but create a larger GIF.",
      min: 2,
      max: 256,
      value: settings.customGifColors,
    }
  }

  const codec = resolveVideoCodec(settings)
  return {
    label: "CRF",
    description: `Lower is higher quality. ${codec === "vp9" ? "VP9" : "H.264"} supports 0–${codec === "vp9" ? 63 : 51}.`,
    min: 0,
    max: codec === "vp9" ? 63 : 51,
    value: codec === "vp9" ? settings.customVp9Crf : settings.customH264Crf,
  }
}

function resolveAudioCodec(
  settings: VideoSettings
): Exclude<AudioCodec, "auto"> {
  if (settings.audioCodec !== "auto") return settings.audioCodec
  return settings.format === "webm" ? "opus" : "aac"
}

export function buildFfmpegArguments(
  inputPath: string,
  outputPath: string,
  settings: VideoSettings
) {
  const filters: string[] = []

  if (settings.resolution === "custom") {
    filters.push(
      `scale=${clampInteger(settings.customWidth, customResolutionBounds.min, customResolutionBounds.max)}:${clampInteger(settings.customHeight, customResolutionBounds.min, customResolutionBounds.max)}`
    )
  } else if (settings.resolution !== "original") {
    filters.push(`scale=-2:${settings.resolution}`)
  }
  if (settings.frameRate === "custom") {
    filters.push(
      `fps=${clampInteger(settings.customFrameRate, customFrameRateBounds.min, customFrameRateBounds.max)}`
    )
  } else if (settings.frameRate !== "original") {
    filters.push(`fps=${settings.frameRate}`)
  }

  if (settings.format === "gif") {
    const filterChain = filters.length > 0 ? filters.join(",") : "null"
    const paletteColors =
      settings.quality === "custom"
        ? clampInteger(settings.customGifColors, 2, 256)
        : gifPaletteColors[settings.quality]
    return [
      "-i",
      inputPath,
      "-filter_complex",
      `[0:v]${filterChain},split[palette_source][gif_source];[palette_source]palettegen=max_colors=${paletteColors}:stats_mode=diff[palette];[gif_source][palette]paletteuse=dither=sierra2_4a[gif]`,
      "-map",
      "[gif]",
      "-loop",
      "0",
      outputPath,
    ]
  }

  const videoCodec = resolveVideoCodec(settings)
  if (videoCodec === "h264" && settings.resolution === "custom") {
    filters[0] = `scale=${Math.floor(clampInteger(settings.customWidth, customResolutionBounds.min, customResolutionBounds.max) / 2) * 2}:${Math.floor(clampInteger(settings.customHeight, customResolutionBounds.min, customResolutionBounds.max) / 2) * 2}`
  }
  if (videoCodec === "h264" && settings.resolution === "original") {
    filters.push("scale=trunc(iw/2)*2:trunc(ih/2)*2")
  }
  const args = ["-i", inputPath, "-map", "0:v:0", "-map", "0:a?"]

  if (filters.length > 0) args.push("-vf", filters.join(","))

  if (videoCodec === "h264") {
    const crf =
      settings.quality === "custom"
        ? clampInteger(settings.customH264Crf, 0, 51)
        : h264Crf[settings.quality]
    args.push(
      "-c:v",
      "libx264",
      "-threads",
      "2",
      "-preset",
      "veryfast",
      "-crf",
      String(crf),
      "-pix_fmt",
      "yuv420p"
    )
  } else {
    const crf =
      settings.quality === "custom"
        ? clampInteger(settings.customVp9Crf, 0, 63)
        : vp9Crf[settings.quality]
    args.push(
      "-c:v",
      "libvpx-vp9",
      "-threads",
      "2",
      "-deadline",
      "good",
      "-cpu-used",
      "4",
      "-crf",
      String(crf),
      "-b:v",
      "0"
    )
  }

  if (settings.keepAudio) {
    const audioCodec = resolveAudioCodec(settings)
    args.push("-c:a", audioCodec === "aac" ? "aac" : "libopus", "-b:a", "128k")
  } else {
    args.push("-an")
  }

  if (settings.format === "mp4" || settings.format === "mov") {
    args.push("-movflags", "+faststart")
  }

  args.push(outputPath)
  return args
}

export function makeVideoOutputName(
  sourceName: string,
  format: VideoOutputFormat
) {
  const stem = sourceName.replace(/\.[^.]+$/, "") || "converted-video"
  return `${stem}.${format}`
}
