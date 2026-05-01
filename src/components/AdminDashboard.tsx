import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Activity, 
  CheckCircle, 
  XCircle, 
  LogOut, 
  ShieldCheck,
  Settings as SettingsIcon,
  Search,
  RefreshCw,
  History,
  X,
  Edit2,
  Trash2,
  Download,
  Upload,
  Share2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDashboard() {
  const { fetchWithAuth, logout, user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'settings'>('users');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserLogs, setSelectedUserLogs] = useState<any[] | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ 
    username: '', 
    mobile: '', 
    email: '', 
    shop_name: '',
    dealer_commission: 0
  });

  // Admin Profile states
  const [adminProfile, setAdminProfile] = useState({ 
    username: user?.username || '', 
    email: user?.email || '', 
    pin: '' 
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, logsData] = await Promise.all([
        fetchWithAuth('/admin/users'),
        fetchWithAuth('/admin/logs')
      ]);
      setUsers(usersData);
      setLogs(logsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusUpdate = async (userId: number, status: string) => {
    try {
      await fetchWithAuth(`/admin/users/${userId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
      loadData();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const fetchUserLogs = async (user: any) => {
    setSelectedUser(user);
    setLogsLoading(true);
    try {
      const data = await fetchWithAuth(`/admin/users/${user.id}/logs`);
      setSelectedUserLogs(data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch user logs");
    } finally {
      setLogsLoading(false);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditForm({ 
      username: user.username, 
      mobile: user.mobile, 
      email: user.email || '', 
      shop_name: user.shop_name || '',
      dealer_commission: user.dealer_commission || 0
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth(`/admin/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      setEditingUser(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await fetchWithAuth(`/admin/users/${id}`, {
        method: 'DELETE'
      });
      setShowDeleteConfirm(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportUserRecords = async (u: any) => {
    try {
      const records = await fetchWithAuth(`/admin/users/${u.id}/records`);
      const dataStr = JSON.stringify(records, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `records_${u.username}.json`;
      link.click();
    } catch (err: any) {
      alert("Failed to export records");
    }
  };

  const handleImportUserRecords = async (u: any, e: React.ChangeEvent<HTMLInputElement>, strategy?: 'overwrite' | 'skip', cachedRecords?: any[]) => {
    let importedRecords = cachedRecords;
    if (!importedRecords) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (Array.isArray(data)) {
            handleImportUserRecords(u, undefined as any, undefined, data);
          }
        } catch (err) {
          alert("Invalid file format");
        }
      };
      reader.readAsText(file);
      return;
    }

    try {
      const response = await fetchWithAuth(`/admin/users/${u.id}/records/import`, {
        method: 'POST',
        body: JSON.stringify({ records: importedRecords, strategy })
      });

      if (response.requiresDecision) {
        if (window.confirm(`Found ${response.duplicateCount} duplicate records for ${u.username}. Would you like to OVERWRITE them?\n\nClick OK to Overwrite, Cancel to Skip duplicates.`)) {
          handleImportUserRecords(u, undefined as any, 'overwrite', importedRecords);
        } else {
          handleImportUserRecords(u, undefined as any, 'skip', importedRecords);
        }
        return;
      }

      let msg = `Import complete for ${u.username}.`;
      if (response.imported > 0) msg += `\n- ${response.imported} New`;
      if (response.updated > 0) msg += `\n- ${response.updated} Updated`;
      if (response.skipped > 0) msg += `\n- ${response.skipped} Skipped`;
      
      alert(msg);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleShareUserRecords = async (u: any) => {
    try {
      const records = await fetchWithAuth(`/admin/users/${u.id}/records`);
      if (records.length === 0) {
        alert("No records to share");
        return;
      }
      const header = `Records Summary for ${u.username} (${records.length} total):\n\n`;
      const body = records.map((r: any, i: number) => {
        const commission = u.dealer_commission || 0;
        const cp = r.cost_price || 0;
        const sp = cp + (cp * commission / 100);
        return `${i + 1}. ${r.dealer_code} / ${r.company_code}\n   CP: $${cp.toFixed(2)} | SP: $${sp.toFixed(2)} (${commission}%)`;
      }).join('\n\n');
      window.open(`https://wa.me/?text=${encodeURIComponent(header + body)}`, '_blank');
    } catch (err) {
      alert("Failed to share records");
    }
  };

  const handleUpdateAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth('/admin/profile', {
        method: 'PUT',
        body: JSON.stringify(adminProfile)
      });
      alert("Profile updated successfully. Please re-login if you changed your username.");
      if (adminProfile.username !== user.username) {
        logout();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.mobile.includes(searchTerm) ||
    u.shop_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <ShieldCheck className="text-emerald-400" size={28} />
          <span className="font-bold text-xl tracking-tight">Admin Console</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-emerald-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <Users size={20} />
            <span className="font-medium">User Management</span>
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'logs' ? 'bg-emerald-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <Activity size={20} />
            <span className="font-medium">System Logs</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-emerald-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <SettingsIcon size={20} />
            <span className="font-medium">Admin Settings</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold">
              {user?.username?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <p className="text-xs text-slate-500 truncate">Administrator</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <h1 className="text-lg font-semibold text-slate-800">
            {activeTab === 'users' ? 'User Management' : activeTab === 'logs' ? 'System Activity Logs' : 'Admin Settings'}
          </h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={loadData}
              className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'users' ? (
              <motion.div 
                key="users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <Search className="text-slate-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search by username, mobile, or shop name..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-bottom border-slate-200">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User Info</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Shop Details</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered At</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{u.username}</div>
                            <div className="text-xs text-slate-500">{u.mobile} • {u.email}</div>
                            <div className="mt-1">
                              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">
                                {u.dealer_commission || 0}% Commission
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{u.shop_name || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              u.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                              u.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {u.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {format(new Date(u.created_at), 'MMM d, yyyy HH:mm')}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button 
                              onClick={() => fetchUserLogs(u)}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="View User Logs"
                            >
                              <History size={18} />
                            </button>
                            <button 
                              onClick={() => handleEditUser(u)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit User"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => setShowDeleteConfirm(u.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleExportUserRecords(u)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Export User Records"
                            >
                              <Download size={18} />
                            </button>
                            <label className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer inline-block" title="Import User Records">
                              <Upload size={18} />
                              <input type="file" className="hidden" accept=".json" onChange={(e) => handleImportUserRecords(u, e)} />
                            </label>
                            <button 
                              onClick={() => handleShareUserRecords(u)}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Share User Records via WhatsApp"
                            >
                              <Share2 size={18} />
                            </button>
                            {u.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => handleStatusUpdate(u.id, 'approved')}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Approve"
                                >
                                  <CheckCircle size={18} />
                                </button>
                                <button 
                                  onClick={() => handleStatusUpdate(u.id, 'rejected')}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Reject"
                                >
                                  <XCircle size={18} />
                                </button>
                              </>
                            )}
                            {u.status !== 'pending' && (
                              <button 
                                onClick={() => handleStatusUpdate(u.id, 'pending')}
                                className="text-xs text-slate-400 hover:text-slate-600 underline"
                              >
                                Reset to Pending
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="logs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Recent System Events</span>
                  <span className="text-xs text-slate-400">Showing last 100 entries</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                      <div className={`mt-1 p-2 rounded-lg ${
                        log.action.includes('LOGIN') ? 'bg-blue-100 text-blue-600' :
                        log.action.includes('REGISTER') ? 'bg-emerald-100 text-emerald-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        <Activity size={16} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-900">{log.action}</span>
                          <span className="text-xs text-slate-400">{format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}</span>
                        </div>
                        <p className="text-sm text-slate-600">{log.details}</p>
                        <p className="text-xs text-slate-400 mt-1">User: {log.username || 'System'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Admin Settings Tab Content */}
      {activeTab === 'settings' && (
        <div className="fixed inset-0 z-10 ml-64 mt-16 p-8 bg-slate-50 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-8"
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Admin Profile Settings</h2>
              <form onSubmit={handleUpdateAdminProfile} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      value={adminProfile.username}
                      onChange={(e) => setAdminProfile({ ...adminProfile, username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                    <input 
                      required
                      type="email" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      value={adminProfile.email}
                      onChange={(e) => setAdminProfile({ ...adminProfile, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Security PIN (Leave blank to keep current)</label>
                  <input 
                    type="password" 
                    maxLength={6}
                    placeholder="Enter new 6-digit PIN"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    value={adminProfile.pin}
                    onChange={(e) => setAdminProfile({ ...adminProfile, pin: e.target.value })}
                  />
                </div>
                <div className="pt-4">
                  <button 
                    type="submit" 
                    className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all"
                  >
                    Update Admin Profile
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <ShieldCheck className="text-amber-600 mt-1" size={24} />
                <div>
                  <h3 className="font-bold text-amber-900">Security Note</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Updating your username will require you to log in again. Ensure you remember your new PIN if you choose to update it.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900">Edit User Details</h3>
                <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mobile</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    value={editForm.mobile}
                    onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</label>
                  <input 
                    type="email" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shop Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    value={editForm.shop_name}
                    onChange={(e) => setEditForm({ ...editForm, shop_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dealer Commission (%)</label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    value={editForm.dealer_commission}
                    onChange={(e) => setEditForm({ ...editForm, dealer_commission: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancel</button>
                  <button type="submit" className="flex-1 py-2 bg-emerald-500 text-white rounded-xl font-bold">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete User?</h3>
              <p className="text-slate-500 text-sm mb-6">This will permanently remove the user and all their associated records and logs. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancel</button>
                <button onClick={() => handleDeleteUser(showDeleteConfirm)} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Logs Modal */}
      <AnimatePresence>
        {selectedUserLogs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Activity Logs: {selectedUser?.username}</h3>
                  <p className="text-sm text-slate-500">{selectedUser?.shop_name}</p>
                </div>
                <button 
                  onClick={() => { setSelectedUserLogs(null); setSelectedUser(null); }}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {logsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="animate-spin text-emerald-500" size={32} />
                  </div>
                ) : selectedUserLogs.length > 0 ? (
                  selectedUserLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className={`mt-1 p-2 rounded-lg ${
                        log.action.includes('LOGIN') ? 'bg-blue-100 text-blue-600' :
                        log.action.includes('REGISTER') ? 'bg-emerald-100 text-emerald-600' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        <Activity size={16} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-900">{log.action}</span>
                          <span className="text-xs text-slate-400">{format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}</span>
                        </div>
                        <p className="text-sm text-slate-600">{log.details}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    No activity logs found for this user.
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
                <button 
                  onClick={() => { setSelectedUserLogs(null); setSelectedUser(null); }}
                  className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold active:scale-95 transition-transform"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
