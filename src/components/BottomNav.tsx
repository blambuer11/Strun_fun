import { useNavigate, useLocation } from "react-router-dom";
import { Map, User, Wallet, Users, Activity, MessageSquare, MapPin, Settings } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useIsAdmin();

  const navItems = [
    { icon: Map, label: "Run", path: "/run" },
    { icon: MapPin, label: "Tasks", path: "/tasks" },
    { icon: MessageSquare, label: "Community", path: "/community" },
    { icon: Activity, label: "Dashboard", path: "/dashboard" },
    { icon: User, label: "Profile", path: "/profile" },
    ...(isAdmin ? [{ icon: Settings, label: "Admin", path: "/admin" }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border/50 z-50 safe-area-bottom">
      <div className="container mx-auto px-1 py-1.5">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 transition-colors px-2 py-1.5 rounded-lg ${
                  isActive ? "text-accent bg-accent/10" : "text-foreground/70 hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
