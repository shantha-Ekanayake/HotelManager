import StatsCards from "@/components/StatsCards";
import ReservationCard, { type ReservationStatus } from "@/components/ReservationCard";
import RoomStatusCard, { type RoomStatus } from "@/components/RoomStatusCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Users, Bed, DollarSign, Calendar, TrendingUp, Star, BarChart3, Clock } from "lucide-react";

// Dashboard Analytics Type
interface DashboardAnalytics {
  todayMetrics?: {
    occupancyRate: number;
    totalRevenue: number;
    adr: number;
    revpar: number;
    totalGuests: number;
  };
  yesterdayMetrics?: {
    occupancyRate: number;
    totalRevenue: number;
    adr: number;
    revpar: number;
    totalGuests: number;
  };
  monthlyTrend?: Array<{
    date: string;
    occupancyRate: number;
    totalRevenue: number;
    adr: number;
    revpar: number;
    totalGuests: number;
  }>;
  guestSatisfaction?: {
    overallRating: number;
    roomRating: number;
    serviceRating: number;
    cleanlinessRating: number;
    valueRating: number;
    locationRating: number;
    recommendationRate: number;
    totalResponses: number;
  };
}

// Dashboard Analytics Hook
function useDashboardAnalytics() {
  return useQuery<DashboardAnalytics>({
    queryKey: ['/api/dashboard/analytics'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
}

// Reservation Type
interface Reservation {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  status: ReservationStatus;
  totalAmount: number;
  guest?: {
    fullName: string;
    email: string;
    phone?: string;
  };
  room?: {
    number: string;
    roomType?: {
      name: string;
    };
  };
}

// Room Type
interface Room {
  id: string;
  number: string;
  status: RoomStatus;
  roomType?: {
    name: string;
    amenities?: string[];
  };
  currentReservation?: {
    guest?: {
      fullName: string;
    };
    checkInDate: string;
    checkOutDate: string;
  };
}

// Helper function to map database status to component status
function mapReservationStatus(dbStatus: string): ReservationStatus {
  const statusMap: { [key: string]: ReservationStatus } = {
    'checked_in': 'checked-in',
    'checked_out': 'checked-out',
    'confirmed': 'confirmed',
    'cancelled': 'cancelled',
    'pending': 'pending',
    'no_show': 'cancelled', // Map no_show to cancelled for display
  };
  return statusMap[dbStatus] || 'pending';
}

function mapRoomStatus(dbStatus: string): RoomStatus {
  const statusMap: { [key: string]: RoomStatus } = {
    'available': 'available',
    'occupied': 'occupied',
    'dirty': 'dirty',
    'clean': 'clean',
    'inspected': 'clean', // Map inspected to clean for display
    'out_of_order': 'maintenance', // Map out_of_order to maintenance
    'maintenance': 'maintenance',
  };
  return statusMap[dbStatus] || 'available';
}

// API Response Types
interface ReservationsResponse {
  reservations: Reservation[];
}

interface RoomsResponse {
  rooms: Room[];
}

// Recent Reservations Hook
function useRecentReservations() {
  return useQuery<ReservationsResponse>({
    queryKey: ['/api/reservations'],
    select: (data) => ({ reservations: data.reservations?.slice(0, 5) || [] }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Room Status Hook
function useRoomStatus() {
  return useQuery<RoomsResponse>({
    queryKey: ['/api/rooms'],
    select: (data) => ({ rooms: data.rooms?.slice(0, 6) || [] }),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Helper function to format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

// Helper function to format percentage
function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// Helper function to calculate percentage change
function calculateChange(current: number | undefined, previous: number | undefined): number {
  if (!current || !previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

// Helper function to format reservation dates
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Loading skeleton component for stats
function StatsCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

// Loading skeleton component for cards
function DashboardCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useDashboardAnalytics();
  const { data: recentReservations, isLoading: reservationsLoading } = useRecentReservations();
  const { data: roomsData, isLoading: roomsLoading } = useRoomStatus();

  // Generate stats from analytics data
  const stats = analytics ? [
    {
      title: "Occupancy Rate",
      value: analytics.todayMetrics ? formatPercentage(analytics.todayMetrics.occupancyRate) : "--",
      change: calculateChange(
        analytics.todayMetrics?.occupancyRate,
        analytics.yesterdayMetrics?.occupancyRate
      ),
      changeLabel: "from yesterday",
      icon: <Users className="h-4 w-4" />,
      color: (analytics.todayMetrics?.occupancyRate || 0) > 0.8 ? "success" as const : "default" as const
    },
    {
      title: "Revenue Today",
      value: analytics.todayMetrics ? formatCurrency(analytics.todayMetrics.totalRevenue) : "--",
      change: calculateChange(
        analytics.todayMetrics?.totalRevenue,
        analytics.yesterdayMetrics?.totalRevenue
      ),
      changeLabel: "from yesterday",
      icon: <DollarSign className="h-4 w-4" />,
      color: "success" as const
    },
    {
      title: "ADR (Avg Daily Rate)",
      value: analytics.todayMetrics ? formatCurrency(analytics.todayMetrics.adr) : "--",
      change: calculateChange(
        analytics.todayMetrics?.adr,
        analytics.yesterdayMetrics?.adr
      ),
      changeLabel: "from yesterday",
      icon: <BarChart3 className="h-4 w-4" />,
      color: "default" as const
    },
    {
      title: "Guest Satisfaction",
      value: analytics.guestSatisfaction ? `${Math.round(analytics.guestSatisfaction.overallRating * 10)/10}/5` : "--",
      change: 0,
      changeLabel: `${analytics.guestSatisfaction?.totalResponses || 0} reviews`,
      icon: <Star className="h-4 w-4" />,
      color: (analytics.guestSatisfaction?.overallRating || 0) >= 4.5 ? "success" as const : 
             (analytics.guestSatisfaction?.overallRating || 0) >= 3.5 ? "default" as const : "warning" as const
    }
  ] : [];

  return (
    <div className="space-y-6" data-testid="page-dashboard">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time hotel management analytics and insights
        </p>
        {analyticsError && (
          <div className="mt-2 text-sm text-destructive">
            Unable to load analytics data. Please try refreshing the page.
          </div>
        )}
      </div>

      {analyticsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>
      ) : (
        <StatsCards stats={stats} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reservationsLoading ? (
          <DashboardCardSkeleton />
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1">
              <CardTitle className="text-lg">Recent Reservations</CardTitle>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
              {recentReservations && recentReservations.reservations.length > 0 ? (
                recentReservations.reservations.map((reservation) => (
                  <ReservationCard
                    key={reservation.id}
                    id={reservation.id}
                    guestName={reservation.guest?.fullName || 'Guest Name'}
                    roomNumber={reservation.room?.number || '--'}
                    roomType={reservation.room?.roomType?.name || 'Room Type'}
                    checkIn={formatDate(reservation.checkInDate)}
                    checkOut={formatDate(reservation.checkOutDate)}
                    status={mapReservationStatus(reservation.status)}
                    totalAmount={reservation.totalAmount}
                    guestEmail={reservation.guest?.email || ''}
                    guestPhone={reservation.guest?.phone || ''}
                    onCheckIn={() => console.log(`Check in ${reservation.id}`)}
                    onCheckOut={() => console.log(`Check out ${reservation.id}`)}
                    onViewDetails={() => console.log(`View details ${reservation.id}`)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No recent reservations</p>
                  <p className="text-sm">New bookings will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {roomsLoading ? (
          <DashboardCardSkeleton />
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1">
              <CardTitle className="text-lg">Room Status Overview</CardTitle>
              <Bed className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
              {roomsData && roomsData.rooms.length > 0 ? (
                roomsData.rooms.map((room) => (
                  <RoomStatusCard
                    key={room.id}
                    roomNumber={room.number}
                    roomType={room.roomType?.name || 'Room Type'}
                    status={mapRoomStatus(room.status)}
                    guestName={room.currentReservation?.guest?.fullName}
                    checkIn={room.currentReservation ? formatDate(room.currentReservation.checkInDate) : undefined}
                    checkOut={room.currentReservation ? formatDate(room.currentReservation.checkOutDate) : undefined}
                    amenities={room.roomType?.amenities || []}
                    onStatusChange={(status) => console.log(`Room ${room.number} status changed to ${status}`)}
                    onViewDetails={() => console.log(`View room ${room.number} details`)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bed className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No room data available</p>
                  <p className="text-sm">Room status will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Additional Analytics Section */}
      {analytics && analytics.monthlyTrend && analytics.monthlyTrend.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1">
            <CardTitle className="text-lg">Monthly Performance Trend</CardTitle>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {formatPercentage(analytics.monthlyTrend.reduce((sum: number, day: any) => sum + (day.occupancyRate || 0), 0) / analytics.monthlyTrend.length)}
                </div>
                <div className="text-sm text-muted-foreground">Avg Occupancy</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(analytics.monthlyTrend.reduce((sum: number, day: any) => sum + (day.totalRevenue || 0), 0))}
                </div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(analytics.monthlyTrend.reduce((sum: number, day: any) => sum + (day.adr || 0), 0) / analytics.monthlyTrend.length)}
                </div>
                <div className="text-sm text-muted-foreground">Avg ADR</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {Math.round(analytics.monthlyTrend.reduce((sum: number, day: any) => sum + (day.revpar || 0), 0) / analytics.monthlyTrend.length)}
                </div>
                <div className="text-sm text-muted-foreground">Avg RevPAR</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}