import type { FFmpeg } from "@ffmpeg/ffmpeg"

import {
  buildFfmpegArguments,
  makeVideoOutputName,
  videoFormatDetails,
} from "@/lib/video-converter/formats"
import type { VideoOutput, VideoSettings } from "@/lib/video-converter/types"

let ffmpeg: FFmpeg | null = null
let ffmpegLoad: Promise<FFmpeg> | null = null
let activeProgress: ((progress: number) => void) | null = null
let lastFfmpegMessage = ""
let ffmpegGeneration = 0

async function loadFfmpeg(onStage: (stage: string) => void) {
  if (ffmpeg?.loaded) return ffmpeg
  if (ffmpegLoad) return ffmpegLoad

  const generation = ffmpegGeneration
  ffmpegLoad = (async () => {
    if (!window.crossOriginIsolated) {
      throw new Error(
        "Video conversion needs cross-origin isolation. Open the app through its configured Next.js server and try again."
      )
    }

    onStage("Loading the local video engine…")
    const { FFmpeg } = await import("@ffmpeg/ffmpeg")
    if (generation !== ffmpegGeneration) {
      throw new Error("Video engine loading was cancelled.")
    }
    const instance = new FFmpeg()
    ffmpeg = instance

    instance.on("progress", ({ progress }) => {
      activeProgress?.(Math.min(100, Math.max(0, Math.round(progress * 100))))
    })
    instance.on("log", ({ message }) => {
      lastFfmpegMessage = message
    })

    const assetUrl = (fileName: string) =>
      new URL(`/ffmpeg/${fileName}`, window.location.origin).href

    await instance.load({
      coreURL: assetUrl("ffmpeg-core.js"),
      wasmURL: assetUrl("ffmpeg-core.wasm"),
      workerURL: assetUrl("ffmpeg-core.worker.js"),
    })

    if (generation !== ffmpegGeneration) {
      instance.terminate()
      throw new Error("Video engine loading was cancelled.")
    }
    return instance
  })()

  try {
    return await ffmpegLoad
  } catch (error) {
    if (generation === ffmpegGeneration) {
      ffmpeg = null
      ffmpegLoad = null
    }
    throw error
  }
}

export async function convertVideoLocally(
  file: File,
  settings: VideoSettings,
  onProgress: (progress: number) => void,
  onStage: (stage: string) => void
): Promise<VideoOutput> {
  const instance = await loadFfmpeg(onStage)
  const operationId = crypto.randomUUID().replaceAll("-", "")
  const sourceExtension = file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".video"
  const inputName = `input-${operationId}${sourceExtension.toLowerCase()}`
  const outputName = `output-${operationId}.${settings.format}`

  activeProgress = onProgress
  lastFfmpegMessage = ""
  onProgress(0)
  onStage("Preparing your video…")

  try {
    await instance.writeFile(
      inputName,
      new Uint8Array(await file.arrayBuffer())
    )

    onStage("Converting locally…")
    const exitCode = await instance.exec(
      buildFfmpegArguments(inputName, outputName, settings)
    )

    if (exitCode !== 0) {
      throw new Error(
        lastFfmpegMessage ||
          "FFmpeg could not convert this video with those settings."
      )
    }

    onStage("Finishing the file…")
    const data = await instance.readFile(outputName)
    if (typeof data === "string") {
      throw new Error("The video engine returned an unexpected text result.")
    }

    return {
      blob: new Blob([data.slice().buffer as ArrayBuffer], {
        type: videoFormatDetails[settings.format].mimeType,
      }),
      fileName: makeVideoOutputName(file.name, settings.format),
    }
  } finally {
    activeProgress = null
    await instance.deleteFile(outputName).catch(() => undefined)
    await instance.deleteFile(inputName).catch(() => undefined)
  }
}

export function cancelVideoConversion() {
  ffmpegGeneration += 1
  ffmpeg?.terminate()
  ffmpeg = null
  ffmpegLoad = null
  activeProgress = null
}
