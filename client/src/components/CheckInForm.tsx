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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar, Clock, User, CreditCard, KeyRound, Phone, Mail, Loader2, ShieldCheck, PenLine, CheckCircle2, Printer, Send, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Reservation, Guest, Room, Property } from "@shared/schema";
import SignaturePad from "./SignaturePad";
import { printRegistrationCard, buildPropertyCardFields, buildGuestCardFields } from "./RegistrationCardPrint";

interface CheckInFormProps {
  reservationId?: string;
  onCheckInComplete?: (data: any) => void;
}

const ID_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "national_id", label: "National ID" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "other", label: "Other" }
];

export default function CheckInForm({ reservationId, onCheckInComplete }: CheckInFormProps) {
  const { toast } = useToast();
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [signature, setSignature] = useState<string | null>(null);
  const [checkInResult, setCheckInResult] = useState<any>(null);
  const [resendLoading, setResendLoading] = useState(false);

  const [idVerification, setIdVerification] = useState({
    idType: "",
    idNumber: "",
    nationality: ""
  });

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

  const { data: propertiesData } = useQuery<{ properties: Property[] }>({
    queryKey: ["/api/properties"]
  });

  // Pre-populate ID fields from guest record when guest loads
  useEffect(() => {
    const g = guestData?.guest;
    if (g) {
      setIdVerification({
        idType: g.idType || "",
        idNumber: g.idNumber || "",
        nationality: g.nationality || ""
      });
    }
  }, [guestData]);

  const checkInMutation = useMutation({
    mutationFn: async (data: {
      roomId: string;
      depositAmount: string;
      paymentMethod: string;
      idType?: string;
      idNumber?: string;
      nationality?: string;
      signature?: string | null;
    }) => {
      const response = await apiRequest("POST", `/api/reservations/${reservationId}/check-in`, data);
      return response.json();
    },
    onSuccess: (data) => {
      setCheckInResult(data);
      toast({
        title: "Check-in Successful",
        description: `Guest has been checked in successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/arrivals-today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/current-guests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      // Do NOT call onCheckInComplete here — the post-check-in panel must stay
      // mounted so staff can print the registration card and resend the email.
      // onCheckInComplete is called when the user explicitly clicks "Done".
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
    
    checkInMutation.mutate({ 
      roomId: selectedRoomId,
      depositAmount: checkInDetails.depositAmount,
      paymentMethod: checkInDetails.paymentMethod,
      idType: idVerification.idType || undefined,
      idNumber: idVerification.idNumber || undefined,
      nationality: idVerification.nationality || undefined,
      signature: signature
    });
  };

  const handlePrintCard = () => {
    const res = reservation?.reservation;
    const g = guestData?.guest;
    const room = availableRoomsData?.rooms.find(r => r.id === selectedRoomId);
    const property = propertiesData?.properties?.[0];
    const propertyFields = buildPropertyCardFields(property);

    const guestFields = buildGuestCardFields(g, idVerification);
    printRegistrationCard({
      ...guestFields,
      roomNumber: room?.roomNumber || selectedRoomId,
      confirmationNumber: res?.confirmationNumber || "—",
      checkInDate: res?.arrivalDate ? new Date(res.arrivalDate).toLocaleDateString() : "—",
      checkOutDate: res?.departureDate ? new Date(res.departureDate).toLocaleDateString() : "—",
      nights: res?.nights || 0,
      rateAmount: res?.totalAmount || "0",
      depositAmount: checkInDetails.depositAmount,
      depositPaid: !!checkInDetails.depositAmount && parseFloat(checkInDetails.depositAmount) > 0,
      signature: signature,
      ...propertyFields,
    });
  };

  const handleResendEmail = async () => {
    if (!reservationId) return;
    setResendLoading(true);
    try {
      await apiRequest("POST", `/api/reservations/${reservationId}/send-checkin-email`, {});
      toast({
        title: "Email Sent",
        description: "Check-in confirmation email has been resent to the guest.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Email Failed",
        description: error.message || "Failed to send email.",
      });
    } finally {
      setResendLoading(false);
    }
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

  // Post-check-in success panel
  if (checkInResult) {
    const emailStatus: "sent" | "skipped" | "failed" | undefined = checkInResult.emailStatus;
    return (
      <div className="space-y-6">
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800">Check-In Complete</AlertTitle>
          <AlertDescription className="text-green-700">
            {guest.firstName} {guest.lastName} has been successfully checked in.
            {emailStatus === "sent"
              ? " A welcome email has been sent to the guest."
              : emailStatus === "failed"
              ? " The welcome email could not be sent — see the warning below."
              : guest.email
              ? " No email confirmation was sent (SMTP not configured)."
              : " No email address on file."}
          </AlertDescription>
        </Alert>

        {emailStatus === "failed" && (
          <Alert className="border-yellow-300 bg-yellow-50" data-testid="alert-email-failed">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Welcome Email Failed</AlertTitle>
            <AlertDescription className="text-yellow-700">
              The check-in confirmation email could not be delivered. The failure has been recorded in the guest communication log. Use the <strong>Resend Welcome Email</strong> button below once the issue is resolved, or contact the guest directly.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Post Check-In Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrintCard}
              data-testid="button-print-registration-card"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Registration Card
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleResendEmail}
              disabled={resendLoading}
              data-testid="button-resend-email"
            >
              {resendLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Resend Welcome Email
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              onClick={() => onCheckInComplete?.(checkInResult)}
              data-testid="button-done-checkin"
            >
              Done
            </Button>
          </CardContent>
        </Card>
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

      {/* ID Verification */}
      <Card data-testid="card-id-verification">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            ID Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="idType">ID Type</Label>
              <Select
                value={idVerification.idType}
                onValueChange={(value) => setIdVerification({ ...idVerification, idType: value })}
              >
                <SelectTrigger data-testid="select-id-type">
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent>
                  {ID_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="idNumber">ID Number</Label>
              <Input
                id="idNumber"
                value={idVerification.idNumber}
                onChange={(e) => setIdVerification({ ...idVerification, idNumber: e.target.value })}
                placeholder="Enter ID number"
                data-testid="input-id-number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                value={idVerification.nationality}
                onChange={(e) => setIdVerification({ ...idVerification, nationality: e.target.value })}
                placeholder="e.g. Pakistani"
                data-testid="input-nationality"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guest Signature */}
      <Card data-testid="card-signature">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5" />
            Guest Signature
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SignaturePad onChange={setSignature} />
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
              <Label htmlFor="depositAmount">Deposit Amount (Rs)</Label>
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
            setSignature(null);
            setIdVerification({ idType: "", idNumber: "", nationality: "" });
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
