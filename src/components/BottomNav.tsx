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
    <nav className="fixed bottom-0 left-0 right-0 glass-strong border-t border-primary/20 z-50 safe-area-bottom">
      <div className="container mx-auto px-1 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 transition-all px-2 py-1.5 rounded-xl ${
                  isActive ? "scale-110" : "hover:scale-105"
                }`}
              >
                <item.icon className={`w-5 h-5 transition-all ${isActive ? "text-primary drop-shadow-[0_0_8px_hsl(174,100%,50%)]" : "text-muted-foreground"}`} />
                <span className={`text-[10px] font-medium transition-all ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
