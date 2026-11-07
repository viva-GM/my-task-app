import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, Project, Priority, MaterialItem } from '../../types';
import { 
  X, 
  CheckCircle2, 
  Building2, 
  User as UserIcon, 
  Users, 
  Calendar, 
  Clock, 
  Plus, 
  Trash2,
  AlertCircle,
  Package,
  ShoppingCart,
  Truck,
  ArrowRight,
  FolderKanban
} from 'lucide-react';

interface Props {
  item: Task | Project;
  itemType: 'task' | 'project';
  onClose: () => void;
}

export const EvaluationModal: React.FC<Props> = ({ item, itemType, onClose }) => {
  const { 
    tasks,
    departments, 
    users, 
    evaluateAndApproveTask, 
    evaluateAndApproveProject,
    addMaterialItem,
    removeMaterialItem,
    toggleMaterialInStock,
    createProcurementTaskForMaterials,
    currentUser
  } = useApp();

  // Helper date add
  const addDays = (dateStr: string, days: number): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  };

  const today = new Date().toISOString().split('T')[0];

  // Task evaluation state
  const isTask = itemType === 'task';
  const task = item as Task;
  const project = item as Project;

  // Reactively track latest task state from context
  const currentTask = isTask ? (tasks.find(t => t.id === task.id) || task) : null;
  const materials: MaterialItem[] = currentTask?.materials || [];
  const missingMaterials = materials.filter(m => !m.inStock);
  const inStockMaterials = materials.filter(m => m.inStock);

  const [departmentId, setDepartmentId] = useState<string>(
    task?.departmentId || departments[0]?.id || 'dept-office'
  );
  const [assignedToId, setAssignedToId] = useState<string | undefined>(task?.assignedToId);
  const [coAssigneeIds, setCoAssigneeIds] = useState<string[]>(task?.coAssigneeIds || []);
  const [startDate, setStartDate] = useState<string>(item?.startDate || today);
  const [dueDate, setDueDate] = useState<string>(item?.dueDate || addDays(today, 14));
  const [priority, setPriority] = useState<Priority>(item?.priority || 'medium');
  const [evaluationNotes, setEvaluationNotes] = useState<string>(
    item?.evaluationNotes || 'Bill of Materials assessed and resource allocation confirmed.'
  );

  // Bill of Materials Form State inside Evaluation
  const [matName, setMatName] = useState('');
  const [matQty, setMatQty] = useState('');
  const [matInStock, setMatInStock] = useState(false);
  const [matNotes, setMatNotes] = useState('');
  const [procurementSuccessMsg, setProcurementSuccessMsg] = useState<string | null>(null);

  // Project subtasks state
  const [subtasks, setSubtasks] = useState<
    {
      id: string;
      title: string;
      description: string;
      departmentId: string;
      assignedToId?: string;
      coAssigneeIds?: string[];
      startDate: string;
      dueDate: string;
      priority: Priority;
    }[]
  >(() => {
    if (isTask) return [];
    return [
      {
        id: 'st-1',
        title: 'Phase 1: Architecture & Technical Specification',
        description: 'Prepare detailed functional requirements, resource plan, and BoM review',
        departmentId: departments[1]?.id || departments[0]?.id || 'dept-eng',
        startDate: today,
        dueDate: addDays(today, 10),
        priority: 'high'
      },
      {
        id: 'st-2',
        title: 'Phase 2: Component Engineering & Integration',
        description: 'Full stack development, integration testing, and deployment verification',
        departmentId: departments[1]?.id || departments[0]?.id || 'dept-eng',
        startDate: addDays(today, 11),
        dueDate: addDays(today, 25),
        priority: 'high'
      }
    ];
  });

  // Users in the selected department of ANY level (head + employees)
  const targetDept = departments.find(d => d.id === departmentId);
  const deptEmployees = users.filter(u => u.departmentId === departmentId || targetDept?.headId === u.id);

  // Look up office department and Procurement Officer for preview
  const officeDept = departments.find(
    d =>
      d.id === 'dept-office' ||
      d.code.toUpperCase() === 'OFC' ||
      d.name.toLowerCase().includes('office') ||
      d.name.toLowerCase().includes('procurement')
  ) || departments[0];

  const procurementOfficer = users.find(
    u =>
      u.departmentId === officeDept.id &&
      (u.title.toLowerCase().includes('procurement') ||
       u.name.toLowerCase().includes('procurement') ||
       u.title.toLowerCase().includes('закуп'))
  );

  const omUser = users.find(u => u.role === 'ops_manager') || currentUser;
  const targetProcurementAssignee = procurementOfficer || omUser;

  const handleToggleCoAssignee = (userId: string) => {
    if (userId === assignedToId) return;
    if (coAssigneeIds.includes(userId)) {
      setCoAssigneeIds(coAssigneeIds.filter(id => id !== userId));
    } else {
      setCoAssigneeIds([...coAssigneeIds, userId]);
    }
  };

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matName.trim() || !task) return;

    addMaterialItem(task.id, {
      name: matName.trim(),
      quantity: matQty.trim() || '1 unit',
      inStock: matInStock,
      notes: matNotes.trim() || undefined
    });

    setMatName('');
    setMatQty('');
    setMatInStock(false);
    setMatNotes('');
  };

  const handleCreateProcurement = () => {
    if (!task) return;
    const procTask = createProcurementTaskForMaterials(task.id);
    if (procTask) {
      setProcurementSuccessMsg(
        `Procurement task created for ${targetProcurementAssignee.name} (${targetProcurementAssignee.title}) in Office. Task moved to "Materials Needed" column!`
      );
      setTimeout(() => {
        onClose();
      }, 1400);
    }
  };

  const handleAddProjectSubtask = () => {
    setSubtasks([
      ...subtasks,
      {
        id: `st-${Date.now()}`,
        title: `Workstream ${subtasks.length + 1}`,
        description: '',
        departmentId: departments[0]?.id || 'dept-office',
        startDate: today,
        dueDate: addDays(today, 14),
        priority: 'medium'
      }
    ]);
  };

  const handleUpdateSubtask = (index: number, patch: Partial<typeof subtasks[0]>) => {
    const updated = [...subtasks];
    updated[index] = { ...updated[index], ...patch };
    setSubtasks(updated);
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleApprove = () => {
    if (isTask) {
      evaluateAndApproveTask(task.id, {
        departmentId,
        assignedToId,
        coAssigneeIds,
        startDate,
        dueDate,
        priority,
        evaluationNotes
      });
    } else {
      evaluateAndApproveProject(project.id, {
        startDate,
        dueDate,
        evaluationNotes,
        subtasks
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-indigo-50/60">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-600 text-white rounded-lg shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ops Evaluation & Allocation: {isTask ? 'Standalone Task' : 'Complex Project'}
              </h2>
              <p className="text-xs text-slate-600">
                Operations Manager Workspace: review Bill of Materials (BoM), assign department, set schedule, and launch to Execution
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Card Summary */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              Promoted from Board Space
            </span>
            <h3 className="text-sm font-bold text-slate-900 leading-snug">
              {item.title}
            </h3>
            {item.description && (
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                {item.description}
              </p>
            )}
          </div>

          {/* SINGLE TASK EVALUATION WORKFLOW */}
          {isTask && (
            <div className="space-y-6">
              
              {/* REQUIREMENT 4: BILL OF MATERIALS (BoM) EVALUATION SECTION IN OPS ASSESSMENT */}
              <div className="p-4 bg-amber-50/50 border-2 border-amber-300 rounded-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-200">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-amber-600 text-white rounded-md shadow-2xs">
                      <Package className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                        <span>Bill of Materials (BoM) · Materials Assessment</span>
                        <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                          Required by OM
                        </span>
                      </h3>
                      <p className="text-[11px] text-amber-800">
                        Assess required materials, licenses, hardware, or external resources before approving execution
                      </p>
                    </div>
                  </div>

                  {/* Summary Status Badges */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-white border border-amber-200 text-amber-900 font-semibold text-[11px]">
                      Total: {materials.length}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                      ✓ In Stock: {inStockMaterials.length}
                    </span>
                    {missingMaterials.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                        ⚠ Missing: {missingMaterials.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Success feedback if procurement triggered */}
                {procurementSuccessMsg && (
                  <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{procurementSuccessMsg}</span>
                  </div>
                )}

                {/* Materials List */}
                {materials.length > 0 ? (
                  <div className="space-y-2">
                    {materials.map(mat => (
                      <div
                        key={mat.id}
                        className="p-2.5 bg-white rounded-lg border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs hover:border-amber-400 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-slate-900">
                            {mat.name}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[11px]">
                            {mat.quantity}
                          </span>
                          {mat.notes && (
                            <span className="text-[11px] text-slate-400 italic truncate max-w-[200px]">
                              ({mat.notes})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* In Stock toggle button */}
                          <button
                            type="button"
                            onClick={() => toggleMaterialInStock(task.id, mat.id)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              mat.inStock
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                            }`}
                            title="Click to toggle availability"
                          >
                            {mat.inStock ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>In Stock (Available)</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Unavailable (Procure)</span>
                              </>
                            )}
                          </button>

                          {/* Delete Item */}
                          <button
                            type="button"
                            onClick={() => removeMaterialItem(task.id, mat.id)}
                            className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Delete material"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-white/70 border border-dashed border-amber-200 rounded-lg text-center text-xs text-slate-500 italic">
                    No materials registered in Bill of Materials yet. Add items below.
                  </div>
                )}

                {/* Alert when items are unavailable -> Prompt to create procurement task */}
                {missingMaterials.length > 0 && (
                  <div className="p-3.5 bg-gradient-to-r from-amber-100/90 to-orange-100/90 border border-amber-300 rounded-xl space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-amber-800 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-amber-950">
                            Unavailable Materials Detected ({missingMaterials.length} item{missingMaterials.length > 1 ? 's' : ''})
                          </h4>
                          <p className="text-[11px] text-amber-900">
                            Create a procurement task and move this initiative to Board "Materials Needed".
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCreateProcurement}
                        className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Create Procurement Task & Move to Materials Needed</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-amber-950 bg-white/90 p-2 rounded border border-amber-200 flex flex-wrap items-center justify-between gap-1">
                      <span>
                        <b>Procurement Assignee:</b> {targetProcurementAssignee.name} ({targetProcurementAssignee.title}) in <b>{officeDept.name}</b>.
                      </span>
                      <span className="font-semibold text-amber-800">
                        Board Stage → "Materials Needed"
                      </span>
                    </div>
                  </div>
                )}

                {/* Form to add item to BoM */}
                <form onSubmit={handleAddMaterial} className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                    + Add Item to Bill of Materials (BoM)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={matName}
                      onChange={e => setMatName(e.target.value)}
                      placeholder="Material / License / Component name..."
                      className="sm:col-span-2 px-2.5 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      value={matQty}
                      onChange={e => setMatQty(e.target.value)}
                      placeholder="Qty (e.g. 10 units, 2 licenses)"
                      className="px-2.5 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-amber-500"
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={matInStock}
                          onChange={e => setMatInStock(e.target.checked)}
                          className="rounded text-amber-600"
                        />
                        <span>In Stock?</span>
                      </label>
                      <button
                        type="submit"
                        className="ml-auto px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Department & Primary Assignee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Department Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Responsible Department <span className="text-rose-500">*</span></span>
                  </label>
                  <select
                    value={departmentId}
                    onChange={e => {
                      setDepartmentId(e.target.value);
                      setAssignedToId(undefined);
                      setCoAssigneeIds([]);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 bg-white outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Primary Executor Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Primary Assignee (Optional)</span>
                  </label>
                  <select
                    value={assignedToId || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setAssignedToId(val || undefined);
                      if (val && coAssigneeIds.includes(val)) {
                        setCoAssigneeIds(coAssigneeIds.filter(id => id !== val));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 bg-white outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">Leave Unassigned (Department will appoint on Assessment)</option>
                    {deptEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.title}) {emp.id === targetDept?.headId ? '— Head of Dept' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400">
                    If unassigned, the department will appoint the executor in their Assessment stage.
                  </p>
                </div>

              </div>

              {/* Co-Assignees */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Department Co-Assignees (Any Level)</span>
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg max-h-32 overflow-y-auto">
                  {deptEmployees.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No employees in this department.</span>
                  ) : (
                    deptEmployees.map(emp => {
                      const isPrimary = emp.id === assignedToId;
                      const isCo = coAssigneeIds.includes(emp.id);

                      return (
                        <button
                          key={emp.id}
                          type="button"
                          disabled={isPrimary}
                          onClick={() => handleToggleCoAssignee(emp.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                            isPrimary
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : isCo
                              ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <img
                            src={emp.avatar}
                            alt={emp.name}
                            referrerPolicy="no-referrer"
                            className="w-4 h-4 rounded-full object-cover"
                          />
                          <span>{emp.name}</span>
                          {isCo && <span>✓</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Dates & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Deadline (Due Date)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

              </div>

              {/* Ops Manager Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Operations Manager Evaluation Notes & Directives
                </label>
                <textarea
                  rows={2}
                  value={evaluationNotes}
                  onChange={e => setEvaluationNotes(e.target.value)}
                  placeholder="Notes on deliverables, resource availability, BoM, and constraints..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

            </div>
          )}

          {/* PROJECT DECOMPOSITION WORKFLOW */}
          {!isTask && (
            <div className="space-y-5">
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Project Workstream Breakdown ({subtasks.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Each subtask is allocated to a specific department, assignee, and individual schedule
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddProjectSubtask}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Workstream</span>
                </button>
              </div>

              {/* Subtasks List */}
              <div className="space-y-4">
                {subtasks.map((st, index) => {
                  return (
                    <div
                      key={st.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700">
                          Workstream #{index + 1}
                        </span>
                        {subtasks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSubtask(index)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={st.title}
                          onChange={e => handleUpdateSubtask(index, { title: e.target.value })}
                          placeholder="Workstream deliverable title..."
                          className="w-full px-3 py-1.5 rounded-md border border-slate-300 text-xs font-semibold text-slate-900 bg-white outline-none focus:border-indigo-500"
                        />
                        <textarea
                          rows={1}
                          value={st.description}
                          onChange={e => handleUpdateSubtask(index, { description: e.target.value })}
                          placeholder="Brief technical requirements..."
                          className="w-full px-3 py-1.5 rounded-md border border-slate-300 text-xs text-slate-700 bg-white outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                        
                        {/* Department */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Department</label>
                          <select
                            value={st.departmentId}
                            onChange={e => handleUpdateSubtask(index, { departmentId: e.target.value, assignedToId: undefined })}
                            className="w-full px-2 py-1 rounded border border-slate-300 text-xs bg-white text-slate-800"
                          >
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Dates & Priority */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
                          <input
                            type="date"
                            value={st.startDate}
                            onChange={e => handleUpdateSubtask(index, { startDate: e.target.value })}
                            className="w-full px-2 py-1 rounded border border-slate-300 text-xs bg-white text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Deadline</label>
                          <input
                            type="date"
                            value={st.dueDate}
                            onChange={e => handleUpdateSubtask(index, { dueDate: e.target.value })}
                            className="w-full px-2 py-1 rounded border border-slate-300 text-xs bg-white text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Priority</label>
                          <select
                            value={st.priority}
                            onChange={e => handleUpdateSubtask(index, { priority: e.target.value as Priority })}
                            className="w-full px-2 py-1 rounded border border-slate-300 text-xs bg-white text-slate-800"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ops Notes for Project */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Operations Manager Project Directives
                </label>
                <textarea
                  rows={2}
                  value={evaluationNotes}
                  onChange={e => setEvaluationNotes(e.target.value)}
                  placeholder="Cross-functional notes for department heads..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

            </div>
          )}

          {/* Workflow Note Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Upon clicking "Approve & Launch into Execution", tasks will appear in the respective department spaces under <b>"New"</b>. On the Board, the card advances to <b>"Execution"</b>.
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {isTask && missingMaterials.length > 0 && (
              <button
                type="button"
                onClick={handleCreateProcurement}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Move to Materials Needed</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleApprove}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Launch into Execution</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
