import { useBookings, useAgencies, useDeleteBooking } from "@/hooks/use-bookings";
import { useAuth } from "@/hooks/use-auth";
import { format, parseISO } from "date-fns";
import { Link, useLocation } from "wouter";
import { Plus, Search, Calendar as CalendarIcon, MessageSquare, Hotel, X, ArrowUpDown, Building2, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BookingsList() {
  const { user } = useAuth();
  const deleteMutation = useDeleteBooking();
  const { data: bookings, isLoading: bookingsLoading } = useBookings();
  const { data: agencies, isLoading: agenciesLoading } = useAgencies();

  const [search, setSearch] = useState("");
  const [location, setLocation] = useLocation();

  // New Filter States
  const [month, setMonth] = useState<string>(new Date().getMonth().toString());
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [agencyId, setAgencyId] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("checkIn_desc");

  // Constants for dropdowns
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentYear = new Date().getFullYear();
  // Generate a list of years from 5 years ago to 5 years in the future
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // Initialize date filter from URL (For single-day Occupancy linking)
  const [dateFilter, setDateFilter] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("date");
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDateFilter(params.get("date"));
  }, [location]);

  const clearDateFilter = () => {
    setDateFilter(null);
    setLocation("/bookings");
  };

  const isLoading = bookingsLoading || agenciesLoading;

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  // 1. Filter Bookings
  let filteredBookings = bookings?.filter(b => {
    const checkInDate = new Date(b.checkIn);

    // Search Filter
    const matchesSearch = b.guestName.toLowerCase().includes(search.toLowerCase());

    // Single Date URL Filter (Occupancy View)
    let matchesDateFilter = true;
    if (dateFilter) {
      const filterDate = new Date(dateFilter + 'T00:00:00');
      const checkIn = new Date(b.checkIn);
      checkIn.setHours(0, 0, 0, 0);
      const checkOut = new Date(b.checkOut);
      checkOut.setHours(0, 0, 0, 0);
      matchesDateFilter = filterDate >= checkIn && filterDate < checkOut;
    }

    // Month & Year Filter
    const matchesMonthYear =
      (month === "all" || checkInDate.getMonth() === parseInt(month)) &&
      (year === "all" || checkInDate.getFullYear() === parseInt(year));

    // Agency Filter
    const matchesAgency =
      agencyId === "all"
        ? true
        : agencyId === "direct"
          ? b.agencyId === null
          : b.agencyId === parseInt(agencyId);

    return matchesSearch && matchesDateFilter && matchesMonthYear && matchesAgency;
  }) || [];

  // 2. Sort Bookings
  filteredBookings.sort((a, b) => {
    const dateA = sortBy.startsWith("checkIn") ? new Date(a.checkIn).getTime() : new Date(a.checkOut).getTime();
    const dateB = sortBy.startsWith("checkIn") ? new Date(b.checkIn).getTime() : new Date(b.checkOut).getTime();

    if (sortBy.endsWith("asc")) {
      return dateA - dateB;
    } else {
      return dateB - dateA;
    }
  });

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

      <div className="flex flex-col gap-4">
        {/* Search & Occupancy Status Row */}
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

          {dateFilter && (
            <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl border border-primary/20">
              <CalendarIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
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

        {/* Filters Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="bg-white rounded-xl">
              <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map((m, i) => (
                <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="bg-white rounded-xl">
              <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={agencyId} onValueChange={setAgencyId}>
            <SelectTrigger className="bg-white rounded-xl">
              <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Agency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="direct">Direct Booking</SelectItem>
              {agencies?.map(a => (
                <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="bg-white rounded-xl">
              <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checkIn_desc">Check-in (Newest)</SelectItem>
              <SelectItem value="checkIn_asc">Check-in (Oldest)</SelectItem>
              <SelectItem value="checkOut_desc">Check-out (Newest)</SelectItem>
              <SelectItem value="checkOut_asc">Check-out (Oldest)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-border">
            <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {dateFilter ? "No occupied rooms found for this date" : "No bookings found for the selected filters"}
            </p>
            {dateFilter && (
              <Button onClick={clearDateFilter} className="mt-4">Clear occupancy filter</Button>
            )}
          </div>
        ) : (
          filteredBookings.map(booking => (
            <Link key={booking.id} href={`/bookings/${booking.id}`} className="block group">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-border/50 hover:border-primary/50 transition-all hover:shadow-md">

                {/* Header with Title, Badge, and Delete Button */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{booking.guestName}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <span>ID: #{booking.id}</span>
                      <span className="px-1.5 py-0.5 bg-secondary/50 rounded-md text-[10px] font-medium ml-2 uppercase tracking-wider">
                        {booking.agencyId ? agencies?.find(a => a.id === booking.agencyId)?.name : 'Direct'}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 relative z-10">
                    <Badge status={booking.status} />

                    {user?.role !== 'manager' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        disabled={deleteMutation.isPending && deleteMutation.variables === booking.id}
                        onClick={(e) => {
                          e.preventDefault(); // Prevents navigating to details page
                          e.stopPropagation();
                          if (confirm("Are you sure you want to delete this booking?")) {
                            deleteMutation.mutate(booking.id);
                          }
                        }}
                      >
                        {deleteMutation.isPending && deleteMutation.variables === booking.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Highlight the relevant dates if filtering by occupancy */}
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