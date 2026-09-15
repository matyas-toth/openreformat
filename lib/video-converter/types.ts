export const videoOutputFormats = ["mp4", "webm", "mov", "mkv", "gif"] as const

export type VideoOutputFormat = (typeof videoOutputFormats)[number]
export type VideoCodec = "auto" | "h264" | "vp9"
export type AudioCodec = "auto" | "aac" | "opus"
export type VideoResolution = "original" | "1080" | "720" | "480" | "custom"
export type VideoFrameRate = "original" | "60" | "30" | "24" | "custom"
export type VideoQuality = "small" | "balanced" | "high" | "custom"

export interface VideoSettings {
  format: VideoOutputFormat
  videoCodec: VideoCodec
  audioCodec: AudioCodec
  resolution: VideoResolution
  frameRate: VideoFrameRate
  quality: VideoQuality
  keepAudio: boolean
  customWidth: number
  customHeight: number
  keepAspectRatio: boolean
  customFrameRate: number
  customH264Crf: number
  customVp9Crf: number
  customGifColors: number
}

export interface VideoMetadata {
  duration: number | null
  width: number | null
  height: number | null
}

export interface VideoOutput {
  blob: Blob
  fileName: string
}

export type VideoConversionStatus =
  "idle" | "ready" | "loading" | "converting" | "done" | "error"
