import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Check,
  Key,
  Edit2,
  Sparkles,
} from 'lucide-react';
import API from '../../services/api';

const CATEGORIES = [
  'Food',
  'Shopping',
  'Travel',
  'Entertainment',
  'Bills',
  'Healthcare',
  'Salary',
  'Investment',
  'Transfer & Reimbursement',
  'Others',
];

function ImportModal({ isOpen, onClose, onImportComplete, currencySymbol = '₹' }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'review' | 'success'
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Review Table Data State
  const [reviewData, setReviewData] = useState({
    totalParsed: 0,
    candidateCount: 0,
    duplicateCount: 0,
    candidates: [],
    duplicates: [],
  });

  const [savedRuleFlags, setSavedRuleFlags] = useState({}); // { [tempId]: true/false }
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError('');
    setRequiresPassword(false);
    setPassword('');
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    
    if (!['csv', 'xlsx', 'xls', 'pdf'].includes(ext)) {
      setError('Please upload a valid CSV, XLSX, or PDF bank statement file.');
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      setError('File size exceeds the 15 MB limit.');
      return;
    }

    if (ext === 'pdf') {
      setRequiresPassword(true);
    }

    setFile(selectedFile);
  };

  // STEP 1 -> STEP 2: PARSE FILE AND OPEN REVIEW SCREEN
  const handleParseStatement = async (e) => {
    if (e) e.preventDefault();
    if (!file) {
      return setError('Please select or drop a bank statement file (CSV, XLSX, PDF) first.');
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (password) {
        formData.append('password', password);
      }

      const res = await API.post('/transactions/import/parse', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setLoading(false);
      setReviewData(res.data.data);

      // Initialize Rule Memory Checkboxes for transfers or modified entries
      const flags = {};
      res.data.data.candidates.forEach((cand) => {
        flags[cand.tempId] = cand.type === 'transfer' || cand.category === 'Transfer & Reimbursement';
      });
      setSavedRuleFlags(flags);

      setStep('review');
    } catch (err) {
      setLoading(false);
      if (err.response?.status === 401 && err.response?.data?.status === 'password_required') {
        setRequiresPassword(true);
        setError('This PDF statement is password protected. Please enter password below to unlock.');
      } else {
        setError(
          err.response?.data?.message ||
          'Failed to process bank statement file. Please make sure it is a valid statement.'
        );
      }
    }
  };

  // Handle Editing Category / Type in Review Table
  const handleCandidateChange = (tempId, field, value) => {
    setReviewData((prev) => ({
      ...prev,
      candidates: prev.candidates.map((cand) => {
        if (cand.tempId === tempId) {
          const updated = { ...cand, [field]: value };
          if (field === 'type' && value === 'transfer') {
            updated.category = 'Transfer & Reimbursement';
            updated.isExcludedFromSummary = true;
          }
          return updated;
        }
        return cand;
      }),
    }));
  };

  const handleToggleRuleFlag = (tempId) => {
    setSavedRuleFlags((prev) => ({
      ...prev,
      [tempId]: !prev[tempId],
    }));
  };

  // STEP 2 -> STEP 3: CONFIRM IMPORT & SAVE MEMORY RULES
  const handleConfirmImport = async () => {
    if (reviewData.candidates.length === 0) {
      return setError('No candidate transactions available to import.');
    }

    setLoading(true);
    setError('');

    try {
      // Build rules array to save in MongoDB memory
      const saveRules = [];
      reviewData.candidates.forEach((cand) => {
        if (savedRuleFlags[cand.tempId]) {
          // Extract key merchant/contact word (e.g. "Alex Sharma" from "UPI/12345/Alex Sharma")
          const cleanKeyword = cand.description
            .replace(/(upi|ach|neft|rtgs|imps|\d{5,})/gi, '')
            .replace(/[^\w\s]/g, ' ')
            .trim();

          if (cleanKeyword.length >= 3) {
            saveRules.push({
              keyword: cleanKeyword,
              category: cand.category,
              type: cand.type,
            });
          }
        }
      });

      const res = await API.post('/transactions/import/confirm', {
        transactions: reviewData.candidates,
        saveRules,
      });

      setLoading(false);
      setImportResult(res.data.data);
      onImportComplete();
      setStep('success');
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Failed to confirm statement import.');
    }
  };

  const handleResetModal = () => {
    setStep('upload');
    setFile(null);
    setPassword('');
    setRequiresPassword(false);
    setError('');
    setImportResult(null);
    onClose();
  };

  const getFileExtension = (name) => {
    if (!name) return 'CSV';
    return name.split('.').pop().toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sm:py-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">
              IMPORT
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-950 mt-0.5">
              {step === 'review'
                ? 'Review Parsed Statement'
                : step === 'success'
                ? 'Import Summary'
                : 'Import Bank Statement'}
            </h3>
            <p className="text-xs text-slate-500">
              {step === 'review'
                ? 'Review and adjust categories, friends, or merchant rules before saving'
                : step === 'success'
                ? 'Review your imported bank statement entries'
                : 'Upload your bank statement in CSV, XLSX, or PDF format.'}
            </p>
          </div>
          <button
            onClick={handleResetModal}
            className="w-8 h-8 rounded-full bg-slate-200/60 text-slate-500 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* SCREEN 3: SUCCESS SUMMARY */}
          {step === 'success' && importResult ? (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-2 shadow-md shadow-emerald-600/20">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="text-lg font-bold text-emerald-950">
                  Statement Processed & Rules Saved!
                </h4>
                <p className="text-xs text-emerald-700 mt-1">
                  Your transactions have been added to MongoDB Atlas and rules updated for future imports.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Imported</span>
                  <span className="text-xl font-extrabold text-emerald-700">+{importResult.importedCount}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rules Memory Saved</span>
                  <span className="text-xl font-extrabold text-slate-950">
                    {Object.values(savedRuleFlags).filter(Boolean).length} Rules
                  </span>
                </div>
              </div>

              <button
                onClick={handleResetModal}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-950 text-white font-semibold text-sm hover:bg-emerald-600 transition shadow-md cursor-pointer"
              >
                Done & View Dashboard
              </button>
            </div>
          ) : step === 'review' ? (
            /* SCREEN 2: INTERACTIVE STATEMENT REVIEW & RULE MEMORY TABLE */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <span className="font-bold text-slate-950">{reviewData.candidateCount} Transactions Ready</span>
                  <span className="text-slate-400 ml-2">({reviewData.duplicateCount} duplicates auto-skipped)</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={12} /> Click rows to adjust
                </span>
              </div>

              {/* Interactive Review Table */}
              <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 text-xs">
                {reviewData.candidates.map((cand) => (
                  <div key={cand.tempId} className="p-3 space-y-2 hover:bg-slate-50/80 transition">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900">{cand.description}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(cand.date).toLocaleDateString()} • {cand.paymentMethod || 'UPI'}
                        </p>
                      </div>

                      <span
                        className={`font-bold text-sm shrink-0 ${
                          cand.type === 'income'
                            ? 'text-emerald-600'
                            : cand.type === 'transfer'
                            ? 'text-blue-600'
                            : 'text-rose-500'
                        }`}
                      >
                        {cand.type === 'income' ? '+' : cand.type === 'transfer' ? '⇄ ' : '-'}{currencySymbol}{cand.amount}
                      </span>
                    </div>

                    {/* Adjusters Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        {/* Type Selector */}
                        <select
                          value={cand.type}
                          onChange={(e) => handleCandidateChange(cand.tempId, 'type', e.target.value)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                          <option value="transfer">Transfer / Neutral</option>
                        </select>

                        {/* Category Selector */}
                        <select
                          value={cand.category}
                          onChange={(e) => handleCandidateChange(cand.tempId, 'category', e.target.value)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none cursor-pointer"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Rule Memory Checkbox */}
                      <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!savedRuleFlags[cand.tempId]}
                          onChange={() => handleToggleRuleFlag(cand.tempId)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>🧠 Remember rule for future imports</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Back to Upload
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleConfirmImport}
                  className="py-3 px-4 rounded-xl bg-slate-950 text-white text-xs font-semibold hover:bg-emerald-600 transition shadow-md cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Confirming & Saving...' : `Confirm & Save (${reviewData.candidateCount})`}
                </button>
              </div>
            </div>
          ) : (
            /* SCREEN 1: UPLOAD DROPZONE */
            <form onSubmit={handleParseStatement} className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-7 text-center transition duration-300 cursor-pointer ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/80 scale-[1.01]'
                    : file
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-emerald-200/80 bg-emerald-50/20 hover:bg-emerald-50/40 hover:border-emerald-300'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <UploadCloud size={24} />
                </div>

                {file ? (
                  <div>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full inline-flex items-center gap-1.5 mb-2">
                      <Check size={13} /> {file.name} [{getFileExtension(file.name)}]
                    </span>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB • Click to change file</p>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-base font-bold text-slate-950">
                      Upload your statement
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Drag and drop your file here, or{' '}
                      <span className="text-emerald-600 font-bold hover:underline">browse files</span>
                    </p>
                  </div>
                )}

                {/* Format Badges */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <span className="px-3 py-1 rounded-lg bg-white border border-emerald-200 text-[11px] font-bold text-emerald-800 shadow-2xs flex items-center gap-1">
                    <FileText size={12} /> CSV
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-white border border-blue-200 text-[11px] font-bold text-blue-800 shadow-2xs flex items-center gap-1">
                    <FileSpreadsheet size={12} /> XLSX
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-white border border-purple-200 text-[11px] font-bold text-purple-800 shadow-2xs flex items-center gap-1">
                    <FileText size={12} /> PDF
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 mt-3">
                  Maximum file size: 15 MB
                </p>
              </div>

              {/* PDF Password Input Field */}
              {(requiresPassword || (file && file.name.toLowerCase().endsWith('.pdf'))) && (
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2 animate-fadeIn">
                  <label className="block text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Key size={14} className="text-amber-600" />
                    Statement PDF Password (If Protected)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter PDF password (e.g. PAN / DOB / Account number)"
                    className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:border-amber-500 focus:outline-none transition"
                  />
                </div>
              )}

              {/* Footer Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetModal}
                  className="py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading || !file}
                  className="py-3 px-4 rounded-xl bg-slate-950 text-white text-xs font-semibold hover:bg-emerald-600 transition shadow-md cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Processing Statement...' : 'Review Statement →'}
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}

export default ImportModal;
