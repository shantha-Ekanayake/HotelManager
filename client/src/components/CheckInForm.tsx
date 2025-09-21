import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, User, CreditCard, KeyRound, Phone, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idNumber: string;
  address: string;
}

interface CheckInFormProps {
  reservationId?: string;
  onCheckInComplete?: (data: any) => void;
}

export default function CheckInForm({ reservationId, onCheckInComplete }: CheckInFormProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    idNumber: "",
    address: ""
  });
  
  const [checkInDetails, setCheckInDetails] = useState({
    roomNumber: "",
    numberOfGuests: "1",
    keyCards: "2",
    specialRequests: "",
    arrivalTime: new Date().toTimeString().slice(0, 5),
    depositAmount: "100",
    paymentMethod: "credit-card"
  });

  // TODO: remove mock functionality - replace with real data
  const availableRooms = [
    { number: "101", type: "Standard King", rate: 120 },
    { number: "102", type: "Deluxe Queen", rate: 140 },
    { number: "201", type: "Executive Suite", rate: 220 },
    { number: "205", type: "Presidential Suite", rate: 350 }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    const checkInData = {
      reservationId,
      guest: guestInfo,
      room: checkInDetails.roomNumber,
      checkInTime: new Date().toISOString(),
      ...checkInDetails
    };

    console.log('Check-in completed:', checkInData);
    
    toast({
      title: "Check-in Successful",
      description: `${guestInfo.firstName} ${guestInfo.lastName} has been checked into room ${checkInDetails.roomNumber}`,
    });

    setIsProcessing(false);
    onCheckInComplete?.(checkInData);
  };

  const isFormValid = guestInfo.firstName && guestInfo.lastName && guestInfo.email && 
                    guestInfo.phone && guestInfo.idNumber && checkInDetails.roomNumber;

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
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={guestInfo.firstName}
                onChange={(e) => setGuestInfo({...guestInfo, firstName: e.target.value})}
                placeholder="John"
                required
                data-testid="input-first-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={guestInfo.lastName}
                onChange={(e) => setGuestInfo({...guestInfo, lastName: e.target.value})}
                placeholder="Doe"
                required
                data-testid="input-last-name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={guestInfo.email}
                  onChange={(e) => setGuestInfo({...guestInfo, email: e.target.value})}
                  placeholder="john.doe@email.com"
                  className="pl-10"
                  required
                  data-testid="input-email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={guestInfo.phone}
                  onChange={(e) => setGuestInfo({...guestInfo, phone: e.target.value})}
                  placeholder="+1 (555) 123-4567"
                  className="pl-10"
                  required
                  data-testid="input-phone"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="idNumber">ID Number *</Label>
              <Input
                id="idNumber"
                value={guestInfo.idNumber}
                onChange={(e) => setGuestInfo({...guestInfo, idNumber: e.target.value})}
                placeholder="Driver's License or Passport"
                required
                data-testid="input-id-number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={guestInfo.address}
                onChange={(e) => setGuestInfo({...guestInfo, address: e.target.value})}
                placeholder="123 Main St, City, State"
                data-testid="input-address"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Room Assignment & Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roomNumber">Room Assignment *</Label>
              <Select value={checkInDetails.roomNumber} onValueChange={(value) => 
                setCheckInDetails({...checkInDetails, roomNumber: value})}>
                <SelectTrigger data-testid="select-room-number">
                  <SelectValue placeholder="Select available room" />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.map((room) => (
                    <SelectItem key={room.number} value={room.number}>
                      Room {room.number} - {room.type} (${room.rate}/night)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="numberOfGuests">Number of Guests</Label>
              <Select value={checkInDetails.numberOfGuests} onValueChange={(value) => 
                setCheckInDetails({...checkInDetails, numberOfGuests: value})}>
                <SelectTrigger data-testid="select-number-guests">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Guest</SelectItem>
                  <SelectItem value="2">2 Guests</SelectItem>
                  <SelectItem value="3">3 Guests</SelectItem>
                  <SelectItem value="4">4 Guests</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="keyCards">Key Cards</Label>
              <Select value={checkInDetails.keyCards} onValueChange={(value) => 
                setCheckInDetails({...checkInDetails, keyCards: value})}>
                <SelectTrigger data-testid="select-key-cards">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Card</SelectItem>
                  <SelectItem value="2">2 Cards</SelectItem>
                  <SelectItem value="3">3 Cards</SelectItem>
                  <SelectItem value="4">4 Cards</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrivalTime">Arrival Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="arrivalTime"
                  type="time"
                  value={checkInDetails.arrivalTime}
                  onChange={(e) => setCheckInDetails({...checkInDetails, arrivalTime: e.target.value})}
                  className="pl-10"
                  data-testid="input-arrival-time"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="depositAmount">Security Deposit ($)</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="depositAmount"
                  value={checkInDetails.depositAmount}
                  onChange={(e) => setCheckInDetails({...checkInDetails, depositAmount: e.target.value})}
                  placeholder="100"
                  className="pl-10"
                  data-testid="input-deposit-amount"
                />
              </div>
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
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={checkInDetails.paymentMethod} onValueChange={(value) => 
            setCheckInDetails({...checkInDetails, paymentMethod: value})}>
            <SelectTrigger data-testid="select-payment-method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="credit-card">Credit Card</SelectItem>
              <SelectItem value="debit-card">Debit Card</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="corporate">Corporate Account</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Badge variant="outline">
            Total Stay Cost: ${checkInDetails.roomNumber ? 
              availableRooms.find(r => r.number === checkInDetails.roomNumber)?.rate || 0 : 0}/night
          </Badge>
          <Badge variant="outline">
            Security Deposit: ${checkInDetails.depositAmount}
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => {
              setGuestInfo({firstName: "", lastName: "", email: "", phone: "", idNumber: "", address: ""});
              setCheckInDetails({roomNumber: "", numberOfGuests: "1", keyCards: "2", specialRequests: "", arrivalTime: new Date().toTimeString().slice(0, 5), depositAmount: "100", paymentMethod: "credit-card"});
            }}
            data-testid="button-clear-form"
          >
            Clear Form
          </Button>
          <Button 
            type="submit" 
            disabled={!isFormValid || isProcessing}
            data-testid="button-complete-checkin"
          >
            {isProcessing ? "Processing..." : "Complete Check-In"}
          </Button>
        </div>
      </div>
    </form>
  );
}