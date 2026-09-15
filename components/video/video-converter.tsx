"use client"

import * as React from "react"
import {
  ArrowsClockwiseIcon,
  CaretDownIcon,
  CheckCircleIcon,
  DownloadSimpleIcon,
  VideoCameraIcon,
  XIcon,
} from "@phosphor-icons/react"

import { VideoDropZone } from "@/components/video/video-drop-zone"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardPanel } from "@/components/ui/card"
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { EmptyMedia } from "@/components/ui/empty"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useVideoConverter } from "@/hooks/use-video-converter"
import { formatBytes } from "@/lib/converter/formats"
import {
  audioCodecOptions,
  frameRateOptions,
  qualityOptions,
  resolutionOptions,
  videoCodecOptions,
  videoFormatDetails,
} from "@/lib/video-converter/formats"
import { videoOutputFormats } from "@/lib/video-converter/types"
import type {
  AudioCodec,
  VideoCodec,
  VideoFrameRate,
  VideoOutputFormat,
  VideoQuality,
  VideoResolution,
} from "@/lib/video-converter/types"
import { cn } from "@/lib/utils"

interface Option {
  value: string
  label: string
}

interface SettingsSelectProps {
  label: string
  value: string
  options: Option[]
  disabled?: boolean
  onValueChange: (value: string) => void
}

