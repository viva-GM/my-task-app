import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, Priority } from '../../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  AlertTriangle,
  MoveHorizontal,
  Plus,
  Minus
} from 'lucide-react';

interface Props {
  tasks?: Task[];
  onSelectTask: (task: Task) => void;
}

export const TimelineView: React.FC<Props> = ({ tasks: propTasks, onSelectTask }) => {
  const { departments, users, tasks: contextTasks, shiftTaskDates, canEditTaskDates, updateTaskDatesDirect } = useApp();
  const tasks = propTasks || contextTasks;

  // Timeline viewport state: center date
  const [centerDate, setCenterDate] = useState<Date>(() => new Date(2026, 10, 8)); // Nov 2026 matching mock data
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editDue, setEditDue] = useState('');

  // Generate 21 days for the visible window
  const days = useMemo(() => {
    const list = [];
    const base = new Date(centerDate);
    base.setDate(base.getDate() - 7); // Show 7 days before, 14 days after

    for (let i = 0; i < 21; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      list.push(d);
    }
    return list;
  }, [centerDate]);

  const windowStartDate = days[0];
  const windowEndDate = days[days.length - 1];

  const shiftCenter = (daysCount: number) => {
    setCenterDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + daysCount);
      return d;
    });
  };

  const jumpToToday = () => {
    setCenterDate(new Date(2026, 10, 8));
  };

  const formatDateKey = (d: Date): string => {
    return d.toISOString().split('T')[0];
  };

  const priorityColors: Record<Priority, string> = {
    low: 'bg-slate-400',
    medium: 'bg-blue-500',
    high: 'bg-amber-500',
    urgent: 'bg-rose-500'
  };

  const startEditDates = (task: Task) => {
    if (!canEditTaskDates(task)) return;
    setEditingTaskId(task.id);
    setEditStart(task.startDate);
    setEditDue(task.dueDate);
  };

  const saveEditDates = (taskId: string) => {
    if (editStart && editDue) {
      updateTaskDatesDirect(taskId, editStart, editDue);
    }
    setEditingTaskId(null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
      
      {/* Timeline Controls Header */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50">
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-2xs p-0.5">
            <button
              onClick={() => shiftCenter(-7)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              title="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={jumpToToday}
              className="px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => shiftCenter(7)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              title="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              {windowStartDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} —{' '}
              {windowEndDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Legend & Instructions */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Normal</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ml-1" />
            <span>High</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ml-1" />
            <span>Critical</span>
          </div>
          <span className="hidden md:inline text-[11px] text-indigo-700 font-medium">
            (Shift with [-1d] / [+1d] to adjust schedule)
          </span>
        </div>

      </div>

      {/* Timeline Table Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          
          {/* Timeline Days Header */}
          <div className="flex border-b border-slate-200 bg-slate-100/70 text-xs font-semibold text-slate-600">
            {/* Task Name Column Header */}
            <div className="w-72 shrink-0 p-3 border-r border-slate-200">
              Task / Assignee
            </div>

            {/* Days columns */}
            <div className="flex-1 grid grid-cols-21 divide-x divide-slate-200">
              {days.map((day, idx) => {
                const isToday = formatDateKey(day) === '2026-11-08';
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                return (
                  <div
                    key={idx}
                    className={`text-center py-2 px-0.5 ${
                      isToday
                        ? 'bg-indigo-100/60 text-indigo-900 font-bold'
                        : isWeekend
                        ? 'bg-slate-100/90 text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-mono">
                      {day.toLocaleDateString('en-US', { weekday: 'narrow' })}
                    </div>
                    <div className="text-xs font-mono font-medium">
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline Task Rows */}
          {tasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 italic">
              No active tasks in current timeline view
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tasks.map(task => {
                const dept = departments.find(d => d.id === task.departmentId);
                const assignee = users.find(u => u.id === task.assignedToId);
                const canEdit = canEditTaskDates(task);

                // Calculate task bar positioning
                const taskStart = new Date(task.startDate);
                const taskDue = new Date(task.dueDate);

                const windowStartMs = windowStartDate.getTime();
                const windowEndMs = windowEndDate.getTime();
                const totalWindowMs = windowEndMs - windowStartMs;

                const startOffsetMs = Math.max(0, taskStart.getTime() - windowStartMs);
                const endOffsetMs = Math.min(totalWindowMs, Math.max(0, taskDue.getTime() - windowStartMs));

                const leftPercent = Math.min(100, Math.max(0, (startOffsetMs / totalWindowMs) * 100));
                const widthPercent = Math.min(100 - leftPercent, Math.max(3, ((endOffsetMs - startOffsetMs) / totalWindowMs) * 100));

                const isOverdue = new Date(task.dueDate) < new Date(2026, 10, 8) && task.departmentStatus !== 'archive' && task.departmentStatus !== 'done';

                return (
                  <div
                    key={task.id}
                    className="flex hover:bg-slate-50/80 transition-colors group items-center min-h-[52px]"
                  >
                    {/* Left Column: Task meta & shift buttons */}
                    <div className="w-72 shrink-0 p-2.5 border-r border-slate-200 flex flex-col justify-center">
                      <div className="flex items-center justify-between gap-1">
                        <button
                          onClick={() => onSelectTask(task)}
                          className="text-xs font-semibold text-slate-900 hover:text-indigo-600 truncate text-left"
                        >
                          {task.title}
                        </button>
                        {isOverdue && (
                          <span title="Overdue!">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          {dept && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{ backgroundColor: `${dept.color}15`, color: dept.color }}
                            >
                              {dept.code}
                            </span>
                          )}
                          <span className="truncate">{assignee?.name || 'Unassigned'}</span>
                        </div>

                        {/* Interactive date shift controls if authorized */}
                        {canEdit && (
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            <button
                              onClick={() => shiftTaskDates(task.id, -1, -1)}
                              title="Shift entire task 1 day earlier"
                              className="px-1 py-0.5 bg-slate-100 hover:bg-slate-200 text-[10px] font-mono rounded text-slate-700 cursor-pointer"
                            >
                              -1d
                            </button>
                            <button
                              onClick={() => shiftTaskDates(task.id, 1, 1)}
                              title="Shift entire task 1 day forward"
                              className="px-1 py-0.5 bg-slate-100 hover:bg-slate-200 text-[10px] font-mono rounded text-slate-700 cursor-pointer"
                            >
                              +1d
                            </button>
                            <button
                              onClick={() => shiftTaskDates(task.id, 0, 3)}
                              title="Extend deadline by 3 days"
                              className="px-1 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-[10px] font-mono rounded text-indigo-700 font-semibold cursor-pointer"
                            >
                              +3d
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Timeline Grid & Bar */}
                    <div className="flex-1 relative h-12 flex items-center px-1">
                      
                      {/* Grid vertical lines */}
                      <div className="absolute inset-0 grid grid-cols-21 divide-x divide-slate-100 pointer-events-none">
                        {days.map((_, i) => (
                          <div key={i} className="h-full" />
                        ))}
                      </div>

                      {/* Timeline Bar */}
                      <div
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`
                        }}
                        className={`absolute h-7 rounded-md shadow-xs flex items-center justify-between px-2 text-white text-xs font-semibold transition-all cursor-pointer select-none overflow-hidden ${
                          priorityColors[task.priority]
                        } ${isOverdue ? 'ring-2 ring-rose-500' : ''}`}
                        onClick={() => onSelectTask(task)}
                      >
                        <span className="truncate text-[11px] font-medium drop-shadow-xs">
                          {task.startDate.slice(5)} → {task.dueDate.slice(5)}
                        </span>

                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {assignee && (
                            <img
                              src={assignee.avatar}
                              alt={assignee.name}
                              referrerPolicy="no-referrer"
                              className="w-4 h-4 rounded-full ring-1 ring-white/50"
                            />
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* Timeline Footer Note */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MoveHorizontal className="w-4 h-4 text-slate-400" />
          <span>
            Operations Manager and Department Heads can adjust deadlines and reschedule tasks directly on the timeline.
          </span>
        </div>
      </div>

    </div>
  );
};
