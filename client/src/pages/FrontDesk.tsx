import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CheckInForm from "@/components/CheckInForm";
import CheckOutForm from "@/components/CheckOutForm";
import GuestServicesPanel from "@/components/GuestServicesPanel";
import WalkInDialog from "@/components/WalkInDialog";
import RoomTransferDialog from "@/components/RoomTransferDialog";
import NoShowDialog from "@/components/NoShowDialog";
import ExpressCheckoutButton from "@/components/ExpressCheckoutButton";
import StayAdjustmentDialog from "@/components/StayAdjustmentDialog";
import ShiftReportPanel from "@/components/ShiftReportPanel";
import { 
  UserCheck, 
  UserX, 
  Bell, 
  Clock, 
  Users, 
  Bed, 
  Loader2, 
  FileText,
  AlertTriangle
} from "lucide-react";
import type { Reservation } from "@shared/schema";

export default function FrontDesk() {
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: overviewData, isLoading: overviewLoading } = useQuery<{
    overview: {
      checkInsScheduled: number;
      checkInsCompleted: number;
      checkOutsScheduled: number;
      checkOutsCompleted: number;
      currentOccupancy: number;
      totalRooms: number;
      occupiedRooms: number;
      availableRooms: number;
    };
  }>({
    queryKey: ["/api/front-desk/overview"]
  });

  const { data: arrivalsData, isLoading: arrivalsLoading } = useQuery<{ arrivals: Reservation[] }>({
    queryKey: ["/api/front-desk/arrivals-today"]
  });

  const { data: departuresData, isLoading: departuresLoading } = useQuery<{ departures: Reservation[] }>({
    queryKey: ["/api/front-desk/departures-today"]
  });

  const { data: currentGuestsData, isLoading: guestsLoading } = useQuery<{ guests: Reservation[] }>({
    queryKey: ["/api/front-desk/current-guests"]
  });

  const handleCheckInComplete = () => {
    setSelectedReservationId(null);
    setActiveTab("overview");
  };

  const handleCheckOutComplete = () => {
    setSelectedReservationId(null);
    setActiveTab("overview");
  };

  const initiateCheckOut = (reservationId: string) => {
    setSelectedReservationId(reservationId);
    setActiveTab("checkout");
  };

  const initiateCheckIn = (reservationId: string) => {
    setSelectedReservationId(reservationId);
    setActiveTab("checkin");
  };

  const overview = overviewData?.overview;
  const arrivals = arrivalsData?.arrivals || [];
  const departures = departuresData?.departures || [];
  const currentGuests = currentGuestsData?.guests || [];
  const isLoading = overviewLoading || arrivalsLoading || departuresLoading || guestsLoading;

  const arrivalsRemaining = (overview?.checkInsScheduled || 0) - (overview?.checkInsCompleted || 0);
  const departuresRemaining = (overview?.checkOutsScheduled || 0) - (overview?.checkOutsCompleted || 0);
  const pendingArrivals = arrivals.filter(a => a.status === "confirmed" || a.status === "pending");

  return (
    <div className="space-y-6" data-testid="page-front-desk">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Front Desk</h1>
          <p className="text-muted-foreground">
            Manage guest check-ins, check-outs, and front desk operations
          </p>
        </div>
        <WalkInDialog onComplete={() => setActiveTab("overview")} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Users className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="checkin" data-testid="tab-checkin">
            <UserCheck className="h-4 w-4 mr-2" />
            Check-In
          </TabsTrigger>
          <TabsTrigger value="checkout" data-testid="tab-checkout">
            <UserX className="h-4 w-4 mr-2" />
            Check-Out
          </TabsTrigger>
          <TabsTrigger value="services" data-testid="tab-services">
            <Bell className="h-4 w-4 mr-2" />
            Services
          </TabsTrigger>
          <TabsTrigger value="report" data-testid="tab-report">
            <FileText className="h-4 w-4 mr-2" />
            Shift Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Check-ins Today</p>
                        <p className="text-2xl font-bold">
                          {overview?.checkInsCompleted}/{overview?.checkInsScheduled}
                        </p>
                      </div>
                      <UserCheck className="h-8 w-8 text-hotel-success" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Check-outs Today</p>
                        <p className="text-2xl font-bold">
                          {overview?.checkOutsCompleted}/{overview?.checkOutsScheduled}
                        </p>
                      </div>
                      <UserX className="h-8 w-8 text-hotel-warning" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Occupancy</p>
                        <p className="text-2xl font-bold">{overview?.currentOccupancy}%</p>
                        <p className="text-xs text-muted-foreground">
                          {overview?.occupiedRooms}/{overview?.totalRooms} rooms
                        </p>
                      </div>
                      <Bed className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Available Rooms</p>
                        <p className="text-2xl font-bold">{overview?.availableRooms}</p>
                        <p className="text-xs text-muted-foreground">Ready for check-in</p>
                      </div>
                      <Bed className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      Current Guests
                      <Badge variant="outline">{currentGuests.length} Active</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {currentGuests.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No guests currently checked in</p>
                    ) : (
                      currentGuests.slice(0, 8).map((reservation) => (
                        <div key={reservation.id} className="flex items-center justify-between p-3 border rounded-lg hover-elevate">
                          <div>
                            <p className="font-medium" data-testid={`text-guest-${reservation.id}`}>
                              {reservation.confirmationNumber}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Room {reservation.roomId || "N/A"} • {new Date(reservation.arrivalDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            <RoomTransferDialog
                              reservationId={reservation.id}
                              currentRoomId={reservation.roomId || undefined}
                              guestName={reservation.confirmationNumber}
                            />
                            <ExpressCheckoutButton
                              reservationId={reservation.id}
                              confirmationNumber={reservation.confirmationNumber}
                            />
                            <Button 
                              size="sm"
                              onClick={() => initiateCheckOut(reservation.id)}
                              data-testid={`button-checkout-${reservation.id}`}
                            >
                              Check Out
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      Today's Arrivals
                      <Badge variant="outline">{arrivals.length} Scheduled</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pendingArrivals.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {arrivals.length > 0 ? "All arrivals checked in" : "No arrivals scheduled"}
                      </p>
                    ) : (
                      pendingArrivals.slice(0, 8).map((arrival) => (
                        <div key={arrival.id} className="flex items-center justify-between p-3 border rounded-lg hover-elevate">
                          <div>
                            <p className="font-medium">{arrival.confirmationNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              {arrival.status === "confirmed" ? "Confirmed" : "Pending"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            <StayAdjustmentDialog
                              reservationId={arrival.id}
                              confirmationNumber={arrival.confirmationNumber}
                              currentStatus={arrival.status}
                            />
                            <NoShowDialog
                              reservationId={arrival.id}
                              confirmationNumber={arrival.confirmationNumber}
                            />
                            <Button
                              size="sm"
                              onClick={() => initiateCheckIn(arrival.id)}
                              data-testid={`button-checkin-arrival-${arrival.id}`}
                            >
                              Check In
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Today's Schedule Summary
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{arrivalsRemaining}</p>
                      <p className="text-sm text-muted-foreground">Pending Check-ins</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">{departuresRemaining}</p>
                      <p className="text-sm text-muted-foreground">Pending Check-outs</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{currentGuests.length}</p>
                      <p className="text-sm text-muted-foreground">In-House Guests</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{overview?.availableRooms || 0}</p>
                      <p className="text-sm text-muted-foreground">Rooms Available</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4 flex-wrap">
                <Button 
                  onClick={() => setActiveTab("checkin")}
                  data-testid="button-quick-checkin"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Check-In Guest
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setActiveTab("checkout")}
                  data-testid="button-quick-checkout"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Check-Out Guest
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setActiveTab("report")}
                  data-testid="button-view-report"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Shift Report
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="checkin" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Guest Check-In
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedReservationId ? (
                <CheckInForm 
                  reservationId={selectedReservationId} 
                  onCheckInComplete={handleCheckInComplete} 
                />
              ) : (
                <div className="text-center py-8 space-y-4">
                  <p className="text-muted-foreground">Select an arrival to check in or register a walk-in guest</p>
                  {pendingArrivals.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-sm font-medium">Today's Pending Arrivals:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {pendingArrivals.map((arrival) => (
                          <div key={arrival.id} className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => initiateCheckIn(arrival.id)}
                              data-testid={`button-select-checkin-${arrival.id}`}
                            >
                              {arrival.confirmationNumber}
                            </Button>
                            <NoShowDialog
                              reservationId={arrival.id}
                              confirmationNumber={arrival.confirmationNumber}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No arrivals scheduled for today</p>
                      <p className="text-sm text-muted-foreground">Use the Walk-in Guest button to register new guests</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkout" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5" />
                Guest Check-Out
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedReservationId ? (
                <CheckOutForm 
                  reservationId={selectedReservationId}
                  onCheckOutComplete={handleCheckOutComplete}
                />
              ) : (
                <div className="text-center py-8 space-y-4">
                  <p className="text-muted-foreground">Select a guest to check out</p>
                  {currentGuests.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-sm font-medium">Guests available for checkout:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                        {currentGuests.slice(0, 10).map((reservation) => (
                          <div 
                            key={reservation.id} 
                            className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                          >
                            <div className="text-left">
                              <p className="font-medium">{reservation.confirmationNumber}</p>
                              <p className="text-xs text-muted-foreground">Room {reservation.roomId || "N/A"}</p>
                            </div>
                            <div className="flex gap-1">
                              <ExpressCheckoutButton
                                reservationId={reservation.id}
                                confirmationNumber={reservation.confirmationNumber}
                              />
                              <Button
                                size="sm"
                                onClick={() => setSelectedReservationId(reservation.id)}
                                data-testid={`button-select-checkout-${reservation.id}`}
                              >
                                Full
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No guests available for checkout</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <GuestServicesPanel />
        </TabsContent>

        <TabsContent value="report" className="space-y-6">
          <ShiftReportPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