function SettingsSelect({
  label,
  value,
  options,
  disabled,
  onValueChange,
}: SettingsSelectProps) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select
        disabled={disabled}
        onValueChange={(nextValue) => {
          if (nextValue) onValueChange(nextValue)
        }}
        value={value}
      >
        <SelectTrigger aria-label={label}>
          <SelectValue>
            {(selected: string | null) =>
              options.find((option) => option.value === selected)?.label ??
              "Choose"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function formatDuration(duration: number | null | undefined) {
  if (!duration) return null
  const totalSeconds = Math.round(duration)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    : `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export function VideoConverter() {
  const {
    file,
    previewUrl,
    metadata,
    settings,
    status,
    progress,
    stage,
    error,
    outputUrl,
    outputName,
    outputSize,
    selectFile,
    clearFile,
    convert,
    cancel,
    setFormat,
    setVideoCodec,
    setAudioCodec,
    setResolution,
    setFrameRate,
    setQuality,
    setKeepAudio,
  } = useVideoConverter()
  const [advancedOpen, setAdvancedOpen] = React.useState(false)
  const isWorking = status === "loading" || status === "converting"
  const isGif = settings.format === "gif"
  const details = [
    metadata?.width && metadata.height
      ? `${metadata.width} × ${metadata.height}`
      : null,
    formatDuration(metadata?.duration),
    file ? formatBytes(file.size) : null,
  ].filter(Boolean)

  return (
    <Card
      aria-label="Video converter"
      className="mt-10 sm:mt-12"
      data-agent-surface="video-converter"
    >
      <CardPanel className="flex flex-col gap-5 p-3 sm:p-5">
        <VideoDropZone
          compact={Boolean(file)}
          disabled={isWorking}
          onFile={selectFile}
        />

        {error ? (
          <Alert variant="error">
            <AlertTitle>Conversion stopped</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {file ? (
          <div className="flex flex-col">
            <Separator className="mb-4" />
            <div className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 px-2 pb-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:gap-4 sm:px-3">
              {previewUrl && file.type.startsWith("video/") ? (
                <video
                  aria-label={`Preview of ${file.name}`}
                  className="aspect-square size-16 rounded-lg border bg-muted object-cover sm:size-20"
                  muted
                  playsInline
                  preload="metadata"
                  src={previewUrl}
                />
              ) : (
                <EmptyMedia
                  aria-hidden="true"
                  className="m-0 size-16 sm:size-20 [&>div]:size-16 sm:[&>div]:size-20"
                  variant="icon"
                >
                  <VideoCameraIcon weight="fill" />
                </EmptyMedia>
              )}
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate font-heading text-sm font-medium">
                    {file.name}
                  </p>
                  {status === "done" ? (
                    <CheckCircleIcon
                      aria-label="Conversion ready"
                      className="shrink-0 text-primary"
                      weight="fill"
                    />
                  ) : null}
                </div>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {details.join(" · ")}
                  {outputSize ? ` → ${formatBytes(outputSize)}` : ""}
                </p>
                {isWorking ? (
                  <div className="flex flex-col gap-1.5">
                    <Progress
                      aria-label="Video conversion progress"
                      value={progress}
                    />
                    <p
                      aria-live="polite"
                      className="text-xs text-muted-foreground"
                      data-agent-status={status}
                    >
                      {stage} {progress > 0 ? `${progress}%` : ""}
                    </p>
                  </div>
                ) : null}
                {status === "done" ? (
                  <p className="text-xs text-primary">Ready to download</p>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                {outputUrl && outputName ? (
                  <Button
                    aria-label={`Download ${outputName}`}
                    data-agent-action="download-converted-video"
                    render={<a download={outputName} href={outputUrl} />}
                    size="icon"
                    variant="outline"
                  >
                    <DownloadSimpleIcon aria-hidden="true" weight="bold" />
                  </Button>
                ) : null}
                <Button
                  aria-label={`Remove ${file.name}`}
                  disabled={isWorking}
                  onClick={clearFile}
                  size="icon"
                  variant="ghost"
                >
                  <XIcon aria-hidden="true" weight="bold" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <Separator />

        <div className="grid items-end gap-5 lg:grid-cols-[minmax(12rem,16rem)_1fr]">
          <Field>
            <FieldLabel>Convert to</FieldLabel>
            <Select
              disabled={isWorking}
              onValueChange={(value) => {
                if (value) setFormat(value as VideoOutputFormat)
              }}
              value={settings.format}
            >
              <SelectTrigger
                aria-label="Output format"
                data-agent-action="select-video-output-format"
              >
                <SelectValue>
                  {(value: VideoOutputFormat | null) =>
                    value ? videoFormatDetails[value].label : "Choose a format"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {videoOutputFormats.map((format) => (
                  <SelectItem
                    data-agent-option={format}
                    key={format}
                    value={format}
                  >
                    {videoFormatDetails[format].label} -{" "}
                    {videoFormatDetails[format].description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              {videoFormatDetails[settings.format].description}
            </FieldDescription>
          </Field>

          {isWorking ? (
            <Button
              className="w-full lg:w-auto lg:justify-self-end"
              data-agent-action="cancel-video-conversion"
              onClick={cancel}
              size="xl"
              variant="outline"
            >
              Cancel
            </Button>
          ) : outputUrl && outputName ? (
            <Button
              className="w-full lg:w-auto lg:justify-self-end"
              data-agent-action="download-converted-video"
              render={<a download={outputName} href={outputUrl} />}
              size="xl"
            >
              <DownloadSimpleIcon
                aria-hidden="true"
                data-icon="inline-start"
                weight="bold"
              />
              Download video
            </Button>
          ) : (
            <Button
              className="w-full lg:w-auto lg:justify-self-end"
              data-agent-action="convert-video"
              disabled={!file}
              onClick={convert}
              size="xl"
            >
              <ArrowsClockwiseIcon
                aria-hidden="true"
                data-icon="inline-start"
                weight="bold"
              />
              Convert video
            </Button>
          )}
        </div>

        <Collapsible onOpenChange={setAdvancedOpen} open={advancedOpen}>
          <Button
            aria-expanded={advancedOpen}
            className="w-full justify-between"
            disabled={isWorking}
            render={<CollapsibleTrigger />}
            variant="ghost"
          >
            Advanced settings
            <CaretDownIcon
              aria-hidden="true"
              className={cn(
                "transition-transform",
                advancedOpen && "rotate-180"
              )}
              weight="bold"
            />
          </Button>
          <CollapsiblePanel>
            <div
              className="grid gap-5 border-t px-1 pt-5 pb-2 sm:grid-cols-2 sm:px-2 lg:grid-cols-3"
              data-agent-surface="video-advanced-settings"
            >
              <SettingsSelect
                disabled={isGif}
                label="Video codec"
                onValueChange={(value) => setVideoCodec(value as VideoCodec)}
                options={videoCodecOptions[settings.format]}
                value={settings.videoCodec}
              />
              <SettingsSelect
                label="Resolution"
                onValueChange={(value) =>
                  setResolution(value as VideoResolution)
                }
                options={resolutionOptions}
                value={settings.resolution}
              />
              <SettingsSelect
                label="Frame rate"
                onValueChange={(value) => setFrameRate(value as VideoFrameRate)}
                options={frameRateOptions}
                value={settings.frameRate}
              />
              <SettingsSelect
                label="Quality"
                onValueChange={(value) => setQuality(value as VideoQuality)}
                options={qualityOptions}
                value={settings.quality}
              />
              <SettingsSelect
                disabled={isGif || !settings.keepAudio}
                label="Audio codec"
                onValueChange={(value) => setAudioCodec(value as AudioCodec)}
                options={audioCodecOptions[settings.format]}
                value={settings.audioCodec}
              />
              <Field className="justify-end">
                <div className="flex min-h-8 w-full items-center justify-between gap-4 rounded-lg border border-input bg-input/16 px-3">
                  <FieldLabel htmlFor="keep-video-audio">Keep audio</FieldLabel>
                  <Switch
                    checked={!isGif && settings.keepAudio}
                    disabled={isGif}
                    id="keep-video-audio"
                    onCheckedChange={setKeepAudio}
                  />
                </div>
              </Field>
            </div>
          </CollapsiblePanel>
        </Collapsible>
      </CardPanel>
    </Card>
  )
}
