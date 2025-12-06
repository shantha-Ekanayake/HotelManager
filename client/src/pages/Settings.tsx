import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  const isAdmin = user?.role === "admin" || user?.role === "it_admin";

  const { data: settingsData, isLoading } = useQuery<{ settings: Array<{ key: string; value: string }> }>({
    queryKey: ["/api/settings/prop-demo"]
  });

  const updateSettingMutation = useMutation({
    mutationFn: async (data: { key: string; value: string }) => {
      return await apiRequest("POST", "/api/settings", data);
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "System settings have been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/prop-demo"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update settings",
      });
    }
  });

  const handleOfflineToggle = (checked: boolean) => {
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only admins can modify this setting",
      });
      return;
    }
    
    setOfflineEnabled(checked);
    updateSettingMutation.mutate({
      key: "offline_mode_enabled",
      value: checked ? "true" : "false"
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage system configuration and features</p>
      </div>

      {!isAdmin && (
        <Card className="border-hotel-warning bg-hotel-warning/10">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-hotel-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm">You have limited permissions. Some settings are only available to administrators.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Offline Mode</span>
            {!isAdmin && (
              <span className="ml-auto text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                Admin Only
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Enable offline functionality for the hotel management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enable Offline Feature</Label>
              <p className="text-sm text-muted-foreground mt-1">
                When enabled, the system can operate without internet connectivity
              </p>
            </div>
            <Switch
              checked={offlineEnabled}
              onCheckedChange={handleOfflineToggle}
              disabled={!isAdmin || updateSettingMutation.isPending}
              data-testid="switch-offline-mode"
            />
          </div>
          {updateSettingMutation.isPending && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating settings...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
