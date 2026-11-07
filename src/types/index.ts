export type UserRole = 'admin' | 'board' | 'ops_manager' | 'dept_head' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  title: string;
  avatar: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  headId?: string;
  color: string;
}

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  attachmentUrl?: string;
}

export interface TaskHistoryItem {
  id: string;
  timestamp: string;
  actorId: string;
  action: string;
}

export type DraftStatus = 'draft' | 'under_review' | 'converted_task' | 'converted_project' | 'rejected';

export interface Draft {
  id: string;
  title: string;
  description: string;
  images: string[];
  tags: string[];
  priority: Priority;
  status: DraftStatus;
  createdBy: string;
  createdAt: string;
  comments: Comment[];
  convertedTargetId?: string;
  convertedType?: 'task' | 'project';
}

export interface MaterialItem {
  id: string;
  name: string;
  quantity: string;
  inStock: boolean; // true = Available / In Stock, false = Unavailable / Needs Procurement
  notes?: string;
  procurementTaskId?: string;
}

// Stages for Board space
export type BoardStage = 
  | 'drafts'           // Drafts / Ideas
  | 'assessment'       // Assessment (Operations Manager)
  | 'materials_needed' // Materials Needed (Awaiting Procurement)
  | 'execution'        // Execution (Delegated to Department)
  | 'awaiting_review'  // Awaiting Review (Completed in Department)
  | 'completed'        // Completed
  | 'rejected';        // Rejected / Archived

// Stages for Department space
export type DepartmentStage = 
  | 'new'              // New (arrived from board execution)
  | 'assessment'       // Assessment (internal department evaluation)
  | 'execution'        // Execution (in progress)
  | 'review'           // Review (internal department review)
  | 'done'             // Done (signals "Awaiting Review" to board)
  | 'overdue'          // Overdue
  | 'archive';         // Archive (after final approval by Ops Manager)

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId?: string;
  originDraftId?: string;
  departmentId: string;
  assignedToId?: string;
  coAssigneeIds: string[];
  startDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  priority: Priority;
  tags: string[];
  images: string[];
  boardStatus: 'assessment' | 'materials_needed' | 'execution' | 'awaiting_review' | 'completed' | 'rejected';
  departmentStatus: DepartmentStage;
  comments: Comment[];
  history: TaskHistoryItem[];
  evaluationNotes?: string;
  estimatedHours?: number;
  subtasks?: Subtask[];
  materials?: MaterialItem[];
  isProcurementTask?: boolean;
  parentTaskIdForProcurement?: string;
  completedAt?: string;
  createdBy?: string;
  observerIds?: string[];
}

export interface Subtask {
  id: string;
  title: string;
  assignedToId?: string;
  isCompleted: boolean;
  dueDate?: string;
}

export interface ProjectSubtaskDef {
  id: string;
  title: string;
  description: string;
  departmentId: string;
  assignedToId?: string;
  coAssigneeIds?: string[];
  startDate: string;
  dueDate: string;
  priority: Priority;
  status?: DepartmentStage;
  taskId?: string; // Links to real Task once created
}

export interface Project {
  id: string;
  title: string;
  description: string;
  originDraftId?: string;
  startDate: string;
  dueDate: string;
  priority: Priority;
  boardStatus: 'assessment' | 'execution' | 'awaiting_review' | 'completed';
  tags: string[];
  comments: Comment[];
  subtaskIds: string[];
  departmentIds: string[];
  history: TaskHistoryItem[];
  evaluationNotes?: string;
  createdAt: string;
  createdBy?: string;
  managerId?: string;
  observerIds?: string[];
}

export type ActiveSpace = 'board' | 'departments' | 'admin';
export type ActiveView = 'kanban' | 'list' | 'calendar' | 'timeline';
