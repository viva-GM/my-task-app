import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Task, DepartmentStage, Priority, Subtask, MaterialItem } from '../types';
import { 
  X, 
  Calendar, 
  Clock, 
  Building2, 
  User as UserIcon, 
  Users, 
  CheckCircle2, 
  RotateCcw, 
  Send, 
  Paperclip, 
  AlertTriangle,
  History,
  FolderKanban,
  Camera,
  Image as ImageIcon,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  ShieldAlert,
  ArrowRight,
  Package,
  ShoppingCart,
  Truck,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';
import { CameraCaptureModal } from './CameraCaptureModal';

interface Props {
  task: Task;
  onClose: () => void;
  onOpenProject?: (projectId: string) => void;
  onOpenTask?: (taskId: string) => void;
  initialTab?: 'overview' | 'bom' | 'subtasks' | 'discussion';
}

export const TaskDetailModal: React.FC<Props> = ({ 
  task, 
  onClose, 
  onOpenProject, 
  onOpenTask,
  initialTab = 'overview'
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'bom' | 'subtasks' | 'discussion'>(initialTab);
  const { 
    tasks,
    departments, 
    users, 
    updateTask, 
    addTaskComment, 
    updateTaskDepartmentStatus,
    approveTaskCompletedByOpsManager,
    returnTaskForRevision,
    canAssessTasks,
    canManageBoard,
    canEditTaskDates,
    canManageDepartment,
    currentUser,
    projects,
    addMaterialItem,
    updateMaterialItem,
    removeMaterialItem,
    toggleMaterialInStock,
    createProcurementTaskForMaterials
  } = useApp();

  // Bind to latest state from context for real-time reactivity
  const currentTask = tasks.find(t => t.id === task.id) || task;

  const [newComment, setNewComment] = useState('');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [isReturning, setIsReturning] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Subtask creation state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState('');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');

  // Bill of Materials creation state
  const [materialName, setMaterialName] = useState('');
  const [materialQty, setMaterialQty] = useState('');
  const [materialInStock, setMaterialInStock] = useState(false);
  const [materialNotes, setMaterialNotes] = useState('');
  const [procurementNotice, setProcurementNotice] = useState<string | null>(null);

  const commentFileInputRef = useRef<HTMLInputElement>(null);

  const dept = departments.find(d => d.id === currentTask.departmentId);
  const deptHead = users.find(u => u.id === dept?.headId);

  // All members of this department of ANY level (head + employees)
  const deptMembers = users.filter(u => u.departmentId === currentTask.departmentId || dept?.headId === u.id);

  const assignee = users.find(u => u.id === currentTask.assignedToId);
  const coAssignees = users.filter(u => currentTask.coAssigneeIds?.includes(u.id));
  const parentProject = projects.find(p => p.id === currentTask.projectId);

  // Office department and Procurement Officer lookup
  const officeDept = departments.find(
    d => d.id === 'dept-office' || d.code.toUpperCase() === 'OFC' || d.name.toLowerCase().includes('office')
  ) || departments[0];

  const procurementOfficer = users.find(
    u => u.departmentId === officeDept?.id && (u.title.toLowerCase().includes('procurement') || u.name.toLowerCase().includes('procurement'))
  );
  const omUser = users.find(u => u.role === 'ops_manager') || currentUser;
  const targetProcurementAssignee = procurementOfficer || omUser;

  const isAwaitingReview = currentTask.boardStatus === 'awaiting_review';
  const isDepartmentAssessment = currentTask.departmentStatus === 'assessment';
  const isNewInDepartment = currentTask.departmentStatus === 'new';

  const deptStages: { key: DepartmentStage; label: string }[] = [
    { key: 'new', label: 'New' },
    { key: 'assessment', label: 'Assessment' },
    { key: 'execution', label: 'Execution' },
    { key: 'review', label: 'Review' },
    { key: 'done', label: 'Done' },
    { key: 'archive', label: 'Archive' }
  ];

  const priorityLabels: Record<Priority, { label: string; color: string }> = {
    urgent: { label: 'Urgent', color: 'bg-rose-100 text-rose-800' },
    high: { label: 'High', color: 'bg-amber-100 text-amber-800' },
    medium: { label: 'Medium', color: 'bg-blue-100 text-blue-800' },
    low: { label: 'Low', color: 'bg-slate-100 text-slate-800' }
  };

  // Materials statistics
  const materials = currentTask.materials || [];
  const inStockCount = materials.filter(m => m.inStock).length;
  const missingMaterials = materials.filter(m => !m.inStock);
  const missingCount = missingMaterials.length;

  // Clipboard paste listener on comment input
  const handleCommentPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          compressImage(file)
            .then(compressed => setCommentImage(compressed))
            .catch(err => console.warn('Comment paste compression error:', err));
        }
      }
    }
  };

  const handleCommentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file)
        .then(compressed => setCommentImage(compressed))
        .catch(err => console.warn('Comment upload error:', err));
    }
    if (commentFileInputRef.current) {
      commentFileInputRef.current.value = '';
    }
  };

  const handleSendComment = () => {
    if (!newComment.trim() && !commentImage) return;
    addTaskComment(currentTask.id, newComment.trim(), commentImage || undefined);
    setNewComment('');
    setCommentImage(null);
  };

  // Primary Assignee setting
  const handleSetPrimaryAssignee = (newAssigneeId: string) => {
    const updatedAssignee = users.find(u => u.id === newAssigneeId);
    updateTask({
      ...currentTask,
      assignedToId: newAssigneeId || undefined,
      history: [
        ...currentTask.history,
        {
          id: `h-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          actorId: currentUser.id,
          action: `Primary assignee updated to: ${updatedAssignee?.name || 'Unassigned'}.`
        }
      ]
    });
  };

  // Toggle Co-Assignees
  const handleToggleCoAssignee = (userId: string) => {
    if (userId === currentTask.assignedToId) return;
    const currentCo = currentTask.coAssigneeIds || [];
    const newCo = currentCo.includes(userId)
      ? currentCo.filter(id => id !== userId)
      : [...currentCo, userId];

    updateTask({
      ...currentTask,
      coAssigneeIds: newCo
    });
  };

  // Add Subtask: rule: if subtasks exist, auto-assign parent task to Department Head
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;

    const newSub: Subtask = {
      id: `sub-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      assignedToId: newSubtaskAssigneeId || undefined,
      dueDate: newSubtaskDueDate || undefined,
      isCompleted: false
    };

    const existingSubtasks = currentTask.subtasks || [];
    const updatedSubtasks = [...existingSubtasks, newSub];

    const headId = deptHead ? deptHead.id : currentTask.assignedToId;

    updateTask({
      ...currentTask,
      subtasks: updatedSubtasks,
      assignedToId: headId,
      history: [
        ...currentTask.history,
        {
          id: `h-sub-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          actorId: currentUser.id,
          action: `Created subtask "${newSub.title}". Primary coordinator automatically assigned to Department Head (${deptHead?.name || 'Head'}).`
        }
      ]
    });

    setNewSubtaskTitle('');
    setNewSubtaskAssigneeId('');
    setNewSubtaskDueDate('');
  };

  const handleToggleSubtask = (subtaskId: string) => {
    const updated = (currentTask.subtasks || []).map(st =>
      st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );

    updateTask({
      ...currentTask,
      subtasks: updated
    });
  };

  const handleRemoveSubtask = (subtaskId: string) => {
    const updated = (currentTask.subtasks || []).filter(st => st.id !== subtaskId);
    updateTask({
      ...currentTask,
      subtasks: updated
    });
  };

  // Bill of Materials Handlers
  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialName.trim()) return;

    addMaterialItem(currentTask.id, {
      name: materialName.trim(),
      quantity: materialQty.trim() || '1 item',
      inStock: materialInStock,
      notes: materialNotes.trim() || undefined
    });

    setMaterialName('');
    setMaterialQty('');
    setMaterialInStock(false);
    setMaterialNotes('');
  };

  const handleCreateProcurement = () => {
    const created = createProcurementTaskForMaterials(currentTask.id);
    if (created) {
      setProcurementNotice(
        `Procurement task created (#${created.id.substring(0, 8)}) and assigned to ${targetProcurementAssignee.name} (${targetProcurementAssignee.title}). Initiative moved to Board "Materials Needed".`
      );
    }
  };

  const handleAdvanceToExecution = () => {
    updateTask({
      ...currentTask,
      boardStatus: 'execution',
      history: [
        ...currentTask.history,
        {
          id: `h-exec-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          actorId: currentUser.id,
          action: 'All required Bill of Materials items confirmed in stock. Task advanced to Execution on the Board.'
        }
      ]
    });
  };

  const handleApproveCompleted = () => {
    approveTaskCompletedByOpsManager(currentTask.id);
    onClose();
  };

  const handleConfirmReturn = () => {
    if (!returnReason.trim()) return;
    returnTaskForRevision(currentTask.id, returnReason);
    setIsReturning(false);
    onClose();
  };

  const handleFinishAssessment = () => {
    updateTaskDepartmentStatus(currentTask.id, 'execution');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${priorityLabels[currentTask.priority].color}`}>
              {priorityLabels[currentTask.priority].label}
            </span>
            {dept && (
              <span
                className="px-2 py-0.5 rounded text-xs font-semibold"
                style={{ backgroundColor: `${dept.color}15`, color: dept.color }}
              >
                {dept.name}
              </span>
            )}
            <span className="text-xs bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded">
              Dept Stage: {currentTask.departmentStatus}
            </span>
            <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">
              Board: {currentTask.boardStatus}
            </span>
            {parentProject && (
              <button
                onClick={() => onOpenProject && onOpenProject(parentProject.id)}
                className="flex items-center gap-1 text-xs text-purple-700 hover:text-purple-900 bg-purple-50 px-2 py-0.5 rounded font-semibold"
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span>Project: {parentProject.title}</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs - Fixed and prominent at top */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Overview & Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bom')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'bom'
                ? 'border-amber-600 text-amber-950 bg-amber-50 rounded-t-lg shadow-2xs ring-1 ring-amber-300 font-extrabold'
                : 'border-transparent text-slate-700 hover:text-amber-800 hover:bg-amber-50/50'
            }`}
          >
            <Package className="w-4 h-4 text-amber-600" />
            <span>Bill of Materials (BoM)</span>
            {missingCount > 0 ? (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                ⚠️ {missingCount} missing
              </span>
            ) : materials.length > 0 ? (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                ✓ {materials.length}
              </span>
            ) : (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-600">
                0
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subtasks')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'subtasks'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
            <span>Subtasks ({(currentTask.subtasks || []).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('discussion')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'discussion'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Discussion ({(currentTask.comments || []).length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Procurement Task Banner if this task is an auto-generated procurement order */}
          {currentTask.isProcurementTask && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-amber-600 text-white rounded-lg shrink-0">
                  <Package className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-amber-950">
                    Procurement Order (Office Department)
                  </h4>
                  <p className="text-[11px] text-amber-800">
                    Assigned to acquire materials for parent initiative: <b>#{currentTask.parentTaskIdForProcurement}</b>.
                  </p>
                </div>
              </div>
              {currentTask.parentTaskIdForProcurement && onOpenTask && (
                <button
                  type="button"
                  onClick={() => onOpenTask(currentTask.parentTaskIdForProcurement!)}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Open Parent Task</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Operations Manager Review Banner if in 'awaiting_review' */}
          {isAwaitingReview && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3 shadow-xs">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-amber-600 text-white rounded-lg">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-amber-950">
                      Task completed by department and awaiting Ops Manager sign-off!
                    </h4>
                    <p className="text-xs text-amber-800">
                      Department marked as "Done". Operations Manager approval required to archive and mark as "COMPLETED" on Board.
                    </p>
                  </div>
                </div>

                {canAssessTasks() && !isReturning && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsReturning(true)}
                      className="px-3 py-1.5 border border-amber-400 text-amber-900 hover:bg-amber-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Return for Revision</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApproveCompleted}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve: COMPLETED</span>
                    </button>
                  </div>
                )}
              </div>

              {isReturning && (
                <div className="pt-2 border-t border-amber-200 space-y-2">
                  <label className="text-xs font-bold text-amber-900">
                    Specify reason for returning task for revision:
                  </label>
                  <textarea
                    rows={2}
                    value={returnReason}
                    onChange={e => setReturnReason(e.target.value)}
                    placeholder="e.g. Missing load testing report or pending visual design QA signoff..."
                    className="w-full px-3 py-2 rounded-lg border border-amber-400 text-xs text-slate-800 bg-white outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsReturning(false)}
                      className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmReturn}
                      className="px-3 py-1 bg-amber-700 text-white rounded text-xs font-semibold hover:bg-amber-800"
                    >
                      Send for Revision
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Title & Description */}
          <div className="space-y-2">
            <h1 className="text-lg font-bold text-slate-900 leading-snug">
              {currentTask.title}
            </h1>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/60 p-3 rounded-lg border border-slate-100">
              {currentTask.description || 'No description provided.'}
            </p>
          </div>

          {/* PROMINENT BILL OF MATERIALS (BOM) SPOTLIGHT BANNER */}
          <div className="p-4 bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50/50 border-2 border-amber-300 rounded-xl space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">
                      Bill of Materials (BoM) · Materials Assessment
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white border border-amber-300 text-amber-900">
                      {materials.length} items
                    </span>
                    {missingCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white shadow-2xs animate-pulse">
                        ⚠️ {missingCount} Missing / Needs Procurement
                      </span>
                    ) : materials.length > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-2xs">
                        ✓ All Materials in Stock
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                        Pending BoM Evaluation
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-800 mt-1">
                    Ops Manager verifies equipment, supplies, parts, and hardware needed for execution.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('bom')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-auto"
              >
                <Package className="w-4 h-4" />
                <span>Open BoM & Procurement ({materials.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick previews of first 4 items */}
            {materials.length > 0 && (
              <div className="pt-2 border-t border-amber-200/80 flex flex-wrap gap-2 items-center text-xs">
                <span className="text-[10px] font-bold text-amber-900 uppercase">Registered Items:</span>
                {materials.slice(0, 4).map(m => (
                  <span
                    key={m.id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                      m.inStock
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200 font-bold'
                    }`}
                  >
                    {m.inStock ? '✓' : '⚠️'} {m.name} ({m.quantity})
                  </span>
                ))}
                {materials.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('bom')}
                    className="text-[11px] text-amber-800 font-bold hover:underline cursor-pointer"
                  >
                    +{materials.length - 4} more in BoM tab →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            
            {/* Responsible Dept */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span>Department</span>
              </span>
              <span className="font-semibold text-slate-900 block truncate">
                {dept?.name || 'Unassigned'}
              </span>
            </div>

            {/* Assignee */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <UserIcon className="w-3 h-3" />
                <span>Primary Assignee</span>
              </span>
              <div className="flex items-center gap-1.5 truncate">
                {assignee ? (
                  <>
                    <img
                      src={assignee.avatar}
                      alt={assignee.name}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover shrink-0"
                    />
                    <span className="font-semibold text-slate-900 truncate">{assignee.name}</span>
                  </>
                ) : (
                  <span className="text-amber-700 font-semibold italic">
                    Unassigned (Pending Assessment)
                  </span>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Timeline</span>
              </span>
              <span className="font-semibold text-slate-900 block tabular-nums">
                {currentTask.startDate} → {currentTask.dueDate}
              </span>
            </div>

            {/* Co-Assignees */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>Co-Assignees</span>
              </span>
              <div className="truncate">
                {coAssignees.length > 0 ? (
                  <span className="text-slate-700 font-medium">
                    {coAssignees.map(u => u.name).join(', ')}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">None appointed</span>
                )}
              </div>
            </div>

          </div>

          {/* SECTION: BILL OF MATERIALS (BoM) / ОЦЕНКА МАТЕРИАЛОВ (Prompt Requirement 2) */}
          {(activeTab === 'overview' || activeTab === 'bom') && (
            <div className={`p-4 rounded-xl space-y-4 border ${
              activeTab === 'bom' 
                ? 'bg-amber-50/80 border-2 border-amber-300 shadow-sm ring-1 ring-amber-200' 
                : 'bg-amber-50/40 border border-amber-200/80'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-amber-100 text-amber-800 rounded-md">
                  <Package className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Bill of Materials (BoM) · Materials Assessment
                  </h3>
                  <p className="text-[11px] text-amber-800">
                    Ops Manager evaluates required resources, supplies, hardware or licenses
                  </p>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-white border border-amber-200 text-amber-900 font-semibold text-[11px]">
                  Total: {materials.length}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                  ✓ In Stock: {inStockCount}
                </span>
                {missingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                    ⚠ Missing: {missingCount}
                  </span>
                )}
              </div>
            </div>

            {/* Procurement Notice if recently triggered */}
            {procurementNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{procurementNotice}</span>
              </div>
            )}

            {/* Material Items List */}
            {materials.length > 0 ? (
              <div className="space-y-2">
                {materials.map(item => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs hover:border-amber-300 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-slate-900 truncate">
                        {item.name}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[11px]">
                        {item.quantity}
                      </span>
                      {item.notes && (
                        <span className="text-[11px] text-slate-400 italic truncate max-w-[200px]">
                          ({item.notes})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Availability status toggle */}
                      <button
                        type="button"
                        onClick={() => toggleMaterialInStock(currentTask.id, item.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          item.inStock
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                        }`}
                        title="Click to toggle availability status"
                      >
                        {item.inStock ? (
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

                      {/* Remove item */}
                      {(canAssessTasks() || canManageBoard()) && (
                        <button
                          type="button"
                          onClick={() => removeMaterialItem(currentTask.id, item.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                          title="Remove material item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-white/70 border border-dashed border-amber-200 rounded-lg text-center text-xs text-slate-500 italic">
                No materials registered in Bill of Materials. Add required items below.
              </div>
            )}

            {/* Prompt Rule: When materials are unavailable -> create procurement task */}
            {missingCount > 0 && (
              <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-700 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-950">
                        Unavailable Materials Detected ({missingCount} item{missingCount > 1 ? 's' : ''})
                      </h4>
                      <p className="text-[11px] text-amber-800">
                        Initiative requires procurement of supplies before or during execution.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateProcurement}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
                    title="Generate procurement task and move initiative to Board 'Materials Needed'"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Create Procurement Task</span>
                  </button>
                </div>

                <div className="text-[11px] text-amber-900 bg-white/80 p-2 rounded border border-amber-200 flex items-center justify-between">
                  <span>
                    <b>Auto-Assignee:</b> {targetProcurementAssignee.name} ({targetProcurementAssignee.title}) in Department: <b>{officeDept.name}</b>.
                  </span>
                  <span className="font-semibold text-amber-800">
                    Board Column → "Materials Needed"
                  </span>
                </div>
              </div>
            )}

            {/* Ready to advance if in materials_needed and all materials are in stock */}
            {currentTask.boardStatus === 'materials_needed' && missingCount === 0 && materials.length > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-950">
                    All required materials are confirmed in stock! Ready to advance to Execution.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAdvanceToExecution}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  <span>Advance to Execution →</span>
                </button>
              </div>
            )}

            {/* Add Material Form for Ops Manager / Board */}
            {(canAssessTasks() || canManageBoard()) && (
              <form onSubmit={handleAddMaterial} className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                  + Add Item to Bill of Materials (BoM)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={materialName}
                    onChange={e => setMaterialName(e.target.value)}
                    placeholder="Item / Hardware / License..."
                    className="sm:col-span-2 px-2.5 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    value={materialQty}
                    onChange={e => setMaterialQty(e.target.value)}
                    placeholder="Qty (e.g. 5 units, 2 pcs)..."
                    className="px-2.5 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={materialInStock}
                        onChange={e => setMaterialInStock(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>In Stock</span>
                    </label>
                    <button
                      type="submit"
                      className="flex-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
          )}

          {/* DEPARTMENT ASSESSMENT & PLANNING SECTION */}
          {(activeTab === 'overview' || activeTab === 'subtasks') && (
            <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-700" />
                <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  Department Assessment & Task Delegation
                </h3>
              </div>
              {isDepartmentAssessment && (
                <button
                  type="button"
                  onClick={handleFinishAssessment}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                >
                  <span>Complete Assessment → Into Work</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Has Subtasks Auto-Assignment Notice */}
            {currentTask.subtasks && currentTask.subtasks.length > 0 && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Subtasks exist in this initiative. Primary coordinator is <b>automatically assigned to Department Head ({deptHead?.name || 'Head'})</b>.
                </span>
              </div>
            )}

            {/* Primary Assignee and Co-Assignees */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Primary Executor Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Primary Assignee
                </label>
                <select
                  value={currentTask.assignedToId || ''}
                  onChange={e => handleSetPrimaryAssignee(e.target.value)}
                  disabled={currentTask.subtasks && currentTask.subtasks.length > 0}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 bg-white outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">-- Select Responsible Team Member --</option>
                  {deptMembers.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.title}) {emp.id === dept?.headId ? '— Head of Dept' : ''}
                    </option>
                  ))}
                </select>
                {currentTask.subtasks && currentTask.subtasks.length > 0 && (
                  <p className="text-[11px] text-slate-500">
                    Locked to Department Head due to active subtask breakdown
                  </p>
                )}
              </div>

              {/* Co-assignees selection: any member from this department of any level */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Co-Assignees (Any Level in Department)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white border border-slate-200 rounded-lg">
                  {deptMembers.map(member => {
                    const isPrimary = member.id === currentTask.assignedToId;
                    const isCo = currentTask.coAssigneeIds?.includes(member.id);

                    return (
                      <button
                        key={member.id}
                        type="button"
                        disabled={isPrimary}
                        onClick={() => handleToggleCoAssignee(member.id)}
                        className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                          isPrimary
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : isCo
                            ? 'bg-indigo-600 text-white font-semibold'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <img
                          src={member.avatar}
                          alt={member.name}
                          referrerPolicy="no-referrer"
                          className="w-3.5 h-3.5 rounded-full object-cover"
                        />
                        <span className="truncate max-w-[120px]">{member.name}</span>
                        {isCo && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Subtasks Section */}
            <div className="pt-2 border-t border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  Initiative Subtasks ({currentTask.subtasks?.length || 0})
                </span>
                <span className="text-[11px] text-slate-500">
                  Creating a subtask automatically sets the parent task lead to Department Head
                </span>
              </div>

              {/* Existing Subtasks */}
              {currentTask.subtasks && currentTask.subtasks.length > 0 && (
                <div className="space-y-2">
                  {currentTask.subtasks.map(st => {
                    const stAssignee = users.find(u => u.id === st.assignedToId);

                    return (
                      <div
                        key={st.id}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 text-xs transition-colors ${
                          st.isCompleted
                            ? 'bg-emerald-50/50 border-emerald-200 text-slate-500'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleSubtask(st.id)}
                            className="text-slate-400 hover:text-emerald-600"
                          >
                            {st.isCompleted ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                          <span className={`font-semibold truncate ${st.isCompleted ? 'line-through' : ''}`}>
                            {st.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 text-[11px]">
                          {stAssignee && (
                            <span className="text-slate-600 flex items-center gap-1">
                              <UserIcon className="w-3 h-3 text-slate-400" />
                              <span>{stAssignee.name}</span>
                            </span>
                          )}
                          {st.dueDate && (
                            <span className="font-mono text-slate-500">{st.dueDate}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveSubtask(st.id)}
                            className="text-slate-300 hover:text-rose-600 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Subtask Form */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">
                  + Add Subtask
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    placeholder="Subtask title & deliverable..."
                    className="sm:col-span-2 px-2.5 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500"
                  />
                  <select
                    value={newSubtaskAssigneeId}
                    onChange={e => setNewSubtaskAssigneeId(e.target.value)}
                    className="px-2 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 outline-none"
                  >
                    <option value="">Assignee...</option>
                    {deptMembers.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={newSubtaskDueDate}
                      onChange={e => setNewSubtaskDueDate(e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubtask}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shrink-0"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </div>
          )}

          {/* Department Stage Selector & Overview Details */}
          {activeTab === 'overview' && (
            <>
              {/* Department Stage Selector / Progress Bar */}
              <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Department Stage
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Board Status: <span className="font-bold text-indigo-700">{currentTask.boardStatus}</span>
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 bg-slate-100 rounded-lg">
              {deptStages.map(stage => {
                const isActive = currentTask.departmentStatus === stage.key;
                return (
                  <button
                    key={stage.key}
                    type="button"
                    onClick={() => updateTaskDepartmentStatus(currentTask.id, stage.key)}
                    className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all text-center truncate ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    {stage.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Evaluation Notes from Ops Manager if present */}
          {currentTask.evaluationNotes && (
            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                Operations Manager Evaluation Notes
              </span>
              <p className="text-xs text-indigo-950 leading-relaxed">
                {currentTask.evaluationNotes}
              </p>
            </div>
          )}

          {/* Attached Images */}
          {currentTask.images && currentTask.images.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Attachments ({currentTask.images.length})</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {currentTask.images.map((img, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setZoomedImage(img)}
                    className="h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <img src={img} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
          </>
        )}

        {/* Comments & Discussion */}
        {(activeTab === 'overview' || activeTab === 'discussion') && (
          <>
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Discussion & Comments ({currentTask.comments?.length || 0})
            </h3>
            
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {!currentTask.comments || currentTask.comments.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 rounded-lg">
                  No comments yet. Post the first update below.
                </div>
              ) : (
                currentTask.comments.map(c => {
                  const author = users.find(u => u.id === c.authorId);
                  return (
                    <div key={c.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <img
                            src={author?.avatar}
                            alt={author?.name}
                            referrerPolicy="no-referrer"
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <span className="font-semibold text-slate-900">{author?.name || 'Member'}</span>
                          <span className="text-[10px] text-slate-400 font-medium">({author?.title})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{c.createdAt}</span>
                      </div>
                      
                      {c.content && (
                        <p className="text-xs text-slate-700 leading-relaxed pl-7 whitespace-pre-line">
                          {c.content}
                        </p>
                      )}

                      {c.attachmentUrl && (
                        <div className="pl-7 pt-1">
                          <img
                            src={c.attachmentUrl}
                            alt="Comment attachment"
                            onClick={() => setZoomedImage(c.attachmentUrl!)}
                            className="max-h-36 rounded-lg border border-slate-200 object-cover shadow-2xs cursor-pointer hover:opacity-95"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Image Preview */}
            {commentImage && (
              <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between max-w-sm">
                <div className="flex items-center gap-2">
                  <img
                    src={commentImage}
                    alt="Comment Preview"
                    className="w-10 h-10 rounded object-cover border border-slate-200"
                  />
                  <span className="text-[11px] text-indigo-900 font-semibold">
                    Image attached to comment
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCommentImage(null)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Comment Input with Ctrl+V, file upload, and webcam */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onPaste={handleCommentPaste}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSendComment())}
                placeholder="Write a comment (supports Ctrl+V paste)..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 bg-white"
              />

              {/* File button */}
              <button
                type="button"
                onClick={() => commentFileInputRef.current?.click()}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                title="Attach image from file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                ref={commentFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCommentFileUpload}
                className="hidden"
              />

              {/* Camera button */}
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                title="Capture image from camera"
              >
                <Camera className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSendComment}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>

          {/* History Log */}
          {currentTask.history && currentTask.history.length > 0 && (
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <History className="w-3 h-3" />
                <span>Audit & History Log</span>
              </span>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {currentTask.history.slice().reverse().map(h => (
                  <div key={h.id} className="text-[11px] text-slate-500 flex items-start gap-2">
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">{h.timestamp}</span>
                    <span>{h.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          </>
        )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            ID: {currentTask.id}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

      </div>

      {/* Camera Capture Modal */}
      {isCameraOpen && (
        <CameraCaptureModal
          onCapture={(dataUrl) => setCommentImage(dataUrl)}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* Image Lightbox Preview */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={zoomedImage} 
              alt="Zoomed view" 
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
