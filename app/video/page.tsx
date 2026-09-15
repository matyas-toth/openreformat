import type { Metadata } from "next"

import { ToolPage } from "@/components/tool-page"
import { VideoConverter } from "@/components/video/video-converter"

export const metadata: Metadata = {
  title: "Secure and private video converter | OpenReformat",
  description:
    "Convert videos locally in your browser with the power of WebAssembly. No uploads or file limits.",
}

export default function VideoPage() {
  return (
    <ToolPage
      description="Fast, private conversion. Your videos never leave your device."
      title="Convert videos without limits."
    >
      <VideoConverter />
    </ToolPage>
  )
}
