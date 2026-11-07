import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Draft, Task, Project, Priority } from '../../types';
import { 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Building2, 
  User as UserIcon, 
  AlertCircle, 
  FolderKanban, 
  Check, 
  RotateCcw,
  ArrowRight,
  Eye,
  Package,
  ShoppingCart,
  Truck
} from 'lucide-react';
import { DraftModal } from './DraftModal';
import { EvaluationModal } from './EvaluationModal';
import { TaskDetailModal } from '../TaskDetailModal';
import { ProjectDetailModal } from '../ProjectDetailModal';
import { ListView } from '../views/ListView';
import { CalendarView } from '../views/CalendarView';
import { TimelineView } from '../views/TimelineView';

export const BoardSpace: React.FC = () => {
  const { 
    currentUser, 
    drafts, 
    tasks, 
    projects, 
    departments, 
    users, 
    activeView, 
    canManageBoard,
    canAssessTasks,
    approveTaskCompletedByOpsManager,
    updateTask
  } = useApp();

  // Modals state
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [evaluatingItem, setEvaluatingItem] = useState<{ item: Task | Project; type: 'task' | 'project' } | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Group items by Board columns:
  // 1. Drafts / Ideas
  const activeDrafts = drafts.filter(d => d.status === 'draft');

  // 2. Assessment: Tasks and projects awaiting Ops Manager evaluation
  const assessmentTasks = tasks.filter(t => t.boardStatus === 'assessment');
  const assessmentProjects = projects.filter(p => p.boardStatus === 'assessment');

  // 3. Materials Needed (BoM / Procurement)
  const materialsNeededTasks = tasks.filter(t => t.boardStatus === 'materials_needed');

  // 4. Execution: Tasks and projects in progress in departments
  const executionTasks = tasks.filter(t => t.boardStatus === 'execution');
  const executionProjects = projects.filter(p => p.boardStatus === 'execution');

  // 5. Awaiting Review: Tasks marked "Done" in department, awaiting Ops review
  const awaitingReviewTasks = tasks.filter(t => t.boardStatus === 'awaiting_review');

  // 6. Completed & Archived
  const completedTasks = tasks.filter(t => t.boardStatus === 'completed');
  const completedProjects = projects.filter(p => p.boardStatus === 'completed');

  const priorityLabels: Record<Priority, { label: string; color: string }> = {
    urgent: { label: 'Urgent', color: 'bg-rose-100 text-rose-800' },
    high: { label: 'High', color: 'bg-amber-100 text-amber-800' },
    medium: { label: 'Medium', color: 'bg-blue-100 text-blue-800' },
    low: { label: 'Low', color: 'bg-slate-100 text-slate-800' }
  };

  // Ops Manager Alert Counter
  const awaitingOpsCount = assessmentTasks.length + assessmentProjects.length + awaitingReviewTasks.length;

  return (
    <div className="space-y-6">
      
      {/* Space Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Board of Directors Space
            </h1>
            <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2.5 py-0.5 rounded-full">
              Strategic Executive Tier
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Strategic initiatives, Ops evaluation, Bill of Materials, department delegations and board governance
          </p>
        </div>

        {/* Action: Create Draft */}
        {canManageBoard() && (
          <button
            onClick={() => setIsCreatingDraft(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4 stroke-2" />
            <span>Create Idea / Draft</span>
          </button>
        )}
      </div>

      {/* Operations Manager Notification Banner */}
      {canAssessTasks() && awaitingOpsCount > 0 && (
        <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-indigo-950">
                Operations Manager Action Required ({awaitingOpsCount})
              </span>
              <p className="text-[11px] text-indigo-800">
                {assessmentTasks.length + assessmentProjects.length} awaiting <b>Assessment</b> (department delegation & BoM), and {awaitingReviewTasks.length} in <b>Awaiting Review</b> (sign-off "COMPLETED").
              </p>
            </div>
          </div>
        </div>
      )}

      {/* RENDER ACTIVE VIEW: Kanban vs List vs Calendar vs Timeline */}
      {activeView === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          
          {/* COLUMN 1: Ideas / Drafts */}
          <div className="bg-slate-100/70 rounded-xl p-3 flex flex-col space-y-3 min-w-[280px] w-80 shrink-0 border border-slate-200/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Ideas / Drafts
                </h3>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                {activeDrafts.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[75vh] overflow-y-auto pr-0.5">
              {activeDrafts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 italic bg-white/60 rounded-lg border border-dashed border-slate-200">
                  No active draft ideas. Click "Create Idea / Draft" above.
                </div>
              ) : (
                activeDrafts.map(draft => {
                  const creator = users.find(u => u.id === draft.createdBy);
                  return (
                    <div
                      key={draft.id}
                      onClick={() => setSelectedDraft(draft)}
                      className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs hover:border-indigo-300 transition-all cursor-pointer group space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${priorityLabels[draft.priority].color}`}>
                          {priorityLabels[draft.priority].label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{draft.createdAt}</span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                        {draft.title}
                      </h4>

                      {draft.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {draft.description}
                        </p>
                      )}

                      {draft.images && draft.images.length > 0 && (
                        <div className="h-16 rounded overflow-hidden bg-slate-100 border border-slate-100">
                          <img src={draft.images[0]} alt="Mockup" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          {creator?.avatar ? (
                            <img
                              src={creator.avatar}
                              alt={creator.name}
                              referrerPolicy="no-referrer"
                              className="w-4 h-4 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600">
                              {creator?.name?.[0] || 'U'}
                            </div>
                          )}
                          <span className="truncate max-w-[90px]">{creator?.name || 'Author'}</span>
                        </div>
                        {draft.comments && draft.comments.length > 0 && (
                          <span className="text-slate-500 font-medium">
                            💬 {draft.comments.length}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMN 2: Assessment (Ops Manager) */}
          <div className="bg-indigo-50/50 rounded-xl p-3 flex flex-col space-y-3 min-w-[280px] w-80 shrink-0 border border-indigo-200/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  Assessment (Ops)
                </h3>
              </div>
              <span className="text-xs font-mono font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                {assessmentTasks.length + assessmentProjects.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[75vh] overflow-y-auto pr-0.5">
              {assessmentTasks.length === 0 && assessmentProjects.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 italic bg-white/60 rounded-lg border border-dashed border-indigo-200">
                  All initiatives have been evaluated by Ops Manager.
                </div>
              ) : (
                <>
                  {/* Standalone tasks awaiting assessment */}
                  {assessmentTasks.map(t => (
                    <div
                      key={t.id}
                      onClick={() => setEvaluatingItem({ item: t, type: 'task' })}
                      className="p-3 bg-white rounded-lg border border-indigo-200 shadow-2xs hover:shadow-xs hover:border-indigo-400 transition-all cursor-pointer group space-y-2"
                    >
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                            Task Evaluation
                          </span>
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                            <Package className="w-3 h-3 text-amber-600" />
                            <span>BoM ({(t.materials || []).length})</span>
                          </span>
                        </div>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${priorityLabels[t.priority].color}`}>
                          {priorityLabels[t.priority].label}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                        {t.title}
                      </h4>

                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {t.description}
                      </p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(t);
                          }}
                          className="text-[11px] text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 cursor-pointer"
                          title="Open Task Card & Bill of Materials"
                        >
                          <Package className="w-3 h-3 text-amber-600" />
                          <span>Card & BoM</span>
                        </button>
                        {canAssessTasks() && (
                          <span className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center gap-0.5">
                            <span>Evaluate</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Projects awaiting assessment */}
                  {assessmentProjects.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setEvaluatingItem({ item: p, type: 'project' })}
                      className="p-3 bg-white rounded-lg border border-purple-200 shadow-2xs hover:shadow-xs hover:border-purple-400 transition-all cursor-pointer group space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded flex items-center gap-1">
                          <FolderKanban className="w-3 h-3" />
                          <span>Complex Project</span>
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${priorityLabels[p.priority].color}`}>
                          {priorityLabels[p.priority].label}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors line-clamp-2">
                        {p.title}
                      </h4>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">
                          Decompose into tasks
                        </span>
                        {canAssessTasks() && (
                          <span className="text-[11px] text-purple-600 font-bold hover:underline flex items-center gap-0.5">
                            <span>Break Down</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* COLUMN 3: Materials Needed (Bill of Materials / Procurement) */}
          <div className="bg-amber-50/60 rounded-xl p-3 flex flex-col space-y-3 min-w-[280px] w-80 shrink-0 border border-amber-300/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-amber-700" />
                  <span>Materials Needed</span>
                </h3>
              </div>
              <span className="text-xs font-mono font-semibold text-amber-800 bg-white px-2 py-0.5 rounded-full border border-amber-200">
                {materialsNeededTasks.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[75vh] overflow-y-auto pr-0.5">
              {materialsNeededTasks.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 italic bg-white/60 rounded-lg border border-dashed border-amber-200">
                  No initiatives waiting for procurement.
                </div>
              ) : (
                materialsNeededTasks.map(task => {
                  const dept = departments.find(d => d.id === task.departmentId);
                  const assignee = users.find(u => u.id === task.assignedToId);
                  const missingCount = (task.materials || []).filter(m => !m.inStock).length;
                  const allInStock = (task.materials || []).length > 0 && missingCount === 0;

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="p-3 bg-white rounded-lg border-2 border-amber-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer group space-y-2"
                    >
                      <div className="flex items-center justify-between gap-1">
                        {task.isProcurementTask ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded flex items-center gap-1">
                            <ShoppingCart className="w-3 h-3" />
                            <span>Procurement Task</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded flex items-center gap-1">
                            <Package className="w-3 h-3 text-amber-600" />
                            <span>BoM Pending ({missingCount} missing)</span>
                          </span>
                        )}
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${priorityLabels[task.priority].color}`}>
                          {priorityLabels[task.priority].label}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-2">
                        {task.title}
                      </h4>

                      <div className="text-[11px] text-slate-500 line-clamp-2">
                        {task.description}
                      </div>

                      {/* Materials status */}
                      <div className="p-2 bg-amber-50/70 rounded border border-amber-200/60 text-[11px] text-amber-900 flex items-center justify-between">
                        <span>
                          {task.isProcurementTask ? 'Office Procurement' : `Supplies: ${task.materials?.length || 0} items`}
                        </span>
                        <span className="font-semibold">
                          {assignee ? assignee.name : 'Unassigned'}
                        </span>
                      </div>

                      {/* Ready button if all materials confirmed */}
                      {allInStock && (
                        <div className="pt-2 border-t border-amber-100" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => updateTask({ ...task, boardStatus: 'execution' })}
                            className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Materials Ready → Execution</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMN 4: Execution (Departments in progress) */}
          <div className="bg-blue-50/40 rounded-xl p-3 flex flex-col space-y-3 min-w-[280px] w-80 shrink-0 border border-blue-200/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                  Execution
                </h3>
              </div>
              <span className="text-xs font-mono font-semibold text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                {executionTasks.length + executionProjects.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[75vh] overflow-y-auto pr-0.5">
              {/* Complex Projects */}
              {executionProjects.map(proj => {
                const projSubtasks = tasks.filter(t => t.projectId === proj.id);
                const doneCount = projSubtasks.filter(t => t.boardStatus === 'completed' || t.departmentStatus === 'archive').length;
                const percent = projSubtasks.length > 0 ? Math.round((doneCount / projSubtasks.length) * 100) : 0;

                return (
                  <div
                    key={proj.id}
                    onClick={() => setSelectedProject(proj)}
                    className="p-3 bg-white rounded-lg border border-purple-200 shadow-2xs hover:shadow-xs hover:border-purple-400 transition-all cursor-pointer group space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded flex items-center gap-1">
                        <FolderKanban className="w-3 h-3" />
                        <span>Project</span>
                      </span>
                      <span className="text-[11px] font-mono font-bold text-purple-700">{percent}%</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors line-clamp-2">
                      {proj.title}
                    </h4>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: `${percent}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>{doneCount} of {projSubtasks.length} tasks done</span>
                      <span className="font-mono">{proj.dueDate}</span>
                    </div>
                  </div>
                );
              })}

              {/* Standalone Tasks in Execution */}
              {executionTasks.map(task => {
                const dept = departments.find(d => d.id === task.departmentId);
                const assignee = users.find(u => u.id === task.assignedToId);

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs hover:border-indigo-300 transition-all cursor-pointer group space-y-2"
                  >
                    <div className="flex items-center justify-between gap-1">
                      {dept && (
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] font-bold"
                          style={{ backgroundColor: `${dept.color}15`, color: dept.color }}
                        >
                          {dept.name}
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                        Dept: {task.departmentStatus}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {task.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 truncate">
                        {assignee ? (
                          <>
                            <img
                              src={assignee.avatar}
                              alt={assignee.name}
                              referrerPolicy="no-referrer"
                              className="w-4 h-4 rounded-full object-cover"
                            />
                            <span className="truncate max-w-[100px]">{assignee.name}</span>
                          </>
                        ) : (
                          <span className="italic text-slate-400">Unassigned</span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-slate-600">{task.dueDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMN 5: Awaiting Review (Ops Sign-off) */}
          <div className="bg-amber-50/50 rounded-xl p-3 flex flex-col space-y-3 min-w-[280px] w-80 shrink-0 border border-amber-200/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Awaiting Review
                </h3>
              </div>
              <span className="text-xs font-mono font-semibold text-amber-800 bg-white px-2 py-0.5 rounded-full border border-amber-200">
                {awaitingReviewTasks.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[75vh] overflow-y-auto pr-0.5">
              {awaitingReviewTasks.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 italic bg-white/60 rounded-lg border border-dashed border-amber-200">
                  No tasks awaiting review. When a department completes a task ("Done"), it lands here.
                </div>
              ) : (
                awaitingReviewTasks.map(task => {
                  const dept = departments.find(d => d.id === task.departmentId);
                  const assignee = users.find(u => u.id === task.assignedToId);

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="p-3 bg-white rounded-lg border-2 border-amber-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer group space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                          Done by Department!
                        </span>
                        {dept && (
                          <span
                            className="px-1.5 py-0.2 rounded text-[10px] font-semibold"
                            style={{ backgroundColor: `${dept.color}15`, color: dept.color }}
                          >
                            {dept.code}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-2">
                        {task.title}
                      </h4>

                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span>Assignee:</span>
                        <span className="font-semibold text-slate-700">{assignee?.name}</span>
                      </div>

                      {/* Instant Approve / Review button for Ops Manager */}
                      {canAssessTasks() && (
                        <div className="pt-2 border-t border-amber-100 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedTask(task)}
                            className="text-[11px] text-slate-600 hover:text-slate-900 font-medium"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => approveTaskCompletedByOpsManager(task.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                            title="Approve as COMPLETED and archive in department"
                          >
                            <Check className="w-3 h-3 stroke-3" />
                            <span>Approve</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMN 6: Completed & Archived */}
          <div className="bg-emerald-50/40 rounded-xl p-3 flex flex-col space-y-3 min-w-[280px] w-80 shrink-0 border border-emerald-200/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Completed
                </h3>
              </div>
              <span className="text-xs font-mono font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                {completedTasks.length + completedProjects.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[75vh] overflow-y-auto pr-0.5">
              {completedTasks.length === 0 && completedProjects.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 italic bg-white/60 rounded-lg border border-dashed border-emerald-200">
                  Completed tasks will appear here after Ops Manager signoff.
                </div>
              ) : (
                <>
                  {/* Completed Projects */}
                  {completedProjects.map(proj => (
                    <div
                      key={proj.id}
                      onClick={() => setSelectedProject(proj)}
                      className="p-3 bg-white/90 rounded-lg border border-emerald-200 opacity-90 hover:opacity-100 transition-opacity cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                          Project Completed
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 line-through">
                        {proj.title}
                      </h4>
                    </div>
                  ))}

                  {/* Completed Tasks */}
                  {completedTasks.map(task => {
                    const dept = departments.find(d => d.id === task.departmentId);
                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="p-3 bg-white/90 rounded-lg border border-emerald-200 opacity-90 hover:opacity-100 transition-opacity cursor-pointer space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="px-1.5 py-0.2 rounded text-[10px] font-bold"
                            style={{ backgroundColor: `${dept?.color || '#10B981'}15`, color: dept?.color || '#10B981' }}
                          >
                            {dept?.code}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Done</span>
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-700 line-through">
                          {task.title}
                        </h4>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Finished: {task.completedAt || 'Recently'}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

        </div>
      )}

      {/* RENDER VIEWS: List View */}
      {activeView === 'list' && (
        <ListView
          onSelectTask={task => setSelectedTask(task)}
          onSelectProject={(proj: Project) => setSelectedProject(proj)}
        />
      )}

      {/* RENDER VIEWS: Calendar View */}
      {activeView === 'calendar' && (
        <CalendarView
          onSelectTask={task => setSelectedTask(task)}
        />
      )}

      {/* RENDER VIEWS: Timeline Gantt View */}
      {activeView === 'timeline' && (
        <TimelineView
          onSelectTask={task => setSelectedTask(task)}
        />
      )}

      {/* MODALS */}
      {/* 1. Draft Modal */}
      {(selectedDraft || isCreatingDraft) && (
        <DraftModal
          draft={selectedDraft}
          onClose={() => {
            setSelectedDraft(null);
            setIsCreatingDraft(false);
          }}
          onSelectForEvaluation={(id, type) => {
            const item = type === 'task' ? tasks.find(t => t.id === id) : projects.find(p => p.id === id);
            if (item) {
              setEvaluatingItem({ item, type });
            }
          }}
        />
      )}

      {/* 2. Ops Manager Evaluation Modal */}
      {evaluatingItem && (
        <EvaluationModal
          item={evaluatingItem.item}
          itemType={evaluatingItem.type}
          onClose={() => setEvaluatingItem(null)}
        />
      )}

      {/* 3. Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onOpenProject={projId => {
            const proj = projects.find(p => p.id === projId);
            if (proj) {
              setSelectedTask(null);
              setSelectedProject(proj);
            }
          }}
          onOpenTask={parentTaskId => {
            const parent = tasks.find(t => t.id === parentTaskId);
            if (parent) {
              setSelectedTask(parent);
            }
          }}
        />
      )}

      {/* 4. Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onSelectTask={(taskId: string) => {
            const t = tasks.find(item => item.id === taskId);
            if (t) {
              setSelectedProject(null);
              setSelectedTask(t);
            }
          }}
        />
      )}

    </div>
  );
};
