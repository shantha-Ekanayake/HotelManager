import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { ThemeProvider } from "@/components/ThemeProvider";
import Dashboard from "@/pages/Dashboard";
import Reservations from "@/pages/Reservations";
import Rooms from "@/pages/Rooms";
import NotFound from "@/pages/NotFound";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/reservations" component={Reservations} />
      <Route path="/rooms" component={Rooms} />
      <Route path="/guests" component={() => <div className="p-6"><h1 className="text-2xl font-bold">Guests - Coming Soon</h1></div>} />
      <Route path="/housekeeping" component={() => <div className="p-6"><h1 className="text-2xl font-bold">Housekeeping - Coming Soon</h1></div>} />
      <Route path="/billing" component={() => <div className="p-6"><h1 className="text-2xl font-bold">Billing - Coming Soon</h1></div>} />
      <Route path="/reports" component={() => <div className="p-6"><h1 className="text-2xl font-bold">Reports - Coming Soon</h1></div>} />
      <Route path="/settings" component={() => <div className="p-6"><h1 className="text-2xl font-bold">Settings - Coming Soon</h1></div>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1">
                <DashboardHeader 
                  userName="John Smith"
                  userRole="Manager"
                  notifications={3}
                />
                <main className="flex-1 overflow-auto">
                  <div className="container mx-auto p-6">
                    <Router />
                  </div>
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
