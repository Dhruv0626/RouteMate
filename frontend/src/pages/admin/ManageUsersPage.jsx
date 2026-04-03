import { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  Trash2, 
  ShieldAlert, 
  ShieldCheck, 
  ChevronLeft, 
  ArrowRight,
  UserCheck,
  MoreVertical,
  Circle,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../../components/ui/ThemeToggle";
import Loader from "../../components/ui/Loader";

const RoleBadge = ({ role }) => {
  const configs = {
    admin: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    driver: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    passenger: "bg-primary/20 text-primary border-primary/30"
  };
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase border ${configs[role] || configs.passenger}`}>
      {role}
    </span>
  );
};

const ManageUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(null); // stores userId currently being updated
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/users/all");
      if (data.success && data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (userId, isBlocked) => {
    try {
      setActionLoading(userId);
      const { data } = await api.put(`/users/${userId}`, { isBlocked: !isBlocked });
      if (data.success) {
        setUsers(users.map(u => u._id === userId ? { ...u, isBlocked: !isBlocked } : u));
      }
    } catch (error) {
      alert(error.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete user "${name}"? This action cannot be undone.`)) return;
    
    try {
      setActionLoading(userId);
      const { data } = await api.delete(`/users/${userId}`);
      if (data.success) {
        setUsers(users.filter(u => u._id !== userId));
      }
    } catch (error) {
      alert(error.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.Mobile_no.includes(searchTerm);
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) return <Loader fullPage text="Accessing core user database..." />;

  return (
    <div className="mesh-bg min-h-screen relative font-sans text-(--text-main)">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate("/admin/dashboard")}
              className="p-2 hover:bg-(--card-bg) rounded-xl border border-(--card-border) text-(--text-dim) hover:text-(--text-main) transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-xl font-display font-black tracking-tight">User Management</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-3 border-l border-(--card-border) pl-4">
              <div className="text-right">
                <p className="text-[10px] font-bold tracking-widest text-primary uppercase leading-tight">ADMIN MODE</p>
                <p className="text-sm font-semibold text-(--text-main)">{currentUser?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8 relative z-10">
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
               <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold tracking-widest uppercase border border-primary/20 flex items-center gap-1.5">
                <Users size={12} /> User Directory
               </span>
            </div>
            <h2 className="text-3xl font-display font-black tracking-tighter">Manage Accounts</h2>
            <p className="text-(--text-dim) text-sm max-w-md">
              Review platform participants, block suspicious activity, or permanently remove accounts. 
              <span className="text-amber-500 ml-1 font-bold italic underline">Changes reflect instantly on user sessions.</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
             <div className="from-primary to-primary-dark shadow-primary/20 bg-linear-to-br p-px rounded-2xl">
               <div className="bg-(--bg-main) rounded-[15px] px-6 py-3 text-center min-w-32">
                 <p className="text-2xl font-black text-(--text-main)">{users.length}</p>
                 <p className="text-[10px] font-bold tracking-widest text-(--text-dim) uppercase">Total Users</p>
               </div>
             </div>
             <button 
               onClick={fetchUsers}
               className="p-4 bg-(--card-bg) border border-(--card-border) rounded-2xl text-primary hover:bg-primary/10 transition-all active:scale-95"
             >
               <RefreshCw size={24} className={loading ? "animate-spin" : ""} />
             </button>
          </div>
        </section>

        {/* Toolbar */}
        <section className="glass-card rounded-3xl p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-dim) group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search by name, email or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/5 dark:bg-black/20 border border-(--card-border) rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-primary/50 text-sm font-medium transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="text-(--text-dim) ml-2" size={18} />
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-(--bg-main) border border-(--card-border) rounded-2xl px-4 py-3.5 outline-none text-sm font-semibold min-w-40 cursor-pointer hover:border-primary/30 transition-all focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Roles</option>
              <option value="admin">Administrators</option>
              <option value="passenger">Passengers</option>
              <option value="driver">Drivers</option>
            </select>
          </div>
        </section>

        {/* Users Table */}
        <section className="glass-card rounded-4xl overflow-hidden border-(--card-border) shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/5 dark:bg-black/20 border-b border-(--card-border)">
                  <th className="px-6 py-5 text-[10px] font-bold tracking-[0.2em] text-(--text-dim) uppercase">Participant</th>
                  <th className="px-6 py-5 text-[10px] font-bold tracking-[0.2em] text-(--text-dim) uppercase">Role</th>
                  <th className="px-6 py-5 text-[10px] font-bold tracking-[0.2em] text-(--text-dim) uppercase">Joined At</th>
                  <th className="px-6 py-5 text-[10px] font-bold tracking-[0.2em] text-(--text-dim) uppercase">Verification</th>
                  <th className="px-6 py-5 text-[10px] font-bold tracking-[0.2em] text-(--text-dim) uppercase">Status</th>
                  <th className="px-6 py-5 text-right text-[10px] font-bold tracking-[0.2em] text-(--text-dim) uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--card-border)">
                {filteredUsers.length > 0 ? filteredUsers.map((u) => (
                  <tr key={u._id} className="group hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-500">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-linear-to-br from-primary/10 to-primary/30 border border-primary/20 flex items-center justify-center font-bold text-primary group-hover:scale-110 transition-transform">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-(--text-main) text-sm leading-none mb-1">{u.name}</p>
                          <p className="text-xs text-(--text-dim) font-medium">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-(--text-main)">{new Date(u.createdAt).toLocaleDateString()}</span>
                        <span className="text-[10px] text-(--text-dim) uppercase font-black">{new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-mono font-medium text-(--text-dim)">{u.Mobile_no}</span>
                        {u.role === "driver" && (
                          u.driverProfile?.isApproved ? (
                            <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase">
                              <ShieldCheck size={10} /> Verified Driver
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[9px] font-black text-amber-500 uppercase">
                              <ShieldAlert size={10} /> Pending Review
                            </span>
                          )
                        )}
                        {u.role === "admin" && (
                          <span className="flex items-center gap-1 text-[9px] font-black text-violet-500 uppercase">
                            <ShieldCheck size={10} /> System Authority
                          </span>
                        )}
                        {u.role === "passenger" && (
                          <span className="flex items-center gap-1 text-[9px] font-black text-primary uppercase">
                            <UserCheck size={10} /> Active Member
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.isBlocked ? (
                        <span className="flex items-center gap-1.5 text-red-500 text-[10px] font-black tracking-widest uppercase">
                          <Circle size={6} fill="currentColor" fillOpacity={0.4} /> Blocked
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-black tracking-widest uppercase">
                          <Circle size={6} fill="currentColor" fillOpacity={0.4} className="animate-pulse" /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleUpdateStatus(u._id, u.isBlocked)}
                          disabled={actionLoading === u._id}
                          className={`p-2.5 rounded-xl border transition-all ${
                            u.isBlocked 
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-black" 
                            : "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-black"
                          }`}
                          title={u.isBlocked ? "Unblock account" : "Block account"}
                        >
                          {actionLoading === u._id ? (
                            <RefreshCw size={18} className="animate-spin" />
                          ) : u.isBlocked ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                        </button>

                        <button 
                          onClick={() => handleDeleteUser(u._id, u.name)}
                          disabled={actionLoading === u._id}
                          className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                          title="Permanently remove"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-6 bg-(--card-bg) border border-(--card-border) rounded-full text-slate-500">
                          <AlertTriangle size={48} />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-(--text-main)">No users found</p>
                          <p className="text-sm text-(--text-dim)">Try adjusting your search or filters.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Info Box */}
        <section className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex gap-4">
          <div className="p-3 bg-amber-500 shadow-lg shadow-amber-500/20 rounded-2xl h-fit">
            <AlertTriangle className="text-black" size={24} />
          </div>
          <div>
            <h4 className="text-amber-500 font-bold mb-1">Administrative Protocols</h4>
            <p className="text-xs font-medium text-amber-500/80 leading-relaxed max-w-2xl">
              Blocking a user will immediately invalidate their active session. They will be logged out on their next interaction or page refresh. 
              Deleting a user is irreversible and will remove all associated ride history and driver profiles. Use with extreme caution.
            </p>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl py-10 px-6 border-t border-(--card-border) flex justify-between items-center opacity-50">
        <p className="text-[10px] font-bold tracking-widest uppercase">Safe & Secure Panel</p>
        <p className="text-[10px] font-bold tracking-widest uppercase">RouteMate Infrastructure</p>
      </footer>
    </div>
  );
};

export default ManageUsersPage;
