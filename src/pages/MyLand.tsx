import { useAuth } from "@/contexts/AuthContext";
import { useUserParcels } from "@/hooks/useParcelInfo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParcelOwnershipCard } from "@/components/ParcelOwnershipCard";
import { MapPin, Loader2, Coins, CheckCircle2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStrunProgram } from "@/hooks/useStrunProgram";
import { useToast } from "@/hooks/use-toast";

const MyLand = () => {
  const { user } = useAuth();
  const { data: parcels, isLoading, refetch } = useUserParcels(user?.id || null);
  const { mintLand, loading: mintLoading } = useStrunProgram();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch unminted parcels
  const { data: unmintedParcels } = useQuery({
    queryKey: ["unminted-parcels", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("parcels")
        .select("*")
        .eq("owner_id", user.id)
        .eq("is_minted", false)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch ALL land NFTs (pending, failed, and minted)
  const { data: allNFTs } = useQuery({
    queryKey: ["my-land-nfts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("land_nfts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleMintLand = async (parcel: any) => {
    try {
      const coordinates = {
        lat: parcel.center_lat,
        lng: parcel.center_lon,
      };
      const result = await mintLand(coordinates);
      if (result) {
        toast({
          title: "Success!",
          description: "Land NFT minted successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["my-land-nfts", user?.id] });
        queryClient.invalidateQueries({ queryKey: ["unminted-parcels", user?.id] });
        refetch();
      }
    } catch (error: any) {
      toast({
        title: "Mint Failed",
        description: error?.message || "Failed to mint land NFT",
        variant: "destructive",
      });
    }
  };

  const handleMintNFT = async (nft: any) => {
    try {
      const coordinates = JSON.parse(nft.polygon_coordinates);
      const center = {
        lat: coordinates[0].lat,
        lng: coordinates[0].lng,
      };
      const result = await mintLand(center);
      if (result) {
        toast({
          title: "Success!",
          description: "NFT minted on Solana blockchain",
        });
        queryClient.invalidateQueries({ queryKey: ["my-land-nfts", user?.id] });
      }
    } catch (error: any) {
      toast({
        title: "Mint Failed",
        description: error?.message || "Failed to mint on Solana",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <MapPin className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">My Land</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Unminted Parcels Section */}
            {unmintedParcels && unmintedParcels.length > 0 && (
              <Card className="p-6 glass border-accent/30 bg-gradient-to-br from-accent/10 to-primary/10">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-accent" />
                  Ready to Mint ({unmintedParcels.length})
                </h3>
                <div className="space-y-3">
                  {unmintedParcels.map((parcel) => (
                    <div key={parcel.id} className="flex items-center justify-between p-4 bg-card/50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-foreground">Parcel #{parcel.parcel_id.slice(0, 8)}</div>
                        <div className="text-xs text-muted-foreground">
                          Location: {parcel.center_lat?.toFixed(4)}, {parcel.center_lon?.toFixed(4)}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="accent"
                        onClick={() => handleMintLand(parcel)}
                        disabled={mintLoading}
                      >
                        {mintLoading ? "Minting..." : "Mint NFT"}
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* All Land NFTs Section */}
            {allNFTs && allNFTs.length > 0 && (
              <Card className="p-6 glass">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  My Land NFTs ({allNFTs.length})
                </h3>
                <div className="space-y-3">
                  {allNFTs.map((nft) => (
                    <div key={nft.id} className="flex items-center justify-between p-4 glass rounded-lg hover-lift">
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{nft.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Area: {parseFloat(String(nft.area_size)).toFixed(2)} m² • 
                          Created {new Date(nft.created_at).toLocaleDateString()}
                        </div>
                        {nft.status === 'minted' && nft.minted_at && (
                          <div className="text-xs text-primary mt-1">
                            ✓ Minted on Solana {new Date(nft.minted_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {nft.status === 'minted' ? (
                        <Badge variant="default" className="text-xs bg-primary">
                          Minted ✓
                        </Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="accent"
                          onClick={() => handleMintNFT(nft)}
                          disabled={mintLoading}
                        >
                          {mintLoading ? "Minting..." : "Mint on Solana"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Owned Parcels with Rent Settings */}
            {parcels && parcels.length > 0 && (
              <Card className="p-6 glass">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  My Parcels ({parcels.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {parcels.map((parcel) => (
                    <ParcelOwnershipCard
                      key={parcel.id}
                      parcel={parcel}
                      onUpdate={refetch}
                    />
                  ))}
                </div>
              </Card>
            )}

            {/* Empty State */}
            {(!parcels || parcels.length === 0) && 
             (!unmintedParcels || unmintedParcels.length === 0) && 
             (!allNFTs || allNFTs.length === 0) && (
              <Card>
                <CardContent className="py-12 text-center">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    You don't own any land yet. Complete runs to claim parcels!
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default MyLand;
