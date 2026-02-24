import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  LineChart as ChartIcon, 
  Wallet, 
  Building, 
  Bitcoin, 
  ArrowUpRight, 
  ArrowDownRight, 
  Settings, 
  LogOut, 
  Bell, 
  Search, 
  ChevronRight, 
  Sparkles, 
  MessageSquare, 
  Send, 
  Loader2, 
  BrainCircuit 
} from 'lucide-react';

// Correction de l'erreur : Utilisation d'une méthode plus robuste pour accéder aux variables d'environnement
// ou repli sur une chaîne vide si l'environnement de build ne supporte pas import.meta.env
const getApiKey = () => {
  try {
    return import.meta.env.VITE_GEMINI_API_KEY || "";
  } catch (e) {
    return ""; // Fallback pour les environnements es2015/legacy
  }
};

const apiKey = getApiKey();

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [showAiChat, setShowAiChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const chatEndRef = useRef(null);

  // Données de simulation (Mock Data)
  const portfolioTotal = 1245680.50;
  const portfolioGrowth = 12.4;
  const growthValue = 137450.20;

  const assetClasses = [
    { name: 'Immobilier', value: 750000, percentage: 60, icon: Building, color: 'text-white' },
    { name: 'Marchés Financiers', value: 320500, percentage: 25, icon: ChartIcon, color: 'text-[#D4AF37]' },
    { name: 'Crypto-actifs', value: 125180, percentage: 10, icon: Bitcoin, color: 'text-gray-300' },
    { name: 'Liquidités', value: 50000.50, percentage: 5, icon: Wallet, color: 'text-white' },
  ];

  const recentTransactions = [
    { id: 1, type: 'Achat BTC', amount: -2500, date: 'Aujourd\'hui', entity: 'Binance' },
    { id: 2, type: 'Dividendes LVMH', amount: +450.20, date: 'Hier', entity: 'Crédit Agricole' },
    { id: 3, type: 'Loyer SCPI', amount: +1200, date: '15 Mars', entity: 'Corum XL' },
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  // --- LOGIQUE GEMINI API AVEC GESTION D'ERREURS AMÉLIORÉE ---

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const callGemini = async (prompt, isAnalysis = false) => {
    if (!apiKey) {
      return "Configuration requise : Veuillez définir la variable d'environnement VITE_GEMINI_API_KEY sur Vercel pour activer l'IA.";
    }

    const systemPrompt = `Tu es un expert en gestion de patrimoine et conseiller financier Senior. 
    Ton ton est professionnel, analytique et élégant. Tu travailles pour MasterInvest. 
    Les données actuelles du client sont : Patrimoine total: ${portfolioTotal}€, 
    Répartition: Immobilier (60%), Bourse (25%), Crypto (10%), Cash (5%). 
    ${isAnalysis ? "Génère une analyse concise en 3 points clés avec des recommandations d'optimisation." : ""}`;

    let retries = 0;
    const maxRetries = 5;
    
    while (retries <= maxRetries) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] }
          })
        });

        const data = await response.json();
        
        if (data.error) throw new Error(data.error.message);

        return data.candidates?.[0]?.content?.parts?.[0]?.text;
      } catch (error) {
        if (retries === maxRetries) throw error;
        const delay = Math.pow(2, retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
      }
    }
  };

  const handleAiAnalysis = async () => {
    setIsAiAnalyzing(true);
    try {
      const result = await callGemini("Analyse mon portefeuille actuel et donne-moi une vision stratégique pour le prochain trimestre.", true);
      setAiAnalysis(result);
    } catch (error) {
      setAiAnalysis("Une erreur est survenue lors de l'analyse. Vérifiez vos paramètres d'API.");
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage;
    setInputMessage("");
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);

    try {
      const aiResponse = await callGemini(userMsg);
      setChatMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'ai', text: "Service IA temporairement indisponible." }]);
    }
  };

  return (
    <div className="min-h-screen bg-[#030B17] text-slate-100 font-sans overflow-hidden flex selection:bg-[#D4AF37] selection:text-[#030B17]">
      {/* Arrière-plan animé */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#D4AF37]/10 blur-[150px] animate-pulse" style={{ animationDuration: '12s' }}></div>
      </div>

      {/* Sidebar */}
      <aside className="relative z-10 w-64 h-screen p-6 flex flex-col border-r border-white/5 bg-[#030B17]/40 backdrop-blur-3xl hidden md:flex">
        <div className="flex items-center gap-3 mb-12 group cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#A08020] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20 group-hover:scale-105 transition-transform duration-500">
            <span className="font-bold text-[#030B17] text-xl tracking-tighter">MP</span>
          </div>
          <span className="font-semibold text-lg tracking-wide text-white/90 group-hover:text-white transition-colors">MasterInvest</span>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: 'dashboard', name: 'Vue Globale', icon: LayoutDashboard },
            { id: 'assets', name: 'Mes Actifs', icon: Wallet },
            { id: 'perf', name: 'Performances', icon: ChartIcon },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group hover:translate-x-1 ${
                activeTab === item.id 
                  ? 'bg-blue-900/20 text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.05)] border border-[#D4AF37]/20' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={18} />
              <span className="font-medium text-sm">{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="mb-8 p-4 bg-gradient-to-b from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2 text-[#D4AF37]">
                <BrainCircuit size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Master AI</span>
            </div>
            <p className="text-[10px] text-slate-400 mb-3">Optimisez votre stratégie avec l'IA.</p>
            <button 
                onClick={() => setShowAiChat(true)}
                className="w-full py-2 bg-[#D4AF37] text-[#030B17] rounded-lg text-xs font-bold hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all flex items-center justify-center gap-2"
            >
                Consulter ✨
            </button>
        </div>

        <div className="mt-auto space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white transition-all">
            <Settings size={18} />
            <span className="font-medium text-sm">Paramètres</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 transition-all">
            <LogOut size={18} />
            <span className="font-medium text-sm">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative z-10 flex-1 h-screen overflow-y-auto p-6 lg:p-10 scroll-smooth">
        <header className="flex justify-between items-center mb-10">
          <div className="flex-1 max-w-md">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                className="w-full bg-white/[0.02] border border-white/5 rounded-full py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
                onClick={handleAiAnalysis}
                disabled={isAiAnalyzing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-full text-blue-300 text-sm font-medium hover:bg-blue-600/30 transition-all disabled:opacity-50"
            >
              {isAiAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Analyse IA ✨
            </button>
            <button className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center hover:bg-white/10 relative">
              <Bell size={18} className="text-slate-300" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#D4AF37] rounded-full"></span>
            </button>
            <div className="h-10 w-10 rounded-full border-2 border-[#D4AF37]/20 bg-cover bg-center" style={{backgroundImage: 'url("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop")'}}></div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto space-y-6 pb-12">
          {aiAnalysis && (
            <div className="bg-gradient-to-r from-blue-900/30 to-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-3xl p-6 backdrop-blur-2xl animate-in fade-in slide-in-from-top-4 duration-700 relative group">
                <button onClick={() => setAiAnalysis(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
                <div className="flex gap-4 items-start">
                    <div className="p-3 bg-[#D4AF37]/10 rounded-2xl text-[#D4AF37]"><BrainCircuit size={24} /></div>
                    <div className="flex-1">
                        <h3 className="text-[#D4AF37] font-bold mb-2 flex items-center gap-2">Analyse Stratégique Master AI ✨</h3>
                        <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{aiAnalysis}</div>
                    </div>
                </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden group hover:bg-white/[0.04] transition-all duration-500 hover:-translate-y-1">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-3xl"></div>
              <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Valeur Nette Totale</h2>
              <h1 className="text-4xl lg:text-5xl font-light text-white mb-4">{formatCurrency(portfolioTotal).replace(',00', '')}</h1>
              <div className="flex items-center gap-2 mb-8 bg-emerald-500/10 w-fit px-3 py-1.5 rounded-full border border-emerald-500/20">
                <ArrowUpRight className="text-emerald-400 w-4 h-4" />
                <span className="text-emerald-400 font-bold text-sm">+{formatCurrency(growthValue)} ({portfolioGrowth}%)</span>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-3xl p-8 backdrop-blur-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium">Évolution du Patrimoine</h2>
              </div>
              <div className="h-[220px] w-full">
                <svg viewBox="0 0 800 200" className="w-full h-full" preserveAspectRatio="none">
                  <path d="M0,150 C100,160 200,110 300,130 C400,150 500,90 600,110 C700,130 750,50 800,20" fill="none" stroke="#D4AF37" strokeWidth="3" />
                  <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D4AF37" /><stop offset="100%" stopColor="#D4AF37" stopOpacity="0" /></linearGradient></defs>
                </svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 backdrop-blur-2xl">
              <h2 className="text-lg font-medium mb-8">Répartition des Actifs</h2>
              <div className="space-y-2">
                {assetClasses.map((asset, i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center"><asset.icon size={20} className={asset.color} /></div>
                      <div><h3 className="text-sm font-medium">{asset.name}</h3><p className="text-xs text-slate-500">{asset.percentage}%</p></div>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(asset.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Chat IA Flottant */}
      {showAiChat && (
        <div className="fixed bottom-6 right-6 w-[400px] h-[600px] bg-[#030B17]/95 border border-[#D4AF37]/30 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl z-50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-900/40 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#D4AF37] rounded-xl flex items-center justify-center"><BrainCircuit size={20} className="text-[#030B17]" /></div>
                    <div>
                        <h4 className="font-bold text-sm">Master AI ✨</h4>
                        <p className="text-[10px] text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Stratégie active</p>
                    </div>
                </div>
                <button onClick={() => setShowAiChat(false)} className="p-2 hover:bg-white/5 rounded-lg">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600/20 border border-blue-500/30 text-white' : 'bg-white/5 border border-white/10 text-slate-200'}`}>{msg.text}</div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-5 border-t border-white/10 bg-black/20">
                <div className="relative">
                    <input 
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Votre question stratégique..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-[#D4AF37]/50 transition-all"
                    />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#D4AF37] hover:scale-110"><Send size={18} /></button>
                </div>
            </form>
        </div>
      )}

      {!showAiChat && (
          <button onClick={() => setShowAiChat(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-[#D4AF37] text-[#030B17] rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-40"><MessageSquare size={24} /></button>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(212, 175, 55, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
}
