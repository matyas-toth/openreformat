import { copyFile, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = dirname(
  fileURLToPath(new URL("../package.json", import.meta.url))
)
const sourceDirectory = join(
  projectRoot,
  "node_modules",
  "@ffmpeg",
  "core-mt",
  "dist",
  "umd"
)
const targetDirectory = join(projectRoot, "public", "ffmpeg")
const runtimeFiles = [
  "ffmpeg-core.js",
  "ffmpeg-core.wasm",
  "ffmpeg-core.worker.js",
]

await mkdir(targetDirectory, { recursive: true })
await Promise.all(
  runtimeFiles.map((fileName) =>
    copyFile(join(sourceDirectory, fileName), join(targetDirectory, fileName))
  )
)

console.log("Synced the local FFmpeg WebAssembly runtime.")
