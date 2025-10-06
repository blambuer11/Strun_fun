import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Activity, Mail, Lock, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signUp, signIn } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: isLogin ? "Welcome back!" : "Account created!",
          description: `You've successfully ${isLogin ? "signed in" : "signed up"}!`,
        });
        if (!isLogin) {
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/10 to-secondary/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(142_76%_52%/0.1),transparent_50%)]" />
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-accent/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      
      <Card className="w-full max-w-md p-8 bg-card/90 backdrop-blur-xl border-primary/20 relative z-10 shadow-2xl">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-accent/30 blur-xl rounded-full" />
            <div className="relative bg-gradient-to-br from-accent to-accent-glow p-4 rounded-2xl">
              <Activity className="w-12 h-12 text-accent-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gradient mb-2">Strun</h1>
          <p className="text-muted-foreground text-center">Run. Claim. Earn. Dominate the streets.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4 text-accent" />
              Email
            </label>
            <Input
              type="email"
              placeholder="runner@strun.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-input border-primary/20 focus:border-accent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Lock className="w-4 h-4 text-accent" />
              Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-input border-primary/20 focus:border-accent"
            />
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            <Zap className="w-5 h-5" />
            {loading ? "Loading..." : (isLogin ? "Sign In" : "Create Account")}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-accent transition-colors"
            >
              {isLogin ? "Need an account? " : "Already have an account? "}
              <span className="text-accent font-semibold">
                {isLogin ? "Sign up" : "Sign in"}
              </span>
            </button>
          </div>
        </form>

        {/* Features */}
        <div className="mt-8 pt-8 border-t border-border/50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-accent font-bold text-2xl">10+</div>
              <div className="text-xs text-muted-foreground">XP per km</div>
            </div>
            <div>
              <div className="text-accent font-bold text-2xl">NFT</div>
              <div className="text-xs text-muted-foreground">Land Claims</div>
            </div>
            <div>
              <div className="text-accent font-bold text-2xl">Web3</div>
              <div className="text-xs text-muted-foreground">Powered</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Login;
