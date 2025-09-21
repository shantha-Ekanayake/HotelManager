import { useState } from "react";
import RoomStatusCard from "@/components/RoomStatusCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Plus } from "lucide-react";

// TODO: remove mock functionality - replace with real data
const mockRooms = [
  {
    roomNumber: "101",
    roomType: "Standard King",
    status: "occupied" as const,
    guestName: "John Doe",
    checkIn: "Dec 20",
    checkOut: "Dec 23",
    amenities: ["WiFi", "Coffee", "Parking"]
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
    amenities: ["WiFi", "Coffee", "Parking", "Business"]
  },
  {
    roomNumber: "104",
    roomType: "Standard Queen",
    status: "available" as const,
    amenities: ["WiFi", "Coffee"]
  },
  {
    roomNumber: "105",
    roomType: "Deluxe King",
    status: "maintenance" as const,
    amenities: ["WiFi", "Coffee", "Parking"]
  },
  {
    roomNumber: "201",
    roomType: "Executive Suite",
    status: "occupied" as const,
    guestName: "Sarah Wilson",
    checkIn: "Dec 21",
    checkOut: "Dec 24",
    amenities: ["WiFi", "Business", "Coffee", "Parking"]
  },
  {
    roomNumber: "202",
    roomType: "Standard King",
    status: "clean" as const,
    amenities: ["WiFi", "Coffee"]
  },
  {
    roomNumber: "203",
    roomType: "Deluxe Queen",
    status: "available" as const,
    amenities: ["WiFi", "Business", "Coffee"]
  }
];

export default function Rooms() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredRooms = mockRooms.filter(room => {
    const matchesSearch = room.roomNumber.includes(searchTerm) ||
                         room.roomType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (room.guestName && room.guestName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || room.status === statusFilter;
    const matchesType = typeFilter === "all" || room.roomType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // TODO: remove mock functionality - replace with real data
  const statusCounts = {
    total: mockRooms.length,
    occupied: mockRooms.filter(r => r.status === "occupied").length,
    available: mockRooms.filter(r => r.status === "available").length,
    clean: mockRooms.filter(r => r.status === "clean").length,
    dirty: mockRooms.filter(r => r.status === "dirty").length,
    maintenance: mockRooms.filter(r => r.status === "maintenance").length,
  };

  const occupancyRate = Math.round((statusCounts.occupied / statusCounts.total) * 100);

  return (
    <div className="space-y-6" data-testid="page-rooms">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rooms</h1>
          <p className="text-muted-foreground">
            Manage room status and availability
          </p>
        </div>
        <Button data-testid="button-add-room">
          <Plus className="h-4 w-4 mr-2" />
          Add Room
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{statusCounts.total}</div>
            <div className="text-xs text-muted-foreground">Total Rooms</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-hotel-success">{statusCounts.occupied}</div>
            <div className="text-xs text-muted-foreground">Occupied</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-hotel-success">{statusCounts.available}</div>
            <div className="text-xs text-muted-foreground">Available</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-hotel-success">{statusCounts.clean}</div>
            <div className="text-xs text-muted-foreground">Clean</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-hotel-warning">{statusCounts.dirty}</div>
            <div className="text-xs text-muted-foreground">Dirty</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-hotel-error">{statusCounts.maintenance}</div>
            <div className="text-xs text-muted-foreground">Maintenance</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Search & Filter</CardTitle>
            <Badge variant="outline" data-testid="badge-occupancy-rate">
              {occupancyRate}% Occupancy
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by room number, type, or guest..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-rooms"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="clean">Clean</SelectItem>
                <SelectItem value="dirty">Dirty</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40" data-testid="select-type-filter">
                <SelectValue placeholder="Room Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Standard King">Standard King</SelectItem>
                <SelectItem value="Standard Queen">Standard Queen</SelectItem>
                <SelectItem value="Deluxe King">Deluxe King</SelectItem>
                <SelectItem value="Deluxe Queen">Deluxe Queen</SelectItem>
                <SelectItem value="Suite">Suite</SelectItem>
                <SelectItem value="Executive Suite">Executive Suite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredRooms.map((room) => (
          <RoomStatusCard
            key={room.roomNumber}
            {...room}
            onStatusChange={(status) => console.log(`Room ${room.roomNumber} status changed to ${status}`)}
            onViewDetails={() => console.log(`View room ${room.roomNumber} details`)}
          />
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No rooms found matching your criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}