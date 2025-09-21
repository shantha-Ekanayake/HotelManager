import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CheckInForm from "@/components/CheckInForm";
import CheckOutForm from "@/components/CheckOutForm";
import GuestServicesPanel from "@/components/GuestServicesPanel";
import { UserCheck, UserX, Bell, Clock, Users, Bed } from "lucide-react";

// TODO: remove mock functionality - replace with real data
const mockActiveGuests = [
  {
    name: "Sarah Johnson",
    roomNumber: "205",
    checkInDate: "Dec 20, 2024",
    totalNights: 3,
    roomRate: 150,
    status: "checked-in"
  },
  {
    name: "Michael Chen", 
    roomNumber: "102",
    checkInDate: "Dec 21, 2024",
    totalNights: 2,
    roomRate: 120,
    status: "checked-in"
  },
  {
    name: "Emily Davis",
    roomNumber: "310",
    checkInDate: "Dec 19, 2024", 
    totalNights: 4,
    roomRate: 180,
    status: "ready-checkout"
  }
];

// TODO: remove mock functionality - replace with real data
const mockTodayStats = {
  checkInsScheduled: 12,
  checkInsCompleted: 8,
  checkOutsScheduled: 15,
  checkOutsCompleted: 11,
  currentOccupancy: 85,
  pendingRequests: 6
};

export default function FrontDesk() {
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const handleCheckInComplete = (data: any) => {
    console.log('Check-in completed:', data);
    setActiveTab("overview");
  };

  const handleCheckOutComplete = (data: any) => {
    console.log('Check-out completed:', data);
    setSelectedGuest(null);
    setActiveTab("overview");
  };

  const initiateCheckOut = (guest: any) => {
    setSelectedGuest(guest);
    setActiveTab("checkout");
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Check-ins Today</p>
                    <p className="text-2xl font-bold">{mockTodayStats.checkInsCompleted}/{mockTodayStats.checkInsScheduled}</p>
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
                    <p className="text-2xl font-bold">{mockTodayStats.checkOutsCompleted}/{mockTodayStats.checkOutsScheduled}</p>
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
                    <p className="text-2xl font-bold">{mockTodayStats.currentOccupancy}%</p>
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
                  <Badge variant="outline">{mockActiveGuests.length} Active</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockActiveGuests.map((guest, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover-elevate">
                    <div>
                      <p className="font-medium" data-testid={`text-guest-name-${index}`}>{guest.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Room {guest.roomNumber} • Checked in {guest.checkInDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={guest.status === "ready-checkout" ? "destructive" : "default"}>
                        {guest.status === "ready-checkout" ? "Ready Checkout" : "Active"}
                      </Badge>
                      {guest.status === "ready-checkout" && (
                        <Button 
                          size="sm"
                          onClick={() => initiateCheckOut(guest)}
                          data-testid={`button-checkout-${index}`}
                        >
                          Check Out
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
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
                    <span className="text-sm">Scheduled Check-ins</span>
                    <Badge variant="outline">{mockTodayStats.checkInsScheduled - mockTodayStats.checkInsCompleted} Remaining</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Scheduled Check-outs</span>
                    <Badge variant="outline">{mockTodayStats.checkOutsScheduled - mockTodayStats.checkOutsCompleted} Remaining</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pending Service Requests</span>
                    <Badge variant="secondary">{mockTodayStats.pendingRequests}</Badge>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => setActiveTab("services")}
                    data-testid="button-view-requests"
                  >
                    View All Requests
                  </Button>
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
              Quick Check-In
            </Button>
            <Button 
              variant="outline"
              onClick={() => setActiveTab("checkout")}
              data-testid="button-quick-checkout"
            >
              <UserX className="h-4 w-4 mr-2" />
              Quick Check-Out
            </Button>
          </div>
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
              <CheckInForm onCheckInComplete={handleCheckInComplete} />
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
              {selectedGuest ? (
                <CheckOutForm 
                  guestData={selectedGuest}
                  onCheckOutComplete={handleCheckOutComplete}
                />
              ) : (
                <div className="text-center py-8 space-y-4">
                  <p className="text-muted-foreground">Select a guest from the overview or enter check-out details manually.</p>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Ready for checkout:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {mockActiveGuests
                        .filter(guest => guest.status === "ready-checkout")
                        .map((guest, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedGuest(guest)}
                            data-testid={`button-select-checkout-${index}`}
                          >
                            {guest.name} - Room {guest.roomNumber}
                          </Button>
                        ))}
                    </div>
                  </div>
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