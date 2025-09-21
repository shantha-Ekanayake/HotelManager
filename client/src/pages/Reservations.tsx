import { useState } from "react";
import ReservationCard from "@/components/ReservationCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Filter } from "lucide-react";

// TODO: remove mock functionality - replace with real data
const mockReservations = [
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
    specialRequests: "Late check-in requested, hypoallergenic pillows"
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
    guestPhone: "+1 (555) 987-6543"
  },
  {
    id: "RSV-003",
    guestName: "Emily Davis",
    roomType: "Standard King",
    checkIn: "Dec 25, 2024",
    checkOut: "Dec 28, 2024",
    status: "pending" as const,
    totalAmount: 340.00,
    guestEmail: "emily.davis@email.com",
    specialRequests: "Ground floor room preferred"
  },
  {
    id: "RSV-004",
    guestName: "Robert Wilson",
    roomNumber: "310",
    roomType: "Deluxe Suite",
    checkIn: "Dec 18, 2024",
    checkOut: "Dec 20, 2024",
    status: "checked-out" as const,
    totalAmount: 520.00,
    guestEmail: "r.wilson@company.com",
    guestPhone: "+1 (555) 111-2222"
  }
];

export default function Reservations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredReservations = mockReservations.filter(reservation => {
    const matchesSearch = reservation.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reservation.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || reservation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6" data-testid="page-reservations">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reservations</h1>
          <p className="text-muted-foreground">
            Manage hotel bookings and guest reservations
          </p>
        </div>
        <Button data-testid="button-new-reservation">
          <Plus className="h-4 w-4 mr-2" />
          New Reservation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by guest name or reservation ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-reservations"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="checked-in">Checked In</SelectItem>
                <SelectItem value="checked-out">Checked Out</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredReservations.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            {...reservation}
            onCheckIn={() => console.log(`Check in ${reservation.id}`)}
            onCheckOut={() => console.log(`Check out ${reservation.id}`)}
            onViewDetails={() => console.log(`View details ${reservation.id}`)}
          />
        ))}
      </div>

      {filteredReservations.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No reservations found matching your criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}