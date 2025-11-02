import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import { useSolanaMobileWallet } from "@/contexts/SolanaMobileWalletContext";

export const useWallet = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isCapacitor, connectWallet: connectMobileWallet } = useSolanaMobileWallet();
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileWallet, setIsMobileWallet] = useState(false);

  useEffect(() => {
    if (user) {
      checkOrCreateWallet();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkOrCreateWallet = async () => {
    try {
      setLoading(true);
      console.log("Checking wallet for user:", user?.id);
      
      // Check if wallet exists
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("solana_public_key")
        .eq("id", user?.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        throw profileError;
      }

      console.log("Profile data:", profile);

      if (profile?.solana_public_key) {
        setPublicKey(profile.solana_public_key);
        console.log("Wallet found:", profile.solana_public_key);
      } else {
        // Create wallet if it doesn't exist
        console.log("No wallet found, creating new one...");
        await createWallet();
      }
    } catch (error) {
      console.error("Error checking wallet:", error);
      toast({
        title: "Wallet Error",
        description: "Failed to load wallet. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createWallet = async () => {
    try {
      // Try mobile wallet first if on Capacitor
      if (isCapacitor) {
        console.log("Attempting to connect Solana mobile wallet...");
        const mobilePublicKey = await connectMobileWallet();
        
        if (mobilePublicKey) {
          console.log("Mobile wallet connected:", mobilePublicKey);
          setPublicKey(mobilePublicKey);
          setIsMobileWallet(true);
          
          // Save mobile wallet to profile
          await supabase
            .from("profiles")
            .update({
              solana_public_key: mobilePublicKey,
            })
            .eq("id", user?.id);
          
          toast({
            title: "Mobile Wallet Connected",
            description: "Your Solana mobile wallet has been connected!",
          });
          return;
        }
      }

      // Fallback to custodial wallet creation
      console.log("Creating custodial Solana wallet for user:", user?.id);
      
      const { data, error } = await supabase.functions.invoke("create-solana-wallet", {
        body: { userId: user?.id },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (data?.publicKey) {
        setPublicKey(data.publicKey);
        setIsMobileWallet(false);
        console.log("Custodial wallet created successfully:", data.publicKey);
        toast({
          title: "Wallet Created",
          description: "Your Solana wallet has been created successfully!",
        });
      } else {
        throw new Error("Failed to create wallet - no public key returned");
      }
    } catch (error) {
      console.error("Error creating wallet:", error);
      toast({
        title: "Error",
        description: "Failed to create wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  return { publicKey, loading, createWallet, checkOrCreateWallet, isMobileWallet, isCapacitor };
};
