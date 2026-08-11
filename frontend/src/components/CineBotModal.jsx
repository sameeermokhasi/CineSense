/**
 * components/CineBotModal.jsx
 * Conversational CineBot AI Assistant with Floating Launcher,
 * Natural Language Prompt Understanding, Quick Starter Chips,
 * and Interactive In-Chat Movie Cards.
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, X, Send, Bot, User, Film, Star, Clock, 
  ArrowRight, Bookmark, BookmarkCheck, Play, RefreshCw, MessageSquare
} from 'lucide-react';
import { sendChatMessage } from '../services/api';

const STARTER_PROMPTS = [
  "Something like Inception but shorter",
  "Mind-bending space thriller with a crazy twist",
  "Feel-good comedy for family like 3 Idiots",
  "Dark, gritty crime thriller with intense mystery",
  "High-octane action thriller under 100 mins"
];

function formatMessageContent(text) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    const formattedLine = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic text-slate-300">{part.slice(1, -1)}</em>;
      }
      return part;
    });

    if (line.trim().startsWith('• ') || line.trim().startsWith('- ')) {
      return (
        <div key={idx} className="flex items-start gap-1.5 pl-1.5 my-0.5 text-slate-200">
          <span className="text-[#ff3b30] font-bold">•</span>
          <span>{formattedLine}</span>
        </div>
      );
    }

    if (!line.trim()) {
      return <div key={idx} className="h-1.5" />;
    }

    return <p key={idx} className="leading-relaxed">{formattedLine}</p>;
  });
}

export default function CineBotModal({
  isOpen,
  onClose,
  onOpen,
  onExploreMovie,
  myList = [],
  onToggleMyList
}) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: "👋 Hi! I'm **CineBot AI**, your personal movie concierge.\n\nAsk me anything like:\n• *'How is 3 Idiots?'*\n• *'Movies like Inception but shorter'*\n• *'Mind-bending space thriller with a crazy twist'*",
      recommendations: []
    }
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend = null) => {
    const query = (textToSend || inputVal).trim();
    if (!query || isTyping) return;

    const userMsgId = Date.now().toString();
    const newMsgList = [
      ...messages,
      { id: userMsgId, sender: 'user', text: query, recommendations: [] }
    ];
    setMessages(newMsgList);
    setInputVal('');
    setIsTyping(true);

    try {
      const res = await sendChatMessage(query, messages.map(m => ({ sender: m.sender, text: m.text })));
      
      setTimeout(() => {
        setMessages([
          ...newMsgList,
          {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            text: res.reply || "Here are great matches for your request:",
            recommendations: res.recommendations || []
          }
        ]);
        setIsTyping(false);
      }, 500);
    } catch (err) {
      setMessages([
        ...newMsgList,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: "I had a moment of interference! Here are iconic classics you'll love:",
          recommendations: [
            { title: "Inception (2010)", genres: "Sci-Fi|Action", runtime: "148 mins", avg_rating: 4.5, imdb_rating: 8.8, why: "Mind-bending layered dream heist." },
            { title: "Source Code (2011)", genres: "Sci-Fi|Thriller", runtime: "93 mins", avg_rating: 4.2, imdb_rating: 7.5, why: "Punchy 93-minute quantum loop thriller." }
          ]
        }
      ]);
      setIsTyping(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: "👋 Hi! I'm **CineBot AI**, your personal movie concierge. Describe what you're in the mood for, and I'll find the perfect film with instant rationale!",
        recommendations: []
      }
    ]);
  };

  return (
    <>
      {/* Floating Bottom-Right Launcher Bubble (Always visible when closed) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[999] animate-bounce-subtle">
          <button
            onClick={onOpen}
            className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#e50914] via-[#ff3b30] to-[#ff5722] text-white font-bold text-xs sm:text-sm shadow-[0_10px_30px_rgba(229,9,20,0.5)] hover:shadow-[0_15px_40px_rgba(229,9,20,0.7)] hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20"
            title="Open CineBot AI Concierge"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 fill-white text-white animate-spin-slow" />
            </div>
            <span className="font-netflix-title tracking-wide">Ask CineBot AI</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white/30 animate-pulse" />
          </button>
        </div>
      )}

      {/* Expandable Conversational Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-[9999] sm:w-[460px] sm:h-[620px] w-full h-full flex flex-col bg-[#12141f]/95 backdrop-blur-2xl sm:rounded-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden font-netflix-body animate-scale-up">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#1c1f2e] to-[#161824] border-b border-white/10 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#e50914] to-[#ff5722] p-[1.5px] shadow-md shadow-[#e50914]/30 flex-shrink-0">
                <div className="w-full h-full rounded-[10px] bg-[#141622] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-[#ff453a]" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white font-netflix-title">CineBot AI</h3>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">Online</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Conversational Movie Concierge</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Clear chat history"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Close CineBot"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs no-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-6 h-6 rounded-lg bg-[#ff3b30]/20 border border-[#ff3b30]/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#ff453a]" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 space-y-2.5 shadow-md ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-[#e50914] to-[#ff3b30] text-white rounded-tr-none font-medium'
                      : 'bg-[#1b1e2c] border border-white/10 text-slate-200 rounded-tl-none'
                  }`}
                >
                  <div className="space-y-1">
                    {formatMessageContent(msg.text)}
                  </div>


                  {/* Recommended Movie Cards in Bot Message */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-white/10">
                      {msg.recommendations.map((rec) => {
                        const cleanTitle = (rec.title || '').replace(/\s*\(\d{4}\)/, '').trim();
                        const isSaved = myList.some((m) => m.title === rec.title);

                        return (
                          <div
                            key={rec.title}
                            className="p-2.5 rounded-xl bg-[#141622] border border-white/10 hover:border-[#ff3b30]/50 transition-all flex flex-col gap-1.5 text-left group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-white group-hover:text-[#ff453a] transition-colors text-xs font-netflix-title">
                                  {cleanTitle}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                  <span className="text-amber-400 font-bold">★ {rec.avg_rating || '4.3'}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {rec.runtime || '110 mins'}</span>
                                </div>
                              </div>

                              <button
                                onClick={() => onToggleMyList(rec)}
                                className={`p-1.5 rounded-lg transition-all ${
                                  isSaved
                                    ? 'bg-[#ff3b30] text-white shadow-md'
                                    : 'bg-white/10 text-slate-400 hover:text-white hover:bg-white/20'
                                }`}
                                title={isSaved ? "In Watchlist" : "Add to Watchlist"}
                              >
                                {isSaved ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                              </button>
                            </div>

                            {rec.why && (
                              <p className="text-[11px] text-slate-300 italic bg-white/5 px-2 py-1 rounded-md border-l-2 border-[#ff3b30]">
                                "{rec.why}"
                              </p>
                            )}

                            <button
                              onClick={() => {
                                onClose();
                                onExploreMovie(rec.title, rec);
                              }}
                              className="mt-1 flex items-center justify-between px-2.5 py-1 rounded-lg bg-[#ff3b30]/15 hover:bg-[#ff3b30] text-[#ff453a] hover:text-white font-bold text-[10px] transition-all"
                            >
                              <span>Explore Full Film</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-6 h-6 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-6 h-6 rounded-lg bg-[#ff3b30]/20 border border-[#ff3b30]/40 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-[#ff453a] animate-spin-slow" />
                </div>
                <div className="p-3 bg-[#1b1e2c] border border-white/10 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ff3b30] animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-[#ff3b30] animate-pulse delay-150" />
                  <span className="w-2 h-2 rounded-full bg-[#ff3b30] animate-pulse delay-300" />
                  <span className="text-[10px] text-slate-400 ml-1 font-medium">CineBot is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starter Chips */}
          <div className="px-4 py-2 border-t border-white/5 bg-[#141622] flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSendMessage(prompt)}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 text-[10px] whitespace-nowrap transition-all font-medium flex-shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-[#161824] border-t border-white/10 flex items-center gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask CineBot (e.g. Inception but shorter)..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              className="flex-1 bg-[#10121a] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff3b30] transition-colors"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputVal.trim() || isTyping}
              className="p-2.5 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff3b30] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
