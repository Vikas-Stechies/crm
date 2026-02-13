import { useState, useMemo } from "react";
import { useOccupancyStats } from "@/hooks/use-analytics";
import { Link } from "wouter";
import {
  format,
  parseISO,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameYear,
  startOfYear,
  endOfYear
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown, CalendarDays, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function Occupancy() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: stats, isLoading } = useOccupancyStats({
    month: currentDate.getMonth(),
    year: currentDate.getFullYear()
  });

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate(next => addMonths(next, 1));

  // 1. FIXED Yearly Occupancy Calculation
  const yearlyOccupancy = useMemo(() => {
    if (!stats || stats.length === 0) return 0;

    // Filter stats for the selected year
    const currentYearStats = stats.filter(s => isSameYear(parseISO(s.date), currentDate));

    // Calculate monthly averages for the year
    const monthlyAverages = Array.from({ length: 12 }, (_, monthIndex) => {
      const monthStats = currentYearStats.filter(s => parseISO(s.date).getMonth() === monthIndex);

      if (monthStats.length === 0) return 0;

      // Average occupancy for that specific month
      const totalMonthPercent = monthStats.reduce((sum, s) => sum + s.percentage, 0);
      return totalMonthPercent / monthStats.length;
    });

    // Final calculation: Sum of all 12 monthly averages divided by 12
    const yearlySum = monthlyAverages.reduce((sum, avg) => sum + avg, 0);
    const finalYearlyAvg = yearlySum / 12;

    // Use toFixed(2) if you want 0.17% precision, or round if you want integers
    return finalYearlyAvg < 1 && finalYearlyAvg > 0
      ? finalYearlyAvg.toFixed(2)
      : Math.round(finalYearlyAvg);
  }, [stats, currentDate]);

  // 2. Generate all days for the selected month
  const fullMonthStats = useMemo(() => {
    if (isLoading) return [];

    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const allDays = eachDayOfInterval({ start, end });

    return allDays.map(day => {
      const existingStat = stats?.find(s => isSameDay(parseISO(s.date), day));
      const totalRooms = existingStat?.totalRooms || 14;
      const occupied = existingStat?.occupied || 0;

      return {
        date: day.toISOString(),
        occupied: occupied,
        totalRooms: totalRooms,
        percentage: existingStat?.percentage || (occupied > 0 ? Math.round((occupied / totalRooms) * 100) : 0)
      };
    });
  }, [stats, currentDate, isLoading]);

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalBooked = fullMonthStats.reduce((acc, curr) => acc + curr.occupied, 0);
  const totalRoomsPossible = fullMonthStats.reduce((acc, curr) => acc + curr.totalRooms, 0);
  const totalVacant = totalRoomsPossible - totalBooked;
  const avgOccupancy = totalRoomsPossible > 0
    ? Math.round((totalBooked / totalRoomsPossible) * 100)
    : 0;

  const maxOccupancy = fullMonthStats.length > 0 ? Math.max(...fullMonthStats.map(s => s.percentage)) : 0;
  const minOccupancy = fullMonthStats.length > 0 ? Math.min(...fullMonthStats.map(s => s.percentage)) : 0;

  return (
    <div className="p-4 md:p-8 space-y-8 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display">Occupancy Report</h1>
          <p className="text-muted-foreground mt-1">
            Booking Chart: {format(currentDate, "MMMM yyyy")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Occupancy</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display">{avgOccupancy}%</div>
            <p className="text-xs text-muted-foreground mt-1">Average for {format(currentDate, "MMMM")}</p>
          </CardContent>
        </Card>

        {/* Updated Yearly Occupancy Card with corrected logic */}
        {/* <Card className="border-border/50 shadow-sm bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Yearly Occupancy</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display text-primary">{yearlyOccupancy}%</div>
            <p className="text-xs text-muted-foreground mt-1">Full year average for {format(currentDate, "yyyy")}</p>
          </CardContent>
        </Card> */}

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Peak Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display text-green-600">{maxOccupancy}%</div>
            <p className="text-xs text-muted-foreground mt-1">Month's peak utilization</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Slowest Day</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display text-orange-500">{minOccupancy}%</div>
            <p className="text-xs text-muted-foreground mt-1">Month's lowest utilization</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="flex items-center justify-between gap-2 text-lg">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              {format(currentDate, "MMMM yyyy")} Breakdown
            </div>

            <div className="flex items-center gap-2 bg-white p-1 rounded-lg shadow-sm border border-border/50">
              <Button variant="ghost" size="sm" onClick={handlePrevMonth} className="text-primary h-8 px-2 hover:bg-primary/5">
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="h-4 w-px bg-border" />
              <Button variant="ghost" size="sm" onClick={handleNextMonth} className="text-primary h-8 px-2 hover:bg-primary/5">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[200px] pl-6">Date</TableHead>
                <TableHead>Booked</TableHead>
                <TableHead>Available</TableHead>
                <TableHead className="w-[45%] pr-6">Bar Chart</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fullMonthStats.map((day, index) => {
                const dateObj = parseISO(day.date);
                const available = day.totalRooms - day.occupied;

                return (
                  <TableRow key={index} className="hover:bg-muted/30 border-b">
                    <TableCell className="font-medium pl-6">
                      <Link href={`/bookings?date=${format(new Date(day.date), "yyyy-MM-dd")}`}>
                        <span className="text-primary hover:underline cursor-pointer">
                          {format(new Date(day.date), "EEE, MMM d")}
                        </span>
                      </Link>

                    </TableCell>

                    <TableCell className="font-semibold">{day.occupied}</TableCell>
                    <TableCell className="text-muted-foreground">{available}</TableCell>
                    <TableCell className="pr-6">
                      <div className="relative h-8 w-full bg-secondary/30 rounded-sm overflow-hidden flex items-center">
                        <div
                          className="h-full flex items-center justify-center text-[10px] font-bold transition-all duration-500"
                          style={{
                            width: `${day.percentage}%`,
                            backgroundColor:
                              day.percentage >= 100 ? '#84cc16' :
                                day.percentage > 50 ? '#22d3ee' :
                                  day.percentage > 0 ? '#f87171' : 'transparent'
                          }}
                        >
                          {day.occupied > 0 && <span className="drop-shadow-sm">{day.occupied}</span>}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="p-6 bg-muted/20 border-t text-center text-sm font-semibold tracking-wide">
            Total Rooms booked: <span className="text-primary mx-1">{totalBooked}</span> |
            Vacant: <span className="text-primary mx-1">{totalVacant}</span> |
            Occupancy: <span className="text-red-500 ml-1">{avgOccupancy}%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}