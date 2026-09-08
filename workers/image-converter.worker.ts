/// <reference lib="webworker" />

import type {
  OutputFormat,
  WorkerRequest,
  WorkerResponse,
} from "@/lib/converter/types"

const scope = self as DedicatedWorkerGlobalScope

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? ""
}

async function decodeWithBrowser(
  buffer: ArrayBuffer,
  mimeType: string
): Promise<ImageData> {
  const bitmap = await createImageBitmap(new Blob([buffer], { type: mimeType }))
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const context = canvas.getContext("2d")

  if (!context) {
    bitmap.close()
    throw new Error("This browser cannot create a conversion canvas.")
  }

  context.drawImage(bitmap, 0, 0)
  const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height)
  bitmap.close()
  return imageData
}

async function decodeImage(request: WorkerRequest): Promise<ImageData> {
  const extension = getExtension(request.fileName)

  try {
    if (request.mimeType === "image/png" || extension === "png") {
      const { default: decode } = await import("@jsquash/png/decode")
      return (await decode(request.buffer)) as ImageData
    }
    if (
      request.mimeType === "image/jpeg" ||
      extension === "jpg" ||
      extension === "jpeg"
    ) {
      const { default: decode } = await import("@jsquash/jpeg/decode")
      return decode(request.buffer, { preserveOrientation: true })
    }
    if (request.mimeType === "image/webp" || extension === "webp") {
      const { default: decode } = await import("@jsquash/webp/decode")
      return decode(request.buffer)
    }
    if (request.mimeType === "image/avif" || extension === "avif") {
      const { default: decode } = await import("@jsquash/avif/decode")
      return (await decode(request.buffer)) as ImageData
    }
  } catch {
    // Browser decoding is a fallback for image variants newer than the codec.
  }

  return decodeWithBrowser(request.buffer, request.mimeType)
}

function flattenTransparency(image: ImageData) {
  const data = new Uint8ClampedArray(image.data)

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] / 255
    data[index] = Math.round(data[index] * alpha + 255 * (1 - alpha))
    data[index + 1] = Math.round(data[index + 1] * alpha + 255 * (1 - alpha))
    data[index + 2] = Math.round(data[index + 2] * alpha + 255 * (1 - alpha))
    data[index + 3] = 255
  }

  return new ImageData(data, image.width, image.height)
}

async function encodeImage(
  image: ImageData,
  format: OutputFormat,
  quality: number
) {
  switch (format) {
    case "png": {
      const { default: encode } = await import("@jsquash/png/encode")
      return encode(image)
    }
    case "jpeg": {
      const { default: encode } = await import("@jsquash/jpeg/encode")
      return encode(flattenTransparency(image), { quality })
    }
    case "webp": {
      const { default: encode } = await import("@jsquash/webp/encode")
      return encode(image, { quality })
    }
    case "avif": {
      const { default: encode } = await import("@jsquash/avif/encode")
      return encode(image, { quality, speed: 6 })
    }
  }
}

function send(message: WorkerResponse, transfer?: Transferable[]) {
  scope.postMessage(message, transfer ?? [])
}

scope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data

  try {
    send({ id: request.id, type: "progress", progress: 12 })
    const image = await decodeImage(request)
    send({ id: request.id, type: "progress", progress: 42 })
    const buffer = await encodeImage(image, request.format, request.quality)
    send({ id: request.id, type: "progress", progress: 92 })
    send({ id: request.id, type: "success", buffer }, [buffer])
  } catch (error) {
    send({
      id: request.id,
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "The image could not be converted.",
    })
  }
}

export {}
