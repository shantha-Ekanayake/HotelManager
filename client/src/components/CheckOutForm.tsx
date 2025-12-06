import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CreditCard, Receipt, Clock, Star, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Reservation, Guest, Folio, Charge, Payment } from "@shared/schema";

interface CheckOutFormProps {
  reservationId?: string;
  onCheckOutComplete?: (data: any) => void;
}

export default function CheckOutForm({ reservationId, onCheckOutComplete }: CheckOutFormProps) {
  const { toast } = useToast();
  
  const [checkOutDetails, setCheckOutDetails] = useState({
    departureTime: new Date().toTimeString().slice(0, 5),
    keyCardsReturned: "2",
    roomCondition: "good",
    damages: "",
    guestFeedback: "",
    rating: "5",
    additionalNotes: ""
  });

  const { data: folioData, isLoading: folioLoading } = useQuery<{
    reservation: Reservation;
    folio: Folio & { charges: Charge[]; payments: Payment[] };
  }>({
    queryKey: ["/api/front-desk/reservation", reservationId, "folio"],
    enabled: !!reservationId
  });

  const { data: guestData, isLoading: guestLoading } = useQuery<{ guest: Guest }>({
    queryKey: ["/api/guests", folioData?.reservation?.guestId],
    enabled: !!folioData?.reservation?.guestId
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/reservations/${reservationId}/check-out`);
    },
    onSuccess: () => {
      toast({
        title: "Check-out Successful",
        description: "Guest has been checked out successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/departures-today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/overview"] });
      onCheckOutComplete?.(folioData);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Check-out Failed",
        description: error.message || "Failed to process check-out",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservationId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No reservation selected for check-out",
      });
      return;
    }
    checkOutMutation.mutate();
  };

  const guest = guestData?.guest;
  const reservation = folioData?.reservation;
  const folio = folioData?.folio;
  const isLoading = folioLoading || guestLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12" data-testid="loader-checkout">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!reservationId) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No reservation selected</p>
        <p className="text-sm text-muted-foreground mt-2">Please select a guest to check out</p>
      </div>
    );
  }

  if (!reservation || !folio) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Reservation or folio not found</p>
        <p className="text-sm text-muted-foreground mt-2">Unable to load check-out information</p>
      </div>
    );
  }

  const totalCharges = folio?.charges?.reduce((sum, c) => sum + parseFloat(c.amount), 0) || 0;
  const totalPayments = folio?.payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
  const balance = totalCharges - totalPayments;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {guest && reservation && (
        <Card data-testid="card-guest-summary">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {guest.firstName[0]}{guest.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-lg">{guest.firstName} {guest.lastName}</div>
                <div className="text-sm text-muted-foreground">
                  {reservation.confirmationNumber} • Room {reservation.roomId}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Bill Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {folio?.charges && folio.charges.length > 0 ? (
            <div className="space-y-2">
              <div className="font-medium text-sm mb-2">Charges</div>
              {folio.charges.map((charge) => (
                <div key={charge.id} className="flex justify-between text-sm">
                  <span>{charge.description}</span>
                  <span>${parseFloat(charge.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No charges recorded</div>
          )}
          
          <Separator />
          
          <div className="flex justify-between font-semibold">
            <span>Total Charges</span>
            <span>${totalCharges.toFixed(2)}</span>
          </div>

          {folio?.payments && folio.payments.length > 0 && (
            <>
              <div className="space-y-2">
                <div className="font-medium text-sm mb-2">Payments</div>
                {folio.payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between text-sm text-hotel-success">
                    <span>{payment.paymentMethod} ({new Date(payment.paymentDate).toLocaleDateString()})</span>
                    <span>-${parseFloat(payment.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Separator />
            </>
          )}
          
          <div className="flex justify-between font-bold text-xl">
            <span>Balance Due</span>
            <span data-testid="text-final-amount" className={balance > 0 ? "text-destructive" : "text-hotel-success"}>
              ${balance.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Check-Out Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departureTime">Departure Time</Label>
              <Input
                id="departureTime"
                type="time"
                value={checkOutDetails.departureTime}
                onChange={(e) => setCheckOutDetails({...checkOutDetails, departureTime: e.target.value})}
                data-testid="input-departure-time"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyCardsReturned">Key Cards Returned</Label>
              <Select value={checkOutDetails.keyCardsReturned} onValueChange={(value) => 
                setCheckOutDetails({...checkOutDetails, keyCardsReturned: value})}>
                <SelectTrigger data-testid="select-key-cards-returned">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 Cards</SelectItem>
                  <SelectItem value="1">1 Card</SelectItem>
                  <SelectItem value="2">2 Cards</SelectItem>
                  <SelectItem value="3">3 Cards</SelectItem>
                  <SelectItem value="4">4 Cards</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="roomCondition">Room Condition</Label>
              <Select value={checkOutDetails.roomCondition} onValueChange={(value) => 
                setCheckOutDetails({...checkOutDetails, roomCondition: value})}>
                <SelectTrigger data-testid="select-room-condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {checkOutDetails.roomCondition === "damaged" && (
            <div className="space-y-2">
              <Label htmlFor="damages">Damage Description</Label>
              <Textarea
                id="damages"
                value={checkOutDetails.damages}
                onChange={(e) => setCheckOutDetails({...checkOutDetails, damages: e.target.value})}
                placeholder="Describe any damages found..."
                rows={3}
                data-testid="textarea-damages"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Settlement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {balance > 0 && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm font-medium text-destructive">
                Outstanding Balance: ${balance.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Payment must be collected before guest departure
              </p>
            </div>
          )}
          
          {balance <= 0 && (
            <div className="p-4 rounded-lg bg-hotel-success/10 border border-hotel-success/20">
              <p className="text-sm font-medium text-hotel-success">
                Account Settled
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                All charges have been paid in full
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Guest Feedback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rating">Overall Rating</Label>
            <Select value={checkOutDetails.rating} onValueChange={(value) => 
              setCheckOutDetails({...checkOutDetails, rating: value})}>
              <SelectTrigger data-testid="select-guest-rating">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">⭐⭐⭐⭐⭐ Excellent</SelectItem>
                <SelectItem value="4">⭐⭐⭐⭐ Very Good</SelectItem>
                <SelectItem value="3">⭐⭐⭐ Good</SelectItem>
                <SelectItem value="2">⭐⭐ Fair</SelectItem>
                <SelectItem value="1">⭐ Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guestFeedback">Guest Comments</Label>
            <Textarea
              id="guestFeedback"
              value={checkOutDetails.guestFeedback}
              onChange={(e) => setCheckOutDetails({...checkOutDetails, guestFeedback: e.target.value})}
              placeholder="Any feedback from the guest..."
              rows={3}
              data-testid="textarea-guest-feedback"
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Badge variant="outline">
            Balance: ${balance.toFixed(2)}
          </Badge>
          <Badge variant={balance > 0 ? "destructive" : "default"}>
            {balance > 0 ? "Payment Required" : "Fully Paid"}
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => window.print()}
            data-testid="button-print-receipt"
          >
            Print Receipt
          </Button>
          <Button 
            type="submit" 
            disabled={checkOutMutation.isPending}
            data-testid="button-complete-checkout"
          >
            {checkOutMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Complete Check-Out"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
