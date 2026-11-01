import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-sm font-ui text-[0.6875rem] font-bold uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default:
          "border border-ink/20 bg-ink text-paper",
        outline:
          "border border-paper-border text-ink-secondary bg-transparent",
        accent:
          "border border-accent-dark bg-accent text-white shadow-sm",
        stamp:
          "cat-stamp",
        positive:
          "border border-positive/30 bg-positive/10 text-positive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  category?: string
}

function Badge({ className, variant, category, children, ...props }: BadgeProps) {
  const categoryClass = category
    ? `cat-stamp--${category.toLowerCase()}`
    : ""

  return (
    <div
      className={cn(
        badgeVariants({ variant }),
        category && "cat-stamp",
        categoryClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Badge, badgeVariants }

