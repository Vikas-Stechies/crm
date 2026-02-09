import { useOccupancyStats } from "@/hooks/use-analytics";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";

export default function Occupancy() {
  const { data: stats, isLoading } = useOccupancyStats();

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <h1 className="text-2xl md:text-3xl font-bold font-display">Occupancy Report</h1>
      
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-border/50 h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(str) => format(parseISO(str), "dd MMM")} 
              tick={{fill: '#6B7280', fontSize: 12}}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              tick={{fill: '#6B7280', fontSize: 12}}
              axisLine={false}
              tickLine={false}
              dx={-10}
              domain={[0, 100]}
            />
            <Tooltip 
              cursor={{fill: '#F3F4F6'}}
              contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
            />
            <Bar 
              dataKey="percentage" 
              fill="hsl(var(--primary))" 
              radius={[6, 6, 0, 0]} 
              barSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats?.slice(0, 3).map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-border/50">
            <p className="text-muted-foreground text-sm">{format(parseISO(stat.date), "EEEE, MMM d")}</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-2xl font-bold">{stat.percentage}%</span>
              <span className="text-sm text-muted-foreground mb-1">occupied</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: `${stat.percentage}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
