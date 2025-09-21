import { Bell, Menu, User, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "../hooks/use-theme";

interface DashboardHeaderProps {
  onMenuClick?: () => void;
  userName?: string;
  userRole?: string;
  notifications?: number;
}

export default function DashboardHeader({ 
  onMenuClick, 
  userName = "John Smith", 
  userRole = "Manager",
  notifications = 3 
}: DashboardHeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          data-testid="button-menu-toggle"
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">HotelPro</h1>
          <p className="text-sm text-muted-foreground">Hotel Management System</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          data-testid="button-theme-toggle"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            data-testid="button-notifications"
          >
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
                data-testid="badge-notification-count"
              >
                {notifications}
              </Badge>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8" data-testid="avatar-user">
            <AvatarImage src="/api/placeholder/32/32" />
            <AvatarFallback>{userName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-foreground" data-testid="text-user-name">
              {userName}
            </p>
            <p className="text-xs text-muted-foreground" data-testid="text-user-role">
              {userRole}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}