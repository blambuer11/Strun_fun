import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";
import { 
  ArrowLeft,
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Zap,
  Map as MapIcon
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Wallet = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { publicKey, loading: walletLoading } = useWallet();
  const [balance, setBalance] = useState({
    sol: 0,
    xp: 0,
  });
  const [nftCount, setNftCount] = useState(0);

  const transactions = [
    { id: 1, type: "receive", amount: "1.2 SOL", status: "completed", time: "4h" },
    { id: 2, type: "send", amount: "0.5 SOL", status: "completed", time: "5d" },
    { id: 3, type: "receive", amount: "2.0 SOL", status: "completed", time: "1w" },
  ];

  useEffect(() => {
    if (user) {
      fetchBalance();
      fetchNFTCount();
    }
  }, [user]);

  const fetchBalance = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp")
        .eq("id", user?.id)
        .single();

      if (profile) {
        setBalance({
          sol: 0, // SOL balance from blockchain
          xp: profile.xp,
        });
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const fetchNFTCount = async () => {
    try {
      const { count } = await supabase
        .from("land_nfts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id);

      setNftCount(count || 0);
    } catch (error) {
      console.error("Error fetching NFT count:", error);
    }
  };

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      toast({
        title: "Copied!",
        description: "Wallet address copied to clipboard",
      });
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card backdrop-blur-lg p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Wallet</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Wallet Address */}
        {walletLoading ? (
          <Card className="p-6 bg-gradient-to-br from-accent/10 via-card to-primary/5 border-accent/30">
            <div className="text-center">
              <p className="text-muted-foreground">Loading wallet...</p>
            </div>
          </Card>
        ) : publicKey ? (
          <Card className="p-6 bg-gradient-to-br from-accent/10 via-card to-primary/5 border-accent/30">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Wallet Address</p>
                <p className="font-mono text-base font-bold">{formatAddress(publicKey)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={copyAddress}>
                <Copy className="w-5 h-5" />
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-6 bg-gradient-to-br from-warning/10 via-card to-primary/5 border-warning/30">
            <div className="text-center">
              <WalletIcon className="w-12 h-12 mx-auto mb-3 text-warning" />
              <p className="text-muted-foreground">No wallet found</p>
            </div>
          </Card>
        )}

        {/* Wallet Balance */}
        <Card className="p-8 bg-gradient-to-br from-primary/20 via-card to-secondary/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(220_70%_50%/0.2),transparent)]" />
          <div className="relative z-10 text-center space-y-4">
            <div className="inline-flex w-24 h-24 rounded-full bg-gradient-to-br from-accent via-primary to-accent-glow items-center justify-center mx-auto relative">
              <div className="absolute inset-0 bg-accent/30 blur-2xl rounded-full" />
              <WalletIcon className="w-12 h-12 text-foreground relative" />
            </div>
            
            <div>
              <h2 className="text-sm text-muted-foreground mb-1">Strun Wallet</h2>
              <div className="text-4xl font-bold text-gradient mb-1">{balance.sol.toFixed(2)} SOL</div>
              <p className="text-sm text-muted-foreground">Balance</p>
            </div>
          </div>
        </Card>

        {/* Tokens */}
        <Card className="p-6 bg-card/95">
          <h3 className="text-lg font-bold mb-4">Tokens</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <WalletIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-bold">SOL</div>
                  <div className="text-sm text-muted-foreground">{balance.sol.toFixed(2)} SOL</div>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-accent/5 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <div className="font-bold">XP</div>
                  <div className="text-sm text-muted-foreground">{balance.xp.toLocaleString()} XP</div>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </Card>

        {/* LandNFTs */}
        <Card className="p-6 bg-card/95">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">LandNFTs</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Owned</span>
              <span className="font-bold text-accent">{nftCount} NFTs</span>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => navigate("/profile")}>
            <MapIcon className="w-4 h-4 mr-2" />
            View Collection
            <ArrowUpRight className="w-4 h-4 ml-auto" />
          </Button>
        </Card>

        {/* Transaction History */}
        <Card className="p-6 bg-card/95">
          <h3 className="text-lg font-bold mb-4">Transaction History</h3>
          
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
              <TabsTrigger value="sends" className="flex-1">Sends</TabsTrigger>
              <TabsTrigger value="receives" className="flex-1">Receives</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 m-0">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-background/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === "receive" 
                        ? "bg-accent/20" 
                        : "bg-warning/20"
                    }`}>
                      {tx.type === "receive" ? (
                        <ArrowDownLeft className="w-5 h-5 text-accent" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-warning" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold">{tx.amount}</div>
                      <div className="text-sm text-muted-foreground capitalize">{tx.type}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">{tx.time}</div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="sends" className="m-0">
              <div className="text-center py-8 text-muted-foreground">
                <p>No send transactions</p>
              </div>
            </TabsContent>

            <TabsContent value="receives" className="m-0">
              <div className="text-center py-8 text-muted-foreground">
                <p>No receive transactions</p>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pb-6">
          <Button variant="default" size="lg" className="h-14">
            <ArrowUpRight className="w-5 h-5 mr-2" />
            Send
          </Button>
          <Button variant="accent" size="lg" className="h-14">
            <ArrowDownLeft className="w-5 h-5 mr-2" />
            Receive
          </Button>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Wallet;
