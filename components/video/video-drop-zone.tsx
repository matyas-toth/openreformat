"use client"

import * as React from "react"
import { UploadSimpleIcon, VideoCameraIcon } from "@phosphor-icons/react"

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
import { acceptedVideoFileTypes } from "@/lib/video-converter/formats"
import { cn } from "@/lib/utils"

interface VideoDropZoneProps {
  compact?: boolean
  disabled?: boolean
  onFile: (file: File) => void
}

export function VideoDropZone({
  compact = false,
  disabled = false,
  onFile,
}: VideoDropZoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const acceptFile = (fileList: FileList | null) => {
    const firstFile = fileList?.item(0)
    if (firstFile) onFile(firstFile)
  }

  return (
    <div
      aria-describedby="supported-video-formats"
      className={cn(
        "rounded-xl border border-dashed transition-colors",
        isDragging && "border-primary bg-primary/4",
        disabled && "pointer-events-none opacity-64",
        compact && "rounded-lg"
      )}
      data-agent-action="drop-video"
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
        acceptFile(event.dataTransfer.files)
      }}
    >
      <Empty className={cn(compact ? "py-7 md:py-7" : "min-h-96 py-14")}>
        <EmptyHeader>
          <EmptyMedia className="border-primary text-primary" variant="icon">
            <VideoCameraIcon aria-hidden="true" weight="fill" />
          </EmptyMedia>
          <EmptyTitle className="tracking-tight">
            {compact ? "Replace video" : "Drop a video here"}
          </EmptyTitle>
          <EmptyDescription>
            {compact
              ? "Drop another video or browse your device"
              : "or choose a file from your device"}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Input
            accept={acceptedVideoFileTypes}
            aria-label="Choose a video file"
            className="sr-only"
            data-agent-action="choose-video-input"
            disabled={disabled}
            onChange={(event) => {
              acceptFile(event.currentTarget.files)
              event.currentTarget.value = ""
            }}
            ref={inputRef}
            type="file"
          />
          <Button
            data-agent-action="choose-video"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            size="xl"
          >
            <UploadSimpleIcon
              aria-hidden="true"
              data-icon="inline-start"
              weight="bold"
            />
            Choose video
          </Button>
          <p
            className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground sm:text-xs"
            id="supported-video-formats"
          >
            MP4 · MOV · WEBM · MKV · AVI · MPEG · GIF · 3GP
          </p>
        </EmptyContent>
      </Empty>
    </div>
  )
}
