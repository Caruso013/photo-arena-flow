import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

interface ResponsiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export function ResponsiveModal({
  open,
  onOpenChange,
  children,
  title,
  description,
  className,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={className}>
          {(title || description) && (
            <DrawerHeader className="text-left">
              {title && <DrawerTitle>{title}</DrawerTitle>}
              {description && <DrawerDescription>{description}</DrawerDescription>}
            </DrawerHeader>
          )}
          <div className="px-4 pb-4">{children}</div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  )
}

interface ResponsiveModalHeaderProps {
  children: React.ReactNode
  className?: string
}

export function ResponsiveModalHeader({ children, className }: ResponsiveModalHeaderProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <DrawerHeader className={className}>{children}</DrawerHeader>
  }

  return <DialogHeader className={className}>{children}</DialogHeader>
}

interface ResponsiveModalTitleProps {
  children: React.ReactNode
  className?: string
}

export function ResponsiveModalTitle({ children, className }: ResponsiveModalTitleProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <DrawerTitle className={className}>{children}</DrawerTitle>
  }

  return <DialogTitle className={className}>{children}</DialogTitle>
}

interface ResponsiveModalDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function ResponsiveModalDescription({ children, className }: ResponsiveModalDescriptionProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <DrawerDescription className={className}>{children}</DrawerDescription>
  }

  return <DialogDescription className={className}>{children}</DialogDescription>
}
