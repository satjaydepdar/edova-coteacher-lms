import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-ink text-sidebar-text",
        secondary: "border-transparent bg-secondary text-ink",
        outline: "border-card-border text-ink",
        okf: "border-okf-border bg-okf-bg text-okf",
        success: "border-transparent bg-success/12 text-success",
        warning: "border-transparent bg-warning/15 text-warning-strong",
        danger: "border-transparent bg-danger/12 text-danger",
        weak: "border-weak-border bg-weak-bg text-weak-text",
        info: "border-transparent bg-[#DBEAFE] text-[#1D4ED8]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
