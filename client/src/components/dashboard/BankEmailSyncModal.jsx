import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import API from '../../services/api';
import { X, Mail, CheckCircle2, AlertCircle, RefreshCw, Zap, FileText, ArrowRight, ShieldCheck } from 'lucide-react';

function BankEmailSyncModal({ isOpen, onClose, onSyncComplete }) {
  const [activeTab, setActiveTab] = useState('gmail'); // 'gmail' | 'paste'
  const [loading, setLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState('');

  // Tab 2: Raw Text Paste state
  const [rawText, setRawText] = useState('');
  const [parsedPreview, setParsedPreview] = useState(null);

  const executeGmailSync = async (accessToken) => {
    setLoading(true);
    setError('');
    setSyncResult(null);

    try {
      const res = await API.post('/bank-sync/sync-gmail', {
        googleAccessToken: accessToken,
      });

      // Cache token for future silent syncs
      localStorage.setItem('walletsphere_google_access_token', accessToken);
      setSyncResult(res.data);
      setLoading(false);
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      console.error('Gmail Bank Sync Error:', err);
      // If token expired, clear cached token and trigger popup login
      localStorage.removeItem('walletsphere_google_access_token');
      triggerGmailSync();
    }
  };

  // 1-Click Gmail Sync popup fallback if no valid session token exists
  const triggerGmailSync = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    onSuccess: (tokenResponse) => {
      executeGmailSync(tokenResponse.access_token);
    },
    onError: (err) => {
      console.error('Google Permission Error:', err);
      setError('Google authorization was cancelled or failed.');
      setLoading(false);
    },
  });

  const handleScanGmailClick = () => {
    const cachedToken = localStorage.getItem('walletsphere_google_access_token');
    if (cachedToken) {
      executeGmailSync(cachedToken);
    } else {
      triggerGmailSync();
    }
  };

  const handleParseRawText = async (autoSave = false) => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError('');
    setParsedPreview(null);

    try {
      const res = await API.post('/bank-sync/parse-raw', {
        rawText,
        autoSave,
      });

      if (autoSave) {
        setSyncResult({
          message: 'Transaction parsed & imported successfully!',
          data: { syncedCount: 1, transactionsAdded: [res.data.data.createdTransaction] },
        });
        setRawText('');
        if (onSyncComplete) onSyncComplete();
      } else {
        setParsedPreview(res.data.data.parsed);
      }
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not parse bank transaction from text.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col text-white">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">Bank Email Alert Sync</h3>
              <p className="text-xs text-slate-400">Auto-detect & parse HDFC, ICICI, SBI, Paytm, UPI transactions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-950/80 border-b border-slate-800 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('gmail'); setError(''); setSyncResult(null); }}
            className={`py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'gmail'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Zap size={15} />
            <span>1-Click Gmail Sync</span>
          </button>

          <button
            onClick={() => { setActiveTab('paste'); setError(''); setSyncResult(null); }}
            className={`py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <FileText size={15} />
            <span>Paste Alert Snippet</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: GMAIL SYNC */}
          {activeTab === 'gmail' && (
            <div className="space-y-5">
              <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <ShieldCheck size={16} />
                  <span>Secure Read-Only Access</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  WalletSphere scans <strong>only bank transaction alerts</strong> from senders like HDFC, ICICI, SBI, Axis, Paytm, and UPI. Your private emails are never stored or read.
                </p>
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-semibold text-slate-400">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700">HDFC Bank</span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700">ICICI Bank</span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700">SBI</span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700">Axis</span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700">Paytm / UPI</span>
                </div>
              </div>

              {!syncResult ? (
                <button
                  onClick={handleScanGmailClick}
                  disabled={loading}
                  className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Scanning Gmail for Bank Emails...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={18} />
                      <span>Scan Gmail for Bank Transaction Alerts</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 size={18} />
                    <span>{syncResult.message}</span>
                  </div>
                  {syncResult.data?.transactionsAdded?.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-emerald-500/20 max-h-48 overflow-y-auto pr-1">
                      {syncResult.data.transactionsAdded.map((tx, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-900/90 p-2.5 rounded-xl text-xs">
                          <div>
                            <p className="font-semibold text-slate-200">{tx.merchant}</p>
                            <p className="text-[10px] text-slate-400">{tx.category} • {new Date(tx.date).toLocaleDateString()}</p>
                          </div>
                          <span className={`font-bold ${tx.type === 'income' || tx.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {tx.type === 'income' || tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setSyncResult(null)}
                    className="w-full mt-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Scan Again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PASTE & PARSE RAW TEXT */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Paste Bank Email or SMS Alert Text:
                </label>
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="e.g. Rs 450.00 debited from A/C XX1234 on 24-SEP-26 to ZOMATO. Avail Bal: Rs 12,450.00"
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3.5 text-xs text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none transition resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleParseRawText(false)}
                  disabled={loading || !rawText.trim()}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Parsing...' : 'Preview Extracted Details'}
                </button>

                <button
                  onClick={() => handleParseRawText(true)}
                  disabled={loading || !rawText.trim()}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-900/30"
                >
                  <span>Import Directly</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {parsedPreview && (
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold text-slate-200 border-b border-slate-700/80 pb-2">
                    <span>Parsed Result:</span>
                    <span className={`text-sm ${parsedPreview.type === 'income' || parsedPreview.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {parsedPreview.type === 'income' || parsedPreview.type === 'credit' ? '+' : '-'}₹{parsedPreview.amount}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div><span className="text-slate-500">Merchant:</span> {parsedPreview.merchant}</div>
                    <div><span className="text-slate-500">Category:</span> {parsedPreview.category}</div>
                    <div><span className="text-slate-500">Bank:</span> {parsedPreview.bankName}</div>
                    <div><span className="text-slate-500">Type:</span> {parsedPreview.type.toUpperCase()}</div>
                  </div>
                </div>
              )}

              {syncResult && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{syncResult.message}</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
          <span>Protected by WalletSphere Bank Parsing Engine</span>
          <button onClick={onClose} className="hover:text-slate-300 font-semibold cursor-pointer">
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

export default BankEmailSyncModal;
