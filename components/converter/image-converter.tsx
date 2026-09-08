"use client"

import * as React from "react"
import { zipSync } from "fflate"
import { DownloadIcon, LockKeyholeIcon, SparklesIcon } from "lucide-react"

import { DropZone } from "@/components/converter/drop-zone"
import { FileRow } from "@/components/converter/file-row"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { useConverterQueue } from "@/hooks/use-converter-queue"
import { formatDetails } from "@/lib/converter/formats"
import { OUTPUT_FORMATS, type OutputFormat } from "@/lib/converter/types"

export function ImageConverter() {
  const {
    items,
    format,
    quality,
    isConverting,
    addFiles,
    removeItem,
    clearItems,
    convertAll,
    setFormat,
    setQuality,
  } = useConverterQueue()
  const [notice, setNotice] = React.useState<string | null>(null)

  const handleFiles = async (files: File[]) => {
    const added = await addFiles(files)
    setNotice(
      added === files.length
        ? null
        : "Some files were skipped because they were not supported images."
    )
  }

  const completedItems = items.filter(
    (item) => item.outputUrl && item.outputName
  )
  const canConvert = items.length > 0 && !isConverting

  const downloadAll = async () => {
    const usedNames = new Set<string>()
    const files = await Promise.all(
      completedItems.map(async (item) => {
        const response = await fetch(item.outputUrl as string)
        const requestedName = item.outputName as string
        let archiveName = requestedName
        let suffix = 2

        while (usedNames.has(archiveName)) {
          const dotIndex = requestedName.lastIndexOf(".")
          archiveName = `${requestedName.slice(0, dotIndex)}-${suffix}${requestedName.slice(dotIndex)}`
          suffix += 1
        }
        usedNames.add(archiveName)

        return [archiveName, new Uint8Array(await response.arrayBuffer())]
      })
    )
    const zipped = zipSync(Object.fromEntries(files), { level: 0 })
    const zipUrl = URL.createObjectURL(
      new Blob([zipped.slice().buffer as ArrayBuffer], {
        type: "application/zip",
      })
    )
    const anchor = document.createElement("a")
    anchor.href = zipUrl
    anchor.download = `limitless-${format}.zip`
    anchor.click()
    URL.revokeObjectURL(zipUrl)
  }

  return (
    <section
      aria-label="Image converter"
      className="mt-12 rounded-xl  bg-card p-3  sm:mt-16 sm:p-5"
      data-agent-surface="image-converter"
      style={{ "--shadow-color": "var(--border)" } as React.CSSProperties}
    >
      {items.length === 0 ? (
        <DropZone onFiles={handleFiles} />
      ) : (
        <div className="flex flex-col">
          <div className="flex flex-col gap-5 p-2 sm:flex-row sm:items-end sm:justify-between sm:p-3">
            <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-[minmax(11rem,15rem)_minmax(12rem,1fr)]">
              <Field>
                <FieldLabel>Convert to</FieldLabel>
                <Select
                  onValueChange={(value) => setFormat(value as OutputFormat)}
                  value={format}
                >
                  <SelectTrigger
                    aria-label="Output format"
                    data-agent-action="select-output-format"
                  >
                    <SelectValue>
                      {(value: OutputFormat | null) =>
                        value ? formatDetails[value].label : "Choose a format"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectGroupLabel>Output format</SelectGroupLabel>
                      {OUTPUT_FORMATS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {formatDetails[option].label} —{" "}
                          {formatDetails[option].description}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field data-disabled={format === "png" || undefined}>
                <div className="flex w-full items-center justify-between gap-3">
                  <FieldLabel>Quality</FieldLabel>
                  <span className="font-mono text-xs text-muted-foreground">
                    {format === "png" ? "Lossless" : `${quality}%`}
                  </span>
                </div>
                <Slider
                  aria-label="Output quality"
                  disabled={format === "png"}
                  max={100}
                  min={1}
                  onValueChange={(value) =>
                    setQuality(Array.isArray(value) ? value[0] : value)
                  }
                  step={1}
                  value={[quality]}
                />
                <FieldDescription>
                  {format === "png"
                    ? "PNG keeps every pixel intact."
                    : "Higher quality creates a larger file."}
                </FieldDescription>
              </Field>
            </div>

            <Button
              data-agent-action="convert-images"
              disabled={!canConvert}
              loading={isConverting}
              onClick={convertAll}
              size="xl"
            >
              <SparklesIcon aria-hidden="true" data-icon="inline-start" />
              Convert {items.length} {items.length === 1 ? "image" : "images"}
            </Button>
          </div>

          <Separator className="my-3" />

          {notice ? (
            <Alert className="mb-3" variant="warning">
              <AlertTitle>Unsupported file skipped</AlertTitle>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex items-center justify-between gap-3 px-2 py-1 sm:px-3">
            <div className="flex items-center gap-2">
              <p className="font-heading text-sm font-medium">
                {items.length} {items.length === 1 ? "image" : "images"}
              </p>
             
            </div>
            <div className="flex items-center gap-1">
              {completedItems.length > 1 ? (
                <Button onClick={downloadAll} size="sm" variant="outline">
                  <DownloadIcon aria-hidden="true" data-icon="inline-start" />
                  Download all
                </Button>
              ) : null}
              <Button
                disabled={isConverting}
                onClick={clearItems}
                size="sm"
                variant="ghost"
              >
                Clear
              </Button>
            </div>
          </div>

          <ul
            className="divide-y px-2 sm:px-3"
            data-agent-list="conversion-queue"
          >
            {items.map((item) => (
              <FileRow
                disabled={isConverting}
                item={item}
                key={item.id}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </ul>

          <Separator className="my-3" />
          <DropZone compact onFiles={handleFiles} />
        </div>
      )}
    </section>
  )
}
