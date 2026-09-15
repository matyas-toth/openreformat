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
]

export const frameRateOptions: { value: VideoFrameRate; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "60", label: "60 fps" },
  { value: "30", label: "30 fps" },
  { value: "24", label: "24 fps" },
]

export const qualityOptions: { value: VideoQuality; label: string }[] = [
  { value: "small", label: "Smaller file" },
  { value: "balanced", label: "Balanced" },
  { value: "high", label: "Higher quality" },
]

const h264Crf: Record<VideoQuality, string> = {
  small: "30",
  balanced: "23",
  high: "18",
}

const vp9Crf: Record<VideoQuality, string> = {
  small: "40",
  balanced: "32",
  high: "24",
}

function resolveVideoCodec(
  settings: VideoSettings
): Exclude<VideoCodec, "auto"> {
  if (settings.videoCodec !== "auto") return settings.videoCodec
  return settings.format === "webm" ? "vp9" : "h264"
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

  if (settings.resolution !== "original") {
    filters.push(`scale=-2:${settings.resolution}`)
  }
  if (settings.frameRate !== "original") {
    filters.push(`fps=${settings.frameRate}`)
  }

  if (settings.format === "gif") {
    const filterChain = filters.length > 0 ? filters.join(",") : "null"
    return [
      "-i",
      inputPath,
      "-filter_complex",
      `[0:v]${filterChain},split[palette_source][gif_source];[palette_source]palettegen=stats_mode=diff[palette];[gif_source][palette]paletteuse=dither=sierra2_4a[gif]`,
      "-map",
      "[gif]",
      "-loop",
      "0",
      outputPath,
    ]
  }

  const videoCodec = resolveVideoCodec(settings)
  if (videoCodec === "h264" && settings.resolution === "original") {
    filters.push("scale=trunc(iw/2)*2:trunc(ih/2)*2")
  }
  const args = ["-i", inputPath, "-map", "0:v:0", "-map", "0:a?"]

  if (filters.length > 0) args.push("-vf", filters.join(","))

  if (videoCodec === "h264") {
    args.push(
      "-c:v",
      "libx264",
      "-threads",
      "2",
      "-preset",
      "veryfast",
      "-crf",
      h264Crf[settings.quality],
      "-pix_fmt",
      "yuv420p"
    )
  } else {
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
      vp9Crf[settings.quality],
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
