import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { X } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group !z-[99999]"
      closeButton
      position="top-center"
      richColors
      duration={4000}
      gap={8}
      style={{
        top: 'max(env(safe-area-inset-top, 0px), 12px)',
        zIndex: 99999,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:!bg-white dark:group-[.toaster]:!bg-zinc-900 group-[.toaster]:text-foreground group-[.toaster]:!border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl group-[.toaster]:py-4 group-[.toaster]:px-4",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          closeButton: "group-[.toast]:!bg-zinc-100 dark:group-[.toast]:!bg-zinc-800 group-[.toast]:!text-foreground group-[.toast]:!border-border group-[.toast]:hover:!bg-zinc-200 dark:group-[.toast]:hover:!bg-zinc-700 group-[.toast]:!h-6 group-[.toast]:!w-6 group-[.toast]:!rounded-full group-[.toast]:!right-2 group-[.toast]:!top-2 group-[.toast]:!left-auto group-[.toast]:!transform-none group-[.toast]:!opacity-100",
          success: "group-[.toaster]:!bg-green-50 dark:group-[.toaster]:!bg-green-950 group-[.toaster]:!border-green-200 dark:group-[.toaster]:!border-green-800 group-[.toaster]:!text-green-700 dark:group-[.toaster]:!text-green-300",
          error: "group-[.toaster]:!bg-red-50 dark:group-[.toaster]:!bg-red-950 group-[.toaster]:!border-red-200 dark:group-[.toaster]:!border-red-800 group-[.toaster]:!text-red-700 dark:group-[.toaster]:!text-red-300",
          warning: "group-[.toaster]:!bg-amber-50 dark:group-[.toaster]:!bg-amber-950 group-[.toaster]:!border-amber-200 dark:group-[.toaster]:!border-amber-800 group-[.toaster]:!text-amber-700 dark:group-[.toaster]:!text-amber-300",
          info: "group-[.toaster]:!bg-blue-50 dark:group-[.toaster]:!bg-blue-950 group-[.toaster]:!border-blue-200 dark:group-[.toaster]:!border-blue-800 group-[.toaster]:!text-blue-700 dark:group-[.toaster]:!text-blue-300",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
