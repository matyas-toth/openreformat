import { ImageConverter } from "@/components/converter/image-converter"
import Link from "next/link"

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <main
        className="container mx-auto flex w-full flex-1 flex-col px-5 pt-14 pb-5 sm:px-8 sm:pt-20 lg:pt-24"
        id="main"
      >
        <section className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center">
          <h1 className="font-heading text-4xl font-normal tracking-[-0.055em] text-balance sm:text-6xl sm:leading-[1.02]">
            Convert anything without limits.
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Images in, any format out. Your files never leave your device.
          </p>
        </section>

        <ImageConverter />
      </main>

      <footer className="">
        <div className="container mx-auto flex w-full flex-col items-center gap-2 px-5 py-5 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-14">
          <p>
            All processing happens locally in your browser using WebAssembly.
          </p>
          <p>made by <Link className="text-primary underline underline-offset-2" href="https://maty.as">maty.as</Link>, for a more open web</p>
        </div>
      </footer>
    </div>
  )
}
