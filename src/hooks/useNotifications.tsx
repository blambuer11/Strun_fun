import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const isNative = Capacitor.isNativePlatform();

  // Initialize notifications on mount
  useEffect(() => {
    initializeNotifications();
  }, []);

  // Initialize notification system
  const initializeNotifications = async () => {
    if (isNative) {
      // Native mobile setup
      await setupNativeNotifications();
    } else {
      // Web PWA setup
      if ("Notification" in window) {
        setPermission(Notification.permission);
      }
    }
  };

  // Setup native (Capacitor) notifications
  const setupNativeNotifications = async () => {
    try {
      // Check permission status
      const permResult = await PushNotifications.checkPermissions();
      setPermission(permResult.receive as NotificationPermission);

      // Add listeners
      await PushNotifications.addListener("registration", (token) => {
        console.log("Push registration success, token:", token.value);
        setFcmToken(token.value);
        saveFcmToken(token.value);
      });

      await PushNotifications.addListener("registrationError", (error) => {
        console.error("Push registration error:", error);
      });

      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("Push notification received:", notification);
        // Show local notification when app is in foreground
        LocalNotifications.schedule({
          notifications: [
            {
              title: notification.title || "Runny",
              body: notification.body || "",
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 1000) },
            },
          ],
        });
      });

      await PushNotifications.addListener("pushNotificationActionPerformed", (notification) => {
        console.log("Push notification action performed:", notification);
      });
    } catch (error) {
      console.error("Native notification setup error:", error);
    }
  };

  // Save FCM token to Supabase
  const saveFcmToken = async (token: string) => {
    if (!user?.id) return;
    try {
      await supabase.from("profiles").update({ fcm_token: token }).eq("id", user.id);
    } catch (error) {
      console.error("Error saving FCM token:", error);
    }
  };

  // Request notification permission
  const requestPermission = async () => {
    setLoading(true);
    try {
      if (isNative) {
        // Native mobile permission request
        let permResult = await PushNotifications.checkPermissions();
        
        if (permResult.receive === "prompt") {
          permResult = await PushNotifications.requestPermissions();
        }

        if (permResult.receive === "granted") {
          await PushNotifications.register();
          setPermission("granted");
          
          toast({
            title: "Notifications Enabled",
            description: "You'll receive push notifications from Runny",
          });

          // Send test notification
          await sendTestNotification();
          return true;
        } else {
          setPermission("denied");
          toast({
            title: "Permission Denied",
            description: "Please enable notifications in your device settings",
            variant: "destructive",
          });
          return false;
        }
      } else {
        // Web PWA permission request
        if (!("Notification" in window)) {
          toast({
            title: "Not Supported",
            description: "Notifications are not supported in this browser",
            variant: "destructive",
          });
          return false;
        }

        const result = await Notification.requestPermission();
        setPermission(result);

        if (result === "granted") {
          const registration = await navigator.serviceWorker.ready;
          const token = `web_${user?.id}_${Date.now()}`;
          setFcmToken(token);

          if (user?.id) {
            await supabase.from("profiles").update({ fcm_token: token }).eq("id", user.id);
          }

          toast({
            title: "Notifications Enabled",
            description: "You'll now receive updates from Runny",
          });

          await sendTestNotification();
          return true;
        } else {
          toast({
            title: "Permission Denied",
            description: "Please enable notifications in your browser settings",
            variant: "destructive",
          });
          return false;
        }
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
    try {
      if (isNative) {
        // Send local notification on native
        await LocalNotifications.schedule({
          notifications: [
            {
              title: "Runny is Ready!",
              body: "You'll receive updates about your runs, tasks, and achievements",
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 1000) },
            },
          ],
        });
      } else if (permission === "granted" && "serviceWorker" in navigator) {
        // Send web notification
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification("Runny is Ready!", {
          body: "You'll receive updates about your runs, tasks, and achievements",
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          tag: "welcome",
          requireInteraction: false,
        });
      }
    } catch (error) {
      console.error("Test notification error:", error);
    }
  };

  // Show notification
  const showNotification = async (title: string, options?: { body?: string; data?: any }) => {
    if (permission !== "granted") {
      console.warn("Notification permission not granted");
      return;
    }

    try {
      if (isNative) {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body: options?.body || "",
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 1000) },
              extra: options?.data,
            },
          ],
        });
      } else {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body: options?.body,
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          data: options?.data,
        });
      }
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
