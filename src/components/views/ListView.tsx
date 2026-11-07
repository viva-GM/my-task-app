import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, Priority, Project } from '../../types';
import { 
  Search, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  User as UserIcon, 
  Clock, 
  ChevronRight,
  Filter
} from 'lucide-react';

interface Props {
  tasks?: Task[];
  onSelectTask: (task: Task) => void;
  onSelectProject?: (project: Project) => void;
  spaceType?: 'board' | 'department';
}

export const ListView: React.FC<Props> = ({ tasks: propTasks, onSelectTask, onSelectProject, spaceType = 'board' }) => {
  const { 
    tasks: contextTasks,
    departments, 
    users, 
    updateTaskDepartmentStatus, 
    approveTaskCompletedByOpsManager,
    currentUser,
    canAssessTasks
  } = useApp();

  const tasks = propTasks || contextTasks;

  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'dueDate' | 'priority' | 'title'>('dueDate');
  const [sortAsc, setSortAsc] = useState(true);

  const priorityLabels: Record<Priority, { label: string; color: string; order: number }> = {
    urgent: { label: 'Urgent', color: 'text-rose-700 bg-rose-50', order: 4 },
    high: { label: 'High', color: 'text-amber-700 bg-amber-50', order: 3 },
    medium: { label: 'Medium', color: 'text-blue-700 bg-blue-50', order: 2 },
    low: { label: 'Low', color: 'text-slate-600 bg-slate-100', order: 1 }
  };

  const deptStatusLabels: Record<string, string> = {
    new: 'New',
    assessment: 'Assessment',
    execution: 'Execution',
    review: 'Review',
    done: 'Done',
    overdue: 'Overdue',
    archive: 'Archive'
  };

  const boardStatusLabels: Record<string, string> = {
    drafts: 'Draft',
    assessment: 'Assessment',
    materials_needed: 'Materials Needed',
    execution: 'Execution',
    awaiting_review: 'Awaiting Review',
    completed: 'Completed',
    rejected: 'Rejected'
  };

  // Filter & Sort
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  }).sort((a, b) => {
    if (sortField === 'dueDate') {
      const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      return sortAsc ? diff : -diff;
    }
    if (sortField === 'priority') {
      const diff = priorityLabels[a.priority].order - priorityLabels[b.priority].order;
      return sortAsc ? diff : -diff;
    }
    return sortAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
      
      {/* List Filter Toolbar */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, description, or keyword..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white placeholder:text-slate-400 outline-none focus:border-indigo-500"
          />
        </div>

        {/* Priority Filter & Sorter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-2 py-1.5 rounded-md border border-slate-300 text-xs bg-white text-slate-800 outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <button
            onClick={() => {
              if (sortField === 'dueDate') {
                setSortAsc(!sortAsc);
              } else {
                setSortField('dueDate');
                setSortAsc(true);
              }
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Due Date</span>
          </button>
        </div>

      </div>

      {/* Table view */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Task & Project</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Assignee</th>
              <th className="py-3 px-4">Timeline (Start → Due)</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status (Board / Dept)</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                  No matching tasks found.
                </td>
              </tr>
            ) : (
              filteredTasks.map(task => {
                const dept = departments.find(d => d.id === task.departmentId);
                const assignee = users.find(u => u.id === task.assignedToId);
                const isOverdue = new Date(task.dueDate) < new Date(2026, 10, 8) && task.departmentStatus !== 'archive' && task.departmentStatus !== 'done';
                const isAwaitingOpsReview = task.boardStatus === 'awaiting_review';

                return (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => onSelectTask(task)}
                  >
                    {/* Task Title & Project badge */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {task.title}
                        </span>
                        {task.projectId && (
                          <span className="text-[10px] text-purple-600 font-medium mt-0.5">
                            Part of Strategic Project
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {dept ? (
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-medium"
                          style={{ backgroundColor: `${dept.color}15`, color: dept.color }}
                        >
                          {dept.name}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Assignee */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {assignee ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={assignee.avatar}
                            alt={assignee.name}
                            referrerPolicy="no-referrer"
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <span className="text-slate-800 font-medium">{assignee.name}</span>
                          {task.coAssigneeIds && task.coAssigneeIds.length > 0 && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              +{task.coAssigneeIds.length}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Dates */}
                    <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{task.startDate}</span>
                        <span className="text-slate-400">→</span>
                        <span className={`font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
                          {task.dueDate}
                        </span>
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${priorityLabels[task.priority].color}`}>
                        {priorityLabels[task.priority].label}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {spaceType === 'board' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800">
                            {boardStatusLabels[task.boardStatus] || task.boardStatus}
                          </span>
                          {task.boardStatus === 'awaiting_review' && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          )}
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-800">
                          {deptStatusLabels[task.departmentStatus] || task.departmentStatus}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      {isAwaitingOpsReview && canAssessTasks() ? (
                        <button
                          onClick={() => approveTaskCompletedByOpsManager(task.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold inline-flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                          title="Approve outcome as COMPLETED and archive in department"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onSelectTask(task)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span>Total tasks in view: {filteredTasks.length}</span>
      </div>

    </div>
  );
};
