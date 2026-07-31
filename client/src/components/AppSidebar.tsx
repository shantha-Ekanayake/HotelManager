import {
  Calendar,
  Home,
  Users,
  Bed,
  ClipboardList,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    permission: "dashboard.view", // Implicitly allowed for all authenticated users
  },
  {
    title: "Front Desk",
    url: "/front-desk",
    icon: Users,
    permission: "front_desk.view",
  },
  {
    title: "Reservations",
    url: "/reservations",
    icon: Calendar,
    permission: "reservations.view",
  },
  {
    title: "Guests",
    url: "/guests",
    icon: Users,
    permission: "guests.view",
  },
  {
    title: "Rooms",
    url: "/rooms",
    icon: Bed,
    permission: "rooms.view",
  },
  {
    title: "Housekeeping",
    url: "/housekeeping",
    icon: ClipboardList,
    permission: "housekeeping.view",
  },
  {
    title: "Billing",
    url: "/billing",
    icon: DollarSign,
    permission: "billing.view",
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
    permission: "reports.view",
  },
];

const settingsItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    permission: "settings.manage",
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === "it_admin") return true;
    if (permission === "dashboard.view") return true;
    
    // Simple check if the permission exists in the user's role permissions
    // In a real app, we'd use the same logic as the backend
    // For now, we'll assume the user object has a permissions array or we check by role
    
    const rolePermissions: Record<string, string[]> = {
      admin: [
        "users.manage", "properties.manage", "reports.view.all", "reports.view", "reports.view.financial",
        "reservations.manage", "guests.manage", "rooms.view", "rooms.manage",
        "billing.manage", "housekeeping.manage", "maintenance.manage", "rates.manage",
        "front_desk.manage", "front_desk.view", "rooms.status.update", "service_requests.view", "service_requests.manage",
        "check_in.process", "check_out.process", "folios.manage", "payments.process", "reservations.view", "guests.view", "housekeeping.view", "billing.view"
      ],
      operations_manager: [
        "reservations.manage", "reservations.view", "guests.view", "housekeeping.view",
        "maintenance.view", "reports.view.operational", "front_desk.manage", "front_desk.view", "reports.view"
      ],
      hotel_manager: [
        "reservations.manage", "reservations.view", "guests.manage", "guests.view", "rooms.view", "rooms.manage", "properties.view", "billing.view",
        "housekeeping.manage", "housekeeping.view", "maintenance.manage", "reports.view.property",
        "reports.view.financial", "reports.view", "rates.view", "users.view.property", "front_desk.manage", "front_desk.view",
        "check_in.process", "check_out.process", "folios.manage", "payments.process"
      ],
      front_desk_staff: [
        "reservations.manage", "reservations.view", "guests.manage", "guests.view", "folios.manage",
        "payments.process", "check_in.process", "check_out.process",
        "service_requests.create", "rooms.view", "rooms.status.update",
        "front_desk.view", "front_desk.manage", "rooms.manage"
      ],
      housekeeping_staff: [
        "housekeeping.tasks.update", "rooms.status.update.assigned", "housekeeping.view"
      ]
    };

    const permissions = rolePermissions[user.role as string] || [];
    
    if (permissions.includes("*")) return true;
    if (permissions.includes(permission)) return true;
    
    // Check for .view if .manage is present
    if (permission.endsWith(".view")) {
      const managePermission = permission.replace(".view", ".manage");
      if (permissions.includes(managePermission)) return true;
    }

    return false;
  };

  const filteredMenuItems = menuItems.filter(item => hasPermission(item.permission));
  const filteredSettingsItems = settingsItems.filter(item => hasPermission(item.permission));

  return (
    <Sidebar data-testid="sidebar-main">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Hotel Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    data-testid={`sidebar-link-${item.title.toLowerCase()}`}
                  >
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filteredSettingsItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredSettingsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location === item.url}
                      data-testid={`sidebar-link-${item.title.toLowerCase()}`}
                    >
                      <a href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={() => logout()}
              data-testid="sidebar-link-logout"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}