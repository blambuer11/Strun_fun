import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, QrCode, Camera } from "lucide-react";
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
      {/* Header */}
      <header className="border-b border-border/50 bg-card backdrop-blur-lg p-4 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
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
        {/* Hero Card */}
        <Card className="p-6 bg-gradient-to-br from-accent/10 via-transparent to-primary/10 border-accent/30">
          <h1 className="text-2xl font-bold mb-2">Geo Tasks</h1>
          <p className="text-muted-foreground mb-4">
            Complete location-based challenges to earn XP and rewards
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowQRScanner(true)}
            >
              <QrCode className="w-4 h-4 mr-2" />
              Scan QR
            </Button>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="nearby" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="nearby">Nearby</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="nearby" className="space-y-4 mt-4">
            <TasksMap onTaskSelect={handleTaskSelect} />
          </TabsContent>
          
          <TabsContent value="completed" className="mt-4">
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                Complete tasks to see them here
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />

      {/* QR Scanner Dialog */}
      <QRScanner
        open={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onSuccess={(xp) => {
          console.log('Earned XP:', xp);
        }}
      />

      {/* Selfie Camera Dialog */}
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
