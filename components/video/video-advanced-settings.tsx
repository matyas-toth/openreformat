"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  audioCodecOptions,
  customFrameRateBounds,
  customResolutionBounds,
  frameRateOptions,
  getCustomQualityControl,
  qualityOptions,
  resolutionOptions,
  videoCodecOptions,
} from "@/lib/video-converter/formats"
import type {
  AudioCodec,
  VideoCodec,
  VideoFrameRate,
  VideoQuality,
  VideoResolution,
  VideoSettings,
} from "@/lib/video-converter/types"

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
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

interface VideoAdvancedSettingsProps {
  disabled: boolean
  settings: VideoSettings
  setVideoCodec: (value: VideoCodec) => void
  setAudioCodec: (value: AudioCodec) => void
  setResolution: (value: VideoResolution) => void
  setCustomWidth: (value: number) => void
  setCustomHeight: (value: number) => void
  setKeepAspectRatio: (value: boolean) => void
  setFrameRate: (value: VideoFrameRate) => void
  setCustomFrameRate: (value: number) => void
  setQuality: (value: VideoQuality) => void
  setCustomQuality: (value: number) => void
  setKeepAudio: (value: boolean) => void
}

export function VideoAdvancedSettings({
  disabled,
  settings,
  setVideoCodec,
  setAudioCodec,
  setResolution,
  setCustomWidth,
  setCustomHeight,
  setKeepAspectRatio,
  setFrameRate,
  setCustomFrameRate,
  setQuality,
  setCustomQuality,
  setKeepAudio,
}: VideoAdvancedSettingsProps) {
  const isGif = settings.format === "gif"
  const qualityControl = getCustomQualityControl(settings)

  return (
    <div
      className="grid gap-5 px-1 pt-5 pb-2 sm:grid-cols-2 sm:px-2 lg:grid-cols-3"
      data-agent-surface="video-advanced-settings"
    >
      <SettingsSelect
        disabled={disabled || isGif}
        label="Video codec"
        onValueChange={(value) => setVideoCodec(value as VideoCodec)}
        options={videoCodecOptions[settings.format]}
        value={settings.videoCodec}
      />

      <div className="flex flex-col gap-3">
        <SettingsSelect
          disabled={disabled}
          label="Resolution"
          onValueChange={(value) => setResolution(value as VideoResolution)}
          options={resolutionOptions}
          value={settings.resolution}
        />
        {settings.resolution === "custom" ? (
          <Field className="rounded-lg border border-input bg-input/16 p-3">
            <div className="grid grid-cols-2 gap-2">
              <Field>
                <FieldLabel htmlFor="custom-video-width">Width (px)</FieldLabel>
                <Input
                  aria-label="Custom video width"
                  data-agent-field="custom-video-width"
                  disabled={disabled}
                  id="custom-video-width"
                  max={customResolutionBounds.max}
                  min={customResolutionBounds.min}
                  onChange={(event) =>
                    setCustomWidth(event.currentTarget.valueAsNumber)
                  }
                  step={1}
                  type="number"
                  value={settings.customWidth}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="custom-video-height">
                  Height (px)
                </FieldLabel>
                <Input
                  aria-label="Custom video height"
                  data-agent-field="custom-video-height"
                  disabled={disabled}
                  id="custom-video-height"
                  max={customResolutionBounds.max}
                  min={customResolutionBounds.min}
                  onChange={(event) =>
                    setCustomHeight(event.currentTarget.valueAsNumber)
                  }
                  step={1}
                  type="number"
                  value={settings.customHeight}
                />
              </Field>
            </div>
            <Field className="flex-row items-center gap-2">
              <Checkbox
                checked={settings.keepAspectRatio}
                data-agent-field="keep-video-aspect-ratio"
                disabled={disabled}
                id="keep-video-aspect-ratio"
                onCheckedChange={setKeepAspectRatio}
              />
              <FieldLabel htmlFor="keep-video-aspect-ratio">
                Keep aspect ratio
              </FieldLabel>
            </Field>
            <FieldDescription>
              {settings.keepAspectRatio
                ? "Changing either dimension updates the other."
                : "Width and height can be changed independently."}{" "}
              H.264 output rounds odd dimensions down by one pixel.
            </FieldDescription>
          </Field>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <SettingsSelect
          disabled={disabled}
          label="Frame rate"
          onValueChange={(value) => setFrameRate(value as VideoFrameRate)}
          options={frameRateOptions}
          value={settings.frameRate}
        />
        {settings.frameRate === "custom" ? (
          <Field className="rounded-lg border border-input bg-input/16 p-3">
            <FieldLabel htmlFor="custom-video-frame-rate">
              Frames per second
            </FieldLabel>
            <Input
              aria-label="Custom video frame rate"
              data-agent-field="custom-video-frame-rate"
              disabled={disabled}
              id="custom-video-frame-rate"
              max={customFrameRateBounds.max}
              min={customFrameRateBounds.min}
              onChange={(event) =>
                setCustomFrameRate(event.currentTarget.valueAsNumber)
              }
              step={1}
              type="number"
              value={settings.customFrameRate}
            />
            <FieldDescription>
              Whole frames from {customFrameRateBounds.min} to{" "}
              {customFrameRateBounds.max} fps.
            </FieldDescription>
          </Field>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <SettingsSelect
          disabled={disabled}
          label="Quality"
          onValueChange={(value) => setQuality(value as VideoQuality)}
          options={qualityOptions}
          value={settings.quality}
        />
        {settings.quality === "custom" ? (
          <Field className="rounded-lg border border-input bg-input/16 p-3">
            <div className="flex w-full items-center justify-between gap-3">
              <FieldLabel>{qualityControl.label}</FieldLabel>
              <Field className="w-20">
                <FieldLabel className="sr-only" htmlFor="custom-video-quality">
                  Exact {qualityControl.label} value
                </FieldLabel>
                <Input
                  data-agent-field="custom-video-quality-input"
                  disabled={disabled}
                  id="custom-video-quality"
                  max={qualityControl.max}
                  min={qualityControl.min}
                  onChange={(event) =>
                    setCustomQuality(event.currentTarget.valueAsNumber)
                  }
                  step={1}
                  type="number"
                  value={qualityControl.value}
                />
              </Field>
            </div>
            <Slider
              aria-label={`Custom ${qualityControl.label}`}
              data-agent-field="custom-video-quality-slider"
              disabled={disabled}
              max={qualityControl.max}
              min={qualityControl.min}
              onValueChange={(value) =>
                setCustomQuality(Array.isArray(value) ? value[0] : value)
              }
              step={1}
              value={[qualityControl.value]}
            />
            <FieldDescription>{qualityControl.description}</FieldDescription>
          </Field>
        ) : null}
      </div>

      <SettingsSelect
        disabled={disabled || isGif || !settings.keepAudio}
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
            disabled={disabled || isGif}
            id="keep-video-audio"
            onCheckedChange={setKeepAudio}
          />
        </div>
      </Field>
    </div>
  )
}
