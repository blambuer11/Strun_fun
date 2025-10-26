import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import characterRunning from "@/assets/character-running.png";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isSuccess = !variant || variant === "default";
        const showCharacter = isSuccess && (
          title?.toLowerCase().includes("success") ||
          title?.toLowerCase().includes("completed") ||
          title?.toLowerCase().includes("updated") ||
          title?.toLowerCase().includes("generated") ||
          title?.toLowerCase().includes("accepted") ||
          title?.toLowerCase().includes("earned")
        );

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-center gap-3 w-full">
              {showCharacter && (
                <div className="shrink-0">
                  <img 
                    src={characterRunning} 
                    alt="Success" 
                    className="w-14 h-14 animate-running drop-shadow-lg"
                  />
                </div>
              )}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
