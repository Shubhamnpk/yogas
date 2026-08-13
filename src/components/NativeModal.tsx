import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

/**
 * A modal that renders as a native-feeling bottom sheet (drawer) on mobile,
 * complete with swipe-to-dismiss gestures and a drag handle, and as a centered
 * dialog on desktop. Use this for every modal so mobile users always get the
 * native pattern.
 */
export function NativeModal({
  open,
  onOpenChange,
  children,
  contentClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  contentClassName?: string;
}) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={cn("flex h-auto flex-col", contentClassName)}>
          <div className="max-h-[90dvh] overflow-y-auto overscroll-contain">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-md", contentClassName)}>{children}</DialogContent>
    </Dialog>
  );
}

export function NativeModalHeader({
  title,
  description,
  onClose,
}: {
  title: string;
  description?: string | undefined;
  onClose?: (() => void) | undefined;
}) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <DrawerHeader className="relative">
        <div className="flex flex-col items-center gap-1 text-center">
          <DrawerTitle>{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
        </div>
        {onClose ? (
          <div className="absolute right-4 top-4">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full border border-border text-muted-foreground"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : null}
      </DrawerHeader>
    );
  }
  return (
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      {description ? <DialogDescription>{description}</DialogDescription> : null}
    </DialogHeader>
  );
}

export function NativeModalFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <DrawerFooter className={className}>{children}</DrawerFooter>;
  }
  return <div className={cn("flex flex-col gap-2", className)}>{children}</div>;
}
