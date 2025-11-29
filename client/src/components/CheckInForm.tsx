import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, User, CreditCard, KeyRound, Phone, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Reservation, Guest, Room } from "@shared/schema";

interface CheckInFormProps {
  reservationId?: string;
  onCheckInComplete?: (data: any) => void;
}

export default function CheckInForm({ reservationId, onCheckInComplete }: CheckInFormProps) {
  const { toast } = useToast();
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  
  const [checkInDetails, setCheckInDetails] = useState({
    numberOfGuests: "1",
    keyCards: "2",
    specialRequests: "",
    arrivalTime: new Date().toTimeString().slice(0, 5),
    depositAmount: "100",
    paymentMethod: "credit_card",
    guestAgreement: false
  });

  const { data: reservation, isLoading: reservationLoading } = useQuery<{ reservation: Reservation }>({
    queryKey: ["/api/reservations", reservationId],
    enabled: !!reservationId
  });

  const { data: guestData, isLoading: guestLoading } = useQuery<{ guest: Guest }>({
    queryKey: ["/api/guests", reservation?.reservation?.guestId],
    enabled: !!reservation?.reservation?.guestId
  });

  const { data: availableRoomsData, isLoading: roomsLoading } = useQuery<{ rooms: Room[] }>({
    queryKey: ["/api/front-desk/available-rooms"]
  });

  const checkInMutation = useMutation({
    mutationFn: async (data: { roomId: string }) => {
      return await apiRequest(`/api/reservations/${reservationId}/check-in`, {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Check-in Successful",
        description: `Guest has been checked into room successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/arrivals-today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/overview"] });
      onCheckInComplete?.(reservation);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Check-in Failed",
        description: error.message || "Failed to process check-in",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId || !reservationId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a room",
      });
      return;
    }
    
    checkInMutation.mutate({ roomId: selectedRoomId });
  };

  const guest = guestData?.guest;
  const availableRooms = availableRoomsData?.rooms || [];
  const isLoading = reservationLoading || guestLoading || roomsLoading;
  const isFormValid = selectedRoomId && reservationId;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12" data-testid="loader-checkin">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!reservationId) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No reservation selected</p>
        <p className="text-sm text-muted-foreground mt-2">Please select a reservation to check in</p>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Reservation not found</p>
        <p className="text-sm text-muted-foreground mt-2">The reservation ID may be invalid</p>
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Guest information not found</p>
        <p className="text-sm text-muted-foreground mt-2">Unable to load guest details for this reservation</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card data-testid="card-checkin-form">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Guest Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input
                value={guest?.firstName || ""}
                disabled
                data-testid="input-first-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input
                value={guest?.lastName || ""}
                disabled
                data-testid="input-last-name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={guest?.email || ""}
                  disabled
                  className="pl-10"
                  data-testid="input-email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={guest?.phone || ""}
                  disabled
                  className="pl-10"
                  data-testid="input-phone"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={guest?.address || "N/A"}
              disabled
              data-testid="input-address"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Room Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roomNumber">Room Assignment *</Label>
            <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
              <SelectTrigger data-testid="select-room-number">
                <SelectValue placeholder="Select available room" />
              </SelectTrigger>
              <SelectContent>
                {availableRooms.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No rooms available</div>
                ) : (
                  availableRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      Room {room.roomNumber} - {room.status}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {availableRooms.length === 0 && (
              <p className="text-sm text-muted-foreground">No clean rooms available for check-in</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numberOfGuests">Number of Guests</Label>
              <Input
                id="numberOfGuests"
                type="number"
                min="1"
                value={checkInDetails.numberOfGuests}
                onChange={(e) => setCheckInDetails({...checkInDetails, numberOfGuests: e.target.value})}
                data-testid="input-number-of-guests"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyCards">Key Cards</Label>
              <Input
                id="keyCards"
                type="number"
                min="1"
                value={checkInDetails.keyCards}
                onChange={(e) => setCheckInDetails({...checkInDetails, keyCards: e.target.value})}
                data-testid="input-key-cards"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialRequests">Special Requests</Label>
            <Textarea
              id="specialRequests"
              value={checkInDetails.specialRequests}
              onChange={(e) => setCheckInDetails({...checkInDetails, specialRequests: e.target.value})}
              placeholder="Any special requests or notes..."
              rows={3}
              data-testid="textarea-special-requests"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Deposit & Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="depositAmount">Deposit Amount ($)</Label>
              <Input
                id="depositAmount"
                type="number"
                min="0"
                step="0.01"
                value={checkInDetails.depositAmount}
                onChange={(e) => setCheckInDetails({...checkInDetails, depositAmount: e.target.value})}
                data-testid="input-deposit-amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={checkInDetails.paymentMethod} onValueChange={(value) => setCheckInDetails({...checkInDetails, paymentMethod: value})}>
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end items-center gap-2">
        <Button 
          type="button" 
          variant="outline"
          onClick={() => {
            setSelectedRoomId("");
            setCheckInDetails({
              numberOfGuests: "1",
              keyCards: "2",
              specialRequests: "",
              arrivalTime: new Date().toTimeString().slice(0, 5),
              depositAmount: "100",
              paymentMethod: "credit_card",
              guestAgreement: false
            });
          }}
          data-testid="button-clear-form"
        >
          Clear
        </Button>
        <Button 
          type="submit" 
          disabled={!isFormValid || checkInMutation.isPending}
          data-testid="button-complete-checkin"
        >
          {checkInMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Complete Check-In"
          )}
        </Button>
      </div>
    </form>
  );
}