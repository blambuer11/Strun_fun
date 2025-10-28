import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, DollarSign, Settings } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ParcelOwnershipCardProps {
  parcel: {
    id: string;
    parcel_id: string;
    rent_amount_usdc: number;
    rent_policy: string;
    created_at: string;
    center_lat: number;
    center_lon: number;
  };
  onUpdate?: () => void;
}

export const ParcelOwnershipCard = ({ parcel, onUpdate }: ParcelOwnershipCardProps) => {
  const [editing, setEditing] = useState(false);
  const [rentAmount, setRentAmount] = useState(parcel.rent_amount_usdc.toString());
  const [rentPolicy, setRentPolicy] = useState(parcel.rent_policy);
  const { toast } = useToast();

  const handleUpdate = async () => {
    try {
      const { error } = await supabase
        .from("parcels")
        .update({
          rent_amount_usdc: parseFloat(rentAmount),
          rent_policy: rentPolicy,
        })
        .eq("id", parcel.id);

      if (error) throw error;

      toast({
        title: "Parcel Updated",
        description: "Your land settings have been updated.",
      });
      setEditing(false);
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4 text-primary" />
          Land Parcel
        </CardTitle>
        <CardDescription className="font-mono text-xs">
          {parcel.parcel_id.slice(0, 12)}...
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Location</span>
            <span className="font-mono text-xs">
              {parcel.center_lat.toFixed(4)}, {parcel.center_lon.toFixed(4)}
            </span>
          </div>

          {editing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="rent-amount">Rent Amount (USDC)</Label>
                <Input
                  id="rent-amount"
                  type="number"
                  step="0.01"
                  value={rentAmount}
                  onChange={(e) => setRentAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rent-policy">Rent Policy</Label>
                <Select value={rentPolicy} onValueChange={setRentPolicy}>
                  <SelectTrigger id="rent-policy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_run">Per Run</SelectItem>
                    <SelectItem value="per_hour">Per Hour</SelectItem>
                    <SelectItem value="per_day">Per Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleUpdate} className="flex-1">
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rent</span>
                <span className="font-bold text-primary">
                  {parcel.rent_amount_usdc} USDC
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Policy</span>
                <Badge variant="secondary">
                  {parcel.rent_policy.replace("_", " ")}
                </Badge>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
                className="w-full"
              >
                <Settings className="mr-2 h-4 w-4" />
                Configure Rent
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
