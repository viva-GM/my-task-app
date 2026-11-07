import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, Priority } from '../../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';

interface Props {
  tasks?: Task[];
  onSelectTask: (task: Task) => void;
}

export const CalendarView: React.FC<Props> = ({ tasks: propTasks, onSelectTask }) => {
  const { departments, tasks: contextTasks } = useApp();
  const tasks = propTasks || contextTasks;

  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(10); // 10 = November (0-indexed)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Build days for the month grid
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Monday = 0

  const calendarDays = [];
  // Empty slots for padding
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  const priorityBorder: Record<Priority, string> = {
    urgent: 'border-l-rose-500 bg-rose-50/50 text-rose-900',
    high: 'border-l-amber-500 bg-amber-50/50 text-amber-900',
    medium: 'border-l-blue-500 bg-blue-50/50 text-blue-900',
    low: 'border-l-slate-400 bg-slate-50 text-slate-800'
  };

  const getDayKey = (dayNum: number): string => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    return `${currentYear}-${mm}-${dd}`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
      
      {/* Month Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">
            {monthNames[currentMonth]} {currentYear}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setCurrentYear(2026);
              setCurrentMonth(10);
            }}
            className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
          >
            Today (Nov 2026)
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/70 text-center text-xs font-semibold text-slate-600 py-2">
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div className="text-rose-500">Sat</div>
        <div className="text-rose-500">Sun</div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-[120px] divide-x divide-y divide-slate-100 border-b border-slate-200">
        {calendarDays.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="bg-slate-50/50 p-1.5" />;
          }

          const dateKey = getDayKey(day);
          const isToday = dateKey === '2026-11-08';

          // Tasks starting or due today
          const dayTasks = tasks.filter(t => t.startDate === dateKey || t.dueDate === dateKey);

          return (
            <div
              key={`day-${day}`}
              className={`p-1.5 flex flex-col overflow-hidden transition-colors ${
                isToday ? 'bg-indigo-50/30 ring-1 ring-inset ring-indigo-200' : 'hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center justify-between pb-1">
                <span
                  className={`text-xs font-mono font-semibold ${
                    isToday
                      ? 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-2xs'
                      : 'text-slate-700'
                  }`}
                >
                  {day}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                )}
              </div>

              {/* Tasks in this day */}
              <div className="flex-1 overflow-y-auto space-y-1">
                {dayTasks.map(task => {
                  const isDue = task.dueDate === dateKey;
                  const isStart = task.startDate === dateKey;

                  return (
                    <button
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      className={`w-full text-left p-1 rounded border-l-3 text-[11px] leading-tight truncate transition-all hover:shadow-2xs ${
                        priorityBorder[task.priority]
                      }`}
                    >
                      <div className="font-semibold truncate">
                        {isDue && <span className="text-rose-600 mr-1">Due:</span>}
                        {isStart && !isDue && <span className="text-indigo-600 mr-1">Start:</span>}
                        {task.title}
                      </div>
                    </button>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

      <div className="p-3 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Click any task cell in the calendar to view details and edit</span>
        </div>
      </div>

    </div>
  );
};
