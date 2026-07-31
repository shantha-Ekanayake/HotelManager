import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ReservationCard from "@/components/ReservationCard";
import { NewReservationDialog } from "@/components/NewReservationDialog";
import CheckInForm from "@/components/CheckInForm";
import CheckOutForm from "@/components/CheckOutForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Plus, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import type { Reservation } from "@shared/schema";

export default function Reservations() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false);
  const [checkInReservationId, setCheckInReservationId] = useState<string | null>(null);
  const [checkOutReservationId, setCheckOutReservationId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ reservations: Reservation[] }>({
    queryKey: ["/api/properties", user?.propertyId, "reservations"],
    enabled: !!user?.propertyId,
  });

  const { data: guestsData } = useQuery<{ guests: any[] }>({
    queryKey: ["/api/guests"],
  });

  const { data: roomsData } = useQuery<{ rooms: any[] }>({
    queryKey: [`/api/properties/${user?.propertyId}/rooms`],
    enabled: !!user?.propertyId,
  });

  const reservations = data?.reservations || [];
  const guests = guestsData?.guests || [];
  const guestMap = new Map(guests.map(g => [g.id, `${g.firstName} ${g.lastName}`]));
  const roomMap = new Map((roomsData?.rooms || []).map((r: any) => [r.id, r.roomNumber]));

  const filteredReservations = reservations.filter(reservation => {
    const matchesSearch = 
      (reservation.confirmationNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      searchTerm === "";
    const matchesStatus = statusFilter === "all" || reservation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div className="space-y-6" data-testid="page-reservations">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reservations</h1>
            <p className="text-muted-foreground">
              Manage hotel bookings and guest reservations
            </p>
          </div>
          <Button 
            onClick={() => setIsNewReservationOpen(true)}
            data-testid="button-new-reservation"
          >
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
                  placeholder="Search by confirmation number..."
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
                  <SelectItem value="checked_in">Checked In</SelectItem>
                  <SelectItem value="checked_out">Checked Out</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Loading reservations...</p>
            </CardContent>
          </Card>
        ) : filteredReservations.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredReservations.map((reservation) => (
              <ReservationCard
                key={reservation.id}
                id={reservation.confirmationNumber}
                guestName={guestMap.get(reservation.guestId) || `Guest #${reservation.guestId.substring(0, 8)}`}
                roomNumber={roomMap.get(reservation.roomId || '') || "TBA"}
                roomType="Room"
                checkIn={new Date(reservation.arrivalDate).toLocaleDateString()}
                checkOut={new Date(reservation.departureDate).toLocaleDateString()}
                status={reservation.status.replace('_', '-') as "confirmed" | "pending" | "checked-in" | "checked-out" | "cancelled"}
                totalAmount={parseFloat(reservation.totalAmount)}
                guestEmail=""
                onCheckIn={() => setCheckInReservationId(reservation.id)}
                onCheckOut={() => setCheckOutReservationId(reservation.id)}
                onViewDetails={() => setLocation('/guests')}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "No reservations found matching your criteria."
                  : "No reservations yet. Create your first reservation to get started!"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <NewReservationDialog
        open={isNewReservationOpen}
        onOpenChange={setIsNewReservationOpen}
      />

      <Dialog open={!!checkInReservationId} onOpenChange={(open) => !open && setCheckInReservationId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Guest Check-In</DialogTitle>
            <DialogDescription>
              Complete the check-in process by selecting a room and verifying guest information.
            </DialogDescription>
          </DialogHeader>
          {checkInReservationId && (
            <CheckInForm
              reservationId={checkInReservationId}
              onCheckInComplete={() => {
                setCheckInReservationId(null);
                queryClient.invalidateQueries({ queryKey: ["/api/properties", user?.propertyId, "reservations"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkOutReservationId} onOpenChange={(open) => !open && setCheckOutReservationId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Guest Check-Out</DialogTitle>
            <DialogDescription>
              Complete the check-out process by reviewing charges and processing payment.
            </DialogDescription>
          </DialogHeader>
          {checkOutReservationId && (
            <CheckOutForm
              reservationId={checkOutReservationId}
              onCheckOutComplete={() => {
                setCheckOutReservationId(null);
                queryClient.invalidateQueries({ queryKey: ["/api/properties", user?.propertyId, "reservations"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
