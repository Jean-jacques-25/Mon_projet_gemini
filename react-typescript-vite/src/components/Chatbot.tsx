import React, { useState, useRef, useEffect } from "react";
import { Send, PhoneCall, HelpCircle, X, Sparkles, MessageSquare } from "lucide-react";

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: "user" | "model";
  text: string;
}

export default function Chatbot({ isOpen, onClose }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Bonjour ! Je suis l'assistant IA officiel de DataBroker229 🇧🇯.\n\nSlogan officiel : \"Des données terrain fiables, partout au Bénin.\"\n\nPosez-moi vos questions concernant le barême des points (1 point = 10 FCFA), les retraits MoMo, le fonctionnement de notre système de gamification ou encore nos algorithmes de détection anti-fraude GPS."
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMsg = inputText.trim();
    setInputText("");
    
    // Append to message list
    const updatedMessages = [...messages, { role: "user", text: userMsg } as Message];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Map message history context for endpoint
      const formattedHistory = updatedMessages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const resp = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: formattedHistory.slice(0, -1) // Excluding the last user prompt since it is passed as body parameters
        })
      });

      if (!resp.ok) {
        throw new Error("Erreur de connexion");
      }

      const resData = await resp.json();
      setMessages([...updatedMessages, { role: "model", text: resData.reply }]);

    } catch (err) {
      setMessages([
        ...updatedMessages,
        {
          role: "model",
          text: "Je n’ai pas trouvé une réponse précise à votre problème. Contactez le support DataBroker229 🇧🇯 sur WhatsApp : +229 55256871\n\nN'hésitez pas à cliquer sur le lien WhatsApp ci-dessous !"
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 md:right-10 w-96 max-w-[calc(100vw-32px)] h-[500px] bg-slate-900 text-white rounded-2xl shadow-2xl border border-emerald-500/30 flex flex-col overflow-hidden z-50">
      
      {/* Mini header component */}
      <div className="px-4 py-3 bg-slate-950 border-b border-emerald-55 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h5 className="text-xs font-black text-slate-100 flex items-center gap-1">
              Assistant IA DataBroker229 🇧🇯
            </h5>
            <span className="text-[9px] text-emerald-450 block font-mono">Conseiller virtuel intelligent</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main chat window */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-900 bg-opacity-95">
        {messages.map((m, index) => {
          const isModel = m.role === "model";
          return (
            <div key={index} className={`flex ${isModel ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs inline-block whitespace-pre-wrap ${
                isModel
                  ? "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/50"
                  : "bg-emerald-600 text-white rounded-tr-none"
              }`}>
                {m.text}

                {/* Detect fallback string to provide quick helper button */}
                {isModel && m.text.includes("+229 55256871") && (
                  <div className="mt-3">
                    <a
                      href="https://wa.me/22955256871"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-emerald-600 hover:bg-emerald-550 text-slate-900 font-extrabold text-[10px] py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all"
                    >
                      <PhoneCall className="w-3.5 h-3.5" /> Contacter Support WhatsApp 💬
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-tl-none px-4 py-3 text-xs italic">
              L'IA réfléchit...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message action submit form */}
      <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-850 flex gap-2 shrink-0">
        <input
          id="chatbot-input-text"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Posez une question à l'assistant..."
          className="flex-1 bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="p-2 bg-emerald-600 hover:bg-emerald-550 text-white rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
