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
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, path }: { component: any, path: string }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  
  if (!user) return <Redirect to="/auth" />;
  
  return (
    <div className="min-h-screen bg-muted/20 pb-20 md:pl-64 md:pb-0">
      <Component />
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
