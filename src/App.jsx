import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutDashboard, LineChart as ChartIcon, Wallet, Building, Bitcoin, 
  ArrowUpRight, ArrowDownRight, Settings, LogOut, Bell, Search, 
  ChevronRight, Sparkles, MessageSquare, Send, Loader2, BrainCircuit,
  Eye, EyeOff, Euro, DollarSign, RefreshCw, Filter, Percent, AlertTriangle,
  TrendingUp, PieChart, Landmark, Smartphone, CheckCircle2, Link2, X
} from 'lucide-react';

// ============================================================================
// 1. SCHÉMAS DE DONNÉES (Typescript conceptuel pour le Backend)
// ============================================================================
/*
type Currency = 'EUR' | 'USD' | 'BTC' | 'ETH';
type StrategyTag = 'Toutes' | 'Retraite' | 'Degen' | 'Bon père de famille';

interface Transaction {
  id: string;
  assetId: string;
  amount: number;
  priceAtExecution: number;
  date: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND' | 'FEE';
}

interface DeFiPosition {
  protocol: string;
  tvl: number; // Valeur bloquée
  unclaimedRewards: number;
  impermanentLoss: number;
}

interface Asset {
  id: string;
  name: string;
  category: 'RealEstate' | 'Stock' | 'Crypto' | 'DeFi' | 'NFT' | 'Cash';
  currentValue: number;
  pru: number; // Prix de Revient Unitaire
  ter?: number; // Total Expense Ratio (Frais de gestion)
  isPrimaryResidence?: boolean;
  strategy: StrategyTag;
  defiDetails?: DeFiPosition;
  nftFloorPrice?: number;
}

interface PortfolioSummary {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  irr: number; // Internal Rate of Return (TRI)
  projectedFees20y: number;
  dividends: { expected: number; realized: number; yieldOnCost: number };
}
*/

// ============================================================================
// 2. MOTEURS DE CALCUL (Services Mathématiques)
// ============================================================================

/**
 * Calcule le TRI (Taux de Rendement Interne) via la méthode de Newton-Raphson.
 * @param {number[]} cashflows - Tableau des flux (négatif = investissement, positif = retrait/valeur finale)
 * @returns {number} TRI en pourcentage
 */
const calculateIRR = (cashflows, guess = 0.1) => {
  const maxTries = 100;
  const delta = 0.00001;
  let irr = guess;

  for (let i = 0; i < maxTries; i++) {
    let npv = 0;
    let derivativeNpv = 0;
    for (let t = 0; t < cashflows.length; t++) {
      npv += cashflows[t] / Math.pow(1 + irr, t);
      if (t > 0) {
        derivativeNpv -= (t * cashflows[t]) / Math.pow(1 + irr, t + 1);
      }
    }
    const newIrr = irr - npv / derivativeNpv;
    if (Math.abs(newIrr - irr) < delta) return newIrr * 100;
    irr = newIrr;
  }
  return irr * 100; // Approximation si non-convergence
};

/**
 * Calcule l'Impermanent Loss pour un pool de liquidité (AMM 50/50).
 * @param {number} priceRatio - Ratio d'évolution des prix (NouveauPrix / AncienPrix)
 * @returns {number} Perte en pourcentage (ex: -5.7%)
 */
const calculateImpermanentLoss = (priceRatio) => {
  const il = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
  return il * 100;
};

// ============================================================================
// 3. COMPOSANT PRINCIPAL (UI & LOGIQUE D'ÉTAT)
// ============================================================================

