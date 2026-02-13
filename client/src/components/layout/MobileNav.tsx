import { Link, useLocation } from "wouter";
import { LayoutDashboard, Calendar, PieChart, DollarSign, Settings, LogOut, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  const items = isAdmin ? [
    { href: "/admin", icon: Settings, label: "Admin" },
    { href: "/admin/users", icon: LayoutDashboard, label: "Users" },
  ] : [
    { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { href: "/bookings", icon: Calendar, label: "Bookings" },
    { href: "/agencies", icon: Building2, label: "Agencies" },
    { href: "/occupancy", icon: PieChart, label: "Occupancy" },
    // Only add Revenue if the user role is strictly "owner"
    ...(user.role === 'owner' ? [{ href: "/revenue", icon: DollarSign, label: "Revenue" }] : [])
  ];

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-lg z-50 safe-area-bottom">
        <div className="flex justify-around items-center p-2">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors duration-200",
              location === item.href
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}>
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
          <button
            onClick={() => logoutMutation.mutate()}
            className="flex flex-col items-center gap-1 p-2 text-destructive/80 hover:text-destructive transition-colors"
          >
            <LogOut className="w-6 h-6" />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 border-r bg-card/50 backdrop-blur-xl">
        <div className="p-6">
          <h1 className="text-2xl font-bold font-display bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            HotelCRM
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome, {user.name}</p>
        </div>

        <div className="flex-1 px-4 space-y-2">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              location === item.href
                ? "bg-primary/10 text-primary font-medium shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={() => logoutMutation.mutate()}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}