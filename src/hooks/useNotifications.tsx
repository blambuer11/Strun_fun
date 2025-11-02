import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Check current permission status
  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Request notification permission
  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Not Supported",
        description: "Notifications are not supported in this browser",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        // Register service worker and get token
        const registration = await navigator.serviceWorker.ready;
        
        // Generate a simple token (in production, use Firebase Cloud Messaging)
        const token = `fcm_${user?.id}_${Date.now()}`;
        setFcmToken(token);

        // Save token to Supabase
        if (user?.id) {
          const { error } = await supabase
            .from("profiles")
            .update({ fcm_token: token })
            .eq("id", user.id);

          if (error) throw error;

          toast({
            title: "Notifications Enabled",
            description: "You'll now receive updates from Runny",
          });

          // Send test notification
          await sendTestNotification();
        }

        return true;
      } else {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Notification permission error:", error);
      toast({
        title: "Error",
        description: "Failed to enable notifications",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    if (permission === "granted" && "serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        await registration.showNotification("Runny is Ready!", {
          body: "You'll receive updates about your runs, tasks, and achievements",
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          tag: "welcome",
          requireInteraction: false,
        });
      } catch (error) {
        console.error("Test notification error:", error);
      }
    }
  };

  // Show notification
  const showNotification = async (title: string, options?: NotificationOptions) => {
    if (permission !== "granted") {
      console.warn("Notification permission not granted");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        ...options,
      });
    } catch (error) {
      console.error("Show notification error:", error);
    }
  };

  return {
    permission,
    fcmToken,
    loading,
    requestPermission,
    showNotification,
    sendTestNotification,
  };
};
