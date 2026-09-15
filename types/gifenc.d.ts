declare module "gifenc" {
  type Palette = number[][]

  interface QuantizeOptions {
    format?: "rgb565" | "rgb444" | "rgba4444"
    oneBitAlpha?: boolean | number
  }

  interface FrameOptions {
    palette: Palette
    transparent?: boolean
    transparentIndex?: number
  }

  interface Encoder {
    writeFrame(
      pixels: Uint8Array,
      width: number,
      height: number,
      options: FrameOptions
    ): void
    finish(): void
    bytes(): Uint8Array
  }

  export function GIFEncoder(): Encoder
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: QuantizeOptions
  ): Palette
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Palette,
    format?: "rgb565" | "rgb444" | "rgba4444"
  ): Uint8Array
}
