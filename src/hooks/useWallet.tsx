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
    }
  }, [user]);

  const checkOrCreateWallet = async () => {
    try {
      // Check if wallet exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("solana_public_key")
        .eq("id", user?.id)
        .single();

      if (profile?.solana_public_key) {
        setPublicKey(profile.solana_public_key);
      } else {
        // Create wallet if it doesn't exist
        await createWallet();
      }
    } catch (error) {
      console.error("Error checking wallet:", error);
    } finally {
      setLoading(false);
    }
  };

  const createWallet = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-solana-wallet", {
        body: { userId: user?.id },
      });

      if (error) throw error;

      if (data?.publicKey) {
        setPublicKey(data.publicKey);
        toast({
          title: "Wallet Created",
          description: "Your Solana wallet has been created successfully!",
        });
      }
    } catch (error) {
      console.error("Error creating wallet:", error);
      toast({
        title: "Error",
        description: "Failed to create wallet",
        variant: "destructive",
      });
    }
  };

  return { publicKey, loading, createWallet };
};
