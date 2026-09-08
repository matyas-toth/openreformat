"use client"

import { CheckIcon, DownloadIcon, RotateCcwIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { formatBytes } from "@/lib/converter/formats"
import type { QueueItem } from "@/lib/converter/types"

interface FileRowProps {
  item: QueueItem
  disabled: boolean
  onRemove: () => void
}

export function FileRow({ item, disabled, onRemove }: FileRowProps) {
  const dimensions =
    item.width && item.height ? `${item.width} × ${item.height}` : "Image"

  return (
    <li className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 py-4 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:gap-4">
      {/* A native image is content, while all interactive UI uses COSS. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        className="size-14 rounded-md border bg-muted object-cover sm:size-16"
        src={item.previewUrl}
      />
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-heading text-sm font-medium">
            {item.file.name}
          </p>
          {item.status === "done" ? (
            <Badge size="sm" variant="success">
              <CheckIcon aria-hidden="true" />
              Ready
            </Badge>
          ) : null}
          {item.status === "error" ? (
            <Badge size="sm" variant="error">
              Failed
            </Badge>
          ) : null}
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">
          {dimensions} · {formatBytes(item.file.size)}
          {item.outputSize ? ` → ${formatBytes(item.outputSize)}` : ""}
        </p>
        {item.status === "converting" ? (
          <Progress
            aria-label={`Converting ${item.file.name}`}
            value={item.progress}
          />
        ) : null}
        {item.error ? (
          <p className="text-xs text-destructive-foreground">{item.error}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        {item.outputUrl && item.outputName ? (
          <Button
            aria-label={`Download ${item.outputName}`}
            data-agent-action="download-converted-image"
            render={<a download={item.outputName} href={item.outputUrl} />}
            size="icon"
            variant="outline"
          >
            <DownloadIcon aria-hidden="true" />
          </Button>
        ) : null}
        {item.status === "error" ? (
          <RotateCcwIcon
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        ) : null}
        <Button
          aria-label={`Remove ${item.file.name}`}
          disabled={disabled}
          onClick={onRemove}
          size="icon"
          variant="ghost"
        >
          <XIcon aria-hidden="true" />
        </Button>
      </div>
    </li>
  )
}
