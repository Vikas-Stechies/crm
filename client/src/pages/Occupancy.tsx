import { useOccupancyStats } from "@/hooks/use-analytics";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { format, parseISO } from "date-fns";
import { Activity, TrendingUp, TrendingDown, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function Occupancy() {
  const { data: stats, isLoading } = useOccupancyStats();

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  // Calculate high-level metrics
  const validStats = stats || [];
  const avgOccupancy = validStats.length > 0
    ? Math.round(validStats.reduce((acc, curr) => acc + curr.percentage, 0) / validStats.length)
    : 0;

  const maxOccupancy = validStats.length > 0 ? Math.max(...validStats.map(s => s.percentage)) : 0;
  const minOccupancy = validStats.length > 0 ? Math.min(...validStats.map(s => s.percentage)) : 0;

  return (
    <div className="p-4 md:p-8 space-y-8 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display">Occupancy Report</h1>
          <p className="text-muted-foreground mt-1">Daily room utilization and trends</p>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Occupancy</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display">{avgOccupancy}%</div>
            <p className="text-xs text-muted-foreground mt-1">Across all tracked days</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Highest Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display text-green-600">{maxOccupancy}%</div>
            <p className="text-xs text-muted-foreground mt-1">Peak utilization</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lowest Day</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display text-orange-500">{minOccupancy}%</div>
            <p className="text-xs text-muted-foreground mt-1">Lowest utilization</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="border-border/50 shadow-sm pt-6">
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={validStats} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tickFormatter={(str) => format(parseISO(str), "MMM d")}
                tick={{ fill: '#6B7280', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                dx={-10}
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                cursor={{ fill: '#F3F4F6' }}
                contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                labelFormatter={(label) => format(parseISO(label as string), "EEEE, MMMM d, yyyy")}
                formatter={(value: number) => [`${value}%`, 'Occupied']}
              />
              <ReferenceLine y={avgOccupancy} stroke="hsl(var(--destructive))" strokeDasharray="3 3" opacity={0.5} />
              <Bar
                dataKey="percentage"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Data Table */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="w-5 h-5 text-primary" />
            Day-by-Day Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Rooms Occupied</TableHead>
                  <TableHead className="text-right">Occupancy %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No occupancy data available to display.
                    </TableCell>
                  </TableRow>
                ) : (
                  validStats.map((stat, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {format(parseISO(stat.date), "EEEE, MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-center">
                        {stat.occupied}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className={cn(
                            "font-semibold",
                            stat.percentage >= 80 ? "text-green-600" :
                              stat.percentage >= 50 ? "text-orange-500" :
                                "text-destructive"
                          )}>
                            {stat.percentage}%
                          </span>
                          <div className="w-16 bg-secondary h-1.5 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                stat.percentage >= 80 ? "bg-green-500" :
                                  stat.percentage >= 50 ? "bg-orange-500" :
                                    "bg-destructive"
                              )}
                              style={{ width: `${stat.percentage}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}