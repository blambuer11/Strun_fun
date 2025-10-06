import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Google login error:', error);
      toast({
        title: "Error",
        description: "Failed to sign in with Google",
        variant: "destructive",
      });
    }
  };

  const handleAppleLogin = async () => {
    toast({
      title: "Coming Soon",
      description: "Apple authentication will be available soon",
    });
  };

  const handleEmailLogin = () => {
    navigate("/email-auth");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-8 bg-card border-border/50">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="inline-flex bg-gradient-to-br from-accent to-accent-glow p-3 rounded-2xl mb-6">
            <Activity className="w-10 h-10 text-accent-foreground" />
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-3">Strun</h1>
          <p className="text-muted-foreground text-lg">
            Run to claim your territory on Solana
          </p>
        </div>

        {/* Auth Buttons */}
        <div className="space-y-3">
          <Button
            variant="default"
            size="lg"
            className="w-full h-14 text-base bg-primary hover:bg-primary/90"
            onClick={handleGoogleLogin}
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full h-14 text-base bg-background hover:bg-muted border-border"
            onClick={handleAppleLogin}
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with Apple
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-card text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="lg"
            className="w-full h-14 text-base border border-border hover:bg-muted"
            onClick={handleEmailLogin}
          >
            Continue with Email
          </Button>
        </div>

        {/* Terms */}
        <p className="text-center text-xs text-muted-foreground mt-8 leading-relaxed">
          By continuing, you agree to our{" "}
          <a href="#" className="text-foreground underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="text-foreground underline">
            Privacy Policy
          </a>
          .
        </p>
      </Card>
    </div>
  );
};

export default Login;
