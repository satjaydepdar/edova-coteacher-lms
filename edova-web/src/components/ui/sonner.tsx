import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-ink group-[.toaster]:border-card-border group-[.toaster]:shadow-card group-[.toaster]:rounded-[10px] group-[.toaster]:font-sans",
          description: "group-[.toast]:text-text-secondary",
          actionButton: "group-[.toast]:bg-ink group-[.toast]:text-sidebar-text",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-text-secondary",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
