export function ToolPage({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <main
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16"
      id="main"
    >
      <section className="flex max-w-3xl flex-col gap-3">
        <h1 className="font-heading text-4xl font-normal tracking-[-0.055em] text-balance sm:text-5xl sm:leading-[1.04]">
          {title}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          {description}
        </p>
      </section>
      {children}
    </main>
  )
}
