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

function mimeTypeForExtension(extension: string) {
  const mimeTypes: Record<string, string> = {
    bmp: "image/bmp",
    gif: "image/gif",
    ico: "image/x-icon",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    svg: "image/svg+xml",
    tga: "image/x-tga",
  }

  return mimeTypes[extension] ?? "application/octet-stream"
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

function decodeTga(buffer: ArrayBuffer) {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  if (buffer.byteLength < 18 || bytes[1] !== 0 || bytes[2] !== 2) {
    throw new Error("Only uncompressed true-color TGA images are supported.")
  }

  const width = view.getUint16(12, true)
  const height = view.getUint16(14, true)
  const bitsPerPixel = bytes[16]
  const bytesPerPixel = bitsPerPixel / 8
  const pixelOffset = 18 + bytes[0]

  if (!width || !height || (bitsPerPixel !== 24 && bitsPerPixel !== 32)) {
    throw new Error("This TGA color depth is not supported.")
  }
  if (pixelOffset + width * height * bytesPerPixel > buffer.byteLength) {
    throw new Error("This TGA file is incomplete.")
  }

  const topOrigin = (bytes[17] & 0x20) !== 0
  const output = new Uint8ClampedArray(width * height * 4)

  for (let y = 0; y < height; y += 1) {
    const sourceY = topOrigin ? y : height - 1 - y
    for (let x = 0; x < width; x += 1) {
      const source = pixelOffset + (sourceY * width + x) * bytesPerPixel
      const target = (y * width + x) * 4
      output[target] = bytes[source + 2]
      output[target + 1] = bytes[source + 1]
      output[target + 2] = bytes[source]
      output[target + 3] = bytesPerPixel === 4 ? bytes[source + 3] : 255
    }
  }

  return new ImageData(output, width, height)
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
    if (
      request.mimeType === "image/tiff" ||
      extension === "tif" ||
      extension === "tiff"
    ) {
      const UTIF = await import("utif2")
      const ifds = UTIF.decode(request.buffer)
      const firstImage = ifds[0]

      if (!firstImage) throw new Error("This TIFF does not contain an image.")

      UTIF.decodeImage(request.buffer, firstImage)
      const rgba = UTIF.toRGBA8(firstImage)
      return new ImageData(
        new Uint8ClampedArray(rgba),
        firstImage.width,
        firstImage.height
      )
    }
    if (request.mimeType === "image/qoi" || extension === "qoi") {
      const { default: decode } = await import("@jsquash/qoi/decode")
      return decode(request.buffer)
    }
    if (request.mimeType === "image/x-tga" || extension === "tga") {
      return decodeTga(request.buffer)
    }
  } catch {
    // Browser decoding is a fallback for image variants newer than the codec.
  }

  return decodeWithBrowser(
    request.buffer,
    request.mimeType || mimeTypeForExtension(extension)
  )
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

function exactArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer
}

function encodeBmp(image: ImageData) {
  const bytesPerPixel = 4
  const pixelOffset = 54
  const imageSize = image.width * image.height * bytesPerPixel
  const buffer = new ArrayBuffer(pixelOffset + imageSize)
  const view = new DataView(buffer)
  const output = new Uint8Array(buffer)

  output[0] = 0x42
  output[1] = 0x4d
  view.setUint32(2, buffer.byteLength, true)
  view.setUint32(10, pixelOffset, true)
  view.setUint32(14, 40, true)
  view.setInt32(18, image.width, true)
  view.setInt32(22, image.height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 32, true)
  view.setUint32(34, imageSize, true)

  for (let y = 0; y < image.height; y += 1) {
    const sourceY = image.height - 1 - y
    for (let x = 0; x < image.width; x += 1) {
      const source = (sourceY * image.width + x) * 4
      const target = pixelOffset + (y * image.width + x) * 4
      output[target] = image.data[source + 2]
      output[target + 1] = image.data[source + 1]
      output[target + 2] = image.data[source]
      output[target + 3] = image.data[source + 3]
    }
  }

  return buffer
}

function encodeTga(image: ImageData) {
  const headerSize = 18
  const imageSize = image.width * image.height * 4
  const buffer = new ArrayBuffer(headerSize + imageSize)
  const view = new DataView(buffer)
  const output = new Uint8Array(buffer)

  output[2] = 2
  view.setUint16(12, image.width, true)
  view.setUint16(14, image.height, true)
  output[16] = 32
  output[17] = 0x28

  for (let index = 0; index < image.width * image.height; index += 1) {
    const source = index * 4
    const target = headerSize + source
    output[target] = image.data[source + 2]
    output[target + 1] = image.data[source + 1]
    output[target + 2] = image.data[source]
    output[target + 3] = image.data[source + 3]
  }

  return buffer
}

