import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, QrCode, Camera, MapPin, Zap, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import TasksMap from "@/components/TasksMap";
import QRScanner from "@/components/QRScanner";
import SelfieCamera from "@/components/SelfieCamera";
import strunLogo from "@/assets/strun-logo.jpg";

const Tasks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showSelfieCamera, setShowSelfieCamera] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const handleTaskSelect = (task: any) => {
    setSelectedTask(task);
    if (task.task_type === 'qr_scan') {
      setShowQRScanner(true);
    } else if (task.task_type === 'selfie_group') {
      setShowSelfieCamera(true);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header with Glass Effect */}
      <header className="border-b border-border/50 glass sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img 
            src={strunLogo} 
            alt="Strun Logo" 
            className="h-8 w-auto object-contain"
          />
          <div className="w-10" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Hero Card with Gradient Border */}
        <Card className="relative overflow-hidden glass border-primary/20 animate-slide-up">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
          <div className="relative p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-full bg-primary/20 glow-primary">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-display font-bold mb-2 text-gradient">
                  Geo Tasks
                </h1>
                <p className="text-muted-foreground text-sm">
                  Complete location-based challenges to earn XP and rewards
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setShowQRScanner(true)}
                className="h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-medium group relative overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary-glow opacity-0 group-hover:opacity-100 transition-opacity" />
                <QrCode className="w-5 h-5 mr-2 relative z-10" />
                <span className="relative z-10">Scan QR</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-14 border-accent/50 hover:bg-accent/10 hover:border-accent text-foreground font-medium"
              >
                <Camera className="w-5 h-5 mr-2" />
                Selfie Task
              </Button>
            </div>

            {/* Stats Pills */}
            <div className="flex gap-2 mt-4">
              <div className="flex-1 glass rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Nearby</span>
                </div>
                <div className="text-xl font-bold text-primary mt-1">12</div>
              </div>
              <div className="flex-1 glass rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent" />
                  <span className="text-xs text-muted-foreground">Earned</span>
                </div>
                <div className="text-xl font-bold text-xp mt-1">450</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs with Glass Style */}
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <Tabs defaultValue="nearby" className="w-full">
            <TabsList className="grid w-full grid-cols-2 glass border border-border/50">
              <TabsTrigger 
                value="nearby"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Nearby
              </TabsTrigger>
              <TabsTrigger 
                value="completed"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              >
                <Zap className="w-4 h-4 mr-2" />
                Completed
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="nearby" className="space-y-4 mt-4">
              <TasksMap onTaskSelect={handleTaskSelect} />
            </TabsContent>
            
            <TabsContent value="completed" className="mt-4">
              <Card className="p-12 text-center glass border-border/50">
                <div className="inline-flex p-4 rounded-full bg-accent/10 mb-4">
                  <Zap className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-lg font-bold mb-2">No Completed Tasks Yet</h3>
                <p className="text-muted-foreground text-sm">
                  Complete tasks to see them here and track your progress
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Floating Hint */}
        <div className="fixed bottom-24 right-4 animate-bounce-slow">
          <div className="glass rounded-full p-3 border border-primary/30 glow-primary">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>

      <BottomNav />

      {/* Modals */}
      <QRScanner
        open={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onSuccess={(xp) => {
          console.log('Earned XP:', xp);
        }}
      />

      {selectedTask?.task_type === 'selfie_group' && (
        <SelfieCamera
          open={showSelfieCamera}
          onClose={() => setShowSelfieCamera(false)}
          taskId={selectedTask.id}
          userTaskId=""
          nonce={`STRUN-${Date.now().toString(36).toUpperCase()}`}
          onSuccess={() => {
            setShowSelfieCamera(false);
          }}
        />
      )}
    </div>
  );
};

export default Tasks;
