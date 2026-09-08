"use client"

import * as React from "react"
import { FileImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { acceptedFileTypes } from "@/lib/converter/formats"
import { cn } from "@/lib/utils"

interface DropZoneProps {
  onFiles: (files: File[]) => void
  compact?: boolean
}

export function DropZone({ onFiles, compact = false }: DropZoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const acceptFiles = (fileList: FileList | null) => {
    if (!fileList) return
    onFiles(Array.from(fileList))
  }

  return (
    <div
      aria-describedby="supported-formats"
      className={cn(
        "rounded-xl border border-dashed transition-colors",
        isDragging && "border-primary bg-primary/4",
        compact && "rounded-lg"
      )}
      data-agent-action="drop-images"
      onDragEnter={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setIsDragging(false)
        }
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragging(false)
        acceptFiles(event.dataTransfer.files)
      }}
    >
      <Empty className={cn(compact ? "py-8 md:py-8" : "min-h-96 py-14")}>
        <EmptyHeader>
          <EmptyMedia className="border-primary text-primary" variant="icon">
            <FileImageIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle className="tracking-tight">
            {compact ? "Add more images" : "Drop images here"}
          </EmptyTitle>
          <EmptyDescription>
            {compact
              ? "Drop them here or browse your device"
              : "or choose files from your device"}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Input
            accept={acceptedFileTypes}
            aria-label="Choose image files"
            className="sr-only"
            data-agent-action="choose-images-input"
            multiple
            onChange={(event) => {
              acceptFiles(event.currentTarget.files)
              event.currentTarget.value = ""
            }}
            ref={inputRef}
            type="file"
          />
          <Button
            data-agent-action="choose-images"
            onClick={() => inputRef.current?.click()}
            size="xl"
          >
            Choose images
          </Button>
          <p
            className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground sm:text-xs"
            id="supported-formats"
          >
            PNG · JPEG · WEBP · AVIF · GIF · BMP
          </p>
        </EmptyContent>
      </Empty>
    </div>
  )
}
