import React, { useState, useEffect, useRef } from 'react';
import API from '../../services/api';
import {
  Sparkles,
  Send,
  User,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  Car,
  PieChart,
  BookOpen,
  ShoppingBag,
  Sliders,
  Scale,
  Receipt,
} from 'lucide-react';

function AIChatWorkspace({ user, currencySymbol = '₹' }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('WalletSphere AI is responding...');
  const [confidence, setConfidence] = useState('HIGH');
  const messagesEndRef = useRef(null);

  const userName = user?.fullName?.split(' ')[0] || 'Friend';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const suggestedQuestions = [
    { title: 'my food expenses', icon: ShoppingBag },
    { title: 'zomato spending', icon: Receipt },
    { title: 'Can I buy a car of 5 lakh if my salary is 80k per month?', icon: Car },
    { title: 'If I reduce my current expenses to 20k', icon: Sliders },
    { title: 'What is compound interest?', icon: BookOpen },
  ];

  const handleSendMessage = async (textToSend) => {
    const queryText = (textToSend || inputMessage).trim();
    if (!queryText || loading) return;

    // Fast UI Update: Immediate user message display & input clear
    const userMsg = { id: Date.now(), sender: 'user', text: queryText };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    // Contextual Loading State
    if (/food|spending|zomato|expenses|shopping|income/i.test(queryText)) {
      setLoadingText('Checking your WalletSphere transactions...');
    } else if (/car|bike|house|emi|afford|buy|salary|expenses/i.test(queryText)) {
      setLoadingText('Calculating scenario & cash flow...');
    } else {
      setLoadingText('WalletSphere AI is analyzing query...');
    }

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await API.post('/ai/chat', {
        message: queryText,
        conversationHistory: historyPayload,
      });

      const data = res.data.data;
      setConfidence(data.confidence || 'HIGH');

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: data.message,
        intent: data.intent,
        ui: data.ui || [],
        dataSources: data.dataSources || [],
        assumptions: data.assumptions || [],
      };

      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);
    } catch (error) {
      console.error('Error sending AI query:', error);
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: 'I encountered an issue processing your query. Please try again.',
        ui: [],
        dataSources: [],
        assumptions: [],
      };
      setMessages((prev) => [...prev, errorMsg]);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[550px] max-w-5xl mx-auto space-y-4 animate-fadeIn">
      
      {/* HEADER & CONFIDENCE BAR */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-950">✨ WalletSphere AI</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                HIGH-SPEED AI PIPELINE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Sub-second conversational assistant & instant financial scenario engine
            </p>
          </div>
        </div>

        {/* Assessment Confidence Indicator */}
        <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs self-start sm:self-auto">
          <ShieldCheck size={16} className={confidence === 'HIGH' ? 'text-emerald-600' : 'text-amber-500'} />
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Data Quality</span>
            <span className="font-extrabold text-slate-900">{confidence} Confidence</span>
          </div>
        </div>
      </div>

      {/* CHAT MESSAGES BODY */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 sm:p-6 overflow-y-auto space-y-6">
        
        {/* EMPTY STATE / SUGGESTED QUESTIONS */}
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-8">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
              <Sparkles size={32} />
            </div>

            <div className="max-w-md space-y-1">
              <h3 className="text-xl sm:text-2xl font-black text-slate-950">
                Good day, {userName} 👋
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Ask me anything — from "my food expenses" (<span className="text-emerald-700 font-bold">&lt; 50ms fast path</span>) to What-If car purchase scenarios.
              </p>
            </div>

            {/* Suggested Quick Questions Grid */}
            <div className="w-full max-w-xl space-y-2 text-left pt-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 block px-1">
                SUGGESTED SCENARIOS & QUESTIONS
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {suggestedQuestions.map((q) => {
                  const IconComp = q.icon;
                  return (
                    <button
                      key={q.title}
                      onClick={() => handleSendMessage(q.title)}
                      className="p-3 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 text-left transition cursor-pointer flex items-center gap-2.5 group"
                    >
                      <div className="w-7 h-7 rounded-xl bg-white text-slate-700 flex items-center justify-center border border-slate-200 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition">
                        <IconComp size={14} />
                      </div>
                      <span className="text-xs font-extrabold text-slate-800 leading-snug">
                        {q.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVE CHAT THREAD */
          <div className="space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles size={16} />
                  </div>
                )}

                <div className={`space-y-3 max-w-2xl ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Message Text Bubble */}
                  <div
                    className={`p-4 rounded-3xl text-xs leading-relaxed space-y-2 ${
                      msg.sender === 'user'
                        ? 'bg-slate-950 text-white font-medium rounded-tr-xs'
                        : 'bg-slate-50 border border-slate-200/80 text-slate-800 font-medium rounded-tl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-line font-medium leading-relaxed">
                      {msg.text}
                    </p>
                  </div>

                  {/* DYNAMIC UI BLOCKS */}
                  {msg.ui && msg.ui.map((block, bIdx) => {
                    if (block.type === 'spending_summary' && block.data) {
                      const s = block.data;
                      return (
                        <div key={bIdx} className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-2 animate-fadeIn">
                          <div className="flex items-center justify-between font-bold text-emerald-950">
                            <span className="flex items-center gap-1.5">
                              <Receipt size={15} className="text-emerald-600" /> Spending Summary: {s.category} ({s.period})
                            </span>
                            <span className="text-emerald-700 font-extrabold text-sm">{currencySymbol}{s.total.toLocaleString()}</span>
                          </div>
                          {s.largestTransaction && (
                            <p className="text-[11px] text-emerald-800 font-medium pt-0.5">
                              Largest expense: <b>{currencySymbol}{s.largestTransaction.amount.toLocaleString()}</b> at <b>{s.largestTransaction.merchant}</b> ({s.largestTransaction.date})
                            </p>
                          )}
                        </div>
                      );
                    }

                    if (block.type === 'scenario' && block.data) {
                      const s = block.data;
                      return (
                        <div key={bIdx} className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200 shadow-xs space-y-4 text-xs animate-fadeIn">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-200/80 pb-3 gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <TrendingUp size={16} className="text-emerald-700" />
                                <h4 className="font-extrabold text-emerald-950 text-sm">
                                  Scenario Analysis: {s.purchasePrice ? `${currencySymbol}${(s.purchasePrice / 100000).toFixed(1)} Lakh ${s.type.replace('_purchase', '').toUpperCase()}` : 'PURCHASE'}
                                </h4>
                              </div>
                              <p className="text-[11px] font-bold text-emerald-800 pt-0.5">
                                Overall Score: {s.score}/100 — <span className="text-slate-950 font-black">{s.overallVerdict}</span>
                              </p>
                            </div>

                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider self-start sm:self-auto ${
                                s.overallAssessment === 'HIGH RISK'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : s.overallAssessment === 'TIGHT'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {s.overallAssessment}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                            <span className="px-2.5 py-1 rounded-xl bg-white border border-emerald-200 text-slate-700">
                              Monthly Affordability: <b className="text-emerald-800">{s.monthlyAffordability}</b>
                            </span>
                            <span className="px-2.5 py-1 rounded-xl bg-white border border-emerald-200 text-slate-700">
                              Debt Load: <b className="text-emerald-800">{s.debtLoad}</b> ({s.totalDebtRatio}% total)
                            </span>
                            <span className="px-2.5 py-1 rounded-xl bg-white border border-emerald-200 text-slate-700">
                              Emergency Reserves: <b className="text-emerald-800">{s.emergencyPreparedness}</b> ({s.emergencyMonths} mo)
                            </span>
                          </div>

                          {s.overrides && s.overrides.length > 0 && (
                            <div className="p-2.5 rounded-2xl bg-amber-100/80 border border-amber-200 text-amber-950 font-medium text-[11px] flex items-center gap-2">
                              <Sliders size={14} className="text-amber-700 shrink-0" />
                              <span><b>User Scenario Overrides Applied:</b> {s.overrides.join(' • ')}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-900 pt-1">
                            <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80">
                              <span className="text-[10px] text-slate-500 block font-semibold">Purchase Price</span>
                              <b className="text-xs">{currencySymbol}{s.purchasePrice.toLocaleString()}</b>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80">
                              <span className="text-[10px] text-slate-500 block font-semibold">Down Payment</span>
                              <b className="text-xs">{currencySymbol}{s.downPayment.toLocaleString()}</b>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80">
                              <span className="text-[10px] text-slate-500 block font-semibold">Loan Amount</span>
                              <b className="text-xs">{currencySymbol}{s.loanAmount.toLocaleString()}</b>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80">
                              <span className="text-[10px] text-slate-500 block font-semibold">Tenure & Rate</span>
                              <b className="text-xs">{s.tenureLabel} @ {s.annualInterestRate}%</b>
                            </div>
                            <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300">
                              <span className="text-[10px] text-emerald-800 block font-bold">Monthly EMI</span>
                              <b className="text-xs text-emerald-950 font-black">{currencySymbol}{s.monthlyEMI.toLocaleString()}</b>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80">
                              <span className="text-[10px] text-slate-500 block font-semibold">Monthly Income</span>
                              <b className="text-xs">{currencySymbol}{s.monthlyIncome.toLocaleString()}</b>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80">
                              <span className="text-[10px] text-slate-500 block font-semibold">Scenario Expenses</span>
                              <b className="text-xs">{currencySymbol}{s.monthlyExpenses.toLocaleString()}</b>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80">
                              <span className="text-[10px] text-slate-500 block font-semibold">Existing EMIs</span>
                              <b className="text-xs">{currencySymbol}{s.existingEMIs.toLocaleString()}</b>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80">
                              <span className="text-[10px] text-slate-500 block font-semibold">Free Cash Flow After</span>
                              <b className={`text-xs ${s.freeCashFlowAfter < 5000 ? 'text-rose-600 font-black' : 'text-emerald-700 font-black'}`}>
                                {currencySymbol}{s.freeCashFlowAfter.toLocaleString()}/mo
                              </b>
                            </div>
                          </div>

                          {s.optionB && (
                            <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-1 text-[11px]">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                <Scale size={14} className="text-emerald-600" /> {s.optionB.title}
                              </div>
                              <p className="text-slate-600">
                                Monthly EMI: <b>{currencySymbol}{s.optionB.monthlyEMI.toLocaleString()}</b> | Remaining Cash Flow: <b>{currencySymbol}{s.optionB.freeCashFlowAfter.toLocaleString()}</b>
                              </p>
                              <p className="text-[10px] text-emerald-800 font-semibold">
                                ✓ {s.optionB.advantage} ({s.optionB.tradeoff})
                              </p>
                            </div>
                          )}

                        </div>
                      );
                    }

                    return null;
                  })}

                  {/* Evidence Sources Footer */}
                  {msg.sender === 'ai' && msg.dataSources?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 font-medium pt-1">
                      <span className="font-bold text-slate-500">Based on:</span>
                      {msg.dataSources.map((src, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                          • {src}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-2xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 items-center text-xs text-slate-400 font-semibold animate-pulse">
                <div className="w-8 h-8 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                  <RefreshCw size={16} className="animate-spin" />
                </div>
                <span>{loadingText}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

      </div>

      {/* INPUT FORM BAR WITH DOUBLE SUBMISSION PREVENTION */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-2.5 sm:p-3 shadow-xs flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputMessage}
          disabled={loading}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask WalletSphere... (e.g. 'my food expenses' or 'Can I buy a 5 lakh car?')"
          className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl focus:bg-white focus:border-emerald-500 focus:outline-none transition disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={!inputMessage.trim() || loading}
          className="p-3 rounded-xl sm:rounded-2xl bg-slate-950 text-white hover:bg-emerald-600 transition cursor-pointer disabled:opacity-40 shrink-0"
        >
          <Send size={15} />
        </button>
      </form>

    </div>
  );
}

export default AIChatWorkspace;
