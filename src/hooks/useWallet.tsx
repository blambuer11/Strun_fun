import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export const useWallet = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      console.log("Calling create-solana-wallet function for user:", user?.id);
      
      const { data, error } = await supabase.functions.invoke("create-solana-wallet", {
        body: { userId: user?.id },
      });

      console.log("Create wallet response:", { data, error });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (data?.publicKey) {
        setPublicKey(data.publicKey);
        console.log("Wallet created successfully:", data.publicKey);
        toast({
          title: "Wallet Created",
          description: "Your Solana wallet has been created successfully!",
        });
      } else {
        console.error("No publicKey in response:", data);
        throw new Error("Failed to create wallet - no public key returned");
      }
    } catch (error) {
      console.error("Error creating wallet:", error);
      toast({
        title: "Error",
        description: "Failed to create wallet. Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  return { publicKey, loading, createWallet, checkOrCreateWallet };
};
