import { useNavigate, useLocation } from "react-router-dom";
import { Map, User, Wallet, Users, Activity, MessageSquare } from "lucide-react";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Map, label: "Run", path: "/run" },
    { icon: Activity, label: "Stats", path: "/stats" },
    { icon: MessageSquare, label: "Community", path: "/community" },
    { icon: Users, label: "Group", path: "/group" },
    { icon: Wallet, label: "Wallet", path: "/wallet" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border/50 z-50 safe-area-bottom">
      <div className="container mx-auto px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 transition-colors px-4 py-2 rounded-lg ${
                  isActive ? "text-accent bg-accent/10" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
