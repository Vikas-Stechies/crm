import { useAuth } from "@/hooks/use-auth";
import { useBookings, useOccupancy, useRevenue, useForecast } from "@/hooks/use-bookings";
import { useHotels } from "@/hooks/use-hotels";
import { StatCard } from "@/components/ui/StatCard";
import { LogIn, LogOut, Calendar, Plus, Bed, DoorOpen } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function OccupancyChart() {
  const { data: stats } = useOccupancy();
  if (!stats) return null;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={stats}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" />
        <YAxis unit="%" />
        <Tooltip />
        <Line type="monotone" dataKey="percentage" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function RevenueChart() {
  const { data: stats } = useRevenue();
  if (!stats?.monthly) return null;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={stats.monthly}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']} />
        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: bookings, isLoading: bookingsLoading } = useBookings();
  const { data: forecast, isLoading: forecastLoading } = useForecast();
  const { data: hotels, isLoading: hotelsLoading } = useHotels();

  const isLoading = bookingsLoading || forecastLoading || hotelsLoading;

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const today = new Date();

  // Normalize today to midnight for accurate occupancy comparisons
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const checkIns = bookings?.filter(b => isSameDay(new Date(b.checkIn), today)) || [];
  const checkOuts = bookings?.filter(b => isSameDay(new Date(b.checkOut), today)) || [];

  // Find the user's assigned hotel
  const assignedHotel = hotels?.find(h => h.id === user?.hotelId);

  // Calculate Occupied Rooms Today
  const occupiedTodayCount = bookings?.filter(b => {
    if (b.status === 'cancelled') return false;
    const checkIn = new Date(b.checkIn);
    checkIn.setHours(0, 0, 0, 0);
    const checkOut = new Date(b.checkOut);
    checkOut.setHours(0, 0, 0, 0);
    // Room is occupied if today falls inside the check-in (inclusive) and check-out (exclusive) dates
    return todayStart >= checkIn && todayStart < checkOut;
  }).reduce((sum, b) => sum + b.numberOfRooms, 0) || 0;

  // Calculate Total Rooms (If admin with no specific hotel, sum all hotels)
  const totalRooms = user?.role === 'admin' && !user?.hotelId
    ? hotels?.reduce((sum, h) => sum + h.totalRooms, 0) || 0
    : assignedHotel?.totalRooms || 0;

  // Calculate Vacant Rooms Today
  const vacantTodayCount = Math.max(0, totalRooms - occupiedTodayCount);

  return (
    <div className="p-4 md:p-8 space-y-8 pb-24 md:pb-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display">
            {assignedHotel ? `${assignedHotel.name} Dashboard` : 'Dashboard'}
          </h1>
          <p className="text-muted-foreground">{format(today, "EEEE, MMMM do, yyyy")}</p>
        </div>
        <Link href="/bookings/new">
          <Button className="rounded-xl shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> New Booking
          </Button>
        </Link>
      </div>

      {/* Grid updated to 4 columns on large screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Check-ins"
          value={checkIns.length}
          icon={<LogIn className="w-6 h-6" />}
          className="border-l-4 border-l-green-500"
        />
        <StatCard
          title="Today's Check-outs"
          value={checkOuts.length}
          icon={<LogOut className="w-6 h-6" />}
          className="border-l-4 border-l-orange-500"
        />
        <StatCard
          title="Today's Occupied"
          value={occupiedTodayCount}
          icon={<Bed className="w-6 h-6" />}
          className="border-l-4 border-l-blue-500"
        />
        <StatCard
          title="Today's Vacant"
          value={vacantTodayCount}
          icon={<DoorOpen className="w-6 h-6" />}
          className="border-l-4 border-l-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Check-ins List */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Checking In Today
          </h3>
          <div className="space-y-3">
            {checkIns.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No check-ins today.</p>
            ) : (
              checkIns.map(booking => (
                <Link key={booking.id} href={`/bookings/${booking.id}`} className="block">
                  <div className="flex justify-between items-center p-3 rounded-xl hover:bg-muted/50 transition-colors border border-border/30">
                    <div>
                      <p className="font-semibold">{booking.guestName}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {format(new Date(booking.checkIn), "h:mm a")}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Check-outs List */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            Checking Out Today
          </h3>
          <div className="space-y-3">
            {checkOuts.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No check-outs today.</p>
            ) : (
              checkOuts.map(booking => (
                <Link key={booking.id} href={`/bookings/${booking.id}`} className="block">
                  <div className="flex justify-between items-center p-3 rounded-xl hover:bg-muted/50 transition-colors border border-border/30">
                    <div>
                      <p className="font-semibold">{booking.guestName}</p>
                      <p className="text-xs text-muted-foreground">Status: {booking.status}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {format(new Date(booking.checkOut), "h:mm a")}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            5-Day Occupancy Forecast
          </h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Occupied</TableHead>
                  <TableHead>Vacant</TableHead>
                  <TableHead>Check-ins</TableHead>
                  <TableHead>Check-outs</TableHead>
                  <TableHead className="text-right">Occupancy %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecast?.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell className="font-medium">
                      <Link href={`/bookings?date=${format(new Date(day.date), "yyyy-MM-dd")}`}>
                        <span className="text-primary hover:underline cursor-pointer">
                          {format(new Date(day.date), "EEE, MMM d")}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>{day.occupied}</TableCell>
                    <TableCell>{day.vacant}</TableCell>
                    <TableCell>{day.checkIns}</TableCell>
                    <TableCell>{day.checkOuts}</TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${day.percentage >= 80 ? 'bg-green-100 text-green-800' :
                        day.percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                        {day.percentage}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {!forecast && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                      Loading forecast...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}