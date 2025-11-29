import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Bed, Users, Wifi, Car, Coffee, ChevronDown, Eye, Wrench, Sparkles, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export type RoomStatus = "clean" | "dirty" | "maintenance" | "occupied" | "available";

interface RoomStatusCardProps {
  roomNumber: string;
  roomType: string;
  status: RoomStatus;
  guestName?: string;
  checkIn?: string;
  checkOut?: string;
  amenities?: string[];
  onStatusChange?: (newStatus: RoomStatus) => void;
  onViewDetails?: () => void;
}

const statusConfig = {
  clean: { color: "bg-hotel-success", text: "Clean", variant: "default" as const, icon: Sparkles },
  dirty: { color: "bg-hotel-warning", text: "Dirty", variant: "secondary" as const, icon: AlertTriangle },
  maintenance: { color: "bg-hotel-error", text: "Maintenance", variant: "destructive" as const, icon: Wrench },
  occupied: { color: "bg-primary", text: "Occupied", variant: "default" as const, icon: Users },
  available: { color: "bg-hotel-success", text: "Available", variant: "outline" as const, icon: CheckCircle },
};

const amenityIcons: Record<string, typeof Wifi> = {
  "WiFi": Wifi,
  "Parking": Car,
  "Coffee": Coffee,
  "Business": Users,
  "TV": Bed,
  "Air Conditioning": Bed,
  "Mini Bar": Coffee,
  "Coffee Maker": Coffee,
};

export default function RoomStatusCard({
  roomNumber,
  roomType,
  status,
  guestName,
  checkIn,
  checkOut,
  amenities = [],
  onStatusChange,
  onViewDetails
}: RoomStatusCardProps) {
  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;

  const getAvailableStatuses = (): RoomStatus[] => {
    switch (status) {
      case "occupied":
        return ["dirty", "maintenance"];
      case "dirty":
        return ["clean", "maintenance"];
      case "clean":
        return ["available", "dirty", "maintenance"];
      case "available":
        return ["occupied", "dirty", "maintenance"];
      case "maintenance":
        return ["available", "dirty", "clean"];
      default:
        return ["available", "occupied", "clean", "dirty", "maintenance"];
    }
  };

  return (
    <Card className="hover-elevate" data-testid={`card-room-${roomNumber}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold" data-testid={`text-room-number-${roomNumber}`}>
            Room {roomNumber}
          </CardTitle>
          <Badge variant={statusInfo.variant} className="flex items-center gap-1" data-testid={`badge-status-${roomNumber}`}>
            <StatusIcon className="h-3 w-3" />
            {statusInfo.text}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground" data-testid={`text-room-type-${roomNumber}`}>
          {roomType}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {guestName && (
          <div className="space-y-1 p-2 rounded-md bg-muted/50">
            <p className="text-sm font-medium" data-testid={`text-guest-name-${roomNumber}`}>
              {guestName}
            </p>
            {checkIn && checkOut && (
              <p className="text-xs text-muted-foreground" data-testid={`text-stay-dates-${roomNumber}`}>
                {checkIn} - {checkOut}
              </p>
            )}
          </div>
        )}

        {amenities.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {amenities.slice(0, 4).map((amenity, index) => {
              const Icon = amenityIcons[amenity] || Bed;
              return (
                <div key={index} className="flex items-center gap-1" data-testid={`amenity-${amenity.toLowerCase().replace(/\s+/g, '-')}-${roomNumber}`}>
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{amenity}</span>
                </div>
              );
            })}
            {amenities.length > 4 && (
              <span className="text-xs text-muted-foreground">+{amenities.length - 4} more</span>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={onViewDetails}
            className="flex-1"
            data-testid={`button-view-details-${roomNumber}`}
          >
            <Eye className="h-4 w-4 mr-1" />
            Details
          </Button>
          {onStatusChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="sm"
                  className="flex-1"
                  data-testid={`button-change-status-${roomNumber}`}
                >
                  Status
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Change to</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {getAvailableStatuses().map((newStatus) => {
                  const config = statusConfig[newStatus];
                  const Icon = config.icon;
                  return (
                    <DropdownMenuItem
                      key={newStatus}
                      onClick={() => onStatusChange(newStatus)}
                      data-testid={`menu-item-status-${newStatus}-${roomNumber}`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {config.text}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
