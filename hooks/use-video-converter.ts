"use client"

import * as React from "react"

import {
  cancelVideoConversion,
  convertVideoLocally,
} from "@/lib/video-converter/ffmpeg-client"
import {
  clampInteger,
  customFrameRateBounds,
  customResolutionBounds,
  resolveVideoCodec,
} from "@/lib/video-converter/formats"
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
  customWidth: 1920,
  customHeight: 1080,
  keepAspectRatio: true,
  customFrameRate: 25,
  customH264Crf: 23,
  customVp9Crf: 32,
  customGifColors: 192,
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
  const fileSelection = React.useRef(0)
  const customResolutionTouched = React.useRef(false)

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
      const selectionId = fileSelection.current + 1
      fileSelection.current = selectionId
      setError(null)
      setProgress(0)
      setStage("")
      setStatus("ready")
      setFile(nextFile)
      setMetadata(null)

      const nextPreviewUrl = URL.createObjectURL(nextFile)
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return nextPreviewUrl
      })
      const nextMetadata = await readVideoMetadata(nextPreviewUrl)
      if (fileSelection.current !== selectionId) return false
      setMetadata(nextMetadata)
      if (
        !customResolutionTouched.current &&
        nextMetadata.width &&
        nextMetadata.height
      ) {
        setSettings((current) => ({
          ...current,
          customWidth: nextMetadata.width as number,
          customHeight: nextMetadata.height as number,
        }))
      }
      return true
    },
    [clearOutput]
  )

  const clearFile = React.useCallback(() => {
    fileSelection.current += 1
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

  const updateSettings = React.useCallback(
    (updater: (current: VideoSettings) => VideoSettings) => {
      setSettings(updater)
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

  const setResolution = React.useCallback(
    (value: VideoResolution) => {
      updateSettings((current) => ({ ...current, resolution: value }))
    },
    [updateSettings]
  )

  const setCustomWidth = React.useCallback(
    (value: number) => {
      if (!Number.isFinite(value)) return
      customResolutionTouched.current = true
      updateSettings((current) => {
        const customWidth = clampInteger(
          value,
          customResolutionBounds.min,
          customResolutionBounds.max
        )
        if (!current.keepAspectRatio) return { ...current, customWidth }

        const aspectRatio =
          metadata?.width && metadata.height
            ? metadata.width / metadata.height
            : current.customWidth / current.customHeight
        return {
          ...current,
          customWidth,
          customHeight: clampInteger(
            customWidth / aspectRatio,
            customResolutionBounds.min,
            customResolutionBounds.max
          ),
        }
      })
    },
    [metadata, updateSettings]
  )

  const setCustomHeight = React.useCallback(
    (value: number) => {
      if (!Number.isFinite(value)) return
      customResolutionTouched.current = true
      updateSettings((current) => {
        const customHeight = clampInteger(
          value,
          customResolutionBounds.min,
          customResolutionBounds.max
        )
        if (!current.keepAspectRatio) return { ...current, customHeight }

        const aspectRatio =
          metadata?.width && metadata.height
            ? metadata.width / metadata.height
            : current.customWidth / current.customHeight
        return {
          ...current,
          customWidth: clampInteger(
            customHeight * aspectRatio,
            customResolutionBounds.min,
            customResolutionBounds.max
          ),
          customHeight,
        }
      })
    },
    [metadata, updateSettings]
  )

  const setKeepAspectRatio = React.useCallback(
    (keepAspectRatio: boolean) => {
      updateSettings((current) => {
        if (!keepAspectRatio) return { ...current, keepAspectRatio }
        const aspectRatio =
          metadata?.width && metadata.height
            ? metadata.width / metadata.height
            : current.customWidth / current.customHeight
        return {
          ...current,
          keepAspectRatio,
          customHeight: clampInteger(
            current.customWidth / aspectRatio,
            customResolutionBounds.min,
            customResolutionBounds.max
          ),
        }
      })
    },
    [metadata, updateSettings]
  )

  const setCustomFrameRate = React.useCallback(
    (value: number) => {
      if (!Number.isFinite(value)) return
      updateSetting(
        "customFrameRate",
        clampInteger(
          value,
          customFrameRateBounds.min,
          customFrameRateBounds.max
        )
      )
    },
    [updateSetting]
  )

  const setCustomQuality = React.useCallback(
    (value: number) => {
      if (!Number.isFinite(value)) return
      if (settings.format === "gif") {
        updateSetting("customGifColors", clampInteger(value, 2, 256))
        return
      }
      if (resolveVideoCodec(settings) === "vp9") {
        updateSetting("customVp9Crf", clampInteger(value, 0, 63))
        return
      }
      updateSetting("customH264Crf", clampInteger(value, 0, 51))
    },
    [settings, updateSetting]
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
    setResolution,
    setCustomWidth,
    setCustomHeight,
    setKeepAspectRatio,
    setFrameRate: (value: VideoFrameRate) => updateSetting("frameRate", value),
    setCustomFrameRate,
    setQuality: (value: VideoQuality) => updateSetting("quality", value),
    setCustomQuality,
    setKeepAudio: (value: boolean) => updateSetting("keepAudio", value),
  }
}
