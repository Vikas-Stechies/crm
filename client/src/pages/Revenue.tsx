import { useRevenue } from "@/hooks/use-bookings";
import { useAuth } from "@/hooks/use-auth"; // Added useAuth
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";

export default function Revenue() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useRevenue();

  // Route Guard: Block non-owners from viewing this page
  if (user?.role !== 'owner') {
    return (
      <div className="p-8 text-center mt-20">
        <h2 className="text-2xl font-bold text-destructive mb-2">Access Denied</h2>
        <p className="text-muted-foreground">Only property owners can view revenue analytics.</p>
      </div>
    );
  }

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="p-4 md:p-8 space-y-8 pb-24 md:pb-8">
      <h1 className="text-2xl md:text-3xl font-bold font-display">Revenue Analytics</h1>

      {/* Existing Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Agency</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.byAgency} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Agency Revenue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agency Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency Name</TableHead>
                <TableHead>Total Revenue</TableHead>
                <TableHead>Receipt (Paid)</TableHead>
                <TableHead>Balance (Due)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.byAgency.map((agency) => (
                <TableRow key={agency.name}>
                  <TableCell className="font-medium">
                    {/* Link to Bookings page with agencyId filter */}
                    <Link href={`/bookings?agencyId=${agency.agencyId ?? 'direct'}`}>
                      <span className="text-primary hover:underline cursor-pointer">
                        {agency.name}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>${agency.revenue.toFixed(2)}</TableCell>
                  <TableCell className="text-green-600">${agency.receipt?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell className="text-red-600">${agency.balance?.toFixed(2) || '0.00'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}