import { useBookings } from "@/hooks/use-bookings";
import { format, parseISO } from "date-fns"; // Added parseISO for safer date parsing
import { Link, useLocation } from "wouter";
import { Plus, Search, Calendar as CalendarIcon, MessageSquare, Hotel, X } from "lucide-react"; // Added X icon
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function BookingsList() {
  const { data: bookings, isLoading } = useBookings();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useLocation();

  // Initialize date filter from URL
  const [dateFilter, setDateFilter] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("date");
  });

  // Sync state if URL changes (optional, but good for navigation consistency)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDateFilter(params.get("date"));
  }, [location]);

  const clearDateFilter = () => {
    setDateFilter(null);
    setLocation("/bookings"); // Remove query param from URL
  };

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const filteredBookings = bookings?.filter(b => {
    const matchesSearch = b.guestName.toLowerCase().includes(search.toLowerCase());

    let matchesDate = true;
    if (dateFilter) {
      // Create date objects for comparison (set time to midnight)
      const filterDate = new Date(dateFilter + 'T00:00:00'); // Ensure time is set to start of day
      const checkIn = new Date(b.checkIn);
      checkIn.setHours(0, 0, 0, 0);

      const checkOut = new Date(b.checkOut);
      checkOut.setHours(0, 0, 0, 0);

      // Logic: Show booking if the selected date falls within the stay [CheckIn, CheckOut)
      // We use < CheckOut because CheckOut day usually doesn't count as "Occupied" for that night
      matchesDate = filterDate >= checkIn && filterDate < checkOut;
    }

    return matchesSearch && matchesDate;
  }) || [];

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold font-display">Bookings</h1>
        <Link href="/bookings/new">
          <Button className="rounded-xl shadow-lg shadow-primary/20 w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" /> New Booking
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search guest name..."
            className="pl-9 h-10 rounded-xl bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Date Filter Indicator */}
        {dateFilter && (
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl border border-primary/20">
            <CalendarIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {/* FIX 2: Append 'T00:00:00' here as well for correct display */}
              Occupancy: {format(new Date(dateFilter + 'T00:00:00'), "MMM d, yyyy")}
            </span>
            <button
              onClick={clearDateFilter}
              className="ml-2 hover:bg-primary/20 rounded-full p-1 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-border">
            <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {dateFilter ? "No occupied rooms found for this date" : "No bookings found"}
            </p>
            {dateFilter && (
              <Button onClick={clearDateFilter}>Clear date filter</Button>
            )}
          </div>
        ) : (
          filteredBookings.map(booking => (
            <Link key={booking.id} href={`/bookings/${booking.id}`} className="block group">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-border/50 hover:border-primary/50 transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{booking.guestName}</h3>
                    <p className="text-xs text-muted-foreground">ID: #{booking.id}</p>
                  </div>
                  <Badge status={booking.status} />
                </div>

                {/* Highlight the relevant dates if filtering */}
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className={cn(
                    "bg-muted/30 p-2 rounded-lg",
                    dateFilter && new Date(booking.checkIn).toDateString() === new Date(dateFilter).toDateString() && "bg-green-100 ring-1 ring-green-200"
                  )}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Check In</p>
                    <p className="text-sm font-medium">{format(new Date(booking.checkIn), "MMM d, yyyy")}</p>
                  </div>
                  <div className="bg-muted/30 p-2 rounded-lg">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Check Out</p>
                    <p className="text-sm font-medium">{format(new Date(booking.checkOut), "MMM d, yyyy")}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Hotel className="w-4 h-4" />
                    <span>{booking.numberOfRooms} Room{booking.numberOfRooms !== 1 ? 's' : ''}</span>
                  </div>
                  {booking.comments && (
                    <div className="flex items-center gap-1.5 italic line-clamp-1">
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span className="truncate">{booking.comments}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex justify-between items-center pt-3 border-t border-dashed">
                  <p className="text-sm font-medium text-muted-foreground">Total: ${(booking.totalCost / 100).toFixed(2)}</p>
                  <p className={cn(
                    "text-sm font-bold",
                    booking.balance > 0 ? "text-destructive" : "text-green-600"
                  )}>
                    {booking.balance > 0 ? `Due: $${(booking.balance / 100).toFixed(2)}` : "Paid"}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const styles = {
    confirmed: "bg-blue-100 text-blue-800",
    checked_in: "bg-green-100 text-green-800",
    checked_out: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
      styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800"
    )}>
      {status.replace('_', ' ')}
    </span>
  );
}
