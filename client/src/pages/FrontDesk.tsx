import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CheckInForm from "@/components/CheckInForm";
import CheckOutForm from "@/components/CheckOutForm";
import GuestServicesPanel from "@/components/GuestServicesPanel";
import { UserCheck, UserX, Bell, Clock, Users, Bed, Loader2 } from "lucide-react";
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

  return (
    <div className="space-y-6" data-testid="page-front-desk">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Front Desk</h1>
        <p className="text-muted-foreground">
          Manage guest check-ins, check-outs, and front desk operations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
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
            Guest Services
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Current Guests
                      <Badge variant="outline">{currentGuests.length} Active</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentGuests.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No guests currently checked in</p>
                    ) : (
                      currentGuests.slice(0, 10).map((reservation) => (
                        <div key={reservation.id} className="flex items-center justify-between p-3 border rounded-lg hover-elevate">
                          <div>
                            <p className="font-medium" data-testid={`text-guest-${reservation.id}`}>
                              {reservation.confirmationNumber}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Room {reservation.roomId || "N/A"} • Checked in {new Date(reservation.arrivalDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default">Active</Badge>
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
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Today's Schedule
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Arrivals Today</span>
                        <Badge variant="outline">{arrivals.length} Scheduled</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Departures Today</span>
                        <Badge variant="outline">{departures.length} Scheduled</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Pending Check-ins</span>
                        <Badge variant="secondary">{arrivalsRemaining}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Pending Check-outs</span>
                        <Badge variant="secondary">{departuresRemaining}</Badge>
                      </div>
                    </div>
                    
                    <div className="pt-4 space-y-2">
                      {arrivals.length > 0 && arrivalsRemaining > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Arrivals to check in:</p>
                          <div className="flex flex-wrap gap-2">
                            {arrivals.filter(a => a.status !== "checked_in").slice(0, 3).map((arrival) => (
                              <Button
                                key={arrival.id}
                                variant="outline"
                                size="sm"
                                onClick={() => initiateCheckIn(arrival.id)}
                                data-testid={`button-quick-checkin-${arrival.id}`}
                              >
                                {arrival.confirmationNumber}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-4">
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
                  <p className="text-muted-foreground">Select an arrival to check in</p>
                  {arrivals.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Today's Arrivals:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {arrivals.filter(a => a.status !== "checked_in").map((arrival) => (
                          <Button
                            key={arrival.id}
                            variant="outline"
                            size="sm"
                            onClick={() => initiateCheckIn(arrival.id)}
                            data-testid={`button-select-checkin-${arrival.id}`}
                          >
                            {arrival.confirmationNumber}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No arrivals scheduled for today</p>
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
                  {departures.length > 0 || currentGuests.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Available for checkout:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {[...departures, ...currentGuests.filter(g => !departures.find(d => d.id === g.id))]
                          .filter(g => g.status === "checked_in")
                          .slice(0, 10)
                          .map((reservation) => (
                            <Button
                              key={reservation.id}
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedReservationId(reservation.id)}
                              data-testid={`button-select-checkout-${reservation.id}`}
                            >
                              {reservation.confirmationNumber}
                            </Button>
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
      </Tabs>
    </div>
  );
}
