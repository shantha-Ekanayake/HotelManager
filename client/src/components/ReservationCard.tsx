import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Phone, Mail, CreditCard } from "lucide-react";

export type ReservationStatus = "confirmed" | "pending" | "checked-in" | "checked-out" | "cancelled";

interface ReservationCardProps {
  id: string;
  guestName: string;
  roomNumber?: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  status: ReservationStatus;
  totalAmount: number;
  guestEmail?: string;
  guestPhone?: string;
  specialRequests?: string;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  onViewDetails?: () => void;
}

const statusConfig = {
  confirmed: { variant: "default" as const, color: "bg-hotel-success" },
  pending: { variant: "secondary" as const, color: "bg-hotel-warning" },
  "checked-in": { variant: "default" as const, color: "bg-primary" },
  "checked-out": { variant: "outline" as const, color: "bg-muted" },
  cancelled: { variant: "destructive" as const, color: "bg-hotel-error" },
};

export default function ReservationCard({
  id,
  guestName,
  roomNumber,
  roomType,
  checkIn,
  checkOut,
  status,
  totalAmount,
  guestEmail,
  guestPhone,
  specialRequests,
  onCheckIn,
  onCheckOut,
  onViewDetails
}: ReservationCardProps) {
  const statusInfo = statusConfig[status];

  return (
    <Card className="hover-elevate" data-testid={`card-reservation-${id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src="/api/placeholder/40/40" />
              <AvatarFallback>{guestName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg" data-testid={`text-guest-name-${id}`}>
                {guestName}
              </CardTitle>
              <p className="text-sm text-muted-foreground" data-testid={`text-reservation-id-${id}`}>
                Reservation #{id.slice(-6)}
              </p>
            </div>
          </div>
          <Badge variant={statusInfo.variant} data-testid={`badge-status-${id}`}>
            {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm" data-testid={`text-checkin-${id}`}>{checkIn}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm" data-testid={`text-checkout-${id}`}>{checkOut}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium" data-testid={`text-room-type-${id}`}>
              {roomType}
              {roomNumber && <span className="text-muted-foreground"> - Room {roomNumber}</span>}
            </p>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold" data-testid={`text-total-amount-${id}`}>
                ${totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {(guestEmail || guestPhone) && (
          <div className="flex gap-4">
            {guestEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground" data-testid={`text-email-${id}`}>
                  {guestEmail}
                </span>
              </div>
            )}
            {guestPhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground" data-testid={`text-phone-${id}`}>
                  {guestPhone}
                </span>
              </div>
            )}
          </div>
        )}

        {specialRequests && (
          <div className="bg-muted/50 p-2 rounded-md">
            <p className="text-xs text-muted-foreground font-medium mb-1">Special Requests:</p>
            <p className="text-xs" data-testid={`text-special-requests-${id}`}>
              {specialRequests}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={onViewDetails}
            data-testid={`button-view-details-${id}`}
          >
            Details
          </Button>
          
          {status === "confirmed" && onCheckIn && (
            <Button 
              size="sm"
              onClick={onCheckIn}
              data-testid={`button-checkin-${id}`}
            >
              Check In
            </Button>
          )}
          
          {status === "checked-in" && onCheckOut && (
            <Button 
              size="sm"
              onClick={onCheckOut}
              data-testid={`button-checkout-${id}`}
            >
              Check Out
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}