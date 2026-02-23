import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Mic, Send, MicOff, Loader2 } from "lucide-react"; // Assuming you use lucide-react for icons

// Define the message type
interface Message {
  role: "user" | "ai";
  content: string;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hello! How can I help you manage your hotel today?" }
  ]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);

  // Request permissions when the component mounts
  useEffect(() => {
    const initSpeech = async () => {
      try {
        const hasPermission = await SpeechRecognition.checkPermissions();
        if (hasPermission.speechRecognition !== 'granted') {
          await SpeechRecognition.requestPermissions();
        }
      } catch (e) {
        console.warn("Speech recognition not supported on this device/browser");
      }
    };
    initSpeech();
  }, []);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/ai/chat", { message });
      return res.json();
    },
    onSuccess: async (data) => {
      const aiText = data.response;
      setMessages((prev) => [...prev, { role: "ai", content: aiText }]);

      const isHindi = /[\u0900-\u097F]/.test(aiText);

      const speechLang = isHindi ? 'hi-IN' : 'en-US';

      try {
        await TextToSpeech.speak({
          text: aiText,
          lang: speechLang,
          rate: 0.9, // You can lower this to 0.9 if the Hindi voice speaks too fast
          pitch: 1.0,
          volume: 1.0,
          category: 'ambient',
        });
      } catch (err) {
        console.error("Text-to-speech failed:", err);
      }
    },
  });

  const handleSend = (textToSend: string) => {
    if (!textToSend.trim() || chatMutation.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: textToSend }]);
    chatMutation.mutate(textToSend);
    setInput("");
  };

  const toggleListening = async () => {
    if (isListening) {
      await SpeechRecognition.stop();
      setIsListening(false);
      return;
    }

    try {
      setIsListening(true);
      const result = await SpeechRecognition.start({
        language: "en-US",
        maxResults: 1,
        prompt: "Say your command...", // Android only prompt
        partialResults: false,
      });

      if (result.matches && result.matches.length > 0) {
        const spokenText = result.matches[0];
        setInput(spokenText);
        handleSend(spokenText); // Auto-send when finished speaking
      }
    } catch (err) {
      console.error("Speech recognition error:", err);
    } finally {
      setIsListening(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto p-4">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-primary p-4 text-primary-foreground">
          <h2 className="text-xl font-bold flex items-center gap-2">
            AI Assistant
          </h2>
          <p className="text-sm opacity-90">Ask me to check in guests, pull reports, or create bookings.</p>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted max-w-[80%] rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-background flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
            placeholder="Type your message or tap the mic..."
            disabled={chatMutation.isPending || isListening}
            className="flex-1"
          />

          {/* Push-to-Talk Microphone Button */}
          <Button
            variant={isListening ? "destructive" : "secondary"}
            size="icon"
            onClick={toggleListening}
            disabled={chatMutation.isPending}
            title={isListening ? "Stop listening" : "Tap to speak"}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          {/* Text Send Button */}
          <Button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || chatMutation.isPending || isListening}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}