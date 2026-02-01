import { useState } from "react";
import StatsCards from "@/components/StatsCards";
import ReservationCard, { type ReservationStatus } from "@/components/ReservationCard";
import RoomStatusCard, { type RoomStatus } from "@/components/RoomStatusCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Users, Bed, DollarSign, Calendar, TrendingUp, Star, BarChart3, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

// Helper function to calculate percentage change
function calculateChange(current: number | undefined, previous: number | undefined): number {
  if (!current || !previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

// Helper function to calculate average for arrays with possible undefined/null values
function calculateAverage(data: any[], key: string): number {
  if (!data || data.length === 0) return 0;
  const validValues = data
    .map(item => typeof item[key] === 'string' ? parseFloat(item[key]) : item[key])
    .filter(val => val !== null && val !== undefined && !isNaN(val));
  
  if (validValues.length === 0) return 0;
  return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
}

// Helper function to calculate total for arrays with possible undefined/null values
function calculateTotal(data: any[], key: string): number {
  if (!data || data.length === 0) return 0;
  return data
    .map(item => typeof item[key] === 'string' ? parseFloat(item[key]) : item[key])
    .filter(val => val !== null && val !== undefined && !isNaN(val))
    .reduce((sum, val) => sum + val, 0);
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

// Helper function to format reservation dates
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Helper function to format currency with symbol
function formatCurrency(value: number): string {
  if (isNaN(value)) return "Rs. 0.00";
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    currencyDisplay: 'symbol'
  }).format(value).replace('LKR', 'Rs.');
}

// Helper function to format percentage
function formatPercentage(value: number): string {
  if (isNaN(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}

// Currency Conversion State and Logic
const exchangeRates: Record<string, number> = {
  "LKR": 1,
  "USD": 0.0033,
  "EUR": 0.0031,
  "GBP": 0.0026
};

export default function Dashboard() {
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useDashboardAnalytics();
  const { data: recentReservations, isLoading: reservationsLoading } = useRecentReservations();
  const { data: roomsData, isLoading: roomsLoading } = useRoomStatus();
  const [, setLocation] = useLocation();
  const [targetCurrency, setTargetCurrency] = useState(() => {
    return localStorage.getItem("preferred_currency") || "LKR";
  });

  const handleCurrencyChange = (value: string) => {
    setTargetCurrency(value);
    localStorage.setItem("preferred_currency", value);
  };

  const convertAmount = (amount: number) => {
    if (isNaN(amount)) return 0;
    return amount * (exchangeRates[targetCurrency] || 1);
  };

  const formatWithCurrency = (amount: number) => {
    if (isNaN(amount)) return targetCurrency === "LKR" ? "Rs. 0.00" : "$0.00";
    const converted = convertAmount(amount);
    if (targetCurrency === "LKR") return formatCurrency(amount);
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: targetCurrency
    }).format(converted);
  };

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
      value: analytics.todayMetrics ? formatWithCurrency(analytics.todayMetrics.totalRevenue) : "--",
      change: calculateChange(
        analytics.todayMetrics?.totalRevenue,
        analytics.yesterdayMetrics?.totalRevenue
      ),
      changeLabel: "from yesterday",
      icon: <DollarSign className="h-4 w-4" />,
      color: "success" as const
    },
    {
      title: "Profit (Est. 60%)",
      value: analytics.todayMetrics ? formatWithCurrency((analytics.todayMetrics.totalRevenue || 0) * 0.6) : "--",
      change: calculateChange(
        analytics.todayMetrics?.totalRevenue,
        analytics.yesterdayMetrics?.totalRevenue
      ),
      changeLabel: "from yesterday",
      icon: <TrendingUp className="h-4 w-4" />,
      color: "success" as const
    },
    {
      title: "ADR (Avg Daily Rate)",
      value: analytics.todayMetrics ? formatWithCurrency(analytics.todayMetrics.adr) : "--",
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
      value: analytics.guestSatisfaction ? `${Math.round((analytics.guestSatisfaction.overallRating || 0) * 10)/10}/5` : "--",
      change: 0,
      changeLabel: `${analytics.guestSatisfaction?.totalResponses || 0} reviews`,
      icon: <Star className="h-4 w-4" />,
      color: (analytics.guestSatisfaction?.overallRating || 0) >= 4.5 ? "success" as const : 
             (analytics.guestSatisfaction?.overallRating || 0) >= 3.5 ? "default" as const : "warning" as const
    }
  ] : [];

  return (
    <div className="space-y-6" data-testid="page-dashboard">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time hotel management analytics and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Display Currency:</span>
          <Select value={targetCurrency} onValueChange={handleCurrencyChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LKR">LKR (Rs.)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {analyticsError && (
        <div className="mt-2 text-sm text-destructive">
          Unable to load analytics data. Please try refreshing the page.
        </div>
      )}

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
                    onCheckIn={() => setLocation('/front-desk')}
                    onCheckOut={() => setLocation('/front-desk')}
                    onViewDetails={() => setLocation(`/guests`)}
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
                    onViewDetails={() => setLocation('/rooms')}
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
                  {formatPercentage(calculateAverage(analytics.monthlyTrend, 'occupancyRate'))}
                </div>
                <div className="text-sm text-muted-foreground">Avg Occupancy</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(calculateTotal(analytics.monthlyTrend, 'totalRevenue'))}
                </div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(calculateAverage(analytics.monthlyTrend, 'adr'))}
                </div>
                <div className="text-sm text-muted-foreground">Avg ADR</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(calculateAverage(analytics.monthlyTrend, 'revpar'))}
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