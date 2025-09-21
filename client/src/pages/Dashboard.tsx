import StatsCards from "@/components/StatsCards";
import ReservationCard from "@/components/ReservationCard";
import RoomStatusCard from "@/components/RoomStatusCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Bed, DollarSign, Calendar, TrendingUp } from "lucide-react";

// TODO: remove mock functionality - replace with real data
const mockStats = [
  {
    title: "Total Rooms",
    value: 120,
    change: 0,
    changeLabel: "rooms total",
    icon: <Bed className="h-4 w-4" />,
    color: "default" as const
  },
  {
    title: "Occupancy Rate",
    value: "85%",
    change: 12,
    changeLabel: "from last month",
    icon: <Users className="h-4 w-4" />,
    color: "success" as const
  },
  {
    title: "Revenue Today",
    value: "$12,450",
    change: 8,
    changeLabel: "from yesterday",
    icon: <DollarSign className="h-4 w-4" />,
    color: "success" as const
  },
  {
    title: "Check-ins Today",
    value: 28,
    change: -5,
    changeLabel: "from yesterday",
    icon: <Calendar className="h-4 w-4" />,
    color: "warning" as const
  }
];

// TODO: remove mock functionality - replace with real data
const mockRecentReservations = [
  {
    id: "RSV-001",
    guestName: "Sarah Johnson",
    roomNumber: "205",
    roomType: "Deluxe King Suite",
    checkIn: "Dec 22, 2024",
    checkOut: "Dec 25, 2024",
    status: "confirmed" as const,
    totalAmount: 450.00,
    guestEmail: "sarah.j@email.com",
    guestPhone: "+1 (555) 123-4567",
  },
  {
    id: "RSV-002",
    guestName: "Michael Chen",
    roomNumber: "102",
    roomType: "Standard Queen",
    checkIn: "Dec 20, 2024",
    checkOut: "Dec 22, 2024",
    status: "checked-in" as const,
    totalAmount: 280.00,
    guestEmail: "m.chen@company.com",
  }
];

// TODO: remove mock functionality - replace with real data
const mockRoomStatuses = [
  {
    roomNumber: "101",
    roomType: "Standard King",
    status: "occupied" as const,
    guestName: "John Doe",
    checkIn: "Dec 20",
    checkOut: "Dec 23",
    amenities: ["WiFi", "Coffee"]
  },
  {
    roomNumber: "102",
    roomType: "Deluxe Queen", 
    status: "dirty" as const,
    amenities: ["WiFi", "Business"]
  },
  {
    roomNumber: "103",
    roomType: "Suite",
    status: "clean" as const,
    amenities: ["WiFi", "Coffee", "Parking"]
  }
];

export default function Dashboard() {
  return (
    <div className="space-y-6" data-testid="page-dashboard">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your hotel management overview
        </p>
      </div>

      <StatsCards stats={mockStats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Reservations</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            {mockRecentReservations.map((reservation) => (
              <ReservationCard
                key={reservation.id}
                {...reservation}
                onCheckIn={() => console.log(`Check in ${reservation.id}`)}
                onCheckOut={() => console.log(`Check out ${reservation.id}`)}
                onViewDetails={() => console.log(`View details ${reservation.id}`)}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Room Status Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockRoomStatuses.map((room) => (
              <RoomStatusCard
                key={room.roomNumber}
                {...room}
                onStatusChange={(status) => console.log(`Room ${room.roomNumber} status changed to ${status}`)}
                onViewDetails={() => console.log(`View room ${room.roomNumber} details`)}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}