import { PageHeader } from "./PageHeader"

/** Temporary placeholder for screens not yet built. */
export function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} subtitle="This screen is being built." />
      <div className="flex h-64 items-center justify-center rounded-[12px] border border-dashed border-card-border bg-cream/50 text-text-muted">
        {title} — coming soon
      </div>
    </div>
  )
}