async function encodeGif(image: ImageData, quality: number) {
  const { GIFEncoder, applyPalette, quantize } = await import("gifenc")
  const hasTransparency = image.data.some(
    (channel, index) => index % 4 === 3 && channel < 128
  )
  const pixelFormat = hasTransparency ? "rgba4444" : "rgb565"
  const colorCount = Math.max(
    32,
    Math.min(256, Math.round(32 + quality * 2.24))
  )
  const palette = quantize(image.data, colorCount, {
    format: pixelFormat,
    oneBitAlpha: hasTransparency,
  })
  const pixels = applyPalette(image.data, palette, pixelFormat)
  const transparentIndex = hasTransparency
    ? palette.findIndex((color) => color[3] === 0)
    : -1
  const gif = GIFEncoder()

  gif.writeFrame(pixels, image.width, image.height, {
    palette,
    transparent: transparentIndex >= 0,
    transparentIndex: Math.max(0, transparentIndex),
  })
  gif.finish()
  return exactArrayBuffer(gif.bytes())
}

async function encodeTiff(image: ImageData) {
  const UTIF = await import("utif2")
  const rgba = new Uint8Array(
    image.data.buffer,
    image.data.byteOffset,
    image.data.byteLength
  )
  return UTIF.encodeImage(rgba, image.width, image.height)
}

function resizeWithin(image: ImageData, maximumSize: number) {
  if (image.width <= maximumSize && image.height <= maximumSize) return image

  const scale = Math.min(maximumSize / image.width, maximumSize / image.height)
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const source = new OffscreenCanvas(image.width, image.height)
  const sourceContext = source.getContext("2d")
  const target = new OffscreenCanvas(width, height)
  const targetContext = target.getContext("2d")

  if (!sourceContext || !targetContext) {
    throw new Error("This browser cannot resize an icon image.")
  }

  sourceContext.putImageData(image, 0, 0)
  targetContext.imageSmoothingEnabled = true
  targetContext.imageSmoothingQuality = "high"
  targetContext.drawImage(source, 0, 0, width, height)
  return targetContext.getImageData(0, 0, width, height)
}

function wrapPngAsIco(png: ArrayBuffer, width: number, height: number) {
  const headerSize = 6
  const entrySize = 16
  const imageOffset = headerSize + entrySize
  const buffer = new ArrayBuffer(imageOffset + png.byteLength)
  const view = new DataView(buffer)
  const output = new Uint8Array(buffer)

  view.setUint16(0, 0, true)
  view.setUint16(2, 1, true)
  view.setUint16(4, 1, true)
  output[6] = width >= 256 ? 0 : width
  output[7] = height >= 256 ? 0 : height
  output[8] = 0
  output[9] = 0
  view.setUint16(10, 1, true)
  view.setUint16(12, 32, true)
  view.setUint32(14, png.byteLength, true)
  view.setUint32(18, imageOffset, true)
  output.set(new Uint8Array(png), imageOffset)
  return buffer
}

async function encodeIco(image: ImageData) {
  const iconImage = resizeWithin(image, 256)
  const { default: encode } = await import("@jsquash/png/encode")
  const png = await encode(iconImage)
  return wrapPngAsIco(png, iconImage.width, iconImage.height)
}

async function encodeAvif(image: ImageData, quality: number) {
  const [{ default: createEncoder }, { initEmscriptenModule }] =
    await Promise.all([
      import("@jsquash/avif/codec/enc/avif_enc.js"),
      import("@jsquash/avif/utils.js"),
    ])
  const encoder = await initEmscriptenModule(createEncoder)
  const source = new Uint8Array(
    image.data.buffer,
    image.data.byteOffset,
    image.data.byteLength
  )
  const result = encoder.encode(source, image.width, image.height, {
    quality,
    qualityAlpha: -1,
    denoiseLevel: 0,
    tileColsLog2: 0,
    tileRowsLog2: 0,
    speed: 6,
    subsample: 1,
    chromaDeltaQ: false,
    sharpness: 0,
    tune: 0,
    enableSharpYUV: false,
    bitDepth: 8,
    lossless: false,
  })

  if (!result) throw new Error("AVIF encoding failed.")
  return exactArrayBuffer(result)
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
      return encodeAvif(image, quality)
    }
    case "gif":
      return encodeGif(image, quality)
    case "bmp":
      return encodeBmp(image)
    case "tiff":
      return encodeTiff(image)
    case "ico":
      return encodeIco(image)
    case "tga":
      return encodeTga(image)
    case "qoi": {
      const { default: encode } = await import("@jsquash/qoi/encode")
      return encode(image)
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
