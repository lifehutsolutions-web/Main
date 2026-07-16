import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  Sparkles, 
  X, 
  ChevronRight, 
  MessageCircle, 
  Check, 
  Loader2, 
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ThumbsUp
} from "lucide-react";

interface RoadmapItem {
  id: string;
  title: string;
  desc: string;
  status: "Shipped" | "In Progress" | "Planned";
  category: string;
  votes: number;
  version: string;
  date: string;
}

export default function VisitorHub() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"whatsapp" | "roadmap">("whatsapp");
  
  // WhatsApp States
  const [waMessage, setWaMessage] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  
  // Roadmap & Newsletter States
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [upvotedFeatures, setUpvotedFeatures] = useState<string[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterTopics, setNewsletterTopics] = useState<string[]>(["releases", "guides"]);
  const [subscriptionToken, setSubscriptionToken] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  // Audio Canvas Ref for Wave Animation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch Roadmap
  const fetchRoadmap = async () => {
    setRoadmapLoading(true);
    try {
      const res = await fetch("/api/roadmap");
      if (res.ok) {
        const data = await res.json();
        setRoadmap(data);
      }
    } catch (err) {
      console.error("Error fetching Roadmap:", err);
    } finally {
      setRoadmapLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRoadmap();
    }
  }, [isOpen]);

  // Audio Visualizer Simulation (Futuristic soundwave effect on canvas)
  useEffect(() => {
    if (isOpen && activeTab === "whatsapp" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      let animationFrameId: number;
      let phase = 0;

      const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "rgba(16, 185, 129, 0.5)"; // Green pulsing wave
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let x = 0; x < canvas.width; x++) {
          const y = canvas.height / 2 + Math.sin(x * 0.05 + phase) * 15 * Math.sin(x * 0.01);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        ctx.strokeStyle = "rgba(59, 130, 246, 0.3)"; // Blue secondary offset wave
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x++) {
          const y = canvas.height / 2 + Math.sin(x * 0.04 - phase * 1.2) * 12 * Math.cos(x * 0.015);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        phase += 0.05;
        animationFrameId = requestAnimationFrame(render);
      };

      render();
      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }
  }, [isOpen, activeTab]);

  // WhatsApp Prompt Preset Cards
  const WHATSAPP_PROMPTS = [
    {
      id: "stack",
      title: "Custom Tech Stack",
      subtitle: "Request Custom templates",
      text: "Hi Lifehut Support, I'm interested in getting a custom template built with my own requirements. Can you share the pricing and timeline?"
    },
    {
      id: "deploy",
      title: "Deployment Help",
      subtitle: "Vercel / Cloudflare Page setup",
      text: "Hello! I purchased a template and would like professional assistance in deploying it to my custom domain"
    },
    {
      id: "payment",
      title: "Custom payment method",
      subtitle: "Alternative payment checkout",
      text: "Hey, I'm trying to purchase a premium theme from outside India. Can we set up a secure alternative payment channel?"
    }
  ];

  const handleSelectPrompt = (promptText: string, id: string) => {
    setSelectedPrompt(id);
    setWaMessage(promptText);
  };

  const handleLaunchWhatsApp = () => {
    const finalMsg = waMessage || "Hi Lifehut Solutions, I'm visiting your templates marketplace and would love to ask a quick question!";
    const encoded = encodeURIComponent(finalMsg);
    // Open WhatsApp URL
    window.open(`https://wa.me/919150998912?text=${encoded}`, "_blank");
  };



  // Upvote Feature Roadmap Item
  const handleVoteRoadmap = async (itemId: string) => {
    if (upvotedFeatures.includes(itemId)) return;
    setUpvotedFeatures([...upvotedFeatures, itemId]);

    // Optimistic UI update
    setRoadmap(roadmap.map(item => {
      if (item.id === itemId) return { ...item, votes: item.votes + 1 };
      return item;
    }));

    try {
      await fetch(`/api/roadmap/${itemId}/vote`, { method: "POST" });
    } catch (err) {
      console.error(err);
    }
  };

  // Newsletter Subscription
  const handleSubscribeNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubscribing(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newsletterEmail,
          topics: newsletterTopics
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSubscriptionToken(data.token);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubscribing(false);
    }
  };

  const toggleTopic = (topic: string) => {
    if (newsletterTopics.includes(topic)) {
      setNewsletterTopics(newsletterTopics.filter(t => t !== topic));
    } else {
      setNewsletterTopics([...newsletterTopics, topic]);
    }
  };

  return (
    <>
      {/* Floating Trigger Button with premium glowing background */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="relative group flex items-center justify-center w-14 h-14 rounded-full bg-[var(--blue)] text-white shadow-[0_4px_20px_rgba(37,99,235,0.35)] border border-blue-500 hover:bg-blue-600 transition-all cursor-pointer overflow-hidden"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Internal rotating light border */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-emerald-400/20 group-hover:opacity-100 opacity-60 transition-opacity duration-500 rounded-full" />
          
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-6 h-6 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <MessageSquare className="w-6 h-6 text-white" />
                {/* Active Indicator Pulse */}
                <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Main Glassmorphic Assistant Board */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 25 }}
            className="fixed bottom-24 right-6 z-[9998] w-full max-w-[440px] h-[640px] bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/80 flex flex-col overflow-hidden text-slate-800 font-sans"
            style={{ maxHeight: "calc(100vh - 120px)" }}
          >
            {/* Holographic Header */}
            <div className="relative p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 border border-blue-100">
                  <Sparkles className="w-5 h-5 text-[var(--blue)]" />
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white animate-pulse"></span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
                    Lifehut Nexus <span className="text-[10px] font-mono text-emerald-600 font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 animate-pulse">LIVE</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Interactive Premium Visitor Hub</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Futuristic Segmented Navigation Tabs */}
            <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100">
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200">
                <button
                  onClick={() => setActiveTab("whatsapp")}
                  className={`relative py-2 text-xs font-semibold rounded-lg transition-all duration-300 flex flex-col items-center gap-1 cursor-pointer ${
                    activeTab === "whatsapp" ? "text-[var(--blue)]" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {activeTab === "whatsapp" && (
                    <motion.div
                      layoutId="activeTabGlow"
                      className="absolute inset-0 bg-white border border-slate-200/80 shadow-xs rounded-lg"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <MessageCircle className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Instant Chat</span>
                </button>

                <button
                  onClick={() => setActiveTab("roadmap")}
                  className={`relative py-2 text-xs font-semibold rounded-lg transition-all duration-300 flex flex-col items-center gap-1 cursor-pointer ${
                    activeTab === "roadmap" ? "text-[var(--blue)]" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {activeTab === "roadmap" && (
                    <motion.div
                      layoutId="activeTabGlow"
                      className="absolute inset-0 bg-white border border-slate-200/80 shadow-xs rounded-lg"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Sparkles className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Releases</span>
                </button>
              </div>
            </div>

            {/* Tab Contents Pane */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50/30">
              
              {/* TAB 1: WHATSAPP PREMIUM CHAT */}
              {activeTab === "whatsapp" && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Secure Direct Hotline</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          Want an immediate response? Connect directly with our lead developers on personal WhatsApp.
                        </p>
                      </div>
                    </div>
                    
                    {/* Pulsing Audio Waveform Canvas */}
                    <div className="relative h-12 bg-slate-900 rounded-lg overflow-hidden border border-slate-950 flex items-center justify-center">
                      <canvas ref={canvasRef} width="340" height="48" className="w-full h-full opacity-80" />
                      <div className="absolute inset-0 flex items-center justify-between px-3">
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Acoustic Synth Stream</span>
                        <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-400/10 px-2 py-0.5 rounded">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Channel
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Pre-fill Cards Grid */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Select Dynamic Prompt Card
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {WHATSAPP_PROMPTS.map((prompt) => (
                        <button
                          key={prompt.id}
                          onClick={() => handleSelectPrompt(prompt.text, prompt.id)}
                          className={`p-3 rounded-xl border text-left transition-all duration-300 relative overflow-hidden group cursor-pointer ${
                            selectedPrompt === prompt.id
                              ? "bg-blue-50/70 border-blue-300 shadow-sm"
                              : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${selectedPrompt === prompt.id ? "text-[var(--blue)]" : "text-slate-800"}`}>{prompt.title}</span>
                            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                              selectedPrompt === prompt.id ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-500"
                            }`}>
                              {prompt.id === "stack" ? "custom build" : prompt.id === "deploy" ? "setup assistance" : "alternative gateway"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-normal">{prompt.subtitle}</p>
                          {selectedPrompt === prompt.id && (
                            <div className="absolute right-2.5 bottom-2.5">
                              <Check className="w-3.5 h-3.5 text-[var(--blue)]" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Textbox Block with character feedback */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Customize Your Inquiry Message
                    </label>
                    <div className="relative">
                      <textarea
                        value={waMessage}
                        onChange={(e) => {
                          setWaMessage(e.target.value);
                          setSelectedPrompt(null);
                        }}
                        placeholder="Type or customize your inquiry here. Be creative! Our team is ready to respond."
                        className="w-full h-24 p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[var(--blue)] transition-colors resize-none leading-relaxed shadow-xs"
                      />
                      <span className="absolute bottom-2.5 right-3 text-[9px] font-mono text-slate-400">
                        {waMessage.length} chars
                      </span>
                    </div>
                  </div>

                  {/* Neural Launcher Action Button */}
                  <button
                    onClick={handleLaunchWhatsApp}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(16,185,129,0.15)] transition-all cursor-pointer group hover:scale-[1.01]"
                  >
                    <MessageSquare className="w-4 h-4 animate-bounce" />
                    <span>LAUNCH SECURED WHATSAPP CHANNEL</span>
                    <ArrowUpRight className="w-4 h-4 opacity-75 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                  
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                    <span>No data is stored. Directly proxies via native API.</span>
                  </div>
                </div>
              )}

              {/* Q&A tab has been moved to specific product page reviews/comments section */}

              {/* TAB 3: PRODUCT ROADMAP & NEURAL NEWSLETTER */}
              {activeTab === "roadmap" && (
                <div className="space-y-6">
                  
                  {/* Neural Subscription Module */}
                  <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/40 rounded-full blur-xl pointer-events-none" />
                    
                    {subscriptionToken ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-4 space-y-3"
                      >
                        <div className="inline-flex p-2 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Access Granted Successfully</h4>
                          <p className="text-[10px] text-slate-500 mt-1 px-4 leading-relaxed">
                            You are now configured for automated releases and direct source drops. Here is your ticket token:
                          </p>
                        </div>
                        <div className="inline-block px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 font-mono text-xs text-[var(--blue)] tracking-wider">
                          {subscriptionToken}
                        </div>
                        <p className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">Verify on Lifehut Host Servers</p>
                      </motion.div>
                    ) : (
                      <form onSubmit={handleSubscribeNewsletter} className="space-y-3.5">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[var(--blue)] animate-pulse" />
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Neural Release updates</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Get immediate triggers whenever we commit template updates, security hotfixes, or free developer UI kit assets.
                        </p>

                        {/* Interactive Topics Segment */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => toggleTopic("releases")}
                            className={`flex-1 py-1 px-2 text-[10px] font-mono rounded-lg border text-center transition-all cursor-pointer ${
                              newsletterTopics.includes("releases")
                                ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold"
                                : "bg-slate-50 border-slate-100 text-slate-400"
                            }`}
                          >
                            #CodeReleases
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleTopic("guides")}
                            className={`flex-1 py-1 px-2 text-[10px] font-mono rounded-lg border text-center transition-all cursor-pointer ${
                              newsletterTopics.includes("guides")
                                ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold"
                                : "bg-slate-50 border-slate-100 text-slate-400"
                            }`}
                          >
                            #SetupGuides
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="email"
                            required
                            placeholder="Your email address"
                            value={newsletterEmail}
                            onChange={(e) => setNewsletterEmail(e.target.value)}
                            className="flex-1 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[var(--blue)]"
                          />
                          <button
                            type="submit"
                            disabled={subscribing || !newsletterEmail.trim()}
                            className="px-4 py-2.5 rounded-lg bg-[var(--blue)] hover:bg-[var(--blue-dark)] text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                          >
                            {subscribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Subscribe"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Future Releases Roadmap Timeline */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Developer Release Roadmap
                    </span>

                    <div className="relative pl-4 border-l border-slate-150 space-y-4">
                      {roadmap.map((item) => (
                        <div key={item.id} className="relative group space-y-1.5">
                          {/* Timeline dot */}
                          <div className={`absolute -left-[21px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                            item.status === "Shipped" 
                              ? "bg-emerald-500" 
                              : item.status === "In Progress" 
                                ? "bg-amber-500" 
                                : "bg-cyan-500"
                          }`} />

                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h5 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                {item.title}
                                <span className="text-[8px] font-mono text-slate-400">{item.version}</span>
                              </h5>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                            </div>

                            {/* Roadmap Voting Action */}
                            <button
                              onClick={() => handleVoteRoadmap(item.id)}
                              disabled={item.status === "Shipped"}
                              className={`flex flex-col items-center justify-center p-1.5 rounded-lg border min-w-[36px] transition-all ${
                                item.status === "Shipped"
                                  ? "bg-slate-50 border-slate-100 text-slate-300"
                                  : upvotedFeatures.includes(item.id)
                                    ? "bg-blue-50 border-blue-200 text-[var(--blue)] font-semibold cursor-default"
                                    : "bg-white border-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                              }`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              <span className="text-[9px] font-mono mt-0.5">{item.votes}</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2 text-[9px] font-mono">
                            <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                              item.status === "Shipped" 
                                ? "bg-emerald-50 text-emerald-800" 
                                : item.status === "In Progress" 
                                  ? "bg-amber-50 text-amber-800" 
                                  : "bg-cyan-50 text-cyan-800"
                            }`}>
                              {item.status}
                            </span>
                            <span className="text-slate-400">{item.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
            
            {/* Ambient Footer Branding */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/55 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ALL SYSTEMS OPERATIONAL
              </span>
              <span>© LIFEHUT SOLUTIONS</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
