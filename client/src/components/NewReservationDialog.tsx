import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Plus, User } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertReservationSchema } from "@shared/schema";

const reservationFormSchema = insertReservationSchema.extend({
  arrivalDate: z.date(),
  departureDate: z.date(),
});

type ReservationFormData = z.infer<typeof reservationFormSchema>;

interface NewReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewReservationDialog({ open, onOpenChange }: NewReservationDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showNewGuestForm, setShowNewGuestForm] = useState(false);
  const [newGuest, setNewGuest] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    idNumber: ""
  });

  const form = useForm<ReservationFormData>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      propertyId: user?.propertyId || "",
      guestId: "",
      roomTypeId: "",
      ratePlanId: "",
      arrivalDate: new Date(),
      departureDate: new Date(Date.now() + 86400000),
      nights: 1,
      adults: 1,
      children: 0,
      totalAmount: "0",
      depositAmount: "0",
      depositPaid: false,
      status: "confirmed",
      source: "direct",
      specialRequests: "",
      notes: "",
      createdBy: user?.id
    },
  });

  const { data: guestsData } = useQuery<{ guests: any[] }>({
    queryKey: ["/api/guests/all"],
    enabled: open,
  });

  const { data: roomTypesData } = useQuery<{ roomTypes: any[] }>({
    queryKey: ["/api/properties", user?.propertyId, "room-types"],
    enabled: open && !!user?.propertyId,
  });

  const { data: ratePlansData } = useQuery<{ ratePlans: any[] }>({
    queryKey: ["/api/properties", user?.propertyId, "rate-plans"],
    enabled: open && !!user?.propertyId,
  });

  const createReservationMutation = useMutation({
    mutationFn: async (data: any) => {
      // Validate required fields
      if (!data.guestId) {
        throw new Error("Please select a guest before creating the reservation");
      }
      
      // Convert form data to API format
      const reservationData = {
        propertyId: data.propertyId,
        guestId: data.guestId,
        roomTypeId: data.roomTypeId,
        ratePlanId: data.ratePlanId,
        arrivalDate: data.arrivalDate.toISOString(),
        departureDate: data.departureDate.toISOString(),
        nights: data.nights,
        adults: data.adults,
        children: data.children,
        totalAmount: data.totalAmount,
        depositAmount: data.depositAmount || "0",
        depositPaid: data.depositPaid || false,
        status: data.status || "confirmed",
        source: data.source || "direct",
        specialRequests: data.specialRequests || "",
        notes: data.notes || "",
        createdBy: data.createdBy
      };
      
      const response = await apiRequest("POST", "/api/reservations", reservationData);
      return response.json();
    },
    onSuccess: async (data: any) => {
      const confirmationNumber = data?.reservation?.confirmationNumber;
      
      // Show toast first before closing dialog
      toast({
        title: "Success",
        description: confirmationNumber 
          ? `Reservation created successfully (${confirmationNumber})` 
          : "Reservation created successfully",
      });
      
      // Invalidate all reservation-related queries - use property-scoped keys to match page queries
      const propertyId = user?.propertyId || "prop-demo";
      await queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "reservations"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      
      // Close dialog and reset form
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create reservation",
        variant: "destructive",
      });
    },
  });

  const createGuestMutation = useMutation({
    mutationFn: async (guestData: any) => {
      const response = await apiRequest("POST", "/api/guests", guestData);
      return response.json();
    },
    onSuccess: async (data: any) => {
      console.log("Guest creation response:", data);
      
      if (data?.guest?.id) {
        // Set the guestId in form with proper trigger options
        form.setValue("guestId", data.guest.id, { 
          shouldDirty: true, 
          shouldValidate: true,
          shouldTouch: true 
        });
        
        // Close the new guest form and reset inputs
        setShowNewGuestForm(false);
        setNewGuest({ firstName: "", lastName: "", email: "", phone: "", idNumber: "" });
        
        // Invalidate and refetch guests list
        await queryClient.invalidateQueries({ queryKey: ["/api/guests/all"] });
        
        toast({
          title: "Success",
          description: `Guest ${data.guest.firstName} ${data.guest.lastName} created and selected`,
        });
      } else {
        console.error("Guest creation response missing ID:", data);
        toast({
          title: "Error",
          description: "Guest created but no ID returned",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error("Guest creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create guest",
        variant: "destructive",
      });
    },
  });

  const calculateNights = (arrival: Date, departure: Date) => {
    const nights = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  };

  const calculateTotal = (roomTypeId: string, nights: number) => {
    const roomType = roomTypesData?.roomTypes.find((rt: any) => rt.id === roomTypeId);
    if (roomType) {
      return (parseFloat(roomType.baseRate) * nights).toFixed(2);
    }
    return "0";
  };

  const onSubmit = (data: ReservationFormData) => {
    createReservationMutation.mutate(data);
  };

  const guests = guestsData?.guests || [];
  const roomTypes = roomTypesData?.roomTypes || [];
  const ratePlans = ratePlansData?.ratePlans || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Reservation</DialogTitle>
          <DialogDescription>
            Create a new reservation for a guest
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Guest Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showNewGuestForm ? (
                  <>
                    <FormField
                      control={form.control}
                      name="guestId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Guest</FormLabel>
                          <div className="flex gap-2">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-guest">
                                  <SelectValue placeholder="Select a guest" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {guests.map((guest: any) => (
                                  <SelectItem key={guest.id} value={guest.id}>
                                    {guest.firstName} {guest.lastName} - {guest.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setShowNewGuestForm(true)}
                              data-testid="button-new-guest"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">New Guest</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowNewGuestForm(false);
                          setNewGuest({ firstName: "", lastName: "", email: "", phone: "", idNumber: "" });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        placeholder="First Name *" 
                        data-testid="input-guest-firstname"
                        value={newGuest.firstName}
                        onChange={(e) => setNewGuest({ ...newGuest, firstName: e.target.value })}
                      />
                      <Input 
                        placeholder="Last Name *" 
                        data-testid="input-guest-lastname"
                        value={newGuest.lastName}
                        onChange={(e) => setNewGuest({ ...newGuest, lastName: e.target.value })}
                      />
                      <Input 
                        placeholder="Email *" 
                        data-testid="input-guest-email" 
                        type="email" 
                        className="col-span-2"
                        value={newGuest.email}
                        onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                      />
                      <Input 
                        placeholder="Phone" 
                        data-testid="input-guest-phone"
                        value={newGuest.phone}
                        onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                      />
                      <Input 
                        placeholder="ID Number" 
                        data-testid="input-guest-idnumber"
                        value={newGuest.idNumber}
                        onChange={(e) => setNewGuest({ ...newGuest, idNumber: e.target.value })}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        if (!newGuest.firstName || !newGuest.lastName || !newGuest.email) {
                          toast({
                            title: "Validation Error",
                            description: "First Name, Last Name, and Email are required",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        createGuestMutation.mutate({
                          propertyId: user?.propertyId || "prop-demo",
                          firstName: newGuest.firstName,
                          lastName: newGuest.lastName,
                          email: newGuest.email,
                          phone: newGuest.phone || "",
                          idNumber: newGuest.idNumber || "",
                          idType: "Passport",
                          nationality: "USA",
                        });
                      }}
                      disabled={createGuestMutation.isPending}
                      data-testid="button-save-guest"
                    >
                      {createGuestMutation.isPending ? "Creating..." : "Create Guest"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Reservation Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="arrivalDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Arrival Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="justify-start text-left font-normal"
                                data-testid="button-arrival-date"
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : "Select date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                if (date) {
                                  field.onChange(date);
                                  const departure = form.getValues("departureDate");
                                  const nights = calculateNights(date, departure);
                                  form.setValue("nights", nights);
                                  const roomTypeId = form.getValues("roomTypeId");
                                  if (roomTypeId) {
                                    form.setValue("totalAmount", calculateTotal(roomTypeId, nights));
                                  }
                                }
                              }}
                              disabled={(date) => date < new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="departureDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Departure Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="justify-start text-left font-normal"
                                data-testid="button-departure-date"
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : "Select date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                if (date) {
                                  field.onChange(date);
                                  const arrival = form.getValues("arrivalDate");
                                  const nights = calculateNights(arrival, date);
                                  form.setValue("nights", nights);
                                  const roomTypeId = form.getValues("roomTypeId");
                                  if (roomTypeId) {
                                    form.setValue("totalAmount", calculateTotal(roomTypeId, nights));
                                  }
                                }
                              }}
                              disabled={(date) => date <= form.getValues("arrivalDate")}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="roomTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Type</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          const nights = form.getValues("nights");
                          form.setValue("totalAmount", calculateTotal(value, nights));
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-room-type">
                            <SelectValue placeholder="Select room type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roomTypes.map((rt: any) => (
                            <SelectItem key={rt.id} value={rt.id}>
                              {rt.name} - ${rt.baseRate}/night
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ratePlanId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate Plan</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-rate-plan">
                            <SelectValue placeholder="Select rate plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ratePlans.map((rp: any) => (
                            <SelectItem key={rp.id} value={rp.id}>
                              {rp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="nights"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nights</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" readOnly disabled className="bg-muted" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adults"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adults</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={1}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-adults"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="children"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Children</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={0}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-children"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Amount</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly disabled className="bg-muted font-medium text-lg" data-testid="input-total-amount" />
                      </FormControl>
                      <FormDescription>
                        Calculated automatically based on room type and nights
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specialRequests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Requests</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Any special requests or preferences..."
                          data-testid="textarea-special-requests"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createReservationMutation.isPending}
                data-testid="button-create-reservation"
              >
                {createReservationMutation.isPending ? "Creating..." : "Create Reservation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
