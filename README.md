# OpenReformat

A private, client-only image converter built with Next.js, COSS UI, Tailwind,
and WebAssembly codecs. Files are decoded and encoded in a Web Worker and never
leave the browser.

(Check it out here!)[https://openreformat.maty.as]

## Development

```bash
npm run dev
```

Production builds use Next.js's webpack path because the codec packages ship
Emscripten WebAssembly modules that are not yet handled reliably by Turbopack.

The app currently exports PNG, JPEG, WebP, and AVIF. Codec bundles are
loaded only when a conversion needs them.

## Architecture

- `components/converter/` contains the interactive converter surface.
- `hooks/use-converter-queue.ts` owns queue state, object URLs, and worker calls.
- `workers/image-converter.worker.ts` owns decode/encode work and dynamically
  imports the relevant `@jsquash/*` WebAssembly codec.
- `lib/converter/` contains stable types and format metadata.

To add a format, extend `OUTPUT_FORMATS`, add its metadata, and add one explicit
encoder branch in the worker. The UI derives its format menu from that single
source of truth.

## Agent-friendly controls

The converter uses semantic headings, labelled controls, stable
`data-agent-action` attributes, and a visible file input path. An automation can
select `choose-images-input`, choose `select-output-format`, activate
`convert-images`, and download each `download-converted-image` result.
