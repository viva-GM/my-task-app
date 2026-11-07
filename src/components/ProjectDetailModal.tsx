import React from 'react';
import { useApp } from '../context/AppContext';
import { Project, Priority } from '../types';
import { 
  X, 
  FolderKanban, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Users, 
  ChevronRight
} from 'lucide-react';

interface Props {
  project: Project;
  onClose: () => void;
  onSelectTask?: (taskId: string) => void;
  onOpenTask?: (taskId: string) => void;
}

export const ProjectDetailModal: React.FC<Props> = ({ project, onClose, onSelectTask, onOpenTask }) => {
  const { tasks, departments, users } = useApp();

  const handleTaskClick = (taskId: string) => {
    if (onSelectTask) {
      onSelectTask(taskId);
    } else if (onOpenTask) {
      onOpenTask(taskId);
    }
  };

  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const completedTasks = projectTasks.filter(t => t.boardStatus === 'completed' || t.departmentStatus === 'archive');
  const progressPercent = projectTasks.length > 0
    ? Math.round((completedTasks.length / projectTasks.length) * 100)
    : 0;

  const priorityLabels: Record<Priority, { label: string; color: string }> = {
    urgent: { label: 'Urgent', color: 'bg-rose-100 text-rose-800' },
    high: { label: 'High', color: 'bg-amber-100 text-amber-800' },
    medium: { label: 'Medium', color: 'bg-blue-100 text-blue-800' },
    low: { label: 'Low', color: 'bg-slate-100 text-slate-800' }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-purple-50/60">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-purple-600 text-white rounded-lg shadow-2xs">
              <FolderKanban className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {project.title}
                </h2>
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${priorityLabels[project.priority].color}`}>
                  {priorityLabels[project.priority].label}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Board Strategic Project · Status: «{project.boardStatus === 'completed' ? 'Completed' : 'In Execution'}»
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Progress Bar */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider">
                Project Execution Progress
              </span>
              <span className="font-mono font-bold text-purple-700 text-sm">
                {progressPercent}% ({completedTasks.length} of {projectTasks.length} completed)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Objectives & Scope
              </label>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                {project.description}
              </p>
            </div>
          )}

          {/* Key Dates & Depts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Timeline</span>
              </span>
              <span className="font-semibold text-slate-900 block tabular-nums">
                {project.startDate} → {project.dueDate}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>Involved Departments</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {project.departmentIds?.map(dId => {
                  const d = departments.find(dep => dep.id === dId);
                  if (!d) return null;
                  return (
                    <span
                      key={dId}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold"
                      style={{ backgroundColor: `${d.color}15`, color: d.color }}
                    >
                      {d.name}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Subtasks breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>Subtasks Breakdown ({projectTasks.length})</span>
              <span className="text-[11px] text-slate-500 font-normal">
                Tasks automatically update project completion status upon closure
              </span>
            </h3>

            <div className="space-y-2">
              {projectTasks.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50 rounded-lg">
                  Tasks have not been broken down by the Operations Manager yet
                </div>
              ) : (
                projectTasks.map(t => {
                  const dept = departments.find(d => d.id === t.departmentId);
                  const assignee = users.find(u => u.id === t.assignedToId);
                  const isDone = t.boardStatus === 'completed' || t.departmentStatus === 'archive';

                  return (
                    <div
                      key={t.id}
                      onClick={() => handleTaskClick(t.id)}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all hover:border-purple-300 hover:shadow-2xs ${
                        isDone ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          isDone ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-slate-400'
                        }`}>
                          <CheckCircle2 className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold truncate ${
                              isDone ? 'text-slate-500 line-through' : 'text-slate-900'
                            }`}>
                              {t.title}
                            </span>
                            {dept && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0"
                                style={{ backgroundColor: `${dept.color}15`, color: dept.color }}
                              >
                                {dept.code}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                            <span className="tabular-nums">
                              {t.startDate} → {t.dueDate}
                            </span>
                            <span>·</span>
                            <span>{assignee?.name || 'Unassigned'}</span>
                            <span>·</span>
                            <span className="font-semibold text-slate-700 capitalize">
                              Dept: {t.departmentStatus}
                            </span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            {project.id}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
