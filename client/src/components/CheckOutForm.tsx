import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreditCard, Receipt, Clock, DollarSign, Star, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CheckOutFormProps {
  guestData?: {
    name: string;
    roomNumber: string;
    checkInDate: string;
    totalNights: number;
    roomRate: number;
  };
  onCheckOutComplete?: (data: any) => void;
}

export default function CheckOutForm({ guestData, onCheckOutComplete }: CheckOutFormProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkOutDetails, setCheckOutDetails] = useState({
    departureTime: new Date().toTimeString().slice(0, 5),
    keyCardsReturned: "2",
    additionalCharges: "",
    guestFeedback: "",
    rating: "5",
    roomCondition: "good",
    damages: "",
    finalPaymentMethod: "same-as-checkin"
  });

  // TODO: remove mock functionality - replace with real bill calculation
  const mockBillSummary = {
    roomCharges: (guestData?.roomRate || 120) * (guestData?.totalNights || 2),
    taxes: ((guestData?.roomRate || 120) * (guestData?.totalNights || 2)) * 0.12,
    additionalCharges: 25.50, // minibar, etc.
    securityDeposit: 100,
    total: 0
  };

  mockBillSummary.total = mockBillSummary.roomCharges + mockBillSummary.taxes + mockBillSummary.additionalCharges;
  const finalAmount = mockBillSummary.total - mockBillSummary.securityDeposit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    const checkOutData = {
      guest: guestData?.name,
      room: guestData?.roomNumber,
      checkOutTime: new Date().toISOString(),
      billSummary: mockBillSummary,
      finalAmount,
      ...checkOutDetails
    };

    console.log('Check-out completed:', checkOutData);
    
    toast({
      title: "Check-out Successful",
      description: `${guestData?.name} has been checked out from room ${guestData?.roomNumber}`,
    });

    setIsProcessing(false);
    onCheckOutComplete?.(checkOutData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {guestData && (
        <Card data-testid="card-guest-summary">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src="/api/placeholder/40/40" />
                <AvatarFallback>{guestData.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-lg">{guestData.name}</div>
                <div className="text-sm text-muted-foreground">
                  Room {guestData.roomNumber} • Checked in {guestData.checkInDate}
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
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span>Room Charges ({guestData?.totalNights || 2} nights)</span>
              <span>${mockBillSummary.roomCharges.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes & Fees</span>
              <span>${mockBillSummary.taxes.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Additional Charges</span>
              <span>${mockBillSummary.additionalCharges.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Security Deposit</span>
              <span className="text-hotel-success">-${mockBillSummary.securityDeposit.toFixed(2)}</span>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex justify-between font-semibold text-lg">
            <span>Total Amount</span>
            <span>${mockBillSummary.total.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between font-bold text-xl text-primary">
            <span>Amount Due</span>
            <span data-testid="text-final-amount">${finalAmount.toFixed(2)}</span>
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

          <div className="space-y-2">
            <Label htmlFor="additionalCharges">Additional Charges Notes</Label>
            <Textarea
              id="additionalCharges"
              value={checkOutDetails.additionalCharges}
              onChange={(e) => setCheckOutDetails({...checkOutDetails, additionalCharges: e.target.value})}
              placeholder="Any additional charges or notes..."
              rows={2}
              data-testid="textarea-additional-charges"
            />
          </div>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Final Payment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="finalPaymentMethod">Payment Method</Label>
            <Select value={checkOutDetails.finalPaymentMethod} onValueChange={(value) => 
              setCheckOutDetails({...checkOutDetails, finalPaymentMethod: value})}>
              <SelectTrigger data-testid="select-final-payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="same-as-checkin">Same as Check-in</SelectItem>
                <SelectItem value="credit-card">Credit Card</SelectItem>
                <SelectItem value="debit-card">Debit Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="corporate">Corporate Account</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Badge variant="outline">
            Final Amount: ${finalAmount.toFixed(2)}
          </Badge>
          <Badge variant={finalAmount > 0 ? "destructive" : "default"}>
            {finalAmount > 0 ? "Payment Required" : "No Payment Due"}
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
            disabled={isProcessing}
            data-testid="button-complete-checkout"
          >
            {isProcessing ? "Processing..." : "Complete Check-Out"}
          </Button>
        </div>
      </div>
    </form>
  );
}