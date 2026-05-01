import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  User, 
  Settings as SettingsIcon, 
  Home, 
  ChevronRight, 
  ArrowLeft,
  Edit2,
  Save,
  LogOut,
  Phone,
  Mail,
  Store,
  Share2,
  Download,
  Upload,
  X,
  ShieldCheck,
  Activity,
  Lock,
  FileText,
  Calculator,
  Check,
  Trash2,
  Filter,
  CheckSquare,
  Square
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function MobileClient() {
  const { user, logout, fetchWithAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'account' | 'settings'>('home');
  const [view, setView] = useState<'list' | 'add' | 'edit' | 'details'>('list');
  const [records, setRecords] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dealerFilter, setDealerFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadRecords = async () => {
    try {
      const data = await fetchWithAuth('/records');
      setRecords(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const filteredRecords = records.filter(r => {
    const dealerCode = r.dealer_code || '(Pending)';
    const matchesSearch = searchTerm === '' || 
                         dealerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.company_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDealer = dealerFilter === '' || dealerCode.toLowerCase().includes(dealerFilter.toLowerCase());
    const matchesCompany = companyFilter === '' || r.company_code.toLowerCase().includes(companyFilter.toLowerCase());
    return matchesSearch && matchesDealer && matchesCompany;
  });

  const toggleSelect = (id: any) => {
    const numId = Number(id);
    setSelectedIds(prev => 
      prev.includes(numId) ? prev.filter(i => i !== numId) : [...prev, numId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} records?`)) return;
    setLoading(true);
    try {
      const response = await fetchWithAuth('/records/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds })
      });
      console.log('Bulk delete success:', response);
      setSelectedIds([]);
      setIsSelectMode(false);
      await loadRecords();
    } catch (err: any) {
      console.error('Bulk delete error:', err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = (record: any) => {
    const text = `Record Details:\nDealer Code: ${record.dealer_code}\nCompany Code: ${record.company_code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareAllWhatsApp = () => {
    if (records.length === 0) {
      alert("No records to share");
      return;
    }
    const header = `My Records Summary (${records.length} total):\n\n`;
    const body = records.map((r, i) => `${i + 1}. Dealer: ${r.dealer_code} | Company: ${r.company_code}`).join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(header + body)}`, '_blank');
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(records, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `records_${user.username}.json`;
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const importedRecords = JSON.parse(event.target?.result as string);
          if (Array.isArray(importedRecords)) {
            await fetchWithAuth('/records/bulk-import', {
              method: 'POST',
              body: JSON.stringify({ records: importedRecords })
            });
            alert(`Successfully imported ${importedRecords.length} records!`);
            loadRecords();
          }
        } catch (err) {
          alert("Invalid file format");
        }
      };
      reader.readAsText(file);
    } else {
      // Excel handling will be done through the custom view
      alert("Please use the Excel Import option for .xlsx files");
    }
  };

  const calculatePrices = (recordOrCp: any) => {
    let cp = 0;
    let commission = Number(user?.dealerCommission) || 0;
    
    if (typeof recordOrCp === 'number') {
      cp = recordOrCp;
    } else {
      cp = recordOrCp.cost_price || 0;
      if (recordOrCp.dealer_commission !== undefined) {
        commission = Number(recordOrCp.dealer_commission);
      }
    }
    
    const sp = cp + (cp * commission / 100);
    return { cp, sp, commission };
  };

  return (
    <div className="mobile-frame font-sans">
      <div className="mobile-content">
        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div 
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {activeTab === 'home' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-slate-900">My Records</h2>
                    <div className="flex gap-2">
                       <button 
                        id="filter-btn"
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-md active:shadow-inner",
                          showFilters 
                            ? "bg-amber-500 text-white shadow-amber-200 ring-2 ring-amber-500/20" 
                            : "bg-white text-slate-500 shadow-slate-100 border border-slate-200"
                        )}
                        title="Toggle Filters"
                        style={{
                          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                      >
                         <Filter size={18} className={cn("transition-transform duration-300", showFilters && "rotate-180")} />
                      </button>
                       <button 
                        id="select-mode-btn"
                        onClick={() => {
                          setIsSelectMode(!isSelectMode);
                          setSelectedIds([]);
                        }}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-md active:shadow-inner",
                          isSelectMode 
                            ? "bg-emerald-500 text-white shadow-emerald-200 ring-2 ring-emerald-500/20" 
                            : "bg-white text-slate-500 shadow-slate-100 border border-slate-200"
                        )}
                        title={isSelectMode ? "Cancel Selection" : "Bulk Select"}
                      >
                         <ShieldCheck size={18} />
                      </button>
                      {!isSelectMode && (
                        <>
                          <button 
                            id="excel-import-btn"
                            onClick={() => setView('excel' as any)}
                            className="w-10 h-10 bg-white text-blue-600 border border-slate-100 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-md shadow-slate-100/50"
                            title="Bulk Excel Import"
                          >
                            <FileText size={18} />
                          </button>
                          <button 
                            id="add-record-btn"
                            onClick={() => setView('add')}
                            className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 active:scale-95 transition-transform"
                            title="Add Record"
                          >
                            <Plus size={22} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isSelectMode && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 space-y-3"
                    >
                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => {
                              const filteredIds = filteredRecords.map(r => Number(r.id));
                              const allFilteredSelected = filteredIds.every(id => selectedIds.includes(id));
                              
                              if (allFilteredSelected) {
                                // Deselect all filtered
                                setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
                              } else {
                                // Select all filtered (keeping any already selected outside this filter if any)
                                setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
                              }
                            }}
                            className="flex items-center gap-2 text-xs font-bold text-emerald-600 px-2 py-1 active:bg-emerald-50 rounded-lg transition-colors"
                          >
                            {filteredRecords.every(r => selectedIds.includes(Number(r.id))) && filteredRecords.length > 0 ? (
                              <><CheckSquare size={16} /> Deselect All</>
                            ) : (
                              <><Square size={16} /> Select All</>
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-400">{selectedIds.length} Selected</span>
                        </div>
                      </div>

                      {selectedIds.length > 0 && (
                        <div className="flex items-center justify-between bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm">
                          <span className="text-xs font-bold text-red-700">{selectedIds.length} Selected</span>
                          <button 
                            onClick={handleBulkDelete}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold active:scale-95 transition-transform disabled:opacity-50"
                          >
                            <Trash2 size={16} /> Delete Selected
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {showFilters && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                      exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          placeholder="Search records..."
                          className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-emerald-500/20"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Filter Dealer</label>
                          <input 
                            type="text"
                            placeholder="Search Dealer..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                            value={dealerFilter}
                            onChange={(e) => setDealerFilter(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Filter Company</label>
                          <input 
                            type="text"
                            placeholder="Search Company..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                            value={companyFilter}
                            onChange={(e) => setCompanyFilter(e.target.value)}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-3 pb-20">
                    {filteredRecords.map(record => {
                      const { sp } = calculatePrices(record);
                      const recordId = Number(record.id);
                      const isSelected = selectedIds.includes(recordId);
                      return (
                        <div 
                          key={record.id}
                          onClick={() => { 
                            if (isSelectMode) {
                              toggleSelect(recordId);
                            } else {
                              setSelectedRecord(record); 
                              setView('details'); 
                            }
                          }}
                          className={cn(
                            "bg-white border p-4 rounded-2xl flex items-center justify-between hover:border-emerald-200 transition-all cursor-pointer active:bg-slate-50 shadow-sm",
                            isSelected ? "border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500" : "border-slate-100"
                          )}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {isSelectMode && (
                              <div className={cn(
                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors",
                                isSelected ? "bg-emerald-500 border-emerald-500" : "bg-white border-slate-200"
                              )}>
                                {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-0.5">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Dealer: {record.dealer_code || '(Pending)'}</p>
                                {record.source && record.source !== 'Manual' && (
                                  <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-bold truncate max-w-[80px]" title={record.source}>
                                    {record.source}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-bold text-slate-900 leading-tight">Company: {record.company_code}</p>
                              <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-widest">SP: ${sp.toFixed(2)}</p>
                            </div>
                          </div>
                          {!isSelectMode && <ChevronRight className="text-slate-300 ml-2" size={20} />}
                        </div>
                      );
                    })}
                    {filteredRecords.length === 0 && (
                      <div className="py-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="text-slate-300" size={32} />
                        </div>
                        <p className="text-slate-400 text-sm">No records found</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'account' && <AccountView onRecordsUpdate={loadRecords} />}
              {activeTab === 'settings' && <SettingsView onLogout={logout} onExport={handleExport} onImport={handleImport} onShareAll={handleShareAllWhatsApp} onExcelImport={() => setView('excel' as any)} />}
            </motion.div>
          )}

          {view === 'add' && <RecordForm onBack={() => setView('list')} onSuccess={loadRecords} />}
          {view === 'edit' && <RecordForm record={selectedRecord} onBack={() => setView('list')} onSuccess={loadRecords} />}
          {view === 'details' && (
            <RecordDetails 
              record={selectedRecord} 
              pricing={calculatePrices(selectedRecord)}
              onBack={() => setView('list')} 
              onEdit={() => setView('edit')}
              onShare={() => handleShareWhatsApp(selectedRecord)}
              onDelete={async () => {
                if (!window.confirm("Are you sure you want to delete this record?")) return;
                try {
                  await fetchWithAuth(`/records/${selectedRecord.id}`, { method: 'DELETE' });
                  await loadRecords();
                  setView('list');
                } catch (err: any) {
                  alert(err.message);
                }
              }}
            />
          )}
          {(view as any) === 'excel' && (
             <ExcelImportView 
               onBack={() => setView('list')} 
               onSuccess={() => { loadRecords(); setView('list'); }} 
             />
          )}
        </AnimatePresence>
      </div>

      <div className="bottom-nav">
        <NavButton active={activeTab === 'home'} icon={<Home size={22} />} label="Home" onClick={() => { setActiveTab('home'); setView('list'); }} />
        <NavButton active={activeTab === 'account'} icon={<User size={22} />} label="Account" onClick={() => { setActiveTab('account'); setView('list'); }} />
        <NavButton active={activeTab === 'settings'} icon={<SettingsIcon size={22} />} label="Settings" onClick={() => { setActiveTab('settings'); setView('list'); }} />
      </div>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center gap-1 transition-colors", active ? "text-emerald-600" : "text-slate-400")}>
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      {active && <motion.div layoutId="nav-dot" className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5" />}
    </button>
  );
}

function RecordForm({ record, onBack, onSuccess }: any) {
  const { fetchWithAuth } = useAuth();
  const [dealerCode, setDealerCode] = useState(record?.dealer_code || '');
  const [companyCode, setCompanyCode] = useState(record?.company_code || '');
  const [costPrice, setCostPrice] = useState(record?.cost_price?.toString() || '');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (dealerCode.length < 2 && companyCode.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const q = dealerCode || companyCode;
        const data = await fetchWithAuth(`/records/suggestions?q=${q}`);
        setSuggestions(data);
      } catch (err) {
        console.error(err);
      }
    };
    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [dealerCode, companyCode]);

  const handleSubmit = async (e: React.FormEvent, overwrite: boolean = false) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const method = record ? 'PUT' : 'POST';
      const url = record ? `/records/${record.id}` : '/records';
      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({ 
          dealerCode, 
          companyCode, 
          costPrice: parseFloat(costPrice) || 0,
          overwrite 
        })
      });

      if (response.duplicate) {
        if (window.confirm(`A record with company code "${companyCode}" already exists. Would you like to override it?`)) {
          handleSubmit(undefined as any, true);
          return;
        } else {
          setLoading(false);
          return;
        }
      }

      onSuccess();
      onBack();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onBack} className="p-2 bg-slate-100 rounded-full"><ArrowLeft size={20} /></button>
        <h2 className="text-xl font-bold">{record ? 'Edit Record' : 'Add New Record'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pb-20">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dealer Code</label>
          <input 
            required
            type="text" 
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 focus:border-emerald-500 focus:ring-0 transition-colors"
            value={dealerCode}
            onChange={(e) => setDealerCode(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company Code</label>
          <input 
            required
            type="text" 
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 focus:border-emerald-500 focus:ring-0 transition-colors"
            value={companyCode}
            onChange={(e) => setCompanyCode(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cost Price (CP)</label>
          <div className="relative">
             <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
               required
               type="number" 
               step="0.01"
               className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 pl-12 pr-4 focus:border-emerald-500 focus:ring-0 transition-colors"
               value={costPrice}
               onChange={(e) => setCostPrice(e.target.value)}
             />
          </div>
        </div>

        {suggestions.length > 0 && (
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Suggestions</p>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <button 
                  key={i}
                  type="button"
                  onClick={() => { setDealerCode(s.dealer_code); setCompanyCode(s.company_code); setCostPrice(s.cost_price?.toString() || ''); setSuggestions([]); }}
                  className="w-full text-left text-sm py-1 border-b border-emerald-100 last:border-0"
                >
                  {s.dealer_code} / {s.company_code} (${s.cost_price})
                </button>
              ))}
            </div>
          </div>
        )}

        <button 
          disabled={loading}
          className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={20} />
          {record ? 'Update Record' : 'Save Record'}
        </button>
      </form>
    </motion.div>
  );
}

function RecordDetails({ record, pricing, onBack, onEdit, onShare, onDelete }: any) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2 bg-slate-100 rounded-full"><ArrowLeft size={20} /></button>
        <div className="flex gap-2">
          <button onClick={onDelete} className="p-2 bg-red-50 text-red-600 rounded-full"><Trash2 size={20} /></button>
          <button onClick={onShare} className="p-2 bg-emerald-50 text-emerald-600 rounded-full"><Share2 size={20} /></button>
          <button onClick={onEdit} className="p-2 bg-blue-50 text-blue-600 rounded-full"><Edit2 size={20} /></button>
        </div>
      </div>

      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-100 mb-4">
          <Store className="text-white" size={40} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">{record.dealer_code || '(No Code)'}</h2>
        <p className="text-slate-400 font-medium">Company Code: {record.company_code}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-2xl p-4 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cost Price (CP)</p>
          <p className="text-lg font-bold text-slate-900">${pricing.cp.toFixed(2)}</p>
        </div>
        <div className="bg-emerald-500 rounded-2xl p-4 text-center text-white shadow-lg shadow-emerald-100">
          <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Selling Price (SP)</p>
          <p className="text-lg font-bold">${pricing.sp.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-3xl p-6 space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-slate-200">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Commission</span>
          <span className="text-sm font-bold text-emerald-600">{pricing.commission}%</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-slate-200">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Source</span>
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full",
            record.source === 'Manual' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
          )}>{record.source || 'Manual'}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-slate-200">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Last Updated</span>
          <span className="text-sm font-semibold">{new Date(record.updated_at).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between items-center py-3">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Record ID</span>
          <span className="text-sm font-mono font-bold text-slate-400">#{record.id.toString().padStart(4, '0')}</span>
        </div>
      </div>
    </motion.div>
  );
}

function AccountView({ onRecordsUpdate }: { onRecordsUpdate: () => void }) {
  const { user, fetchWithAuth, updateUser } = useAuth();
  const [mobile, setMobile] = useState(user.mobile || '');
  const [dealerCommission, setDealerCommission] = useState(user.dealerCommission?.toString() || '0');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploads, setUploads] = useState<any[]>([]);
  
  // PIN Reset states
  const [showPinReset, setShowPinReset] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');

  const loadUploads = async () => {
    try {
      const data = await fetchWithAuth('/uploads');
      setUploads(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadUploads();
  }, []);

  const handleDeleteUpload = async (id: number, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete all records uploaded from "${filename}"?`)) return;
    setLoading(true);
    try {
      await fetchWithAuth(`/uploads/${id}`, { method: 'DELETE' });
      alert("File and associated records deleted.");
      loadUploads();
      onRecordsUpdate();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const commissionVal = parseFloat(dealerCommission) || 0;
      await fetchWithAuth('/profile', {
        method: 'PUT',
        body: JSON.stringify({ mobile, dealerCommission: commissionVal })
      });
      updateUser({ mobile, dealerCommission: commissionVal });
      onRecordsUpdate();
      setEditing(false);
      alert("Account updated successfully and all records persisted with new commission.");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePinReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 6) {
      alert("New PIN must be 6 digits");
      return;
    }
    setLoading(true);
    try {
      await fetchWithAuth('/profile/pin', {
        method: 'PUT',
        body: JSON.stringify({ oldPin, newPin })
      });
      alert("PIN reset successfully");
      setShowPinReset(false);
      setOldPin('');
      setNewPin('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <h2 className="text-2xl font-bold">Account Details</h2>
      
      <div className="space-y-4">
        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
            <User size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Username</p>
            <p className="font-bold text-slate-900">{user.username}</p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl space-y-4">
           <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
               <Store size={20} />
             </div>
             <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Shop & Email</p>
               <p className="text-sm font-bold text-slate-900 leading-tight">{user.shopName || 'N/A'}</p>
               <p className="text-xs text-slate-400 font-medium">{user.email || 'N/A'}</p>
             </div>
           </div>
        </div>

        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
           <div className="flex items-center gap-3 mb-4">
              <Calculator className="text-emerald-600" size={24} />
              <h3 className="font-bold text-emerald-900">Dealer Settings</h3>
           </div>
           
           <div className="space-y-4">
             <div className="space-y-1">
               <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Dealer Commission (%)</label>
               {editing ? (
                 <div className="flex gap-2">
                   <input 
                     type="number" 
                     className="flex-1 bg-white border-2 border-emerald-200 rounded-xl px-4 py-2 text-sm focus:ring-0 focus:border-emerald-500 outline-none"
                     value={dealerCommission}
                     onChange={(e) => setDealerCommission(e.target.value)}
                   />
                 </div>
               ) : (
                 <p className="text-2xl font-black text-emerald-600">{dealerCommission}%</p>
               )}
             </div>

             <div className="space-y-1">
                <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Mobile Number</label>
                {editing ? (
                   <input 
                     type="text" 
                     className="w-full bg-white border-2 border-emerald-200 rounded-xl px-4 py-2 text-sm focus:ring-0 focus:border-emerald-500 outline-none"
                     value={mobile}
                     onChange={(e) => setMobile(e.target.value)}
                   />
                ) : (
                   <p className="font-bold text-emerald-900">{mobile || 'N/A'}</p>
                )}
             </div>

             <div className="pt-2">
               {editing ? (
                 <div className="flex gap-2">
                   <button onClick={handleUpdate} disabled={loading} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-100">Save Changes</button>
                   <button onClick={() => setEditing(false)} className="px-6 py-3 bg-white text-emerald-600 border border-emerald-100 rounded-xl text-xs font-bold">Cancel</button>
                 </div>
               ) : (
                 <button onClick={() => setEditing(true)} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-100">Update Settings</button>
               )}
             </div>
           </div>
        </div>

        <div className="pt-4">
          {showPinReset ? (
            <form onSubmit={handlePinReset} className="space-y-4 bg-slate-50 p-4 rounded-2xl">
              <p className="text-sm font-bold text-slate-900 mb-2">Reset Security PIN</p>
              <div className="space-y-3">
                <input 
                  required
                  type="password" 
                  maxLength={6}
                  placeholder="Current 6-Digit PIN"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-4 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                />
                <input 
                  required
                  type="password" 
                  maxLength={6}
                  placeholder="New 6-Digit PIN"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-4 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold">Update PIN</button>
                <button type="button" onClick={() => setShowPinReset(false)} className="flex-1 py-2 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold">Cancel</button>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => setShowPinReset(true)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl group active:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Lock className="text-slate-400 group-hover:text-emerald-500" size={20} />
                <span className="font-medium">Reset Security PIN</span>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          )}
        </div>

        {/* Upload History Section */}
        <div className="pt-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Upload size={16} className="text-emerald-500" />
              Upload History
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{uploads.length} Files</span>
          </div>

          <div className="space-y-3">
            {uploads.map(upload => (
              <div key={upload.id} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight truncate max-w-[150px]">{upload.filename}</p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {new Date(upload.timestamp).toLocaleDateString()} • {upload.record_count} Records
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteUpload(upload.id, upload.filename)}
                  disabled={loading}
                  className="p-2 text-slate-300 hover:text-red-500 active:scale-90 transition-all"
                  title="Delete records from this file"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {uploads.length === 0 && (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                <Upload size={24} className="mx-auto text-slate-200 mb-2" />
                <p className="text-xs text-slate-400">No upload history found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsView({ onLogout, onExport, onImport, onShareAll, onExcelImport }: any) {
  return (
    <div className="space-y-6 pb-24">
      <h2 className="text-2xl font-bold">Settings</h2>
      
      <div className="space-y-3">
        <button 
          onClick={onShareAll}
          className="w-full flex items-center justify-between p-4 bg-emerald-500 text-white rounded-3xl group active:scale-[0.98] transition-all shadow-lg shadow-emerald-100 mb-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
               <Share2 size={24} />
            </div>
            <div className="text-left">
               <p className="font-bold leading-tight">Share Summary</p>
               <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">via WhatsApp</p>
            </div>
          </div>
          <ChevronRight size={18} />
        </button>

        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4 mb-2">Data Management</p>

        <button 
          onClick={onExcelImport}
          className="w-full flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-3xl group active:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
               <FileText size={22} />
            </div>
            <div className="text-left">
               <p className="font-bold text-slate-900 leading-tight">Excel Import</p>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Multi-Column Custom Code</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300" />
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onExport} className="flex flex-col items-center gap-2 p-5 bg-white border-2 border-slate-100 rounded-3xl active:bg-slate-50 transition-colors shadow-sm">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <Download size={22} />
            </div>
            <span className="text-xs font-bold text-slate-600">Export JSON</span>
          </button>
          
          <label className="flex flex-col items-center gap-2 p-5 bg-white border-2 border-slate-100 rounded-3xl active:bg-slate-50 transition-colors shadow-sm cursor-pointer">
            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
              <Upload size={22} />
            </div>
            <span className="text-xs font-bold text-slate-600">Import JSON</span>
            <input type="file" className="hidden" accept=".json" onChange={onImport} />
          </label>
        </div>

        <div className="pt-6">
           <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl group active:bg-slate-100 transition-colors border border-slate-100">
             <div className="flex items-center gap-3">
               <ShieldCheck className="text-slate-400 group-hover:text-emerald-500" size={20} />
               <span className="font-medium text-slate-700">Security & Privacy</span>
             </div>
             <ChevronRight size={18} className="text-slate-300" />
           </button>
        </div>

        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 p-5 bg-red-50 text-red-600 rounded-3xl active:bg-red-100 transition-colors mt-4 border border-red-100"
        >
          <LogOut size={22} />
          <span className="font-bold uppercase tracking-widest text-xs">Logout Securely</span>
        </button>
      </div>

      <div className="pt-8 text-center">
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">OmniAuth Enterprise v1.2</p>
      </div>
    </div>
  );
}

function ExcelImportView({ onBack, onSuccess }: any) {
  const { fetchWithAuth } = useAuth();
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [decisionRequired, setDecisionRequired] = useState<{ count: number; total: number; duplicates: string[] } | null>(null);
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);
  
  // Mapping state
  const [companyCodeCols, setCompanyCodeCols] = useState<string[]>([]);
  const [priceCol, setPriceCol] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const wb = XLSX.read(data, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      const excelHeaders: any = json[0];
      const excelData: any = json.slice(1);
      
      setHeaders(excelHeaders);
      setData(excelData);
      setStep(2);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async (strategy?: 'overwrite' | 'skip', overwriteCodes?: string[]) => {
    if (companyCodeCols.length === 0 || !priceCol) {
      alert("Please map all required columns");
      return;
    }
    
    setLoading(true);
    try {
      const recordsToImport = data.map(row => {
        const dealer_code = ''; // Left blank as requested
        const company_code = companyCodeCols
          .map(col => row[headers.indexOf(col)]?.toString() || '')
          .filter(val => val.trim().length > 0)
          .join(' - ');
        
        const cost_price = parseFloat(row[headers.indexOf(priceCol)]) || 0;
        
        return { dealer_code, company_code, cost_price };
      }).filter(r => r.company_code.length > 0);

      if (recordsToImport.length === 0) {
        alert("No valid records found after mapping.");
        setLoading(false);
        return;
      }

      const response = await fetchWithAuth('/records/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ records: recordsToImport, strategy, overwriteCodes, filename: fileName })
      });
      
      if (response.requiresDecision) {
        setDecisionRequired({ 
          count: response.duplicateCount, 
          total: response.totalCount,
          duplicates: response.duplicates || []
        });
        setSelectedDuplicates([]); // Default none selected
        setLoading(false);
        return;
      }

      const results = response;
      let msg = `Successfully imported ${results.imported} new records!`;
      if (results.updated > 0) msg += `\nUpdated ${results.updated} existing records.`;
      if (results.skipped > 0) msg += `\nSkipped ${results.skipped} duplicates.`;
      
      alert(msg);
      onSuccess();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompanyCol = (col: string) => {
    setCompanyCodeCols(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onBack} className="p-2 bg-slate-100 rounded-full cursor-pointer"><ArrowLeft size={20} /></button>
        <h2 className="text-xl font-bold">Excel Bulk Import</h2>
      </div>

      {step === 1 && (
        <div className="text-center space-y-6 pt-10">
           <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
             <Upload size={48} />
           </div>
           <div>
             <h3 className="text-xl font-bold text-slate-900">Upload Data File</h3>
             <p className="text-sm text-slate-400 mt-2 px-8">Upload your .xlsx or .xls file to begin mapping columns and prices.</p>
           </div>
           
           <label className="block px-8">
             <span className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer">
                Select Excel File
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
             </span>
           </label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
           <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
             <div className="flex items-center gap-3">
               <FileText className="text-blue-600" size={20} />
               <span className="text-sm font-bold text-slate-700">{fileName}</span>
             </div>
             <button onClick={() => { setStep(1); setDecisionRequired(null); }} className="text-xs font-bold text-blue-600">Change</button>
           </div>

           {!decisionRequired ? (
             <>
               <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">1. Company Code Columns (Selected: {companyCodeCols.length})</label>
                   <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                     {headers.map((h, i) => (
                       <button 
                         key={i}
                         onClick={() => toggleCompanyCol(h)}
                         className={cn(
                           "flex items-center justify-between p-3 rounded-xl border-2 text-xs font-bold transition-all",
                           companyCodeCols.includes(h) 
                            ? "bg-blue-50 border-blue-500 text-blue-600" 
                            : "bg-white border-slate-50 text-slate-400"
                         )}
                       >
                         {h}
                         {companyCodeCols.includes(h) && <Check size={14} />}
                       </button>
                     ))}
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">2. Cost Price (CP) Column</label>
                   <select 
                     className="w-full bg-white border-2 border-slate-100 rounded-2xl py-3 px-4 text-sm outline-none focus:border-blue-500"
                     value={priceCol}
                     onChange={(e) => setPriceCol(e.target.value)}
                     required
                   >
                     <option value="">Select Column...</option>
                     {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
                   </select>
                 </div>
               </div>

               <button 
                 onClick={() => handleImport()}
                 disabled={loading}
                 className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-100 active:scale-[0.98] transition-all disabled:opacity-50 mt-8 mb-20"
               >
                 {loading ? 'Processing Data...' : `Import ${data.length} Records`}
               </button>
             </>
           ) : (
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 space-y-6"
             >
                <div className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-100">
                  <Activity size={32} />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-amber-900">Duplicates Detected</h3>
                  <p className="text-sm text-amber-700 mt-2">
                    We found <span className="font-black underline">{decisionRequired.count}</span> records that already exist. 
                    Choose which ones to update or skip.
                  </p>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 p-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Duplicate Records</span>
                    <button 
                      onClick={() => setSelectedDuplicates(
                        selectedDuplicates.length === decisionRequired.duplicates.length 
                          ? [] 
                          : [...decisionRequired.duplicates]
                      )}
                      className="text-[10px] font-bold text-blue-600"
                    >
                      {selectedDuplicates.length === decisionRequired.duplicates.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  {decisionRequired.duplicates.map((code, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setSelectedDuplicates(prev => 
                        prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
                      )}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-xs text-left",
                        selectedDuplicates.includes(code)
                          ? "bg-amber-100 border-amber-500 text-amber-900"
                          : "bg-white border-amber-100 text-slate-500"
                      )}
                    >
                      <span className="truncate pr-4 font-bold">{code}</span>
                      {selectedDuplicates.includes(code) && <Check size={14} className="text-amber-500" />}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-3">
                  {selectedDuplicates.length > 0 ? (
                    <button 
                      onClick={() => handleImport(undefined, selectedDuplicates)}
                      disabled={loading}
                      className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Save size={20} /> Update {selectedDuplicates.length} Selected
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleImport('overwrite')}
                      disabled={loading}
                      className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Save size={20} /> Update All {decisionRequired.count}
                    </button>
                  )}
                  
                  <button 
                    onClick={() => handleImport('skip')}
                    disabled={loading}
                    className="w-full bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <X size={20} /> Skip Duplicates
                  </button>
                  
                  <button 
                    onClick={() => { setDecisionRequired(null); setStep(1); }}
                    className="text-amber-600 font-bold text-xs p-2 text-center w-full"
                  >
                    Go Back & Cancel
                  </button>
                </div>
             </motion.div>
           )}
        </div>
      )}
    </motion.div>
  );
}
