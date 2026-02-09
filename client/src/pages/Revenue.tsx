import { useRevenueStats } from "@/hooks/use-analytics";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

export default function Revenue() {
  const { data: stats, isLoading } = useRevenueStats();

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <h1 className="text-2xl md:text-3xl font-bold font-display">Revenue Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Trend */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-border/50 h-[400px]">
          <h3 className="font-bold mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={stats?.monthly}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} tick={{fontSize: 12, fill: '#6B7280'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} tickFormatter={(val) => `$${val/1000}k`} />
              <Tooltip formatter={(val: number) => [`$${val.toFixed(2)}`, "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Agency Breakdown */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-border/50 h-[400px]">
          <h3 className="font-bold mb-4">Revenue by Source</h3>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={stats?.byAgency}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="revenue"
              >
                {stats?.byAgency.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val: number) => `$${val.toFixed(2)}`} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
