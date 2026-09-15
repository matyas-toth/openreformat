"use client"

import * as React from "react"

import {
  formatDetails,
  isSupportedImage,
  outputName,
} from "@/lib/converter/formats"
import {
  ConverterWorkerPool,
  recommendedWorkerCount,
} from "@/lib/converter/worker-pool"
import type {
  OutputFormat,
  QueueItem,
  WorkerRequest,
} from "@/lib/converter/types"

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
  const workerPoolRef = React.useRef<ConverterWorkerPool | null>(null)
  const itemsRef = React.useRef(items)
  itemsRef.current = items

  const getWorkerPool = React.useCallback(() => {
    workerPoolRef.current ??= new ConverterWorkerPool(recommendedWorkerCount())
    return workerPoolRef.current
  }, [])

  React.useEffect(() => {
    return () => {
      workerPoolRef.current?.terminate()
      for (const item of itemsRef.current) revokeItemUrls(item)
    }
  }, [])

  const addFiles = React.useCallback(async (files: File[]) => {
    const imageFiles = files.filter(isSupportedImage)
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
      getWorkerPool().run(request, onProgress),
    [getWorkerPool]
  )

  const convertAll = React.useCallback(async () => {
    if (isConverting) return
    setIsConverting(true)

    const queue = itemsRef.current.filter(
      (item) => item.status !== "converting"
    )

    await Promise.all(
      queue.map(async (item) => {
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: "converting",
                  progress: 4,
                  error: undefined,
                }
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
      })
    )

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
