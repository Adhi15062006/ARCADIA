import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, MessageSquare, X, Send, Sparkles, SendHorizontal } from "lucide-react";
import AnimatedButton from "./ui/animated-button";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Namaste! I am the ARCADIA AI Architechture advisor. How can I assist you with custom websites, SaaS solutions, or AI calling agents today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const suggestions = [
    "List of Services",
    "Website cost in India?",
    "Book a free consultation",
    "Explain AI calling agents"
  ];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMessage: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: textToSend,
          chatHistory: messages.map(m => ({ sender: m.sender, text: m.text }))
        })
      });
      const data = await res.json();
      
      const botMessage: Message = {
        id: Math.random().toString(),
        sender: "bot",
        text: data.text || data.reply || "I am currently optimizing my network loops. Please try again shortly or contact our human specialists directly.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: Math.random().toString(),
        sender: "bot",
        text: "Could not establish safe data pipe to neural node. Please verify your internet connection.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="arcadia-chatbot-widget" className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* 1. Expandable Messaging Window Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="w-[90vw] sm:w-[360px] h-[480px] bg-arcadia-dark rounded-[28px] border border-white/10 shadow-[0_16px_50px_rgba(0,0,0,0.7)] flex flex-col justify-between overflow-hidden mb-4 relative"
          >
            {/* Header branding overlay */}
            <div className="p-4 bg-arcadia-black border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-arcadia-blue/10 border border-arcadia-blue/20 text-arcadia-cyan">
                  <Bot className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-xs text-white">ARCADIA NEURAL SLOT</h4>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                    <span className="font-mono text-[8px] text-green-400 font-bold uppercase">ONLINE PROTOCOL</span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <AnimatedButton
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </AnimatedButton>
            </div>

            {/* Conversation Messages Thread Area */}
            <div className="flex-grow p-4 overflow-y-auto space-y-3 flex flex-col">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[80%] ${
                    msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
                >
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl font-sans text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-arcadia-blue text-white rounded-br-none"
                        : "bg-white/5 text-gray-300 border border-white/5 rounded-bl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="font-mono text-[7px] text-gray-600 mt-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}

              {/* Loader indicator while loading Gemini replies */}
              {isLoading && (
                <div className="flex flex-col items-start mr-auto max-w-[80%]">
                  <div className="px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/5 text-gray-400 rounded-bl-none flex items-center gap-2 font-mono text-[10px]">
                    <Sparkles className="w-3.5 h-3.5 text-arcadia-cyan animate-spin" />
                    <span>SYNAPSE PROPAGATING...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions & Text Input Form Area */}
            <div className="p-4 border-t border-white/10 bg-arcadia-black/50 space-y-3">
              {/* suggestions list */}
              {messages.length === 1 && !isLoading && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((sug) => (
                    <AnimatedButton
                      key={sug}
                      onClick={() => handleSend(sug)}
                      className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 hover:border-white/10 text-[9px] font-medium text-gray-300 hover:text-white transition cursor-pointer"
                    >
                      {sug}
                    </AnimatedButton>
                  ))}
                </div>
              )}

              {/* Chat Input form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(inputValue);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask ARCADIA AI anything..."
                  className="w-full px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-arcadia-blue/50 transition-all"
                />
                <AnimatedButton
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="p-2.5 rounded-full bg-arcadia-blue text-white hover:bg-blue-600 transition disabled:opacity-40 shrink-0 cursor-pointer"
                >
                  <SendHorizontal className="w-4 h-4" />
                </AnimatedButton>
              </form>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Floating Circular Launch Button with glowing border */}
      <AnimatedButton
        id="chatbot-launch-btn"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="p-4 rounded-full bg-arcadia-blue text-white shadow-[0_8px_32px_rgba(47,128,255,0.4)] hover:shadow-[0_8px_40px_rgba(47,128,255,0.6)] cursor-pointer border border-white/15 relative group flex items-center justify-center"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-arcadia-blue to-arcadia-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        {isOpen ? (
          <X className="w-5.5 h-5.5 relative z-10" />
        ) : (
          <MessageSquare className="w-5.5 h-5.5 relative z-10 animate-pulse" />
        )}
      </AnimatedButton>

    </div>
  );
}
