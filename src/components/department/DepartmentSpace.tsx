import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, DepartmentStage, Priority } from '../../types';
import { 
  Building2, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Archive, 
  Filter, 
  ChevronRight, 
  ChevronLeft,
  UserCheck,
  FolderKanban
} from 'lucide-react';
import { TaskDetailModal } from '../TaskDetailModal';
import { ProjectDetailModal } from '../ProjectDetailModal';
import { ListView } from '../views/ListView';
import { CalendarView } from '../views/CalendarView';
import { TimelineView } from '../views/TimelineView';

export const DepartmentSpace: React.FC = () => {
  const { 
    currentUser, 
    tasks, 
    projects, 
    departments, 
    users, 
    selectedDepartmentId, 
    setSelectedDepartmentId,
    activeView,
    updateTaskDepartmentStatus,
    filterMyTasksOnly,
    setFilterMyTasksOnly
  } = useApp();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  const currentDept = departments.find(d => d.id === selectedDepartmentId) || departments[0];

  // Base list: only tasks delegated to this department (Prompt: "В пространстве каждого департамента должны отображаться только те задачи, которые были им делегированы")
  let deptTasks = tasks.filter(t => t.departmentId === currentDept.id);

  // Role-based visibility logic:
  // - Regular employees: see ONLY tasks assigned to them (or co-assigned)
  // - Dept head: can toggle between all department tasks and tasks assigned to them
  // - Ops manager / Admin: can toggle between all and assigned to them
  const isEmployee = currentUser.role === 'employee';
  const isHeadOfThisDept = currentUser.role === 'dept_head' && currentUser.departmentId === currentDept.id;

  if (isEmployee) {
    deptTasks = deptTasks.filter(
      t => t.assignedToId === currentUser.id || t.coAssigneeIds?.includes(currentUser.id)
    );
  } else if (filterMyTasksOnly) {
    deptTasks = deptTasks.filter(
      t => t.assignedToId === currentUser.id || t.coAssigneeIds?.includes(currentUser.id)
    );
  }

  // Today reference for overdue check
  const todayDate = new Date(2026, 10, 8); // November 8, 2026

  // Check if a task is overdue (if not done and not in archive)
  const isTaskOverdue = (t: Task): boolean => {
    if (t.departmentStatus === 'done' || t.departmentStatus === 'archive') return false;
    return new Date(t.dueDate) < todayDate;
  };

  // 7 Stages requested by user:
  // New, Assessment, Execution, Review, Done, Overdue, Archive
  const stages: { key: DepartmentStage; label: string; desc: string; color: string }[] = [
    { key: 'new', label: 'New', desc: 'Arrived from Board', color: 'border-slate-300 bg-slate-100/70' },
    { key: 'assessment', label: 'Assessment', desc: 'Internal triage & planning', color: 'border-indigo-200 bg-indigo-50/50' },
    { key: 'execution', label: 'Execution', desc: 'Active implementation', color: 'border-blue-200 bg-blue-50/50' },
    { key: 'review', label: 'Review & QA', desc: 'Internal peer review & testing', color: 'border-purple-200 bg-purple-50/50' },
    { key: 'done', label: 'Done', desc: 'Ready for Board sign-off', color: 'border-amber-300 bg-amber-50/60' },
    { key: 'overdue', label: 'Overdue', desc: 'Past delivery deadline', color: 'border-rose-300 bg-rose-50/60' },
    { key: 'archive', label: 'Archive', desc: 'Approved by Ops Manager', color: 'border-emerald-200 bg-emerald-50/40' }
  ];

  const priorityLabels: Record<Priority, { label: string; color: string }> = {
    urgent: { label: 'Urgent', color: 'bg-rose-100 text-rose-800' },
    high: { label: 'High', color: 'bg-amber-100 text-amber-800' },
    medium: { label: 'Medium', color: 'bg-blue-100 text-blue-800' },
    low: { label: 'Low', color: 'bg-slate-100 text-slate-800' }
  };

  const getTasksByStage = (stageKey: DepartmentStage): Task[] => {
    if (stageKey === 'overdue') {
      // Return tasks that are strictly overdue or explicitly marked overdue
      return deptTasks.filter(t => t.departmentStatus === 'overdue' || isTaskOverdue(t));
    }
    // For other columns, exclude tasks that are overdue so they don't duplicate
    return deptTasks.filter(t => t.departmentStatus === stageKey && !isTaskOverdue(t));
  };

  const stageKeysOrder: DepartmentStage[] = ['new', 'assessment', 'execution', 'review', 'done', 'archive'];

  const moveTaskStage = (taskId: string, currentStage: DepartmentStage, direction: 'prev' | 'next') => {
    const idx = stageKeysOrder.indexOf(currentStage);
    if (idx === -1) return;
    const nextIdx = direction === 'next' ? idx + 1 : idx - 1;
    if (nextIdx >= 0 && nextIdx < stageKeysOrder.length) {
      updateTaskDepartmentStatus(taskId, stageKeysOrder[nextIdx]);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Department Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: currentDept.color }}
            />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Department: {currentDept.name} ({currentDept.code})
            </h1>
            {isHeadOfThisDept && (
              <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-0.5 rounded-full">
                You are Head of this Department
              </span>
            )}
            {isEmployee && (
              <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2.5 py-0.5 rounded-full">
                Member View: My Tasks & Delegations
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {currentDept.description}
          </p>
        </div>

        {/* Filters & Toggles */}
        <div className="flex items-center gap-2">
          
          {/* Toggle for Head / Ops Manager / Admin: "All Department Tasks" vs "My Tasks" */}
          {!isEmployee && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setFilterMyTasksOnly(false)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  !filterMyTasksOnly
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Department Tasks
              </button>
              <button
                onClick={() => setFilterMyTasksOnly(true)}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  filterMyTasksOnly
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>My Tasks</span>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* RENDER VIEWS */}
      {activeView === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 overflow-x-auto pb-4">
          {stages.map(stage => {
            const stageTasks = getTasksByStage(stage.key);

            return (
              <div
                key={stage.key}
                className={`rounded-xl p-2.5 flex flex-col space-y-2.5 min-w-[240px] border ${stage.color}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {stage.label}
                    </h3>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {stage.desc}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    {stageTasks.length}
                  </span>
                </div>

                  {/* Column Cards */}
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[75vh] pr-0.5">
                  {stageTasks.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 italic bg-white/50 rounded-lg border border-dashed border-slate-200">
                      Empty
                    </div>
                  ) : (
                    stageTasks.map(task => {
                      const assignee = users.find(u => u.id === task.assignedToId);
                      const isOverdue = isTaskOverdue(task);

                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className={`p-2.5 bg-white rounded-lg border shadow-2xs hover:shadow-xs transition-all cursor-pointer group space-y-2 ${
                            isOverdue
                              ? 'border-rose-300 bg-rose-50/20 ring-1 ring-rose-200'
                              : 'border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${priorityLabels[task.priority].color}`}>
                              {priorityLabels[task.priority].label}
                            </span>
                            {isOverdue && (
                              <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Overdue!</span>
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                            {task.title}
                          </h4>

                          {task.projectId && (
                            <div className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-semibold truncate flex items-center gap-1">
                              <FolderKanban className="w-3 h-3 shrink-0" />
                              <span className="truncate">Part of Project</span>
                            </div>
                          )}

                          {task.subtasks && task.subtasks.length > 0 && (
                            <div className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-semibold flex items-center justify-between">
                              <span>Subtasks: {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}</span>
                              <span className="text-slate-400 font-normal">Dept Head lead</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 truncate">
                              {assignee ? (
                                <>
                                  <img
                                    src={assignee.avatar}
                                    alt={assignee.name}
                                    referrerPolicy="no-referrer"
                                    className="w-4 h-4 rounded-full object-cover shrink-0"
                                  />
                                  <span className="truncate max-w-[85px]">{assignee.name}</span>
                                </>
                              ) : (
                                <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                                  {stage.key === 'new' ? 'Awaiting Assessment' : 'Unassigned'}
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-slate-600">{task.dueDate.slice(5)}</span>
                          </div>

                          {/* Quick stage move actions */}
                          <div
                            className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              onClick={() => moveTaskStage(task.id, stage.key, 'prev')}
                              disabled={stage.key === 'new' || stage.key === 'archive' || stage.key === 'overdue'}
                              className="p-1 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100 rounded cursor-pointer"
                              title="Previous Stage"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>

                            <span className="font-medium text-slate-500">
                              {stage.label}
                            </span>

                            <button
                              onClick={() => moveTaskStage(task.id, stage.key, 'next')}
                              disabled={stage.key === 'done' || stage.key === 'archive' || stage.key === 'overdue'}
                              className="p-1 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100 rounded cursor-pointer"
                              title="Next Stage"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {activeView === 'list' && (
        <ListView
          tasks={deptTasks}
          onSelectTask={setSelectedTask}
          spaceType="department"
        />
      )}

      {/* CALENDAR VIEW */}
      {activeView === 'calendar' && (
        <CalendarView
          tasks={deptTasks}
          onSelectTask={setSelectedTask}
        />
      )}

      {/* TIMELINE VIEW */}
      {activeView === 'timeline' && (
        <TimelineView
          tasks={deptTasks}
          onSelectTask={setSelectedTask}
        />
      )}

      {/* MODALS */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onOpenProject={(projId) => {
            const pr = projects.find(p => p.id === projId);
            if (pr) {
              setSelectedTask(null);
              setSelectedProject(pr);
            }
          }}
        />
      )}

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onSelectTask={(tId) => {
            const tk = tasks.find(t => t.id === tId);
            if (tk) {
              setSelectedProject(null);
              setSelectedTask(tk);
            }
          }}
        />
      )}

    </div>
  );
};
