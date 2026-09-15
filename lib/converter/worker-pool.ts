import type { WorkerRequest, WorkerResponse } from "@/lib/converter/types"

interface ConversionTask {
  request: WorkerRequest
  onProgress: (progress: number) => void
  resolve: (buffer: ArrayBuffer) => void
  reject: (error: Error) => void
}

interface WorkerSlot {
  worker: Worker
  current?: ConversionTask
}

function createWorker() {
  return new Worker(
    new URL("../../workers/image-converter.worker.ts", import.meta.url),
    { type: "module" }
  )
}

export function recommendedWorkerCount() {
  const availableCores = navigator.hardwareConcurrency || 2
  return Math.max(1, Math.min(4, availableCores - 1))
}

export class ConverterWorkerPool {
  private slots: WorkerSlot[]
  private queue: ConversionTask[] = []
  private stopped = false

  constructor(size: number) {
    this.slots = Array.from({ length: size }, () => this.createSlot())
  }

  run(request: WorkerRequest, onProgress: (progress: number) => void) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      if (this.stopped) {
        reject(new Error("The conversion workers have stopped."))
        return
      }

      this.queue.push({ request, onProgress, resolve, reject })
      this.drain()
    })
  }

  terminate() {
    this.stopped = true
    const error = new Error("The conversion was cancelled.")

    for (const task of this.queue) task.reject(error)
    this.queue = []

    for (const slot of this.slots) {
      slot.current?.reject(error)
      slot.worker.terminate()
    }
  }

  private createSlot(): WorkerSlot {
    const slot: WorkerSlot = { worker: createWorker() }
    this.connect(slot)
    return slot
  }

  private connect(slot: WorkerSlot) {
    slot.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const task = slot.current
      const message = event.data
      if (!task || task.request.id !== message.id) return

      if (message.type === "progress") {
        task.onProgress(message.progress)
        return
      }

      slot.current = undefined
      if (message.type === "success") task.resolve(message.buffer)
      else task.reject(new Error(message.message))
      this.drain()
    }

    slot.worker.onerror = () => {
      slot.current?.reject(
        new Error("A conversion worker stopped unexpectedly.")
      )
      slot.current = undefined
      slot.worker.terminate()

      if (!this.stopped) {
        slot.worker = createWorker()
        this.connect(slot)
        this.drain()
      }
    }
  }

  private drain() {
    if (this.stopped) return

    for (const slot of this.slots) {
      if (slot.current) continue
      const task = this.queue.shift()
      if (!task) return

      slot.current = task
      slot.worker.postMessage(task.request, [task.request.buffer])
    }
  }
}
