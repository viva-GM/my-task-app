import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BoardSpace } from './components/board/BoardSpace';
import { DepartmentSpace } from './components/department/DepartmentSpace';
import { AdminSpace } from './components/admin/AdminSpace';
import { Info, X, Sparkles, CheckCircle2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeSpace, currentUser, canAccessBoardSpace } = useApp();
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <Header />

      {/* Guided Quick Workflow Banner */}
      {showWorkflowGuide && (
        <div className="bg-indigo-900 text-white border-b border-indigo-950 py-2.5 px-4 sm:px-6 lg:px-8 text-xs transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <span className="p-1 bg-indigo-700 rounded-md shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </span>
              <div className="truncate">
                <span className="font-bold text-indigo-200">Corporate Workflow: </span>
                <span className="text-indigo-100">
                  Board drafts idea → Converts to Task/Project → Ops Manager conducts Assessment & Bill of Materials (BoM) → Department executes → Ops Manager approves "COMPLETED" → Archived in Dept & Done on Board.
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowWorkflowGuide(false)}
              className="text-indigo-300 hover:text-white p-1 rounded transition-colors shrink-0"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeSpace === 'board' && (canAccessBoardSpace() ? <BoardSpace /> : <DepartmentSpace />)}
        {activeSpace === 'departments' && <DepartmentSpace />}
        {activeSpace === 'admin' && <AdminSpace />}
      </main>

      {/* Quiet Footer */}
      <footer className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Apex Task Engine · Enterprise Multi-Level Work & Materials Management</span>
          <span className="text-[11px] text-slate-400">
            Active Session: <b className="text-slate-700">{currentUser.name}</b> ({currentUser.title})
          </span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
