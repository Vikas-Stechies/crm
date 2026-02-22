import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAiForecast, useAiStaffing, useGenerateMessage, useGenerateReviewResponse } from "@/hooks/use-ai";
import { Sparkles, Brain, Users, MessageSquare, Loader2 } from "lucide-react";

export default function AIAssistant() {
  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 text-primary rounded-xl">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold font-display">AI Assistant</h1>
      </div>

      <Tabs defaultValue="forecasting" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 max-w-[800px] mb-8">
          <TabsTrigger value="forecasting">Demand Forecast</TabsTrigger>
          <TabsTrigger value="staffing">Staffing Opt.</TabsTrigger>
          <TabsTrigger value="engagement">Guest Messages</TabsTrigger>
          <TabsTrigger value="reviews">Review Response</TabsTrigger>
        </TabsList>

        <TabsContent value="forecasting"><ForecastingTab /></TabsContent>
        <TabsContent value="staffing"><StaffingTab /></TabsContent>
        <TabsContent value="engagement"><EngagementTab /></TabsContent>
        <TabsContent value="reviews"><ReviewsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ForecastingTab() {
  const { data, isLoading, refetch } = useAiForecast();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> Demand & Pricing AI</CardTitle>
        <CardDescription>AI analysis based on your recent occupancy trends.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : data ? (
          <div className="space-y-6">
            <div className="bg-muted/30 p-4 rounded-lg">
              <h3 className="font-bold mb-2">Trend Analysis</h3>
              <p className="text-muted-foreground">{data.analysis}</p>
            </div>
            <div className="bg-muted/30 p-4 rounded-lg">
              <h3 className="font-bold mb-2">7-Day Forecast</h3>
              <p className="text-muted-foreground">{data.forecast}</p>
            </div>
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
              <h3 className="font-bold text-primary mb-2">Pricing Recommendation</h3>
              <p className="text-primary/80">{data.pricingRecommendation}</p>
            </div>
            <Button onClick={() => refetch()} variant="outline"><Sparkles className="w-4 h-4 mr-2" /> Refresh Analysis</Button>
          </div>
        ) : (
          <Button onClick={() => refetch()}><Sparkles className="w-4 h-4 mr-2" /> Generate Forecast</Button>
        )}
      </CardContent>
    </Card>
  );
}

function StaffingTab() {
  const { data, isLoading, refetch } = useAiStaffing();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Predictive Staffing</CardTitle>
        <CardDescription>Optimal schedule generated based on upcoming check-ins/outs.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((day, i) => (
                <div key={i} className="border p-4 rounded-xl shadow-sm">
                  <div className="font-bold mb-3">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                  <div className="flex justify-between text-sm mb-1"><span>Housekeeping:</span> <strong>{day.housekeepersNeeded}</strong></div>
                  <div className="flex justify-between text-sm mb-3"><span>Front Desk:</span> <strong>{day.frontDeskNeeded}</strong></div>
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">{day.notes}</div>
                </div>
              ))}
            </div>
            <Button onClick={() => refetch()} variant="outline" className="mt-4"><Sparkles className="w-4 h-4 mr-2" /> Recalculate</Button>
          </div>
        ) : (
          <Button onClick={() => refetch()}><Sparkles className="w-4 h-4 mr-2" /> Generate Schedule</Button>
        )}
      </CardContent>
    </Card>
  );
}

function EngagementTab() {
  const [form, setForm] = useState({ guestName: "", checkIn: "", checkOut: "", type: "Welcome Email", comments: "" });
  const { mutate, data, isPending } = useGenerateMessage();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle>Generate Message</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Guest Name" value={form.guestName} onChange={e => setForm({ ...form, guestName: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input type="date" value={form.checkIn} onChange={e => setForm({ ...form, checkIn: e.target.value })} />
            <Input type="date" value={form.checkOut} onChange={e => setForm({ ...form, checkOut: e.target.value })} />
          </div>
          <Input placeholder="Message Type (e.g., Post-stay feedback)" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} />
          <Textarea placeholder="Specific notes (optional)" value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} />
          <Button disabled={isPending || !form.guestName || !form.checkIn} onClick={() => mutate(form)} className="w-full">
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />} Generate
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>AI Output</CardTitle></CardHeader>
        <CardContent>
          {data ? (
            <div className="whitespace-pre-wrap text-sm bg-muted/30 p-4 rounded-xl min-h-[200px] border border-border/50">{data.message}</div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground border border-dashed rounded-xl">Fill the details to generate a message</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewsTab() {
  const [form, setForm] = useState({ reviewText: "", rating: 5, guestName: "" });
  const { mutate, data, isPending } = useGenerateReviewResponse();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Auto-Reply</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Guest Name (Optional)" value={form.guestName} onChange={e => setForm({ ...form, guestName: e.target.value })} />
          <Input type="number" min={1} max={5} placeholder="Rating (1-5)" value={form.rating} onChange={e => setForm({ ...form, rating: parseInt(e.target.value) })} />
          <Textarea placeholder="Paste the guest's review here..." rows={5} value={form.reviewText} onChange={e => setForm({ ...form, reviewText: e.target.value })} />
          <Button disabled={isPending || !form.reviewText} onClick={() => mutate(form)} className="w-full">
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />} Generate Response
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Suggested Response</CardTitle></CardHeader>
        <CardContent>
          {data ? (
            <div className="whitespace-pre-wrap text-sm bg-muted/30 p-4 rounded-xl min-h-[200px] border border-border/50">{data.response}</div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground border border-dashed rounded-xl">Paste a review to generate a response</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}