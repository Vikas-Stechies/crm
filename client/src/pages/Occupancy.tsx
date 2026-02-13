import { useOccupancyStats } from "@/hooks/use-analytics";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { format, parseISO } from "date-fns";
import { Progress } from "@/components/ui/progress"; // Ensure this shadcn component exists
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown, CalendarDays } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function Occupancy() {
  const { data: stats, isLoading } = useOccupancyStats();

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Calculate high-level metrics
  const validStats = stats || [];
  const avgOccupancy = validStats.length > 0
    ? Math.round(validStats.reduce((acc, curr) => acc + curr.percentage, 0) / validStats.length)
    : 0;

  const maxOccupancy = validStats.length > 0 ? Math.max(...validStats.map(s => s.percentage)) : 0;
  const minOccupancy = validStats.length > 0 ? Math.min(...validStats.map(s => s.percentage)) : 0;

  const totalBooked = stats?.reduce((acc, curr) => acc + curr.occupied, 0) || 0;
  const totalRoomsPossible = stats?.reduce((acc, curr) => acc + (curr.totalRooms || 14), 0) || 0;
  const totalVacant = totalRoomsPossible - totalBooked;
  //const avgOccupancy = stats?.length ? Math.round((totalBooked / totalRoomsPossible) * 100) : 0;

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
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[100px]">Month</TableHead>
                  <TableHead className="w-[80px]">Date</TableHead>
                  <TableHead>Booked</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead className="w-[40%]">Bar Chart</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.map((day, index) => {
                  const dateObj = parseISO(day.date);
                  const totalRooms = day.totalRooms; // Fallback to 14 from image if not in data
                  const available = totalRooms - day.occupied;

                  return (
                    <TableRow key={index} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <span className="bg-gray-500 text-white px-2 py-1 rounded text-[10px] uppercase">
                          {format(dateObj, "MMMM")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="bg-cyan-500 text-white px-2 py-1 rounded font-bold text-xs">
                          {format(dateObj, "dd")}
                        </span>
                      </TableCell>
                      <TableCell>{day.occupied}</TableCell>
                      <TableCell>{available}</TableCell>
                      <TableCell>
                        <div className="relative h-8 w-full bg-secondary/20 rounded-sm overflow-hidden flex items-center">
                          <div
                            className="h-full flex items-center justify-center text-[10px] font-bold transition-all"
                            style={{
                              width: `${day.percentage}%`,
                              backgroundColor: day.percentage > 80 ? '#84cc16' : day.percentage > 50 ? '#22d3ee' : '#f87171'
                            }}
                          >
                            {day.occupied > 0 && <span>{day.occupied}</span>}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Footer Summary as seen in image */}
            <div className="p-4 bg-muted/20 border-t text-center text-sm font-medium">
              Total Rooms booked: <span className="text-primary">{totalBooked}</span> |
              Vacant: <span className="text-primary">{totalVacant}</span> |
              Occupancy: <span className="text-red-500">{avgOccupancy}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}