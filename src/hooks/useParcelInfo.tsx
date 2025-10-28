import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ParcelInfo {
  id: string;
  parcel_id: string;
  owner_id: string;
  rent_amount_usdc: number;
  rent_policy: string;
  owner_username?: string;
}

export const useParcelInfo = (parcelId: string | null) => {
  return useQuery({
    queryKey: ["parcel", parcelId],
    queryFn: async () => {
      if (!parcelId) return null;

      const { data: parcel, error } = await supabase
        .from("parcels")
        .select("*")
        .eq("parcel_id", parcelId)
        .maybeSingle();

      if (error) throw error;
      
      if (!parcel) return null;

      // Fetch owner profile separately
      let owner_username = "Unknown Owner";
      if (parcel.owner_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", parcel.owner_id)
          .single();
        
        if (profile?.username) {
          owner_username = profile.username;
        }
      }

      return {
        ...parcel,
        owner_username
      } as ParcelInfo;
    },
    enabled: !!parcelId,
  });
};

export const useUserParcels = (userId: string | null) => {
  return useQuery({
    queryKey: ["user-parcels", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("parcels")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
};
