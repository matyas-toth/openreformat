"use client"

import * as React from "react"
import { ArrowsClockwiseIcon, DownloadSimpleIcon } from "@phosphor-icons/react"
import { zipSync } from "fflate"

import { DropZone } from "@/components/converter/drop-zone"
import { FileRow } from "@/components/converter/file-row"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardPanel } from "@/components/ui/card"
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
import { formatDetails, formatGroups } from "@/lib/converter/formats"
import type { OutputFormat } from "@/lib/converter/types"

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
  const isLossless = formatDetails[format].quality === "lossless"
  const convertLabel =
    items.length === 0
      ? "Convert images"
      : items.length === 1
        ? "Convert image"
        : `Convert ${items.length} images`

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
    <Card
      aria-label="Image converter"
      className="mt-10 sm:mt-12"
      data-agent-surface="image-converter"
    >
      <CardPanel className="flex flex-col gap-5 p-3 sm:p-5">
        <DropZone compact={items.length > 0} onFiles={handleFiles} />

        {notice ? (
          <Alert variant="warning">
            <AlertTitle>Unsupported file skipped</AlertTitle>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}

        {items.length > 0 ? (
          <div className="flex flex-col">
            <Separator className="mb-4" />
            <div className="flex items-center justify-between gap-3 px-2 py-1 sm:px-3">
              <div className="flex items-center gap-2">
                <p className="font-heading text-sm font-medium">
                  {items.length} {items.length === 1 ? "image" : "images"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {completedItems.length > 1 ? (
                  <Button onClick={downloadAll} size="sm" variant="outline">
                    <DownloadSimpleIcon
                      aria-hidden="true"
                      data-icon="inline-start"
                      weight="bold"
                    />
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
          </div>
        ) : null}

        <Separator />

        <div className="grid items-end gap-5 lg:grid-cols-[minmax(12rem,16rem)_minmax(14rem,1fr)_auto]">
          <Field>
            <FieldLabel>Convert to</FieldLabel>
            <Select
              disabled={isConverting}
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
                {formatGroups.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectGroupLabel>{group.label}</SelectGroupLabel>
                    {group.formats.map((option) => (
                      <SelectItem
                        data-agent-option={option}
                        key={option}
                        value={option}
                      >
                        {formatDetails[option].label} -{" "}
                        {formatDetails[option].description}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              {formatDetails[format].description}
            </FieldDescription>
          </Field>

          <Field data-disabled={isLossless || undefined}>
            <div className="flex w-full items-center justify-between gap-3">
              <FieldLabel>Quality</FieldLabel>
              <span className="font-mono text-xs text-muted-foreground">
                {isLossless ? "Lossless" : `${quality}%`}
              </span>
            </div>
            <Slider
              aria-label="Output quality"
              disabled={isLossless || isConverting}
              max={100}
              min={1}
              onValueChange={(value) =>
                setQuality(Array.isArray(value) ? value[0] : value)
              }
              step={1}
              value={[quality]}
            />
            <FieldDescription>
              {isLossless
                ? `${formatDetails[format].label} keeps the source pixels intact.`
                : "Higher quality creates a larger file."}
            </FieldDescription>
          </Field>

          <Button
            className="w-full lg:w-auto"
            data-agent-action="convert-images"
            disabled={!canConvert}
            loading={isConverting}
            onClick={convertAll}
            size="xl"
          >
            <ArrowsClockwiseIcon
              aria-hidden="true"
              data-icon="inline-start"
              weight="bold"
            />
            {convertLabel}
          </Button>
        </div>

       
      </CardPanel>
    </Card>
  )
}
