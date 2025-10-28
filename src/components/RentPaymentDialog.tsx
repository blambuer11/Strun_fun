import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, MapPin, User, Coins } from "lucide-react";

interface RentPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  parcelInfo: {
    parcel_id: string;
    owner_id: string;
    owner_username?: string;
    rent_amount_usdc: number;
    rent_policy: string;
  };
  onSuccess: () => void;
}

export const RentPaymentDialog = ({
  open,
  onOpenChange,
  taskId,
  parcelInfo,
  onSuccess,
}: RentPaymentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const { toast } = useToast();

  const requestPayment = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke("task-enter", {
        body: { taskId },
      });

      if (error) throw error;

      if (data.access) {
        // Already has access
        toast({
          title: "Access Granted",
          description: data.message,
        });
        onSuccess();
        onOpenChange(false);
        return;
      }

      // Should receive 402 with payment details
      if (data.payment) {
        setPaymentInfo(data);
      }
    } catch (error: any) {
      console.error("Payment request error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process payment request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const simulatePayment = async () => {
    try {
      setLoading(true);

      // Simulate transaction hash (in production, this would be from Solana wallet)
      const mockTxHash = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabase.functions.invoke("task-enter", {
        body: { taskId },
        headers: {
          "X-PAYMENT": mockTxHash,
        },
      });

      if (error) throw error;

      if (data.access) {
        toast({
          title: "Payment Successful!",
          description: "You now have access to this task.",
        });
        onSuccess();
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Land Rent Payment Required
          </DialogTitle>
          <DialogDescription>
            This task is located on privately owned land.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              To accept this task, you must pay rent to the land owner.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Land Owner
              </span>
              <Badge variant="secondary">
                @{parcelInfo.owner_username || "Unknown"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Rent Amount
              </span>
              <span className="font-bold text-primary">
                {parcelInfo.rent_amount_usdc} USDC
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Policy</span>
              <Badge variant="outline">
                {parcelInfo.rent_policy.replace("_", " ")}
              </Badge>
            </div>
          </div>

          {paymentInfo && (
            <div className="rounded-lg bg-muted p-3 text-xs">
              <p className="font-mono break-all text-muted-foreground">
                Pay to: {paymentInfo.payment.pay_to}
              </p>
              <p className="font-mono break-all text-muted-foreground mt-1">
                Memo: {paymentInfo.payment.memo}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          {!paymentInfo ? (
            <Button
              onClick={requestPayment}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue to Payment
            </Button>
          ) : (
            <Button
              onClick={simulatePayment}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pay {parcelInfo.rent_amount_usdc} USDC (Simulated)
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
