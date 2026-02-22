import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Brain, Users, MessageSquare, Loader2, Bot, Send, TrendingUp, Mic, MicOff } from "lucide-react";
import { useAiForecast, useAiStaffing, useGenerateMessage, useGenerateReviewResponse, useAiChat, useAiAgencyScoring } from "@/hooks/use-ai";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AIAssistant() {
  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 text-primary rounded-xl">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold font-display">AI Assistant</h1>
      </div>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-8 h-auto p-1">
          <TabsTrigger value="chat">Assistant</TabsTrigger>
          <TabsTrigger value="scoring">Agency Rank</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="chat"><ChatbotTab /></TabsContent>
        <TabsContent value="scoring"><AgencyScoringTab /></TabsContent>
        <TabsContent value="reviews"><ReviewsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
function AgencyScoringTab() {
  const { data, isLoading, refetch } = useAiAgencyScoring();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Agency Performance</CardTitle>
        <CardDescription>AI evaluation of travel agencies based on revenue and volume.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : data && data.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((agency, i) => (
                <div key={i} className="border p-5 rounded-xl shadow-sm bg-white relative overflow-hidden">
                  {/* Visual score indicator */}
                  <div className={`absolute top-0 left-0 w-1 h-full ${agency.score >= 80 ? 'bg-green-500' : agency.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} />

                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg">{agency.agencyName}</h3>
                    <div className="flex flex-col items-end">
                      <span className="text-2xl font-black">{agency.score}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">Score</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                    {agency.insights}
                  </p>
                </div>
              ))}
            </div>
            <Button onClick={() => refetch()} variant="outline" className="mt-4"><Sparkles className="w-4 h-4 mr-2" /> Re-evaluate Agencies</Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No agencies or booking data found to analyze.</p>
            <Button onClick={() => refetch()}><Sparkles className="w-4 h-4 mr-2" /> Analyze Agencies</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function ChatbotTab() {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: "Hello! I am your CRM Assistant. Ask me about hotel management best practices or our current booking stats. You can type or use the microphone to speak in any language!" }
  ]);
  const { mutate, isPending } = useAiChat();

  // Reference for the speech recognition instance
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      // Let the browser auto-detect the spoken language
      recognitionRef.current.lang = '';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev ? `${prev} ${transcript}` : transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        alert("Microphone is not supported in this browser.");
      }
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userText = input;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput("");

    // Stop listening if user manually clicks send while mic is open
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    mutate({ message: userText }, {
      onSuccess: (data) => {
        setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
      },
      onError: () => {
        setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an error connecting to my brain." }]);
      }
    });
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> CRM Assistant</CardTitle>
        <CardDescription>Ask questions in plain English or speak in your native language.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-end overflow-hidden pb-4">
        <ScrollArea className="flex-1 pr-4 mb-4">
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 border border-border/50'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isPending && (
              <div className="flex justify-start">
                <div className="bg-muted/50 border border-border/50 rounded-2xl px-4 py-2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="flex gap-2 items-center">
          {/* New Microphone Button */}
          <Button
            variant={isListening ? "destructive" : "outline"}
            size="icon"
            onClick={toggleListening}
            className="shrink-0 transition-all"
            title="Click to speak"
          >
            {isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
          </Button>

          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isListening ? "Listening..." : "Type or speak your message..."}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />

          <Button disabled={isPending || !input.trim()} onClick={handleSend} className="shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
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