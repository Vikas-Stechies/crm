import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { MobileNav } from "@/components/layout/MobileNav";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import BookingsList from "@/pages/BookingsList";
import BookingDetail from "@/pages/BookingDetail";
import Occupancy from "@/pages/Occupancy";
import Revenue from "@/pages/Revenue";
import Agencies from "@/pages/Agencies";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { LocalNotifications } from '@capacitor/local-notifications';
import AIAssistant from "@/pages/AIAssistant";

function ProtectedRoute({ component: Component, path }: { component: any, path: string }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  if (!user) return <Redirect to="/auth" />;

  // Extract the subscription warning if it exists on the user payload
  const warning = (user as any).subscriptionWarning;

  return (
    <div className="min-h-screen bg-muted/20 pb-20 md:pl-64 md:pb-0 flex flex-col relative">
      {/* Permanent Warning Banner - Sticky & High Contrast on Mobile */}
      {warning && (
        <div className="sticky top-0 z-50 w-full bg-destructive text-destructive-foreground px-4 py-3 shadow-md flex items-start md:items-center gap-3 shrink-0 md:static md:w-auto md:bg-destructive/15 md:text-destructive md:border md:border-destructive/30 md:p-3 md:mx-8 md:mt-8 md:rounded-xl md:shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 md:mt-0">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
            <path d="M12 9v4"></path>
            <path d="M12 17h.01"></path>
          </svg>
          <span className="font-semibold leading-tight">{warning}</span>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <Component />
      </div>
      <MobileNav />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Login} />

      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} path="/dashboard" />
      </Route>

      <Route path="/bookings">
        <ProtectedRoute component={BookingsList} path="/bookings" />
      </Route>

      <Route path="/bookings/:id">
        <ProtectedRoute component={BookingDetail} path="/bookings/:id" />
      </Route>

      <Route path="/occupancy">
        <ProtectedRoute component={Occupancy} path="/occupancy" />
      </Route>

      <Route path="/revenue">
        <ProtectedRoute component={Revenue} path="/revenue" />
      </Route>

      <Route path="/agencies">
        <ProtectedRoute component={Agencies} path="/agencies" />
      </Route>
      <Route path="/ai-assistant">
        <ProtectedRoute component={AIAssistant} path="/ai-assistant" />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={Admin} path="/admin" />
      </Route>

      <Route path="/">
        {(_params) => {
          const { user } = useAuth();
          if (!user) return <Redirect to="/auth" />;
          return user.role === 'admin' ? <Redirect to="/admin" /> : <Redirect to="/dashboard" />;
        }}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {

  useEffect(() => {
    const checkAndScheduleNotifications = async () => {
      const warningMessage = localStorage.getItem("sub_warning");
      if (!warningMessage) {
        await LocalNotifications.cancel({ notifications: [{ id: 999 }] });
        return;
      }
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return;
      // Check if already scheduled to avoid duplicates
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.some(n => n.id === 999)) return;

      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Subscription Exiring Soon",
            body: warningMessage,
            id: 999,
            schedule: {
              at: new Date(Date.now() + 1000 * 5),
              repeats: true,
              every: 'two-hours' as any,
              allowWhileIdle: true
            }
          }
        ]
      });
    };

    checkAndScheduleNotifications();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;