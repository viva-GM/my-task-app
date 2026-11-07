import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Department, UserRole, Task } from '../../types';
import { 
  Users, 
  Building2, 
  Plus, 
  Trash2, 
  Edit2, 
  ShieldCheck, 
  Crown, 
  Workflow, 
  Briefcase, 
  UserCheck, 
  Search,
  CheckCircle2,
  Lock,
  Eye,
  ChevronDown,
  ChevronUp,
  Camera,
  Upload,
  Image as ImageIcon,
  Layers,
  ArrowUpDown,
  Filter,
  Check,
  X,
  Mail,
  User as UserIcon,
  Sparkles,
  FolderKanban,
  Clock
} from 'lucide-react';
import { CameraCaptureModal } from '../CameraCaptureModal';
import { compressImage } from '../../utils/imageCompressor';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
];

export const AdminSpace: React.FC = () => {
  const { 
    currentUser, 
    users, 
    departments, 
    tasks, 
    addUser, 
    updateUser, 
    deleteUser, 
    addDepartment, 
    updateDepartment, 
    deleteDepartment
  } = useApp();

  const isAdmin = currentUser.role === 'admin';

  const [activeTab, setActiveTab] = useState<'users' | 'departments'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Requirement 3: Grouping by role & Sorting within groups
  const [groupByRole, setGroupByRole] = useState(true);
  const [sortBy, setSortBy] = useState<'dept' | 'name' | 'tasks'>('dept');

  // Requirement 1: Expandable Departments in accordion style
  const [expandedDeptIds, setExpandedDeptIds] = useState<string[]>([]);

  // Modals state for admin operations
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // View-only user modal (for non-admins or info inspection)
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  // Quick Avatar Changer Modal state (accessible to anyone for any employee)
  const [avatarModalUser, setAvatarModalUser] = useState<User | null>(null);
  const [isAvatarCameraOpen, setIsAvatarCameraOpen] = useState(false);
  const quickAvatarFileInputRef = useRef<HTMLInputElement>(null);
  const [quickAvatarUrlInput, setQuickAvatarUrlInput] = useState('');
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState<string | null>(null);

  const handleUpdateUserAvatar = (userId: string, newAvatar: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    updateUser({
      ...target,
      avatar: newAvatar
    });
    if (viewingUser && viewingUser.id === userId) {
      setViewingUser({
        ...viewingUser,
        avatar: newAvatar
      });
    }
    if (avatarModalUser && avatarModalUser.id === userId) {
      setAvatarModalUser({
        ...avatarModalUser,
        avatar: newAvatar
      });
    }
    setAvatarSuccessMsg('Avatar updated successfully!');
    setTimeout(() => setAvatarSuccessMsg(null), 3000);
  };

  // Form states for user
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('employee');
  const [userDeptId, setUserDeptId] = useState<string>('');
  const [userTitle, setUserTitle] = useState('');
  const [userAvatar, setUserAvatar] = useState('');

  // Avatar picker helpers
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states for dept
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptColor, setDeptColor] = useState('#3B82F6');
  const [deptHeadId, setDeptHeadId] = useState('');

  const toggleExpandDept = (id: string) => {
    setExpandedDeptIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const openAddUser = () => {
    if (!isAdmin) return;
    setUserName('');
    setUserEmail('');
    setUserRole('employee');
    setUserDeptId(departments[0]?.id || '');
    setUserTitle('');
    setUserAvatar(AVATAR_PRESETS[0]);
    setIsAddUserOpen(true);
  };

  const openEditUser = (user: User) => {
    if (!isAdmin) return;
    setEditingUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserRole(user.role);
    setUserDeptId(user.departmentId || '');
    setUserTitle(user.title);
    setUserAvatar(user.avatar || AVATAR_PRESETS[0]);
  };

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setUserAvatar(compressed);
      } catch (err) {
        console.error('Failed to compress avatar image', err);
      }
    }
  };

  // Clipboard paste listener for avatar modal
  useEffect(() => {
    if (!isAddUserOpen && !editingUser) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            try {
              const compressed = await compressImage(blob);
              setUserAvatar(compressed);
            } catch (err) {
              console.error('Failed to process pasted avatar', err);
            }
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isAddUserOpen, editingUser]);

  useEffect(() => {
    if (!avatarModalUser) return;
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            try {
              const compressed = await compressImage(blob);
              handleUpdateUserAvatar(avatarModalUser.id, compressed);
            } catch (err) {
              console.error('Failed to process pasted avatar', err);
            }
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [avatarModalUser]);

  const handleSaveUser = () => {
    if (!isAdmin || !userName.trim() || !userEmail.trim()) return;

    const finalAvatar = userAvatar || AVATAR_PRESETS[0];

    if (editingUser) {
      updateUser({
        ...editingUser,
        name: userName,
        email: userEmail,
        role: userRole,
        departmentId: userDeptId || undefined,
        title: userTitle || 'Team Member',
        avatar: finalAvatar
      });
      setEditingUser(null);
    } else {
      addUser({
        name: userName,
        email: userEmail,
        role: userRole,
        departmentId: userDeptId || undefined,
        title: userTitle || 'Team Member',
        avatar: finalAvatar
      });
      setIsAddUserOpen(false);
    }
  };

  const openAddDept = () => {
    if (!isAdmin) return;
    setDeptName('');
    setDeptCode('');
    setDeptDesc('');
    setDeptColor('#3B82F6');
    setDeptHeadId('');
    setIsAddDeptOpen(true);
  };

  const openEditDept = (dept: Department) => {
    if (!isAdmin) return;
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setDeptDesc(dept.description);
    setDeptColor(dept.color);
    setDeptHeadId(dept.headId || '');
  };

  const handleSaveDept = () => {
    if (!isAdmin || !deptName.trim() || !deptCode.trim()) return;

    if (editingDept) {
      updateDepartment({
        ...editingDept,
        name: deptName,
        code: deptCode.toUpperCase(),
        description: deptDesc,
        color: deptColor,
        headId: deptHeadId || undefined
      });
      setEditingDept(null);
    } else {
      addDepartment({
        name: deptName,
        code: deptCode.toUpperCase(),
        description: deptDesc,
        color: deptColor,
        headId: deptHeadId || undefined
      });
      setIsAddDeptOpen(false);
    }
  };

  const roleMeta: Record<UserRole, { label: string; icon: any; color: string; desc: string }> = {
    board: { 
      label: 'Board of Directors', 
      icon: Crown, 
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      desc: 'Strategic oversight, high-level drafts evaluation, project approvals'
    },
    ops_manager: { 
      label: 'Operations Management', 
      icon: Workflow, 
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      desc: 'Workload assessment, Bill of Materials (BoM), delegation to departments & quality sign-off'
    },
    dept_head: { 
      label: 'Department Heads', 
      icon: Briefcase, 
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      desc: 'Subtask decomposition, internal team coordination and milestone review'
    },
    employee: { 
      label: 'Execution Specialists', 
      icon: UserCheck, 
      color: 'text-slate-700 bg-slate-100 border-slate-200',
      desc: 'Hands-on task execution, deliverables fulfillment, and operational updates'
    },
    admin: { 
      label: 'System Administrators', 
      icon: ShieldCheck, 
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      desc: 'User identity management, corporate directory, system structure and department governance'
    }
  };

  // Filter users based on search & role filter
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (departments.find(d => d.id === u.departmentId)?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Sorting helper
  const sortUsersList = (list: User[]) => {
    return [...list].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'tasks') {
        const countA = tasks.filter(t => t.assignedToId === a.id).length;
        const countB = tasks.filter(t => t.assignedToId === b.id).length;
        return countB - countA;
      }
      // default: by department name
      const deptA = departments.find(d => d.id === a.departmentId)?.name || 'ZZZ General';
      const deptB = departments.find(d => d.id === b.departmentId)?.name || 'ZZZ General';
      const deptCompare = deptA.localeCompare(deptB);
      if (deptCompare !== 0) return deptCompare;
      return a.name.localeCompare(b.name);
    });
  };

  // Group definitions in corporate hierarchy sequence
  const ROLE_GROUPS: UserRole[] = ['board', 'ops_manager', 'dept_head', 'employee', 'admin'];

  return (
    <div className="space-y-6">
      
      {/* Space Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {isAdmin ? 'Admin & Users' : 'Users and Departments'}
            </h1>
            
            {isAdmin ? (
              <span className="text-xs bg-rose-100 text-rose-800 font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border border-rose-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Administrator Workspace</span>
              </span>
            ) : (
              <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border border-slate-200">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Directory · View Only</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin 
              ? 'Full management of team members, roles, corporate departments, and permissions'
              : 'Corporate hierarchy, departmental rosters, and team member directory'}
          </p>
        </div>

        {/* Tab navigation: Users vs Departments */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Employees ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('departments')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'departments'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Departments ({departments.length})</span>
          </button>
        </div>
      </div>

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          
          {/* Action & Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name, role, title, email, dept..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white outline-none focus:border-indigo-500"
                />
              </div>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white outline-none cursor-pointer"
              >
                <option value="all">All Roles ({users.length})</option>
                <option value="board">Board of Directors</option>
                <option value="ops_manager">Operations Management</option>
                <option value="dept_head">Department Heads</option>
                <option value="employee">Specialists</option>
                <option value="admin">Administrators</option>
              </select>

              {/* Sorting Selection (Requirement 3) */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-500">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white outline-none cursor-pointer"
                >
                  <option value="dept">Department</option>
                  <option value="name">Name (A–Z)</option>
                  <option value="tasks">Active Tasks</option>
                </select>
              </div>

              {/* Group by Role Toggle (Requirement 3) */}
              <button
                type="button"
                onClick={() => setGroupByRole(!groupByRole)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  groupByRole
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
                title="Toggle grouping by hierarchical system roles"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Group by Role: {groupByRole ? 'On' : 'Off'}</span>
              </button>
            </div>

            {/* Admin Add User Button (Requirement 1: only for Admin) */}
            {isAdmin && (
              <button
                onClick={openAddUser}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Employee</span>
              </button>
            )}
          </div>

          {/* RENDER EMPLOYEES: GROUPED BY ROLE OR FLAT LIST */}
          {groupByRole ? (
            /* GROUPED BY ROLE (Requirement 3) */
            <div className="space-y-6">
              {ROLE_GROUPS.map(roleKey => {
                const groupUsers = sortUsersList(filteredUsers.filter(u => u.role === roleKey));
                if (groupUsers.length === 0) return null;

                const meta = roleMeta[roleKey];
                const RoleIcon = meta.icon;

                return (
                  <div key={roleKey} className="space-y-3">
                    
                    {/* Role Group Section Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <span className={`p-1.5 rounded-lg border shadow-2xs ${meta.color}`}>
                          <RoleIcon className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">
                              {meta.label}
                            </h3>
                            <span className="text-[11px] font-mono font-semibold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              {groupUsers.length}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {meta.desc}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] text-slate-400 font-medium">
                        Sorted by {sortBy === 'dept' ? 'Department' : sortBy === 'name' ? 'Name' : 'Active Tasks'}
                      </span>
                    </div>

                    {/* Table for this Role Group */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                              <th className="py-2.5 px-4">Employee</th>
                              <th className="py-2.5 px-4">Job Title</th>
                              <th className="py-2.5 px-4">Department</th>
                              <th className="py-2.5 px-4">Active Tasks</th>
                              <th className="py-2.5 px-4 text-right">{isAdmin ? 'Actions' : 'Profile'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {groupUsers.map(user => {
                              const dept = departments.find(d => d.id === user.departmentId);
                              const userTasks = tasks.filter(t => t.assignedToId === user.id && t.boardStatus !== 'completed' && t.departmentStatus !== 'archive');

                              return (
                                <tr 
                                  key={user.id} 
                                  onClick={() => setViewingUser(user)}
                                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                >
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                      <div className="relative group/avatar shrink-0">
                                        <img
                                          src={user.avatar}
                                          alt={user.name}
                                          referrerPolicy="no-referrer"
                                          className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200 group-hover:ring-indigo-300"
                                        />
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setAvatarModalUser(user);
                                          }}
                                          className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer shadow-xs"
                                          title="Click to change avatar"
                                        >
                                          <Camera className="w-3.5 h-3.5" />
                                        </button>
                                        {user.id === currentUser.id && (
                                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full z-10" title="You" />
                                        )}
                                      </div>
                                      <div>
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                          <span>{user.name}</span>
                                          {user.id === currentUser.id && (
                                            <span className="text-[10px] text-emerald-700 bg-emerald-50 font-semibold px-1.5 py-0.2 rounded">
                                              Current
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                          <Mail className="w-3 h-3 text-slate-300" />
                                          <span>{user.email}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-medium">
                                    {user.title}
                                  </td>

                                  <td className="py-3 px-4 whitespace-nowrap">
                                    {dept ? (
                                      <span
                                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold inline-flex items-center gap-1"
                                        style={{ backgroundColor: `${dept.color}15`, color: dept.color }}
                                      >
                                        <Building2 className="w-3 h-3" />
                                        <span>{dept.name}</span>
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 italic text-[11px]">Organization-wide</span>
                                    )}
                                  </td>

                                  <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                                    <span className="font-semibold text-slate-800">{userTasks.length}</span>
                                    <span className="text-slate-400 text-[11px] ml-1">in progress</span>
                                  </td>

                                  <td className="py-3 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                    {isAdmin ? (
                                      /* Admin controls (Requirement 1) */
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          onClick={() => openEditUser(user)}
                                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                          title="Edit employee & avatar"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        {user.id !== currentUser.id && (
                                          <button
                                            onClick={() => {
                                              if (confirm(`Delete employee ${user.name}?`)) {
                                                deleteUser(user.id);
                                              }
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                            title="Delete employee"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      /* Non-admin view button (Requirement 1) */
                                      <button
                                        onClick={() => setViewingUser(user)}
                                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                                      >
                                        View Details
                                      </button>
                                    )}
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
              })}
            </div>
          ) : (
            /* FLAT LIST (Sorted according to selected option) */
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">System Role</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Assigned Tasks</th>
                      <th className="py-3 px-4 text-right">{isAdmin ? 'Actions' : 'Profile'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortUsersList(filteredUsers).map(user => {
                      const dept = departments.find(d => d.id === user.departmentId);
                      const userTasksCount = tasks.filter(t => t.assignedToId === user.id && t.boardStatus !== 'completed').length;
                      const meta = roleMeta[user.role];
                      const RoleIcon = meta.icon;

                      return (
                        <tr 
                          key={user.id} 
                          onClick={() => setViewingUser(user)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative group/avatar shrink-0">
                                <img
                                  src={user.avatar}
                                  alt={user.name}
                                  referrerPolicy="no-referrer"
                                  className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 group-hover:ring-indigo-300"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAvatarModalUser(user);
                                  }}
                                  className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer shadow-xs"
                                  title="Click to change avatar"
                                >
                                  <Camera className="w-3 h-3" />
                                </button>
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{user.name}</span>
                                  {user.id === currentUser.id && (
                                    <span className="text-[10px] text-emerald-700 bg-emerald-50 font-semibold px-1.5 py-0.2 rounded">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500">{user.title}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{user.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${meta.color}`}>
                              <RoleIcon className="w-3.5 h-3.5" />
                              <span>{meta.label}</span>
                            </span>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {dept ? (
                              <span
                                className="px-2 py-0.5 rounded text-[11px] font-semibold inline-flex items-center gap-1"
                                style={{ backgroundColor: `${dept.color}15`, color: dept.color }}
                              >
                                {dept.name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Organization-wide</span>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                            <span className="font-semibold text-slate-700">{userTasksCount}</span>
                            <span className="text-slate-400 text-[11px] ml-1">active</span>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            {isAdmin ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditUser(user)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                  title="Edit employee & avatar"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {user.id !== currentUser.id && (
                                  <button
                                    onClick={() => {
                                      if (confirm(`Delete user ${user.name}?`)) {
                                        deleteUser(user.id);
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => setViewingUser(user)}
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* DEPARTMENTS TAB (Requirement 1: Expandable Cards revealing members) */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          
          {/* Action Toolbar */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Organizational Departments
              </h3>
              <p className="text-[11px] text-slate-500">
                Click any department card to expand it and inspect its full roster of staff members.
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={openAddDept}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Department</span>
              </button>
            )}
          </div>

          {/* Departments Grid (with Expandable Accordion items - Requirement 1) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departments.map(dept => {
              const head = users.find(u => u.id === dept.headId);
              const members = users.filter(u => u.departmentId === dept.id);
              const deptTasks = tasks.filter(t => t.departmentId === dept.id);
              const isExpanded = expandedDeptIds.includes(dept.id);

              return (
                <div
                  key={dept.id}
                  className={`bg-white rounded-xl border transition-all duration-200 shadow-2xs hover:shadow-xs overflow-hidden ${
                    isExpanded 
                      ? 'md:col-span-2 border-indigo-400 ring-2 ring-indigo-100 shadow-md' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Clickable Header / Card Top */}
                  <div
                    onClick={() => toggleExpandDept(dept.id)}
                    className="p-5 cursor-pointer flex flex-col justify-between space-y-4 select-none hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-2xs shrink-0"
                          style={{ backgroundColor: dept.color }}
                        >
                          {dept.code}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{dept.name}</h4>
                            <span className="text-[11px] text-slate-400 font-mono">Code: {dept.code}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                            {dept.description}
                          </p>
                        </div>
                      </div>

                      {/* Right controls: Admin actions + Expand toggle */}
                      <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditDept(dept)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title="Edit department"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {departments.length > 1 && (
                              <button
                                onClick={() => {
                                  if (confirm(`Delete department ${dept.name}?`)) {
                                    deleteDepartment(dept.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                title="Delete department"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Expand / Collapse Button */}
                        <button
                          type="button"
                          onClick={() => toggleExpandDept(dept.id)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            isExpanded
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <span>{isExpanded ? 'Collapse' : 'View Members'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Summary row (Head + Stats) */}
                    <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Department Head:
                        </span>
                        {head ? (
                          <div className="flex items-center gap-2 mt-1">
                            <img
                              src={head.avatar}
                              alt={head.name}
                              referrerPolicy="no-referrer"
                              className="w-5 h-5 rounded-full object-cover"
                            />
                            <span className="font-semibold text-slate-800 truncate">{head.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs mt-1 block">Unassigned</span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Department Stats:
                        </span>
                        <div className="text-slate-700 font-medium mt-1">
                          <b>{members.length}</b> staff members · <b>{deptTasks.length}</b> tasks
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED SECTION (Requirement 1: Accordion reveals all employees in this department) */}
                  {isExpanded && (
                    <div className="border-t border-indigo-100 bg-indigo-50/20 p-5 space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-600" />
                          <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Department Team Members ({members.length})
                          </h5>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Click any member to view profile details
                        </span>
                      </div>

                      {members.length === 0 ? (
                        <div className="p-4 bg-white rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-400 italic">
                          No employees currently assigned to this department
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {members.map(member => {
                            const isHead = member.id === dept.headId;
                            const memberTasks = tasks.filter(t => t.assignedToId === member.id && t.boardStatus !== 'completed');

                            return (
                              <div
                                key={member.id}
                                onClick={() => setViewingUser(member)}
                                className={`p-3 rounded-lg border transition-all cursor-pointer bg-white hover:border-indigo-300 hover:shadow-xs space-y-2.5 ${
                                  isHead ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-slate-200'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="relative group/avatar shrink-0">
                                      <img
                                        src={member.avatar}
                                        alt={member.name}
                                        referrerPolicy="no-referrer"
                                        className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100"
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAvatarModalUser(member);
                                        }}
                                        className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer shadow-xs"
                                        title="Click to change avatar"
                                      >
                                        <Camera className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-slate-900 text-xs truncate">
                                          {member.name}
                                        </span>
                                        {isHead && (
                                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-bold rounded shrink-0">
                                            HEAD
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-slate-500 truncate">
                                        {member.title}
                                      </p>
                                    </div>
                                  </div>

                                  {isAdmin && (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        openEditUser(member);
                                      }}
                                      className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                                      title="Edit employee"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                                  <span className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                                    {member.email}
                                  </span>
                                  <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                    {memberTasks.length} active tasks
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Collapse footer button */}
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => toggleExpandDept(dept.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                        >
                          <span>Close department roster</span>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* VIEW-ONLY USER PROFILE MODAL (Available to all roles - Requirement 1) */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Employee Directory Profile
                </h3>
              </div>
              <button
                onClick={() => setViewingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-6 space-y-5 overflow-y-auto">
              
              {/* Profile Card Top with Interactive Avatar Management */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="relative group shrink-0">
                    <img
                      src={viewingUser.avatar}
                      alt={viewingUser.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-300 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setAvatarModalUser(viewingUser)}
                      className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Change Avatar"
                    >
                      <Camera className="w-4 h-4 mb-0.5" />
                      <span>Change</span>
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-base font-bold text-slate-900 truncate">
                        {viewingUser.name}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setAvatarModalUser(viewingUser)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Change Avatar</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      {viewingUser.title}
                    </p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {viewingUser.email}
                    </p>
                  </div>
                </div>

                {/* Instant Corporate Preset Picker inside profile */}
                <div className="pt-2 border-t border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Corporate Photo Presets:</span>
                    <button
                      type="button"
                      onClick={() => setAvatarModalUser(viewingUser)}
                      className="text-indigo-600 hover:underline capitalize"
                    >
                      Upload custom or snapshot →
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {AVATAR_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleUpdateUserAvatar(viewingUser.id, preset)}
                        className={`rounded-full p-0.5 border-2 transition-all cursor-pointer shrink-0 ${
                          viewingUser.avatar === preset
                            ? 'border-indigo-600 ring-2 ring-indigo-200 scale-105'
                            : 'border-transparent hover:border-slate-300 opacity-80 hover:opacity-100'
                        }`}
                        title={`Select preset ${idx + 1}`}
                      >
                        <img
                          src={preset}
                          alt={`Preset ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Roles & Department details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    System Role
                  </span>
                  <span className="font-semibold text-slate-800 capitalize flex items-center gap-1.5">
                    {roleMeta[viewingUser.role].label}
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Department
                  </span>
                  <span className="font-semibold text-slate-800">
                    {departments.find(d => d.id === viewingUser.departmentId)?.name || 'Organization-wide'}
                  </span>
                </div>
              </div>

              {/* Active Assigned Tasks list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 uppercase tracking-wider">
                    Currently Assigned Tasks
                  </span>
                  <span className="text-slate-400">
                    {tasks.filter(t => t.assignedToId === viewingUser.id).length} total
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {tasks.filter(t => t.assignedToId === viewingUser.id).length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 italic bg-slate-50 rounded-lg">
                      No active tasks currently assigned
                    </div>
                  ) : (
                    tasks
                      .filter(t => t.assignedToId === viewingUser.id)
                      .map(t => (
                        <div
                          key={t.id}
                          className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-2"
                        >
                          <span className="font-medium text-slate-800 truncate">
                            {t.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                            {t.dueDate}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    const u = viewingUser;
                    setViewingUser(null);
                    openEditUser(u);
                  }}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit in Admin Mode</span>
                </button>
              )}
              <div className="ml-auto">
                <button
                  type="button"
                  onClick={() => setViewingUser(null)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* USER EDIT / CREATE MODAL WITH COMPREHENSIVE AVATAR MANAGEMENT (Requirement 2 & Requirement 1) */}
      {(isAddUserOpen || editingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingUser ? 'Edit Employee Profile' : 'Add New Employee'}
              </h3>
              <button
                onClick={() => {
                  setIsAddUserOpen(false);
                  setEditingUser(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* REQUIREMENT 2: AVATAR MANAGEMENT SECTION */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Employee Avatar & Photo (Upload, Paste or Camera)
                </label>

                <div className="flex items-center gap-4">
                  {/* Current Avatar Preview */}
                  <div className="relative group shrink-0">
                    <img
                      src={userAvatar || AVATAR_PRESETS[0]}
                      alt="Avatar Preview"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-400 shadow-sm"
                    />
                  </div>

                  {/* Upload / Camera actions */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* File upload */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleAvatarFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Upload File</span>
                      </button>

                      {/* Camera snapshot */}
                      <button
                        type="button"
                        onClick={() => setIsCameraOpen(true)}
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Camera className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Camera</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Supports JPG, PNG, WebP or direct clipboard paste (Ctrl+V).
                    </p>
                  </div>
                </div>

                {/* Preset Avatars Selection */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Or select a corporate preset:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {AVATAR_PRESETS.map((presetUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setUserAvatar(presetUrl)}
                        className={`relative rounded-full p-0.5 border-2 transition-all cursor-pointer shrink-0 ${
                          userAvatar === presetUrl
                            ? 'border-indigo-600 ring-2 ring-indigo-200 scale-105'
                            : 'border-transparent hover:border-slate-300 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={presetUrl}
                          alt={`Preset ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom URL Input */}
                <div className="pt-1">
                  <input
                    type="text"
                    value={userAvatar}
                    onChange={e => setUserAvatar(e.target.value)}
                    placeholder="Or enter direct image URL..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 bg-white outline-none focus:border-indigo-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Basic Information */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    placeholder="e.g. Alexander Wright"
                    className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Work Email *</label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={e => setUserEmail(e.target.value)}
                    placeholder="alexander.wright@company.internal"
                    className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">System Role *</label>
                    <select
                      value={userRole}
                      onChange={e => setUserRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 border rounded-lg text-xs bg-white outline-none cursor-pointer"
                    >
                      <option value="employee">Specialist</option>
                      <option value="dept_head">Department Head</option>
                      <option value="ops_manager">Operations Manager</option>
                      <option value="board">Board Director</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Department</label>
                    <select
                      value={userDeptId}
                      onChange={e => setUserDeptId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs bg-white outline-none cursor-pointer"
                    >
                      <option value="">No Department (General)</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Job Title</label>
                  <input
                    type="text"
                    value={userTitle}
                    onChange={e => setUserTitle(e.target.value)}
                    placeholder="e.g. Procurement Officer, Senior Architect, etc."
                    className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddUserOpen(false);
                  setEditingUser(null);
                }}
                className="px-4 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveUser}
                className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs"
              >
                Save Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEPARTMENT EDIT / CREATE MODAL (Admin only - Requirement 1) */}
      {(isAddDeptOpen || editingDept) && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingDept ? 'Edit Department' : 'Create New Department'}
              </h3>
              <button
                onClick={() => {
                  setIsAddDeptOpen(false);
                  setEditingDept(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Department Name *</label>
                <input
                  type="text"
                  value={deptName}
                  onChange={e => setDeptName(e.target.value)}
                  placeholder="e.g. Office & Procurement"
                  className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Code (2-4 characters) *</label>
                  <input
                    type="text"
                    value={deptCode}
                    onChange={e => setDeptCode(e.target.value.toUpperCase())}
                    placeholder="OFF"
                    maxLength={4}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-mono uppercase outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Color Badge</label>
                  <input
                    type="color"
                    value={deptColor}
                    onChange={e => setDeptColor(e.target.value)}
                    className="w-full h-8 p-0 border rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Assign Department Head</label>
                <select
                  value={deptHeadId}
                  onChange={e => setDeptHeadId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-xs bg-white outline-none cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.title})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Department Scope & Mission</label>
                <textarea
                  rows={2}
                  value={deptDesc}
                  onChange={e => setDeptDesc(e.target.value)}
                  placeholder="Describe the responsibilities and focus of this department..."
                  className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddDeptOpen(false);
                  setEditingDept(null);
                }}
                className="px-4 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDept}
                className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs"
              >
                Save Department
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAMERA CAPTURE MODAL (Requirement 2) */}
      {isCameraOpen && (
        <CameraCaptureModal
          onCapture={photoUrl => {
            setUserAvatar(photoUrl);
            setIsCameraOpen(false);
          }}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* QUICK AVATAR PICKER MODAL (Requirement 2) */}
      {avatarModalUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Change Avatar · {avatarModalUser.name}
                </h3>
              </div>
              <button
                onClick={() => setAvatarModalUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Current Preview */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <img
                  src={avatarModalUser.avatar}
                  alt={avatarModalUser.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-400 shadow-sm shrink-0"
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{avatarModalUser.name}</h4>
                  <p className="text-xs text-slate-500">{avatarModalUser.title}</p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    {avatarSuccessMsg || 'Select a new photo or preset below'}
                  </p>
                </div>
              </div>

              {/* Upload & Camera Buttons */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Upload from Device or Web Camera
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="file"
                    ref={quickAvatarFileInputRef}
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressed = await compressImage(file);
                          handleUpdateUserAvatar(avatarModalUser.id, compressed);
                        } catch (err) {
                          console.error('Avatar file upload failed', err);
                        }
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => quickAvatarFileInputRef.current?.click()}
                    className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>Upload File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAvatarCameraOpen(true)}
                    className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Camera className="w-4 h-4 text-indigo-600" />
                    <span>Web Camera</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tip: You can also paste an image from your clipboard (Ctrl+V) right here.
                </p>
              </div>

              {/* Presets */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Corporate Presets (Click to Apply Instantly)
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleUpdateUserAvatar(avatarModalUser.id, preset)}
                      className={`relative rounded-xl p-1 border-2 transition-all cursor-pointer flex items-center justify-center ${
                        avatarModalUser.avatar === preset
                          ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200'
                          : 'border-slate-200 hover:border-indigo-300 bg-white'
                      }`}
                    >
                      <img
                        src={preset}
                        alt={`Preset ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* URL Input */}
              <div className="space-y-1 pt-2 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Or Image Web URL
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickAvatarUrlInput}
                    onChange={e => setQuickAvatarUrlInput(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (quickAvatarUrlInput.trim()) {
                        handleUpdateUserAvatar(avatarModalUser.id, quickAvatarUrlInput.trim());
                        setQuickAvatarUrlInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setAvatarModalUser(null)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK AVATAR CAMERA CAPTURE */}
      {isAvatarCameraOpen && avatarModalUser && (
        <CameraCaptureModal
          onCapture={photoUrl => {
            handleUpdateUserAvatar(avatarModalUser.id, photoUrl);
            setIsAvatarCameraOpen(false);
          }}
          onClose={() => setIsAvatarCameraOpen(false)}
        />
      )}

    </div>
  );
};
