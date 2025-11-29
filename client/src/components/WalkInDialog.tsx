import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UserPlus, Loader2, User, CreditCard, Bed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Room, RoomType } from "@shared/schema";

interface WalkInDialogProps {
  onComplete?: () => void;
}

export default function WalkInDialog({ onComplete }: WalkInDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  const [guestData, setGuestData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    idType: "",
    idNumber: ""
  });

  const [reservationData, setReservationData] = useState({
    roomId: "",
    roomTypeId: "",
    nights: "1",
    adults: "1",
    children: "0",
    depositAmount: "100",
    paymentMethod: "credit_card",
    specialRequests: ""
  });

  const { data: roomsData, isLoading: roomsLoading } = useQuery<{ rooms: Room[] }>({
    queryKey: ["/api/front-desk/available-rooms"],
    enabled: open
  });

  const { data: roomTypesData } = useQuery<{ roomTypes: RoomType[] }>({
    queryKey: ["/api/properties/prop-demo/room-types"],
    enabled: open
  });

  const walkInMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/front-desk/walk-in", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Walk-in Successful",
        description: data.message || "Guest has been checked in successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/current-guests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/available-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      setOpen(false);
      resetForm();
      onComplete?.();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Walk-in Failed",
        description: error.message || "Failed to process walk-in registration",
      });
    }
  });

  const resetForm = () => {
    setGuestData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      idType: "",
      idNumber: ""
    });
    setReservationData({
      roomId: "",
      roomTypeId: "",
      nights: "1",
      adults: "1",
      children: "0",
      depositAmount: "100",
      paymentMethod: "credit_card",
      specialRequests: ""
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guestData.firstName || !guestData.lastName) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter guest first and last name",
      });
      return;
    }

    if (!reservationData.roomId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a room",
      });
      return;
    }

    walkInMutation.mutate({
      guest: guestData,
      ...reservationData,
      nights: parseInt(reservationData.nights),
      adults: parseInt(reservationData.adults),
      children: parseInt(reservationData.children),
      depositAmount: reservationData.depositAmount
    });
  };

  const availableRooms = roomsData?.rooms || [];
  const roomTypes = roomTypesData?.roomTypes || [];

  const selectedRoom = availableRooms.find(r => r.id === reservationData.roomId);
  const selectedRoomType = roomTypes.find(rt => rt.id === (reservationData.roomTypeId || selectedRoom?.roomTypeId));
  const estimatedTotal = selectedRoomType 
    ? (parseFloat(selectedRoomType.baseRate) * parseInt(reservationData.nights || "1")).toFixed(2)
    : "0.00";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-walk-in">
          <UserPlus className="h-4 w-4 mr-2" />
          Walk-in Guest
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Walk-in Guest Registration
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Guest Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={guestData.firstName}
                    onChange={(e) => setGuestData({ ...guestData, firstName: e.target.value })}
                    placeholder="Enter first name"
                    data-testid="input-walk-in-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={guestData.lastName}
                    onChange={(e) => setGuestData({ ...guestData, lastName: e.target.value })}
                    placeholder="Enter last name"
                    data-testid="input-walk-in-lastname"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={guestData.email}
                    onChange={(e) => setGuestData({ ...guestData, email: e.target.value })}
                    placeholder="guest@example.com"
                    data-testid="input-walk-in-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={guestData.phone}
                    onChange={(e) => setGuestData({ ...guestData, phone: e.target.value })}
                    placeholder="+1 555-0100"
                    data-testid="input-walk-in-phone"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="idType">ID Type</Label>
                  <Select
                    value={guestData.idType}
                    onValueChange={(value) => setGuestData({ ...guestData, idType: value })}
                  >
                    <SelectTrigger data-testid="select-walk-in-idtype">
                      <SelectValue placeholder="Select ID type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="drivers_license">Driver's License</SelectItem>
                      <SelectItem value="national_id">National ID</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idNumber">ID Number</Label>
                  <Input
                    id="idNumber"
                    value={guestData.idNumber}
                    onChange={(e) => setGuestData({ ...guestData, idNumber: e.target.value })}
                    placeholder="Enter ID number"
                    data-testid="input-walk-in-idnumber"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bed className="h-4 w-4" />
                Room Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomId">Select Room *</Label>
                {roomsLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading rooms...
                  </div>
                ) : (
                  <Select
                    value={reservationData.roomId}
                    onValueChange={(value) => {
                      const room = availableRooms.find(r => r.id === value);
                      setReservationData({ 
                        ...reservationData, 
                        roomId: value,
                        roomTypeId: room?.roomTypeId || ""
                      });
                    }}
                  >
                    <SelectTrigger data-testid="select-walk-in-room">
                      <SelectValue placeholder="Select an available room" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms.length === 0 ? (
                        <SelectItem value="none" disabled>No rooms available</SelectItem>
                      ) : (
                        availableRooms.map((room) => {
                          const roomType = roomTypes.find(rt => rt.id === room.roomTypeId);
                          return (
                            <SelectItem key={room.id} value={room.id}>
                              Room {room.roomNumber} - {roomType?.name || "Standard"} (${roomType?.baseRate || "0"}/night)
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nights">Nights</Label>
                  <Input
                    id="nights"
                    type="number"
                    min="1"
                    value={reservationData.nights}
                    onChange={(e) => setReservationData({ ...reservationData, nights: e.target.value })}
                    data-testid="input-walk-in-nights"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adults">Adults</Label>
                  <Input
                    id="adults"
                    type="number"
                    min="1"
                    value={reservationData.adults}
                    onChange={(e) => setReservationData({ ...reservationData, adults: e.target.value })}
                    data-testid="input-walk-in-adults"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="children">Children</Label>
                  <Input
                    id="children"
                    type="number"
                    min="0"
                    value={reservationData.children}
                    onChange={(e) => setReservationData({ ...reservationData, children: e.target.value })}
                    data-testid="input-walk-in-children"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialRequests">Special Requests</Label>
                <Textarea
                  id="specialRequests"
                  value={reservationData.specialRequests}
                  onChange={(e) => setReservationData({ ...reservationData, specialRequests: e.target.value })}
                  placeholder="Any special requests or notes..."
                  rows={2}
                  data-testid="textarea-walk-in-requests"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="depositAmount">Deposit Amount</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={reservationData.depositAmount}
                    onChange={(e) => setReservationData({ ...reservationData, depositAmount: e.target.value })}
                    data-testid="input-walk-in-deposit"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={reservationData.paymentMethod}
                    onValueChange={(value) => setReservationData({ ...reservationData, paymentMethod: value })}
                  >
                    <SelectTrigger data-testid="select-walk-in-payment">
                      <SelectValue placeholder="Select payment method" />
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

              <Separator />

              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Estimated Total:</span>
                <span className="text-primary">${estimatedTotal}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={walkInMutation.isPending}
              data-testid="button-submit-walk-in"
            >
              {walkInMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Complete Check-in
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
