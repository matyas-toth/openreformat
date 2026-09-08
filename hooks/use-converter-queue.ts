"use client"

import * as React from "react"

import { formatDetails, outputName } from "@/lib/converter/formats"
import type {
  OutputFormat,
  QueueItem,
  WorkerRequest,
  WorkerResponse,
} from "@/lib/converter/types"

interface PendingConversion {
  resolve: (buffer: ArrayBuffer) => void
  reject: (error: Error) => void
  onProgress: (progress: number) => void
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

async function getDimensions(file: File) {
  try {
    const bitmap = await createImageBitmap(file)
    const dimensions = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return dimensions
  } catch {
    return {}
  }
}

function revokeItemUrls(item: QueueItem) {
  URL.revokeObjectURL(item.previewUrl)
  if (item.outputUrl) URL.revokeObjectURL(item.outputUrl)
}

export function useConverterQueue() {
  const [items, setItems] = React.useState<QueueItem[]>([])
  const [format, setFormat] = React.useState<OutputFormat>("webp")
  const [quality, setQuality] = React.useState(82)
  const [isConverting, setIsConverting] = React.useState(false)
  const workerRef = React.useRef<Worker | null>(null)
  const pendingRef = React.useRef(new Map<string, PendingConversion>())
  const itemsRef = React.useRef(items)
  itemsRef.current = items

  const getWorker = React.useCallback(() => {
    if (workerRef.current) return workerRef.current

    const worker = new Worker(
      new URL("../workers/image-converter.worker.ts", import.meta.url),
      { type: "module" }
    )

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data
      const pending = pendingRef.current.get(message.id)
      if (!pending) return

      if (message.type === "progress") {
        pending.onProgress(message.progress)
        return
      }

      pendingRef.current.delete(message.id)
      if (message.type === "success") pending.resolve(message.buffer)
      else pending.reject(new Error(message.message))
    }

    worker.onerror = () => {
      for (const pending of pendingRef.current.values()) {
        pending.reject(new Error("The conversion worker stopped unexpectedly."))
      }
      pendingRef.current.clear()
    }

    workerRef.current = worker
    return worker
  }, [])

  React.useEffect(() => {
    return () => {
      workerRef.current?.terminate()
      for (const item of itemsRef.current) revokeItemUrls(item)
    }
  }, [])

  const addFiles = React.useCallback(async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"))
    if (!imageFiles.length) return 0

    const additions = await Promise.all(
      imageFiles.map(async (file): Promise<QueueItem> => {
        const dimensions = await getDimensions(file)
        return {
          id: makeId(),
          file,
          previewUrl: URL.createObjectURL(file),
          status: "ready",
          progress: 0,
          ...dimensions,
        }
      })
    )

    setItems((current) => [...current, ...additions])
    return additions.length
  }, [])

  const removeItem = React.useCallback((id: string) => {
    setItems((current) => {
      const item = current.find((entry) => entry.id === id)
      if (item) revokeItemUrls(item)
      return current.filter((entry) => entry.id !== id)
    })
  }, [])

  const clearItems = React.useCallback(() => {
    setItems((current) => {
      for (const item of current) revokeItemUrls(item)
      return []
    })
  }, [])

  const convertOne = React.useCallback(
    (request: WorkerRequest, onProgress: (progress: number) => void) =>
      new Promise<ArrayBuffer>((resolve, reject) => {
        pendingRef.current.set(request.id, { resolve, reject, onProgress })
        getWorker().postMessage(request, [request.buffer])
      }),
    [getWorker]
  )

  const convertAll = React.useCallback(async () => {
    if (isConverting) return
    setIsConverting(true)

    const queue = itemsRef.current.filter(
      (item) => item.status !== "converting"
    )

    for (const item of queue) {
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, status: "converting", progress: 4, error: undefined }
            : entry
        )
      )

      try {
        const sourceBuffer = await item.file.arrayBuffer()
        const converted = await convertOne(
          {
            id: item.id,
            buffer: sourceBuffer,
            fileName: item.file.name,
            mimeType: item.file.type,
            format,
            quality,
          },
          (progress) => {
            setItems((current) =>
              current.map((entry) =>
                entry.id === item.id ? { ...entry, progress } : entry
              )
            )
          }
        )
        const blob = new Blob([converted], {
          type: formatDetails[format].mimeType,
        })
        const url = URL.createObjectURL(blob)

        setItems((current) =>
          current.map((entry) => {
            if (entry.id !== item.id) return entry
            if (entry.outputUrl) URL.revokeObjectURL(entry.outputUrl)
            return {
              ...entry,
              status: "done",
              progress: 100,
              outputUrl: url,
              outputSize: blob.size,
              outputName: outputName(entry.file.name, format),
            }
          })
        )
      } catch (error) {
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: "error",
                  progress: 0,
                  error:
                    error instanceof Error
                      ? error.message
                      : "The image could not be converted.",
                }
              : entry
          )
        )
      }
    }

    setIsConverting(false)
  }, [convertOne, format, isConverting, quality])

  const setOutputFormat = React.useCallback((nextFormat: OutputFormat) => {
    setFormat(nextFormat)
    setItems((current) =>
      current.map((item) => {
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl)
        return {
          ...item,
          status: "ready",
          progress: 0,
          outputUrl: undefined,
          outputSize: undefined,
          outputName: undefined,
          error: undefined,
        }
      })
    )
  }, [])

  return {
    items,
    format,
    quality,
    isConverting,
    addFiles,
    removeItem,
    clearItems,
    convertAll,
    setFormat: setOutputFormat,
    setQuality,
  }
}
