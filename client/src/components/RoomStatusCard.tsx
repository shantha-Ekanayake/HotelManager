import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bed, Users, Wifi, Car, Coffee } from "lucide-react";

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
  clean: { color: "bg-hotel-success", text: "Clean", variant: "default" as const },
  dirty: { color: "bg-hotel-warning", text: "Dirty", variant: "secondary" as const },
  maintenance: { color: "bg-hotel-error", text: "Maintenance", variant: "destructive" as const },
  occupied: { color: "bg-primary", text: "Occupied", variant: "default" as const },
  available: { color: "bg-hotel-success", text: "Available", variant: "outline" as const },
};

const amenityIcons = {
  "WiFi": Wifi,
  "Parking": Car,
  "Coffee": Coffee,
  "Business": Users,
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

  return (
    <Card className="hover-elevate" data-testid={`card-room-${roomNumber}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold" data-testid={`text-room-number-${roomNumber}`}>
            Room {roomNumber}
          </CardTitle>
          <Badge variant={statusInfo.variant} data-testid={`badge-status-${roomNumber}`}>
            {statusInfo.text}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground" data-testid={`text-room-type-${roomNumber}`}>
          {roomType}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {guestName && (
          <div className="space-y-1">
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
            {amenities.map((amenity, index) => {
              const Icon = amenityIcons[amenity as keyof typeof amenityIcons] || Bed;
              return (
                <div key={index} className="flex items-center gap-1" data-testid={`amenity-${amenity.toLowerCase()}-${roomNumber}`}>
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{amenity}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={onViewDetails}
            data-testid={`button-view-details-${roomNumber}`}
          >
            View Details
          </Button>
          {onStatusChange && (
            <Button 
              size="sm"
              onClick={() => {
                const newStatus = status === "clean" ? "dirty" : "clean";
                onStatusChange(newStatus);
              }}
              data-testid={`button-change-status-${roomNumber}`}
            >
              Update Status
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}