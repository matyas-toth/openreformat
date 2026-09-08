export const OUTPUT_FORMATS = ["png", "jpeg", "webp", "avif"] as const

export type OutputFormat = (typeof OUTPUT_FORMATS)[number]

export type ConversionStatus = "ready" | "converting" | "done" | "error"

export interface QueueItem {
  id: string
  file: File
  previewUrl: string
  width?: number
  height?: number
  status: ConversionStatus
  progress: number
  outputUrl?: string
  outputSize?: number
  outputName?: string
  error?: string
}

export interface WorkerRequest {
  id: string
  buffer: ArrayBuffer
  fileName: string
  mimeType: string
  format: OutputFormat
  quality: number
}

export type WorkerResponse =
  | { id: string; type: "progress"; progress: number }
  | { id: string; type: "success"; buffer: ArrayBuffer }
  | { id: string; type: "error"; message: string }
