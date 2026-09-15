"use client"

import * as React from "react"

import {
  cancelVideoConversion,
  convertVideoLocally,
} from "@/lib/video-converter/ffmpeg-client"
import { videoOutputFormats } from "@/lib/video-converter/types"
import type {
  AudioCodec,
  VideoCodec,
  VideoConversionStatus,
  VideoFrameRate,
  VideoMetadata,
  VideoOutputFormat,
  VideoQuality,
  VideoResolution,
  VideoSettings,
} from "@/lib/video-converter/types"

const supportedVideoExtensions = new Set([
  "3gp",
  "avi",
  "gif",
  "m2ts",
  "m4v",
  "mkv",
  "mov",
  "mp4",
  "mpeg",
  "mpg",
  "mts",
  "ogv",
  "ts",
  "webm",
])

const initialSettings: VideoSettings = {
  format: "mp4",
  videoCodec: "auto",
  audioCodec: "auto",
  resolution: "original",
  frameRate: "original",
  quality: "balanced",
  keepAudio: true,
}

function isSupportedVideo(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase()
  return (
    file.size > 0 &&
    (file.type.startsWith("video/") ||
      (extension ? supportedVideoExtensions.has(extension) : false))
  )
}

function readVideoMetadata(url: string): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    const video = document.createElement("video")
    const finish = (metadata: VideoMetadata) => {
      video.removeAttribute("src")
      video.load()
      resolve(metadata)
    }

    const timeout = window.setTimeout(
      () => finish({ duration: null, width: null, height: null }),
      10_000
    )

    video.preload = "metadata"
    video.onloadedmetadata = () => {
      window.clearTimeout(timeout)
      finish({
        duration: Number.isFinite(video.duration) ? video.duration : null,
        width: video.videoWidth || null,
        height: video.videoHeight || null,
      })
    }
    video.onerror = () => {
      window.clearTimeout(timeout)
      finish({ duration: null, width: null, height: null })
    }
    video.src = url
  })
}

export function useVideoConverter() {
  const [file, setFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [metadata, setMetadata] = React.useState<VideoMetadata | null>(null)
  const [settings, setSettings] = React.useState<VideoSettings>(initialSettings)
  const [status, setStatus] = React.useState<VideoConversionStatus>("idle")
  const [progress, setProgress] = React.useState(0)
  const [stage, setStage] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null)
  const [outputName, setOutputName] = React.useState<string | null>(null)
  const [outputSize, setOutputSize] = React.useState<number | null>(null)
  const operation = React.useRef(0)

  React.useEffect(() => {
    return () => {
      operation.current += 1
      cancelVideoConversion()
    }
  }, [])

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (outputUrl) URL.revokeObjectURL(outputUrl)
    }
  }, [outputUrl, previewUrl])

  const clearOutput = React.useCallback(() => {
    setOutputUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
    setOutputName(null)
    setOutputSize(null)
  }, [])

  const selectFile = React.useCallback(
    async (nextFile: File) => {
      if (!isSupportedVideo(nextFile)) {
        setError("Choose a supported video file with content in it.")
        return false
      }

      clearOutput()
      setError(null)
      setProgress(0)
      setStage("")
      setStatus("ready")
      setFile(nextFile)

      const nextPreviewUrl = URL.createObjectURL(nextFile)
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return nextPreviewUrl
      })
      setMetadata(await readVideoMetadata(nextPreviewUrl))
      return true
    },
    [clearOutput]
  )

  const clearFile = React.useCallback(() => {
    setFile(null)
    setMetadata(null)
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
    clearOutput()
    setError(null)
    setProgress(0)
    setStage("")
    setStatus("idle")
  }, [clearOutput])

  const updateSetting = React.useCallback(
    <Key extends keyof VideoSettings>(key: Key, value: VideoSettings[Key]) => {
      setSettings((current) => ({ ...current, [key]: value }))
      clearOutput()
      setStatus((current) => (current === "done" ? "ready" : current))
    },
    [clearOutput]
  )

  const setFormat = React.useCallback(
    (format: VideoOutputFormat) => {
      if (!videoOutputFormats.includes(format)) return
      setSettings((current) => ({
        ...current,
        format,
        videoCodec: "auto",
        audioCodec: "auto",
      }))
      clearOutput()
      setStatus((current) => (current === "done" ? "ready" : current))
    },
    [clearOutput]
  )

  const convert = React.useCallback(async () => {
    if (!file || status === "loading" || status === "converting") return

    const operationId = operation.current + 1
    operation.current = operationId
    clearOutput()
    setError(null)
    setProgress(0)
    setStage("Loading the local video engine…")
    setStatus("loading")

    try {
      const output = await convertVideoLocally(
        file,
        settings,
        (nextProgress) => {
          if (operation.current === operationId) setProgress(nextProgress)
        },
        (nextStage) => {
          if (operation.current !== operationId) return
          setStage(nextStage)
          if (nextStage === "Converting locally…") setStatus("converting")
        }
      )

      if (operation.current !== operationId) return
      const nextOutputUrl = URL.createObjectURL(output.blob)
      setOutputUrl(nextOutputUrl)
      setOutputName(output.fileName)
      setOutputSize(output.blob.size)
      setProgress(100)
      setStage("Ready to download")
      setStatus("done")
    } catch (caughtError) {
      if (operation.current !== operationId) return
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "This video could not be converted. Try another format or setting."
      )
      setStage("")
      setStatus("error")
    }
  }, [clearOutput, file, settings, status])

  const cancel = React.useCallback(() => {
    operation.current += 1
    cancelVideoConversion()
    setProgress(0)
    setStage("")
    setError(null)
    setStatus(file ? "ready" : "idle")
  }, [file])

  return {
    file,
    previewUrl,
    metadata,
    settings,
    status,
    progress,
    stage,
    error,
    outputUrl,
    outputName,
    outputSize,
    selectFile,
    clearFile,
    convert,
    cancel,
    setFormat,
    setVideoCodec: (value: VideoCodec) => updateSetting("videoCodec", value),
    setAudioCodec: (value: AudioCodec) => updateSetting("audioCodec", value),
    setResolution: (value: VideoResolution) =>
      updateSetting("resolution", value),
    setFrameRate: (value: VideoFrameRate) => updateSetting("frameRate", value),
    setQuality: (value: VideoQuality) => updateSetting("quality", value),
    setKeepAudio: (value: boolean) => updateSetting("keepAudio", value),
  }
}
