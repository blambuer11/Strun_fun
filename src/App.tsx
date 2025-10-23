import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { InstallPWA } from "@/components/InstallPWA";
import Index from "./pages/Index";
import Login from "./pages/Login";
import EmailAuth from "./pages/EmailAuth";
import Dashboard from "./pages/Dashboard";
import Run from "./pages/Run";
import Profile from "./pages/Profile";
import Stats from "./pages/Stats";
import Group from "./pages/Group";
import Community from "./pages/Community";
import Wallet from "./pages/Wallet";
import Tasks from "./pages/Tasks";
import Admin from "./pages/Admin";
import Share from "./pages/Share";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <InstallPWA />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/email-auth" element={<EmailAuth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/run" element={<Run />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/group" element={<Group />} />
            <Route path="/community" element={<Community />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/share/:taskId" element={<Share />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
