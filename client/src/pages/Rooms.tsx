import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import RoomStatusCard, { RoomStatus } from "@/components/RoomStatusCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Plus, Loader2, Settings, DollarSign, Building2, BedDouble, Users, RefreshCw, Lock, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Room, RoomType, RatePlan } from "@shared/schema";

// Validation schemas
const addRoomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required"),
  roomTypeId: z.string().min(1, "Room type is required"),
  floor: z.string().optional(),
  notes: z.string().optional(),
});

const addRoomTypeSchema = z.object({
  name: z.string().min(1, "Room type name is required"),
  description: z.string().optional(),
  maxOccupancy: z.number().min(1, "Max occupancy must be at least 1"),
  baseRate: z.number().min(0, "Base rate must be 0 or more"),
});

const addRatePlanSchema = z.object({
  name: z.string().min(1, "Rate plan name is required"),
  description: z.string().optional(),
  minLengthOfStay: z.number().optional(),
  maxLengthOfStay: z.number().optional(),
  isRefundable: z.boolean(),
  cancellationPolicy: z.string().optional(),
});

const outOfOrderSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
  estimatedCompletionDate: z.string().optional(),
  notes: z.string().optional(),
});

interface RoomsResponse {
  rooms: Room[];
}

interface RoomTypesResponse {
  roomTypes: RoomType[];
}

interface RatePlansResponse {
  ratePlans: RatePlan[];
}

interface ReservationsResponse {
  reservations: Array<{
    id: string;
    guestId: string;
    roomId?: string;
    status: string;
    arrivalDate: string;
    departureDate: string;
  }>;
}

interface GuestsResponse {
  guests: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
}

function useRooms(propertyId: string) {
  return useQuery<RoomsResponse>({
    queryKey: [`/api/properties/${propertyId}/rooms`],
    enabled: !!propertyId,
  });
}

function useRoomTypes(propertyId: string) {
  return useQuery<RoomTypesResponse>({
    queryKey: [`/api/properties/${propertyId}/room-types`],
    enabled: !!propertyId,
  });
}

function useRatePlans(propertyId: string) {
  return useQuery<RatePlansResponse>({
    queryKey: [`/api/properties/${propertyId}/rate-plans`],
    enabled: !!propertyId,
  });
}

function useReservations() {
  return useQuery<ReservationsResponse>({
    queryKey: ['/api/reservations'],
  });
}

function useGuests() {
  return useQuery<GuestsResponse>({
    queryKey: ['/api/guests'],
  });
}

function useCurrentUser() {
  return useQuery<{ user: { propertyId: string } }>({
    queryKey: ['/api/auth/me'],
  });
}

function RoomsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <Skeleton className="h-8 w-12 mx-auto mb-2" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Rooms() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isRoomDetailsOpen, setIsRoomDetailsOpen] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isAddRoomTypeOpen, setIsAddRoomTypeOpen] = useState(false);
  const [isAddRatePlanOpen, setIsAddRatePlanOpen] = useState(false);
  const [isBlockingRoomOpen, setIsBlockingRoomOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<RoomStatus>("available");
  const [statusNotes, setStatusNotes] = useState("");
  const [activeTab, setActiveTab] = useState("rooms");
  const [blockingRoomId, setBlockingRoomId] = useState<string | null>(null);
  const [blockingRoomBlocked, setBlockingRoomBlocked] = useState(false);
  const [isOutOfOrderDialogOpen, setIsOutOfOrderDialogOpen] = useState(false);
  const [outOfOrderRoomId, setOutOfOrderRoomId] = useState<string | null>(null);

  const outOfOrderForm = useForm({
    resolver: zodResolver(outOfOrderSchema),
    defaultValues: { reason: "", estimatedCompletionDate: "", notes: "" },
  });

  const roomForm = useForm({
    resolver: zodResolver(addRoomSchema),
    defaultValues: { roomNumber: "", roomTypeId: "", floor: "", notes: "" },
  });

  const roomTypeForm = useForm({
    resolver: zodResolver(addRoomTypeSchema),
    defaultValues: { name: "", description: "", maxOccupancy: 2, baseRate: 100 },
  });

  const ratePlanForm = useForm({
    resolver: zodResolver(addRatePlanSchema),
    defaultValues: { name: "", description: "", isRefundable: true, cancellationPolicy: "" },
  });

  const { data: userData } = useCurrentUser();
  const propertyId = userData?.user?.propertyId || "prop-demo";

  const { data: roomsData, isLoading: roomsLoading, error: roomsError } = useRooms(propertyId);
  const { data: roomTypesData, isLoading: typesLoading } = useRoomTypes(propertyId);
  const { data: ratePlansData } = useRatePlans(propertyId);
  const { data: reservationsData } = useReservations();
  const { data: guestsData } = useGuests();

  const rooms = roomsData?.rooms || [];
  const roomTypes = roomTypesData?.roomTypes || [];
  const ratePlans = ratePlansData?.ratePlans || [];
  const reservations = reservationsData?.reservations || [];
  const guests = guestsData?.guests || [];

  const roomTypeMap = new Map(roomTypes.map(rt => [rt.id, rt]));
  const guestMap = new Map(guests.map(g => [g.id, g]));

  const updateStatusMutation = useMutation({
    mutationFn: async ({ roomId, status, notes }: { roomId: string; status: string; notes?: string }) => {
      return apiRequest('PATCH', `/api/rooms/${roomId}/status`, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/rooms`] });
      toast({
        title: "Room status updated",
        description: `Room ${selectedRoom?.roomNumber} status changed to ${newStatus}`,
      });
      setIsStatusDialogOpen(false);
      setSelectedRoom(null);
      setStatusNotes("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update room status",
      });
    },
  });

  const addRoomMutation = useMutation({
    mutationFn: async (data: z.infer<typeof addRoomSchema>) => {
      return apiRequest('POST', '/api/rooms', { ...data, propertyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/rooms`] });
      toast({ title: "Room added successfully" });
      setIsAddRoomOpen(false);
      roomForm.reset();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add room",
      });
    },
  });

  const addRoomTypeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof addRoomTypeSchema>) => {
      return apiRequest('POST', '/api/room-types', { ...data, propertyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/room-types`] });
      toast({ title: "Room type added successfully" });
      setIsAddRoomTypeOpen(false);
      roomTypeForm.reset();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add room type",
      });
    },
  });

  const addRatePlanMutation = useMutation({
    mutationFn: async (data: z.infer<typeof addRatePlanSchema>) => {
      return apiRequest('POST', '/api/rate-plans', { ...data, propertyId, isActive: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/rate-plans`] });
      toast({ title: "Rate plan added successfully" });
      setIsAddRatePlanOpen(false);
      ratePlanForm.reset();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add rate plan",
      });
    },
  });

  const blockRoomMutation = useMutation({
    mutationFn: async ({ roomId, isBlocked }: { roomId: string; isBlocked: boolean }) => {
      return apiRequest('PATCH', `/api/rooms/${roomId}/block`, { isBlocked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/rooms`] });
      toast({
        title: blockingRoomBlocked ? "Room blocked" : "Room unblocked",
        description: `Room ${selectedRoom?.roomNumber} has been ${blockingRoomBlocked ? 'blocked' : 'unblocked'}`,
      });
      setIsBlockingRoomOpen(false);
      setBlockingRoomId(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update room blocking status",
      });
    },
  });

  const outOfOrderMutation = useMutation({
    mutationFn: async (data: z.infer<typeof outOfOrderSchema>) => {
      return apiRequest('PATCH', `/api/rooms/${outOfOrderRoomId}/status`, { 
        status: "maintenance",
        notes: `Out of Order - ${data.reason}${data.estimatedCompletionDate ? ` (Est. completion: ${data.estimatedCompletionDate})` : ''}${data.notes ? ` - ${data.notes}` : ''}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/rooms`] });
      toast({
        title: "Room marked as out-of-order",
        description: `Room maintenance status updated`,
      });
      setIsOutOfOrderDialogOpen(false);
      outOfOrderForm.reset();
      setOutOfOrderRoomId(null);
      setSelectedRoom(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark room as out-of-order",
      });
    },
  });

  const enrichedRooms = rooms.map(room => {
    const roomType = roomTypeMap.get(room.roomTypeId);
    const currentReservation = reservations.find(
      r => r.roomId === room.id && r.status === 'checked_in'
    );
    const guest = currentReservation ? guestMap.get(currentReservation.guestId) : null;

    return {
      ...room,
      roomTypeName: roomType?.name || 'Unknown Type',
      amenities: roomType?.amenities || [],
      guestName: guest ? `${guest.firstName} ${guest.lastName}` : undefined,
      checkIn: currentReservation ? new Date(currentReservation.arrivalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined,
      checkOut: currentReservation ? new Date(currentReservation.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined,
    };
  });

  const filteredRooms = enrichedRooms.filter(room => {
    const matchesSearch = room.roomNumber.includes(searchTerm) ||
                         room.roomTypeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (room.guestName && room.guestName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || room.status === statusFilter;
    const matchesType = typeFilter === "all" || room.roomTypeId === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const statusCounts = {
    total: rooms.length,
    occupied: rooms.filter(r => r.status === "occupied").length,
    available: rooms.filter(r => r.status === "available").length,
    clean: rooms.filter(r => r.status === "clean").length,
    dirty: rooms.filter(r => r.status === "dirty").length,
    maintenance: rooms.filter(r => r.status === "maintenance").length,
  };

  const occupancyRate = statusCounts.total > 0 ? Math.round((statusCounts.occupied / statusCounts.total) * 100) : 0;

  const handleStatusChange = (room: Room, status: RoomStatus) => {
    setSelectedRoom(room);
    setNewStatus(status);
    setIsStatusDialogOpen(true);
  };

  const handleViewDetails = (room: Room) => {
    setSelectedRoom(room);
    setIsRoomDetailsOpen(true);
  };

  const confirmStatusChange = () => {
    if (selectedRoom) {
      updateStatusMutation.mutate({
        roomId: selectedRoom.id,
        status: newStatus,
        notes: statusNotes || undefined,
      });
    }
  };

  if (roomsLoading || typesLoading) {
    return (
      <div className="space-y-6" data-testid="page-rooms">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Rooms</h1>
            <p className="text-muted-foreground">Manage room status and availability</p>
          </div>
        </div>
        <RoomsSkeleton />
      </div>
    );
  }

  if (roomsError) {
    return (
      <div className="space-y-6" data-testid="page-rooms">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-destructive">Failed to load rooms. Please try again.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/rooms`] })}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-rooms">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rooms</h1>
          <p className="text-muted-foreground">
            Manage room status and availability
          </p>
        </div>
        <Button data-testid="button-add-room" onClick={() => setIsAddRoomOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Room
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="rooms" className="flex items-center gap-2" data-testid="tab-rooms">
            <BedDouble className="h-4 w-4" />
            Rooms
          </TabsTrigger>
          <TabsTrigger value="room-types" className="flex items-center gap-2" data-testid="tab-room-types">
            <Building2 className="h-4 w-4" />
            Room Types
          </TabsTrigger>
          <TabsTrigger value="rate-plans" className="flex items-center gap-2" data-testid="tab-rate-plans">
            <DollarSign className="h-4 w-4" />
            Rate Plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rooms" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card data-testid="stat-total-rooms">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{statusCounts.total}</div>
                <div className="text-xs text-muted-foreground">Total Rooms</div>
              </CardContent>
            </Card>
            <Card data-testid="stat-occupied">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{statusCounts.occupied}</div>
                <div className="text-xs text-muted-foreground">Occupied</div>
              </CardContent>
            </Card>
            <Card data-testid="stat-available">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-hotel-success">{statusCounts.available}</div>
                <div className="text-xs text-muted-foreground">Available</div>
              </CardContent>
            </Card>
            <Card data-testid="stat-clean">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-hotel-success">{statusCounts.clean}</div>
                <div className="text-xs text-muted-foreground">Clean</div>
              </CardContent>
            </Card>
            <Card data-testid="stat-dirty">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-hotel-warning">{statusCounts.dirty}</div>
                <div className="text-xs text-muted-foreground">Dirty</div>
              </CardContent>
            </Card>
            <Card data-testid="stat-maintenance">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-hotel-error">{statusCounts.maintenance}</div>
                <div className="text-xs text-muted-foreground">Maintenance</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle>Search & Filter</CardTitle>
                <Badge variant="outline" data-testid="badge-occupancy-rate">
                  {occupancyRate}% Occupancy
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px] relative">
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
                  <SelectTrigger className="w-48" data-testid="select-type-filter">
                    <SelectValue placeholder="Room Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {roomTypes.map((rt) => (
                      <SelectItem key={rt.id} value={rt.id}>
                        {rt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRooms.map((room) => (
              <RoomStatusCard
                key={room.id}
                roomNumber={room.roomNumber}
                roomType={room.roomTypeName}
                status={room.status as RoomStatus}
                guestName={room.guestName}
                checkIn={room.checkIn}
                checkOut={room.checkOut}
                amenities={room.amenities as string[]}
                onStatusChange={(status) => handleStatusChange(room, status)}
                onViewDetails={() => handleViewDetails(room)}
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
        </TabsContent>

        <TabsContent value="room-types" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Room Types Configuration</h2>
            <Button data-testid="button-add-room-type" onClick={() => setIsAddRoomTypeOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Room Type
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roomTypes.map((roomType) => {
              const roomCount = rooms.filter(r => r.roomTypeId === roomType.id).length;
              return (
                <Card key={roomType.id} className="hover-elevate" data-testid={`card-room-type-${roomType.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{roomType.name}</CardTitle>
                      <Badge variant="outline">{roomCount} rooms</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{roomType.description || 'No description'}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Max {roomType.maxOccupancy} guests
                      </span>
                      <span className="font-semibold text-primary">${roomType.baseRate}/night</span>
                    </div>
                    {roomType.amenities && (roomType.amenities as string[]).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(roomType.amenities as string[]).slice(0, 4).map((amenity, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{amenity}</Badge>
                        ))}
                        {(roomType.amenities as string[]).length > 4 && (
                          <Badge variant="secondary" className="text-xs">+{(roomType.amenities as string[]).length - 4}</Badge>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1" data-testid={`button-edit-room-type-${roomType.id}`}>
                        <Settings className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {roomTypes.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No room types configured yet.</p>
                <Button className="mt-4" data-testid="button-create-first-room-type">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Room Type
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rate-plans" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Rate Plans</h2>
            <Button data-testid="button-add-rate-plan" onClick={() => setIsAddRatePlanOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rate Plan
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ratePlans.map((plan) => (
              <Card key={plan.id} className="hover-elevate" data-testid={`card-rate-plan-${plan.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <Badge variant={plan.isActive ? "default" : "secondary"}>
                      {plan.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{plan.description || 'No description'}</p>
                  <div className="space-y-1 text-sm">
                    {plan.minLengthOfStay && (
                      <p>Min stay: {plan.minLengthOfStay} nights</p>
                    )}
                    {plan.maxLengthOfStay && (
                      <p>Max stay: {plan.maxLengthOfStay} nights</p>
                    )}
                    <p className={plan.isRefundable ? "text-hotel-success" : "text-hotel-warning"}>
                      {plan.isRefundable ? "Refundable" : "Non-refundable"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.cancellationPolicy}</p>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1" data-testid={`button-edit-rate-plan-${plan.id}`}>
                      <Settings className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {ratePlans.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No rate plans configured yet.</p>
                <Button className="mt-4" data-testid="button-create-first-rate-plan">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Rate Plan
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent data-testid="dialog-change-status">
          <DialogHeader>
            <DialogTitle>Update Room Status</DialogTitle>
            <DialogDescription>
              Change the status of Room {selectedRoom?.roomNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as RoomStatus)}>
                <SelectTrigger data-testid="select-new-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="clean">Clean</SelectItem>
                  <SelectItem value="dirty">Dirty</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add notes about the status change..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                data-testid="input-status-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmStatusChange}
              disabled={updateStatusMutation.isPending}
              data-testid="button-confirm-status-change"
            >
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Status'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoomDetailsOpen} onOpenChange={setIsRoomDetailsOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-room-details">
          <DialogHeader>
            <DialogTitle>Room {selectedRoom?.roomNumber} Details</DialogTitle>
          </DialogHeader>
          {selectedRoom && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Room Type</Label>
                  <p className="font-medium">{roomTypeMap.get(selectedRoom.roomTypeId)?.name || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Floor</Label>
                  <p className="font-medium">{selectedRoom.floor || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant="outline" className="mt-1">{selectedRoom.status}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Active</Label>
                  <p className="font-medium">{selectedRoom.isActive ? 'Yes' : 'No'}</p>
                </div>
              </div>
              {selectedRoom.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-1">{selectedRoom.notes}</p>
                </div>
              )}
              {selectedRoom.lastCleaned && (
                <div>
                  <Label className="text-muted-foreground">Last Cleaned</Label>
                  <p className="text-sm mt-1">
                    {new Date(selectedRoom.lastCleaned).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-2 pt-4">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setIsRoomDetailsOpen(false);
                      setNewStatus(selectedRoom.status as RoomStatus);
                      setIsStatusDialogOpen(true);
                    }}
                    data-testid="button-change-room-status"
                  >
                    Change Status
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    data-testid="button-edit-room"
                  >
                    Edit Room
                  </Button>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setOutOfOrderRoomId(selectedRoom.id);
                    setIsOutOfOrderDialogOpen(true);
                  }}
                  data-testid="button-mark-out-of-order"
                >
                  Mark Out of Order
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setBlockingRoomId(selectedRoom.id);
                    setBlockingRoomBlocked(!selectedRoom.isActive);
                    setIsBlockingRoomOpen(true);
                  }}
                  data-testid="button-toggle-room-blocking"
                >
                  {selectedRoom.isActive ? (
                    <><Lock className="h-4 w-4 mr-2" />Block Room</>
                  ) : (
                    <><Unlock className="h-4 w-4 mr-2" />Unblock Room</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Room Dialog */}
      <Dialog open={isAddRoomOpen} onOpenChange={setIsAddRoomOpen}>
        <DialogContent data-testid="dialog-add-room">
          <DialogHeader>
            <DialogTitle>Add New Room</DialogTitle>
          </DialogHeader>
          <Form {...roomForm}>
            <form onSubmit={roomForm.handleSubmit((data) => addRoomMutation.mutate(data))} className="space-y-4">
              <FormField control={roomForm.control} name="roomNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Number</FormLabel>
                  <FormControl><Input placeholder="e.g., 101" {...field} data-testid="input-room-number" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={roomForm.control} name="roomTypeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Type</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-room-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes.map((rt) => (
                          <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={roomForm.control} name="floor" render={({ field }) => (
                <FormItem>
                  <FormLabel>Floor (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g., 1" {...field} data-testid="input-floor" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={roomForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="Room notes..." {...field} data-testid="input-room-notes" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsAddRoomOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addRoomMutation.isPending} data-testid="button-submit-add-room">
                  {addRoomMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Add Room
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Room Type Dialog */}
      <Dialog open={isAddRoomTypeOpen} onOpenChange={setIsAddRoomTypeOpen}>
        <DialogContent data-testid="dialog-add-room-type">
          <DialogHeader>
            <DialogTitle>Add Room Type</DialogTitle>
          </DialogHeader>
          <Form {...roomTypeForm}>
            <form onSubmit={roomTypeForm.handleSubmit((data) => addRoomTypeMutation.mutate(data))} className="space-y-4">
              <FormField control={roomTypeForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Standard Room" {...field} data-testid="input-room-type-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={roomTypeForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Room description..." {...field} data-testid="input-room-type-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={roomTypeForm.control} name="maxOccupancy" render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Occupancy</FormLabel>
                  <FormControl><Input type="number" min="1" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} data-testid="input-max-occupancy" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={roomTypeForm.control} name="baseRate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Rate ($)</FormLabel>
                  <FormControl><Input type="number" min="0" step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} data-testid="input-base-rate" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsAddRoomTypeOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addRoomTypeMutation.isPending} data-testid="button-submit-add-room-type">
                  {addRoomTypeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Add Room Type
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Rate Plan Dialog */}
      <Dialog open={isAddRatePlanOpen} onOpenChange={setIsAddRatePlanOpen}>
        <DialogContent data-testid="dialog-add-rate-plan">
          <DialogHeader>
            <DialogTitle>Add Rate Plan</DialogTitle>
          </DialogHeader>
          <Form {...ratePlanForm}>
            <form onSubmit={ratePlanForm.handleSubmit((data) => addRatePlanMutation.mutate(data))} className="space-y-4">
              <FormField control={ratePlanForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Standard Rate" {...field} data-testid="input-rate-plan-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={ratePlanForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Rate plan description..." {...field} data-testid="input-rate-plan-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={ratePlanForm.control} name="isRefundable" render={({ field }) => (
                <FormItem>
                  <FormLabel>Refundable</FormLabel>
                  <FormControl>
                    <Select value={field.value ? "true" : "false"} onValueChange={(v) => field.onChange(v === "true")}>
                      <SelectTrigger data-testid="select-refundable">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Refundable</SelectItem>
                        <SelectItem value="false">Non-Refundable</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsAddRatePlanOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addRatePlanMutation.isPending} data-testid="button-submit-add-rate-plan">
                  {addRatePlanMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Add Rate Plan
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Block Room Dialog */}
      <Dialog open={isBlockingRoomOpen} onOpenChange={setIsBlockingRoomOpen}>
        <DialogContent data-testid="dialog-block-room">
          <DialogHeader>
            <DialogTitle>{blockingRoomBlocked ? "Block Room" : "Unblock Room"}</DialogTitle>
            <DialogDescription>
              Room {selectedRoom?.roomNumber} will be {blockingRoomBlocked ? "blocked from bookings" : "made available for bookings"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBlockingRoomOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => blockRoomMutation.mutate({ roomId: blockingRoomId || "", isBlocked: blockingRoomBlocked })}
              disabled={blockRoomMutation.isPending}
              data-testid="button-confirm-blocking"
            >
              {blockRoomMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {blockingRoomBlocked ? "Block Room" : "Unblock Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Out of Order Dialog */}
      <Dialog open={isOutOfOrderDialogOpen} onOpenChange={setIsOutOfOrderDialogOpen}>
        <DialogContent data-testid="dialog-out-of-order">
          <DialogHeader>
            <DialogTitle>Mark Room as Out of Order</DialogTitle>
            <DialogDescription>
              Room {selectedRoom?.roomNumber} will be marked for maintenance
            </DialogDescription>
          </DialogHeader>
          <Form {...outOfOrderForm}>
            <form onSubmit={outOfOrderForm.handleSubmit((data) => outOfOrderMutation.mutate(data))} className="space-y-4">
              <FormField control={outOfOrderForm.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Maintenance *</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-maintenance-reason">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plumbing">Plumbing Issue</SelectItem>
                        <SelectItem value="electrical">Electrical Issue</SelectItem>
                        <SelectItem value="hvac">HVAC/Climate Control</SelectItem>
                        <SelectItem value="furniture">Furniture Damage</SelectItem>
                        <SelectItem value="deep-cleaning">Deep Cleaning Required</SelectItem>
                        <SelectItem value="renovation">Renovation</SelectItem>
                        <SelectItem value="carpet-cleaning">Carpet Cleaning</SelectItem>
                        <SelectItem value="painting">Painting</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={outOfOrderForm.control} name="estimatedCompletionDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Completion Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      data-testid="input-completion-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={outOfOrderForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional details about the maintenance..." 
                      {...field} 
                      data-testid="textarea-maintenance-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsOutOfOrderDialogOpen(false);
                    outOfOrderForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={outOfOrderMutation.isPending}
                  data-testid="button-submit-out-of-order"
                >
                  {outOfOrderMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Mark Out of Order"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
