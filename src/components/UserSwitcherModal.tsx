import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';
import { X, Check, ShieldCheck, Crown, Workflow, Briefcase, UserCheck, Camera, Upload } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

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

interface Props {
  onClose: () => void;
}

export const UserSwitcherModal: React.FC<Props> = ({ onClose }) => {
  const { users, currentUser, setCurrentUserId, departments, updateUser } = useApp();
  const [avatarTargetUser, setAvatarTargetUser] = useState<User | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (user: User) => {
    setCurrentUserId(user.id);
    onClose();
  };

  const handleApplyAvatar = (newAvatar: string) => {
    if (!avatarTargetUser) return;
    updateUser({
      ...avatarTargetUser,
      avatar: newAvatar
    });
    setAvatarTargetUser(prev => prev ? { ...prev, avatar: newAvatar } : null);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          title: 'System Administrator',
          icon: ShieldCheck,
          badge: 'bg-rose-100 text-rose-800 border-rose-300',
          desc: 'Full access to all workspaces, department directories, and system user management'
        };
      case 'board':
        return {
          title: 'Board of Directors',
          icon: Crown,
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          desc: 'Draft strategic ideas, qualify into tasks or projects, reject, and executive governance'
        };
      case 'ops_manager':
        return {
          title: 'Operations Manager (OM)',
          icon: Workflow,
          badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          desc: 'Bill of Materials (BoM), department delegation, procurement assignments, and final review'
        };
      case 'dept_head':
        return {
          title: 'Head of Department',
          icon: Briefcase,
          badge: 'bg-blue-100 text-blue-800 border-blue-300',
          desc: 'Department workload planning, internal evaluation, subtasks, and timeline scheduling'
        };
      case 'employee':
      default:
        return {
          title: 'Team Specialist / Member',
          icon: UserCheck,
          badge: 'bg-slate-100 text-slate-700 border-slate-300',
          desc: 'Views assigned tasks in department, updates deliverables, and executes subtasks'
        };
    }
  };

  const rolesOrder: UserRole[] = ['admin', 'board', 'ops_manager', 'dept_head', 'employee'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Active User Switcher
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate role-based permissions, Board access restrictions, and department views
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Users by Role */}
        <div className="p-6 overflow-y-auto space-y-6">
          {rolesOrder.map(role => {
            const roleUsers = users.filter(u => u.role === role);
            if (roleUsers.length === 0) return null;
            const meta = getRoleBadge(role);
            const RoleIcon = meta.icon;

            return (
              <div key={role} className="space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <RoleIcon className="w-4 h-4 text-slate-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {meta.title}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    {meta.desc}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {roleUsers.map(user => {
                    const isSelected = user.id === currentUser.id;
                    const dept = departments.find(d => d.id === user.departmentId);

                    return (
                      <button
                        key={user.id}
                        onClick={() => handleSelect(user)}
                        className={`group flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'bg-indigo-50/80 border-indigo-400 shadow-xs ring-1 ring-indigo-300'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative group/avatar shrink-0">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                            />
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setAvatarTargetUser(user);
                              }}
                              className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer shadow-xs"
                              title="Change Avatar for this user"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                {user.name}
                              </span>
                              {isSelected && (
                                <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {user.title}
                            </div>
                            {dept && (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: dept.color }}
                                />
                                <span>{dept.name}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 ml-2">
                          {isSelected ? (
                            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 stroke-3" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border border-slate-200 group-hover:border-slate-300 flex items-center justify-center text-transparent group-hover:text-slate-400">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Role Switcher Simulation</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Quick Avatar Picker Dialog */}
        {avatarTargetUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-5 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-900">
                    Change Avatar · {avatarTargetUser.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setAvatarTargetUser(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={avatarTargetUser.avatar}
                  alt={avatarTargetUser.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-400 shrink-0"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">{avatarTargetUser.name}</p>
                  <p className="text-[11px] text-slate-500">{avatarTargetUser.title}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Select Corporate Preset:
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyAvatar(preset)}
                      className={`p-0.5 rounded-lg border-2 transition-all cursor-pointer ${
                        avatarTargetUser.avatar === preset
                          ? 'border-indigo-600 ring-1 ring-indigo-300'
                          : 'border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <img src={preset} alt={`P${idx}`} className="w-8 h-8 rounded-full object-cover mx-auto" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Or Upload File:
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const compressed = await compressImage(file);
                      handleApplyAvatar(compressed);
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Choose Image File</span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAvatarTargetUser(null)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
