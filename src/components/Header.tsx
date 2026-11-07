import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Building2, 
  Users, 
  Layers, 
  Kanban, 
  List, 
  Calendar as CalendarIcon, 
  Clock, 
  RotateCcw,
  ChevronDown
} from 'lucide-react';
import { UserSwitcherModal } from './UserSwitcherModal';

export const Header: React.FC = () => {
  const {
    currentUser,
    activeSpace,
    setActiveSpace,
    activeView,
    setActiveView,
    resetDemoData,
    departments,
    selectedDepartmentId,
    setSelectedDepartmentId,
    canAccessBoardSpace
  } = useApp();

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'Administrator', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    board: { label: 'Board Director', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    ops_manager: { label: 'Operations Mgr', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    dept_head: { label: 'Head of Dept', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    employee: { label: 'Specialist', color: 'bg-slate-100 text-slate-700 border-slate-200' }
  };

  const userRoleMeta = roleLabels[currentUser.role] || roleLabels.employee;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Zone 1: Brand Wordmark */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold tracking-wider shadow-sm">
                A
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                  Apex Task Engine
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Enterprise Work & Project Suite
                </span>
              </div>
            </div>

            {/* Zone 2: Space Nav Links (Rule: users below OM must not see Board Space) */}
            <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
              {canAccessBoardSpace() && (
                <button
                  onClick={() => setActiveSpace('board')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeSpace === 'board'
                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Board Space</span>
                </button>
              )}

              <button
                onClick={() => setActiveSpace('departments')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeSpace === 'departments'
                    ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Department Space</span>
              </button>

              <button
                onClick={() => setActiveSpace('admin')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeSpace === 'admin'
                    ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4 text-indigo-600" />
                <span>{currentUser.role === 'admin' ? 'Admin & Users' : 'Users and Departments'}</span>
              </button>
            </nav>

            {/* Zone 3: User Switcher & Controls */}
            <div className="flex items-center gap-3 shrink-0">
              
              {/* Reset demo data button */}
              <button
                onClick={() => {
                  if (confirm('Reset workspace data to initial clean state?')) {
                    resetDemoData();
                  }
                }}
                title="Reset workspace demo data"
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Active User Debug Switcher Trigger */}
              <button
                onClick={() => setIsSwitcherOpen(true)}
                className="group flex items-center gap-2.5 p-1.5 pr-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-left bg-white shadow-2xs cursor-pointer"
                title="Switch active user profile (role simulation)"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 group-hover:ring-indigo-300"
                />
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-900 truncate max-w-[130px]">
                      {currentUser.name}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 font-medium rounded-full border ${userRoleMeta.color}`}>
                      {userRoleMeta.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 truncate max-w-[170px]">
                    {currentUser.title}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors ml-1" />
              </button>
            </div>
          </div>

          {/* Sub-toolbar for active views: Kanban, List, Calendar, Timeline */}
          {activeSpace !== 'admin' && (
            <div className="flex items-center justify-between py-2 border-t border-slate-100">
              
              {/* Left: Department selector if in departments space */}
              {activeSpace === 'departments' ? (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-400 mr-1 text-[11px] font-medium">Department:</span>
                  {departments.map(dept => {
                    const isSelected = selectedDepartmentId === dept.id;
                    const isUserDept = currentUser.departmentId === dept.id;
                    return (
                      <button
                        key={dept.id}
                        onClick={() => setSelectedDepartmentId(dept.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {dept.name}
                        {isUserDept && (
                          <span className="ml-1.5 text-[10px] opacity-75">(mine)</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-medium">
                  Initiatives, assessment, BoM, task execution and board verification
                </div>
              )}

              {/* Right: View Mode Segmented Controls */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                <button
                  onClick={() => setActiveView('kanban')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeView === 'kanban'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Kanban className="w-3.5 h-3.5" />
                  <span>Kanban</span>
                </button>

                <button
                  onClick={() => setActiveView('list')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeView === 'list'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>

                <button
                  onClick={() => setActiveView('calendar')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeView === 'calendar'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Calendar</span>
                </button>

                <button
                  onClick={() => setActiveView('timeline')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeView === 'timeline'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Timeline (Gantt)</span>
                </button>
              </div>

            </div>
          )}

        </div>
      </header>

      {/* User Switcher Modal for debugging & testing roles */}
      {isSwitcherOpen && (
        <UserSwitcherModal onClose={() => setIsSwitcherOpen(false)} />
      )}
    </>
  );
};
