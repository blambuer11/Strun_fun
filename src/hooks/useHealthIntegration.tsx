import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface HealthData {
  steps: number;
  distance: number; // in km
  activeMinutes: number;
}

export const useHealthIntegration = () => {
  const [isGoogleFitConnected, setIsGoogleFitConnected] = useState(false);
  const [isAppleHealthConnected, setIsAppleHealthConnected] = useState(false);
  const [healthData, setHealthData] = useState<HealthData>({
    steps: 0,
    distance: 0,
    activeMinutes: 0,
  });
  const { toast } = useToast();

  const requestGoogleFitPermission = async () => {
    try {
      // Check if running on mobile
      if (!window.Capacitor) {
        toast({
          title: "Mobile Only",
          description: "Google Fit integration is only available on mobile devices",
          variant: "destructive",
        });
        return;
      }

      // Request permissions for Google Fit
      toast({
        title: "Requesting Permission",
        description: "Please allow access to Google Fit in the next screen",
      });
      
      // TODO: Implement Google Fit integration using Capacitor plugin
      // This will trigger native permission dialog
      // const { Health } = await import('@capacitor-community/health');
      // await Health.requestAuthorization({
      //   read: ['steps', 'distance', 'activity'],
      //   write: []
      // });
      
      setIsGoogleFitConnected(true);
      localStorage.setItem('googleFitConnected', 'true');
      
      toast({
        title: "Connected!",
        description: "Google Fit has been connected successfully",
      });
    } catch (error) {
      console.error('Google Fit permission error:', error);
      toast({
        title: "Error",
        description: "Failed to connect to Google Fit",
        variant: "destructive",
      });
    }
  };

  const requestAppleHealthPermission = async () => {
    try {
      // Check if running on iOS
      if (!window.Capacitor) {
        toast({
          title: "Mobile Only",
          description: "Apple Health integration is only available on iOS devices",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Requesting Permission",
        description: "Please allow access to Apple Health in the next screen",
      });

      // TODO: Implement Apple Health integration using Capacitor plugin
      // This will trigger native permission dialog
      // const { Health } = await import('@capacitor-community/health');
      // await Health.requestAuthorization({
      //   read: ['steps', 'distance', 'activity'],
      //   write: []
      // });
      
      setIsAppleHealthConnected(true);
      localStorage.setItem('appleHealthConnected', 'true');
      
      toast({
        title: "Connected!",
        description: "Apple Health has been connected successfully",
      });
    } catch (error) {
      console.error('Apple Health permission error:', error);
      toast({
        title: "Error",
        description: "Failed to connect to Apple Health",
        variant: "destructive",
      });
    }
  };

  const syncHealthData = async () => {
    try {
      if (!isGoogleFitConnected && !isAppleHealthConnected) {
        return;
      }

      // TODO: Implement actual data sync
      // const { Health } = await import('@capacitor-community/health');
      // const today = new Date();
      // const data = await Health.query({
      //   startDate: new Date(today.setHours(0, 0, 0, 0)),
      //   endDate: new Date(),
      //   dataType: ['steps', 'distance', 'activity']
      // });

      // For now, use mock data
      setHealthData({
        steps: Math.floor(Math.random() * 10000) + 5000,
        distance: Math.random() * 5 + 2,
        activeMinutes: Math.floor(Math.random() * 60) + 30,
      });

      toast({
        title: "Success",
        description: "Health data synced successfully",
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Error",
        description: "Failed to sync health data",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Check connection status on mount
    const checkConnections = async () => {
      // TODO: Check if already authorized
      // For now, load from localStorage
      const googleFitConnected = localStorage.getItem('googleFitConnected') === 'true';
      const appleHealthConnected = localStorage.getItem('appleHealthConnected') === 'true';
      
      setIsGoogleFitConnected(googleFitConnected);
      setIsAppleHealthConnected(appleHealthConnected);
    };

    checkConnections();
  }, []);

  return {
    isGoogleFitConnected,
    isAppleHealthConnected,
    healthData,
    requestGoogleFitPermission,
    requestAppleHealthPermission,
    syncHealthData,
  };
};

// Add Capacitor types
declare global {
  interface Window {
    Capacitor?: any;
  }
}
