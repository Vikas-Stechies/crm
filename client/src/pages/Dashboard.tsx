import { useAuth } from "@/hooks/use-auth";
import { useBookings } from "@/hooks/use-bookings";
import { StatCard } from "@/components/ui/StatCard";
import { LogIn, LogOut, Calendar, Plus } from "lucide-react";
import { format, isToday, isSameDay } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: bookings, isLoading } = useBookings();

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const today = new Date();
  
  const checkIns = bookings?.filter(b => isSameDay(new Date(b.checkIn), today)) || [];
  const checkOuts = bookings?.filter(b => isSameDay(new Date(b.checkOut), today)) || [];
  
  const activeBookings = bookings?.filter(b => b.status === 'checked_in') || [];

  return (
    <div className="p-4 md:p-8 space-y-8 pb-24 md:pb-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display">Dashboard</h1>
          <p className="text-muted-foreground">{format(today, "EEEE, MMMM do, yyyy")}</p>
        </div>
        <Link href="/bookings/new">
          <Button className="rounded-xl shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> New Booking
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          title="Active Guests" 
          value={activeBookings.length} 
          icon={<Calendar className="w-6 h-6" />} 
          className="border-l-4 border-l-blue-500"
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
                      <p className="text-xs text-muted-foreground">Room: TBD</p>
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
    </div>
  );
}
