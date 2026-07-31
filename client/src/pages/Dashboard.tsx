import StatsCards from "@/components/StatsCards";
import ReservationCard, { type ReservationStatus } from "@/components/ReservationCard";
import RoomStatusCard, { type RoomStatus } from "@/components/RoomStatusCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Users, Bed, DollarSign, Calendar, TrendingUp, Star, BarChart3, Clock, Wrench, TrendingDown, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/context/CurrencyContext";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from "recharts";

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

  const calculateTotal = (data: any[], key: string): number => {
    if (!data || data.length === 0) return 0;
    return data
      .map(item => {
        const val = item[key];
        return typeof val === 'string' ? parseFloat(val) : val;
      })
      .filter(val => val !== null && val !== undefined && !isNaN(val))
      .reduce((sum, val) => sum + val, 0);
  };

  const calculateAverage = (data: any[], key: string): number => {
    if (!data || data.length === 0) return 0;
    const validValues = data
      .map(item => {
        const val = item[key];
        return typeof val === 'string' ? parseFloat(val) : val;
      })
      .filter(val => val !== null && val !== undefined && !isNaN(val));
    
    if (validValues.length === 0) return 0;
    return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
  };

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

// Helper function to format percentage
function formatPercentage(value: number): string {
  if (isNaN(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}

export default function Dashboard() {
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useDashboardAnalytics();
  const { data: recentReservations, isLoading: reservationsLoading } = useRecentReservations();
  const { data: roomsData, isLoading: roomsLoading } = useRoomStatus();
  const [, setLocation] = useLocation();
  const { formatWithCurrency, convertAmount } = useCurrency();
  const { user } = useAuth();
  const propertyId = user?.propertyId;

  const { data: housekeepingData } = useQuery<{ tasks: any[] }>({
    queryKey: [`/api/properties/${propertyId}/housekeeping-tasks`],
    enabled: !!propertyId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: allReservationsData } = useQuery<{ reservations: any[] }>({
    queryKey: ['/api/properties', propertyId, 'reservations'],
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000,
  });

  // Housekeeping summary
  const hkTasks = housekeepingData?.tasks || [];
  const hkSummary = {
    pending: hkTasks.filter(t => t.status === 'pending').length,
    inProgress: hkTasks.filter(t => t.status === 'in_progress').length,
    completed: hkTasks.filter(t => t.status === 'completed' || t.status === 'inspected').length,
    total: hkTasks.length,
  };

  // Revenue forecast: group future reservations by week (next 4 weeks)
  const forecastData = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weeks = [
      { label: 'This Week', start: 0, end: 6 },
      { label: 'Week 2', start: 7, end: 13 },
      { label: 'Week 3', start: 14, end: 20 },
      { label: 'Week 4', start: 21, end: 27 },
    ];
    return weeks.map(w => {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + w.start);
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + w.end);
      const revenue = (allReservationsData?.reservations || [])
        .filter(r => {
          if (!['confirmed', 'pending', 'checked_in'].includes(r.status)) return false;
          const arrival = new Date(r.arrivalDate);
          arrival.setHours(0, 0, 0, 0);
          return arrival >= weekStart && arrival <= weekEnd;
        })
        .reduce((sum: number, r: any) => {
          const amt = typeof r.totalAmount === 'string' ? parseFloat(r.totalAmount) : (r.totalAmount || 0);
          return sum + convertAmount(amt);
        }, 0);
      return { label: w.label, revenue: Math.round(revenue) };
    });
  })();

  // Monthly trend chart data (convert occupancyRate from 0-1 to 0-100)
  const trendChartData = (analytics?.monthlyTrend || []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    occupancy: Math.round((d.occupancyRate || 0) * 100),
    revenue: Math.round(convertAmount(typeof d.totalRevenue === 'string' ? parseFloat(d.totalRevenue) : (d.totalRevenue || 0))),
    adr: Math.round(convertAmount(typeof d.adr === 'string' ? parseFloat(d.adr) : (d.adr || 0))),
  }));

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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time hotel management analytics and insights
        </p>
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

      {/* Interactive Charts Section */}
      {analytics && analytics.monthlyTrend && analytics.monthlyTrend.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="section-performance-charts">
          {/* Occupancy Trend Line Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
              <div>
                <CardTitle className="text-lg">Occupancy Trend</CardTitle>
                <p className="text-sm text-muted-foreground">30-day occupancy rate (%)</p>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="mb-3 grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">
                    {formatPercentage(calculateAverage(analytics.monthlyTrend, 'occupancyRate'))}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Occupancy</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">
                    {formatWithCurrency(calculateAverage(analytics.monthlyTrend, 'revpar'))}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg RevPAR</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v, i) => i % 7 === 0 ? v : ''}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, 'Occupancy']}
                    labelStyle={{ fontSize: 12 }}
                    contentStyle={{ fontSize: 12, borderRadius: '8px' }}
                  />
                  <ReferenceLine y={80} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: '80%', fontSize: 10, position: 'insideTopRight' }} />
                  <Line
                    type="monotone"
                    dataKey="occupancy"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name="Occupancy %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Bar Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
              <div>
                <CardTitle className="text-lg">Revenue Graph</CardTitle>
                <p className="text-sm text-muted-foreground">30-day daily revenue</p>
              </div>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="mb-3 grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">
                    {formatWithCurrency(calculateTotal(analytics.monthlyTrend, 'totalRevenue'))}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">
                    {formatWithCurrency(calculateAverage(analytics.monthlyTrend, 'adr'))}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg ADR</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v, i) => i % 7 === 0 ? v : ''}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) => [formatWithCurrency(value), 'Revenue']}
                    labelStyle={{ fontSize: 12 }}
                    contentStyle={{ fontSize: 12, borderRadius: '8px' }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Housekeeping Status Overview & Revenue Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Housekeeping Status Overview */}
        <Card data-testid="card-housekeeping-overview">
          <CardHeader className="flex flex-row items-center justify-between gap-1">
            <div>
              <CardTitle className="text-lg">Housekeeping Status</CardTitle>
              <p className="text-sm text-muted-foreground">Current task overview</p>
            </div>
            <Wrench className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            {hkTasks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Wrench className="mx-auto h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No housekeeping tasks today</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-md border p-3">
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{hkSummary.pending}</div>
                    <div className="text-xs text-muted-foreground mt-1">Pending</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{hkSummary.inProgress}</div>
                    <div className="text-xs text-muted-foreground mt-1">In Progress</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{hkSummary.completed}</div>
                    <div className="text-xs text-muted-foreground mt-1">Completed</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {(['pending', 'in_progress', 'completed', 'inspected', 'cancelled'] as const).map(status => {
                    const count = hkTasks.filter(t => t.status === status).length;
                    if (count === 0) return null;
                    const pct = hkSummary.total > 0 ? Math.round((count / hkSummary.total) * 100) : 0;
                    const labelMap: Record<string, string> = {
                      pending: 'Pending', in_progress: 'In Progress',
                      completed: 'Completed', inspected: 'Inspected', cancelled: 'Cancelled'
                    };
                    const colorMap: Record<string, string> = {
                      pending: 'bg-amber-500', in_progress: 'bg-blue-500',
                      completed: 'bg-green-500', inspected: 'bg-emerald-500', cancelled: 'bg-muted-foreground'
                    };
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{labelMap[status]}</span>
                          <span className="font-medium">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${colorMap[status]}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-1">
                  <button
                    onClick={() => setLocation('/housekeeping')}
                    className="text-xs text-primary hover:underline"
                  >
                    View all housekeeping tasks →
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Revenue Forecast */}
        <Card data-testid="card-revenue-forecast">
          <CardHeader className="flex flex-row items-center justify-between gap-1">
            <div>
              <CardTitle className="text-lg">Revenue Forecast</CardTitle>
              <p className="text-sm text-muted-foreground">Next 4 weeks (confirmed bookings)</p>
            </div>
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            {forecastData.every(w => w.revenue === 0) ? (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="mx-auto h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No upcoming bookings in the next 28 days</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border p-3">
                    <div className="text-lg font-bold text-primary">
                      {formatWithCurrency(forecastData.reduce((s, w) => s + w.revenue, 0))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Total 4-Week Forecast</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-lg font-bold text-primary">
                      {formatWithCurrency(Math.round(forecastData.reduce((s, w) => s + w.revenue, 0) / 4))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Avg Per Week</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={forecastData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: any) => [formatWithCurrency(value), 'Projected Revenue']}
                      labelStyle={{ fontSize: 12 }}
                      contentStyle={{ fontSize: 12, borderRadius: '8px' }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary) / 0.8)" radius={[4, 4, 0, 0]} name="Forecast" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2">
                  {forecastData.map(w => (
                    <Badge key={w.label} variant="outline" className="text-xs">
                      {w.label}: {formatWithCurrency(w.revenue)}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}