export default function App() {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState('EUR');
  const [activeStrategy, setActiveStrategy] = useState('Toutes');
  const [includePrimaryRes, setIncludePrimaryRes] = useState(true);

  // IA Chat States
  const [showAiChat, setShowAiChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const chatEndRef = useRef(null);

  // Intégrations States (Mock)
  const [integrations, setIntegrations] = useState({
    binance: true,
    plaid: false,
    tradeRepublic: false,
  });
  const [showTRModal, setShowTRModal] = useState(false);
  const [trToken, setTrToken] = useState('');
  const [isConnectingTR, setIsConnectingTR] = useState(false);

  // --- MOCK DATA ÉTENDUE ---
  const mockAssets = useMemo(() => [
    { id: '1', name: 'Résidence Principale (Paris)', category: 'RealEstate', value: 850000, isPrimaryResidence: true, strategy: 'Bon père de famille' },
    { id: '2', name: 'SCPI Corum XL', category: 'RealEstate', value: 50000, isPrimaryResidence: false, strategy: 'Retraite', ter: 0.012 },
    { id: '3', name: 'ETF S&P 500 (PEA)', category: 'Stock', value: 120500, pru: 95000, strategy: 'Retraite', ter: 0.0015 },
    { id: '4', name: 'LVMH (CT)', category: 'Stock', value: 45000, pru: 32000, strategy: 'Bon père de famille' },
    { id: '5', name: 'Bitcoin (Cold Wallet)', category: 'Crypto', value: 85000, pru: 42000, strategy: 'Degen' },
    { id: '6', name: 'Uniswap ETH/USDC', category: 'DeFi', value: 25000, pru: 25000, strategy: 'Degen', defiDetails: { tvl: 25000, unclaimedRewards: 450, impermanentLoss: calculateImpermanentLoss(1.5) } },
    { id: '7', name: 'Bored Ape Yacht Club', category: 'NFT', value: 35000, pru: 50000, strategy: 'Degen', nftFloorPrice: 11.5 }, // Floor in ETH
    { id: '8', name: 'Cash (Livret A)', category: 'Cash', value: 22950, strategy: 'Bon père de famille' }
  ], []);

  const liabilities = 350000; // Emprunt immobilier

  // --- LOGIQUE DE CONVERSION & FORMATAGE ---
  const exchangeRates = { EUR: 1, USD: 1.08, BTC: 0.000016, ETH: 0.00032 };
  const currencySymbols = { EUR: '€', USD: '$', BTC: '₿', ETH: 'Ξ' };

  const formatValue = (valueInEur, isPercent = false) => {
    if (isPrivacyMode) return isPercent ? '••• %' : '••••••';
    
    if (isPercent) return `${valueInEur.toFixed(2)} %`;

    const converted = valueInEur * exchangeRates[baseCurrency];
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: baseCurrency,
      minimumFractionDigits: baseCurrency === 'BTC' || baseCurrency === 'ETH' ? 4 : 0,
      maximumFractionDigits: baseCurrency === 'BTC' || baseCurrency === 'ETH' ? 4 : 0
    }).format(converted).replace(baseCurrency, currencySymbols[baseCurrency]);
  };

  // --- CALCULS AGRÉGÉS (Kpis) ---
  const filteredAssets = mockAssets.filter(a => 
    (activeStrategy === 'Toutes' || a.strategy === activeStrategy) &&
    (includePrimaryRes || !a.isPrimaryResidence)
  );

  const totalAssets = filteredAssets.reduce((sum, a) => sum + a.value, 0);
  const activeLiabilities = includePrimaryRes ? liabilities : 0; // Simplification : on exclut le passif si on exclut la RP
  const netWorth = totalAssets - activeLiabilities;
  
  const totalInvested = filteredAssets.reduce((sum, a) => sum + (a.pru || a.value), 0);
  const unrealizedGains = totalAssets - totalInvested;
  
  // Simulation d'un calcul de TRI basé sur des flux fictifs
  const mockCashflows = [-800000, -50000, -20000, totalAssets]; 
  const calculatedIrr = calculateIRR(mockCashflows, 0.08);

  // Projection des frais (TER) sur 20 ans
  const annualFees = filteredAssets.reduce((sum, a) => sum + (a.value * (a.ter || 0)), 0);
  const projectedFees20y = annualFees * 20 * 1.5; // Simplification (intérêts composés sur manque à gagner)

  // Handlers pour les paramètres
  const handleConnectTradeRepublic = (e) => {
    e.preventDefault();
    setIsConnectingTR(true);
    // Simulation d'un appel API pour vérifier le token
    setTimeout(() => {
      setIsConnectingTR(false);
      setIntegrations(prev => ({ ...prev, tradeRepublic: true }));
      setShowTRModal(false);
      setTrToken('');
    }, 1500);
  };

  const handleDisconnectTradeRepublic = () => {
    setIntegrations(prev => ({ ...prev, tradeRepublic: false }));
  };

  // ============================================================================
  // RENDUS DES ONGLETS (TABS)
  // ============================================================================

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPIs Principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Net Worth */}
        <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden group hover:bg-white/[0.04] transition-all duration-500">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-3xl group-hover:bg-[#D4AF37]/20 transition-all duration-700"></div>
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Patrimoine Net</h2>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-500 flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                <input 
                  type="checkbox" 
                  checked={includePrimaryRes} 
                  onChange={(e) => setIncludePrimaryRes(e.target.checked)}
                  className="accent-[#D4AF37]"
                />
                Inclure Résidence Principale
              </label>
            </div>
          </div>
          <h1 className={`text-4xl lg:text-5xl font-light text-white mb-4 ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>
            {formatValue(netWorth)}
          </h1>
          <div className="flex gap-6 mt-6 pt-6 border-t border-white/5">
            <div>
              <p className="text-xs text-slate-500 mb-1">Actifs Bruts</p>
              <p className="text-sm font-medium text-slate-200">{formatValue(totalAssets)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Passifs (Emprunts)</p>
              <p className="text-sm font-medium text-rose-400">-{formatValue(activeLiabilities)}</p>
            </div>
          </div>
        </div>

        {/* TRI (IRR) */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-2xl flex flex-col justify-between hover:bg-white/[0.04] transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">TRI (Rendement Réel)</h3>
            <p className="text-2xl font-light text-white">{formatValue(calculatedIrr, true)}</p>
          </div>
          <p className="text-xs text-slate-500 mt-4">Méthode Newton-Raphson intégrant tous les flux de capitaux.</p>
        </div>

        {/* Frais Latents */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-2xl flex flex-col justify-between hover:bg-white/[0.04] transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Frais Projetés (20 ans)</h3>
            <p className="text-2xl font-light text-rose-400">-{formatValue(projectedFees20y)}</p>
          </div>
          <p className="text-xs text-slate-500 mt-4">Manque à gagner calculé sur la base des TER de vos fonds.</p>
        </div>
      </div>

      {/* Reste du dashboard (simplifié pour l'espace) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 backdrop-blur-2xl">
          <h2 className="text-lg font-medium mb-6 flex items-center gap-2"><PieChart size={18} className="text-[#D4AF37]" /> Répartition par Silo</h2>
          <div className="space-y-4">
            {['Bon père de famille', 'Retraite', 'Degen'].map(strat => {
              const stratValue = mockAssets.filter(a => a.strategy === strat).reduce((s, a) => s + a.value, 0);
              const percentage = ((stratValue / totalAssets) * 100).toFixed(1);
              return (
                <div key={strat} className="flex justify-between items-center p-3 hover:bg-white/5 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div>
                    <span className="text-sm font-medium">{strat}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white">{formatValue(stratValue)}</p>
                    <p className="text-xs text-slate-500">{isPrivacyMode ? '•••' : percentage}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAssets = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 backdrop-blur-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-white">Inventaire Détaillé</h2>
          <button className="flex items-center gap-2 text-sm text-[#D4AF37] hover:underline">
            <RefreshCw size={14} /> Synchroniser APIs
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-slate-500">
                <th className="pb-4 font-medium">Actif</th>
                <th className="pb-4 font-medium">Stratégie</th>
                <th className="pb-4 font-medium text-right">PRU / Investi</th>
                <th className="pb-4 font-medium text-right">Valeur Actuelle</th>
                <th className="pb-4 font-medium text-right">Plus-value</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/5">
              {filteredAssets.map(asset => {
                const invested = asset.pru || asset.value;
                const pnl = asset.value - invested;
                const pnlPercent = (pnl / invested) * 100;
                
                return (
                  <tr key={asset.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 flex flex-col">
                      <span className="font-medium text-slate-200">{asset.name}</span>
                      {asset.defiDetails && (
                        <span className="text-[10px] text-blue-400 mt-1 flex items-center gap-1">
                          IL: {formatValue(asset.defiDetails.impermanentLoss, true)} | Rewards: {formatValue(asset.defiDetails.unclaimedRewards)}
                        </span>
                      )}
                      {asset.nftFloorPrice && (
                        <span className="text-[10px] text-purple-400 mt-1">Floor: {asset.nftFloorPrice} ETH</span>
                      )}
                    </td>
                    <td className="py-4">
                      <span className="px-2 py-1 bg-white/5 rounded-md text-xs text-slate-400">{asset.strategy}</span>
                    </td>
                    <td className="py-4 text-right text-slate-400">{formatValue(invested)}</td>
                    <td className="py-4 text-right font-medium text-white">{formatValue(asset.value)}</td>
                    <td className="py-4 text-right">
                      {pnl !== 0 ? (
                        <span className={`font-medium ${pnl > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pnl > 0 ? '+' : ''}{formatValue(pnl)} <span className="text-xs opacity-70">({formatValue(pnlPercent, true)})</span>
                        </span>
                      ) : <span className="text-slate-500">-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Benchmarking Chart */}
      <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 backdrop-blur-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium">Benchmarking : Portfolio vs Indices</h2>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div> Portfolio</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> S&P 500</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> BTC</span>
          </div>
        </div>
        <div className="h-[300px] w-full relative">
          {/* Mockup d'un graphique multi-lignes */}
          <svg viewBox="0 0 800 300" className="w-full h-full" preserveAspectRatio="none">
            {/* Grille */}
            {[1,2,3].map(i => <line key={i} x1="0" y1={i*75} x2="800" y2={i*75} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />)}
            {/* BTC (Volatile) */}
            <path d="M0,250 C100,280 200,100 300,180 C400,90 500,220 600,80 C700,40 750,150 800,20" fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />
            {/* SP500 (Stable) */}
            <path d="M0,250 C100,240 200,220 300,200 C400,180 500,150 600,120 C700,90 750,70 800,50" fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0.6" />
            {/* Portfolio (Master) */}
            <path d="M0,250 C100,245 200,200 300,190 C400,150 500,140 600,100 C700,80 750,60 800,30" fill="none" stroke="#D4AF37" strokeWidth="4" filter="drop-shadow(0 0 8px rgba(212,175,55,0.4))" />
          </svg>
        </div>
      </div>

      {/* Calendrier des Dividendes */}
      <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 backdrop-blur-2xl">
        <h2 className="text-lg font-medium mb-6">Calendrier des Revenus Passifs (Dividendes & Loyers)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
            <p className="text-xs text-slate-400 mb-1">Yield on Cost Global</p>
            <p className="text-xl font-medium text-[#D4AF37]">{isPrivacyMode ? '••• %' : '4.2 %'}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
            <p className="text-xs text-slate-400 mb-1">Revenus Réalisés (YTD)</p>
            <p className="text-xl font-medium text-white">{formatValue(12450)}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
            <p className="text-xs text-slate-400 mb-1">Revenus Projetés (Fin d'année)</p>
            <p className="text-xl font-medium text-slate-300">{formatValue(18500)}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 backdrop-blur-2xl">
        <h2 className="text-xl font-medium text-white mb-2">Comptes & Intégrations</h2>
        <p className="text-sm text-slate-400 mb-8">Connectez vos courtiers et portefeuilles pour une synchronisation automatique de vos actifs via l'API (Lecture seule).</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card Trade Republic */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between transition-all duration-300 ${integrations.tradeRepublic ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5 hover:border-[#D4AF37]/50'}`}>
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
                   {/* Logo Placeholder pour Trade Republic */}
                   <span className="font-bold text-black text-xl">TR</span>
                </div>
                {integrations.tradeRepublic && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded-md">
                    <CheckCircle2 size={14} /> Connecté
                  </span>
                )}
              </div>
              <h3 className="text-lg font-medium text-white mb-1">Trade Republic</h3>
              <p className="text-xs text-slate-400 mb-6">Actions, ETF, Crypto</p>
            </div>
            
            {integrations.tradeRepublic ? (
              <button 
                onClick={handleDisconnectTradeRepublic}
                className="w-full py-2.5 rounded-xl border border-rose-500/30 text-rose-400 text-sm font-medium hover:bg-rose-500/10 transition-colors"
              >
                Déconnecter
              </button>
            ) : (
              <button 
                onClick={() => setShowTRModal(true)}
                className="w-full py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-[#D4AF37] hover:text-black transition-all flex items-center justify-center gap-2"
              >
                <Link2 size={16} /> Lier le compte
              </button>
            )}
          </div>

          {/* Card Binance (Exemple d'une intégration déjà active) */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between transition-all duration-300 ${integrations.binance ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#FCD535] flex items-center justify-center">
                   <Bitcoin size={28} className="text-black" />
                </div>
                {integrations.binance && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded-md">
                    <CheckCircle2 size={14} /> Connecté
                  </span>
                )}
              </div>
              <h3 className="text-lg font-medium text-white mb-1">Binance</h3>
              <p className="text-xs text-slate-400 mb-6">Exchange Web3</p>
            </div>
            <button 
              onClick={() => setIntegrations(prev => ({ ...prev, binance: false }))}
              className="w-full py-2.5 rounded-xl border border-rose-500/30 text-rose-400 text-sm font-medium hover:bg-rose-500/10 transition-colors"
            >
              Déconnecter
            </button>
          </div>

          {/* Card Banque Traditionnelle (Ex: Plaid) */}
          <div className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-[#D4AF37]/50 flex flex-col justify-between transition-all duration-300">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                   <Landmark size={24} className="text-white" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-1">Banques & Open Banking</h3>
              <p className="text-xs text-slate-400 mb-6">Plaid / Bridge / Powens</p>
            </div>
            <button className="w-full py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-[#D4AF37] hover:text-black transition-all flex items-center justify-center gap-2">
              <Link2 size={16} /> Lier le compte
            </button>
          </div>

        </div>
      </div>

      {/* Modal Trade Republic */}
      {showTRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0A1121] border border-[#D4AF37]/30 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setShowTRModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0">
                <span className="font-bold text-black text-xl">TR</span>
              </div>
              <div>
                <h3 className="text-xl font-medium text-white">Connexion Trade Republic</h3>
                <p className="text-xs text-slate-400">Synchronisation sécurisée en lecture seule</p>
              </div>
            </div>

            <form onSubmit={handleConnectTradeRepublic} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Token d'accès API (Session ID)</label>
                <input 
                  type="text" 
                  value={trToken}
                  onChange={(e) => setTrToken(e.target.value)}
                  placeholder="Ex: eyJhbGciOiJIUzI1NiIsInR5cCI6..." 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37] text-white font-mono placeholder:text-slate-600 transition-all"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-2">
                  Trade Republic n'offre pas d'API publique officielle. Vous devez récupérer votre token de session depuis les requêtes réseau de l'application web.
                </p>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={isConnectingTR || !trToken}
                  className="w-full py-3 rounded-xl bg-[#D4AF37] text-black font-bold text-sm hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnectingTR ? (
                    <><Loader2 size={18} className="animate-spin" /> Connexion en cours...</>
                  ) : (
                    <><CheckCircle2 size={18} /> Autoriser l'accès</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030B17] text-slate-100 font-sans overflow-hidden flex selection:bg-[#D4AF37] selection:text-[#030B17]">
      {/* Arrière-plan animé Liquid Glass */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#D4AF37]/10 blur-[150px] animate-pulse" style={{ animationDuration: '12s' }}></div>
      </div>

      {/* Sidebar Navigation */}
      <aside className="relative z-10 w-64 h-screen p-6 flex flex-col border-r border-white/5 bg-[#030B17]/40 backdrop-blur-3xl hidden md:flex">
        <div className="flex items-center gap-3 mb-10 group cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#A08020] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
            <span className="font-bold text-[#030B17] text-xl tracking-tighter">MP</span>
          </div>
          <span className="font-semibold text-lg tracking-wide text-white/90">MasterInvest</span>
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
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                activeTab === item.id 
                  ? 'bg-blue-900/30 text-[#D4AF37] border border-[#D4AF37]/30 shadow-inner' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={18} />
              <span className="font-medium text-sm">{item.name}</span>
            </button>
          ))}
        </nav>

        {/* Toggles Système (Privacy & Devise) */}
        <div className="mb-6 space-y-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
          <button 
            onClick={() => setIsPrivacyMode(!isPrivacyMode)}
            className="w-full flex items-center justify-between text-sm text-slate-300 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">{isPrivacyMode ? <EyeOff size={16}/> : <Eye size={16}/>} Mode Discret</span>
            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isPrivacyMode ? 'bg-[#D4AF37]' : 'bg-slate-600'}`}>
              <div className={`w-3 h-3 bg-[#030B17] rounded-full shadow-md transform transition-transform ${isPrivacyMode ? 'translate-x-4' : ''}`}></div>
            </div>
          </button>
          
          <div className="flex items-center justify-between pt-3 border-t border-white/10 text-sm text-slate-300">
            <span className="flex items-center gap-2"><Euro size={16} /> Devise</span>
            <select 
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="bg-black/50 border border-white/20 rounded-md text-xs py-1 px-2 focus:outline-none focus:border-[#D4AF37] text-white"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="BTC">BTC (₿)</option>
              <option value="ETH">ETH (Ξ)</option>
            </select>
          </div>
        </div>

        {/* Boutons du bas */}
        <div className="space-y-2 pt-4 border-t border-white/10">
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              activeTab === 'settings' 
                ? 'bg-blue-900/30 text-[#D4AF37] border border-[#D4AF37]/30 shadow-inner' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings size={18} />
            <span className="font-medium text-sm">Paramètres</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={18} />
            <span className="font-medium text-sm">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 h-screen overflow-y-auto p-6 lg:p-10 scroll-smooth">
        {/* Header avec Filtre de Stratégie (Sauf dans Paramètres) */}
        <header className="flex justify-between items-center mb-10 pb-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-light text-white capitalize">
              {activeTab === 'dashboard' ? 'Vue Globale' : 
               activeTab === 'assets' ? 'Mes Actifs' : 
               activeTab === 'perf' ? 'Performances' : 'Paramètres'}
            </h1>
            
            {activeTab !== 'settings' && (
              <>
                <div className="h-6 w-px bg-white/20 mx-2"></div>
                <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-full px-3 py-1.5 backdrop-blur-md">
                  <Filter size={14} className="text-slate-400" />
                  <select 
                    value={activeStrategy}
                    onChange={(e) => setActiveStrategy(e.target.value)}
                    className="bg-transparent text-sm text-slate-200 focus:outline-none appearance-none cursor-pointer pr-4"
                  >
                    <option value="Toutes">Toutes les poches</option>
                    <option value="Bon père de famille">Poche 'Bon père de famille'</option>
                    <option value="Retraite">Poche 'Retraite'</option>
                    <option value="Degen">Poche 'Degen' (Crypto/DeFi)</option>
                  </select>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center hover:bg-white/10 relative transition-colors">
              <Bell size={18} className="text-slate-300" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#D4AF37] rounded-full shadow-[0_0_8px_rgba(212,175,55,0.8)]"></span>
            </button>
            <div className="h-10 w-10 rounded-full border-2 border-[#D4AF37]/40 bg-cover bg-center" style={{backgroundImage: 'url("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop")'}}></div>
          </div>
        </header>

        {/* Dynamic View Rendering */}
        <div className="max-w-7xl mx-auto pb-12">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'assets' && renderAssets()}
          {activeTab === 'perf' && renderPerformance()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </main>
    </div>
  );
}
