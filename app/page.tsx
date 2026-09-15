import { ImageConverter } from "@/components/converter/image-converter"
import { ToolPage } from "@/components/tool-page"

export default function Page() {
  return (
    <ToolPage
      description="Fast, private conversion. Your files never leave your device."
      title="Convert images without limits."
    >
      <ImageConverter />
    </ToolPage>
  )
}
