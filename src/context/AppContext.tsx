import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  Department,
  Draft,
  Task,
  Project,
  ActiveSpace,
  ActiveView,
  DepartmentStage,
  Priority,
  MaterialItem
} from '../types';
import {
  initialUsers,
  initialDepartments,
  initialDrafts,
  initialProjects,
  initialTasks
} from '../data/initialData';

interface AppContextType {
  // Current user & space
  currentUser: User;
  setCurrentUserId: (id: string) => void;
  activeSpace: ActiveSpace;
  setActiveSpace: (space: ActiveSpace) => void;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  selectedDepartmentId: string;
  setSelectedDepartmentId: (deptId: string) => void;
  filterMyTasksOnly: boolean;
  setFilterMyTasksOnly: (val: boolean) => void;

  // Data lists
  users: User[];
  departments: Department[];
  drafts: Draft[];
  projects: Project[];
  tasks: Task[];

  // User & Dept CRUD
  addUser: (user: Omit<User, 'id'>) => User;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
  addDepartment: (dept: Omit<Department, 'id'>) => Department;
  updateDepartment: (dept: Department) => void;
  deleteDepartment: (id: string) => void;

  // Draft operations
  createDraft: (draft: Omit<Draft, 'id' | 'createdAt' | 'comments' | 'status'>) => Draft;
  updateDraft: (draft: Draft) => void;
  deleteDraft: (id: string) => void;
  addDraftComment: (draftId: string, content: string, attachmentUrl?: string) => void;
  convertDraftToTask: (draftId: string, taskData?: Partial<Task>) => Task;
  convertDraftToProject: (draftId: string, projectData?: Partial<Project>, subtasks?: Partial<Task>[]) => Project;
  rejectDraft: (draftId: string, reason?: string) => void;

  // Task & Project operations
  createTask: (task: Omit<Task, 'id' | 'comments' | 'history'>) => Task;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  addTaskComment: (taskId: string, content: string, attachmentUrl?: string) => void;
  
  // Bill of Materials (BoM) & Procurement
  addMaterialItem: (taskId: string, item: Omit<MaterialItem, 'id'>) => void;
  updateMaterialItem: (taskId: string, item: MaterialItem) => void;
  removeMaterialItem: (taskId: string, materialId: string) => void;
  toggleMaterialInStock: (taskId: string, materialId: string) => void;
  createProcurementTaskForMaterials: (parentTaskId: string) => Task | null;

  // Ops Manager Evaluation & Approval
  evaluateAndApproveTask: (
    taskId: string,
    data: {
      departmentId: string;
      assignedToId?: string;
      coAssigneeIds: string[];
      startDate: string;
      dueDate: string;
      priority?: Priority;
      evaluationNotes?: string;
    }
  ) => void;

  evaluateAndApproveProject: (
    projectId: string,
    data: {
      startDate: string;
      dueDate: string;
      evaluationNotes?: string;
      subtasks: {
        title: string;
        description: string;
        departmentId: string;
        assignedToId?: string;
        coAssigneeIds?: string[];
        startDate: string;
        dueDate: string;
        priority: Priority;
      }[];
    }
  ) => void;

  // Workflow transitions (Board <-> Department sync)
  updateTaskDepartmentStatus: (taskId: string, newDeptStatus: DepartmentStage) => void;
  approveTaskCompletedByOpsManager: (taskId: string) => void;
  returnTaskForRevision: (taskId: string, reason: string) => void;

  // Timeline & dates
  shiftTaskDates: (taskId: string, startDeltaDays: number, dueDeltaDays: number) => void;
  updateTaskDatesDirect: (taskId: string, startDate: string, dueDate: string) => void;

  // Direct Board Task creation (Board members assigning to each other with observers)
  createDirectBoardTask: (data: {
    title: string;
    description: string;
    departmentId?: string;
    assignedToId?: string;
    coAssigneeIds?: string[];
    observerIds?: string[];
    priority: Priority;
    startDate: string;
    dueDate: string;
  }) => Task;

  // Permissions helpers
  canEditTaskDates: (task: Task) => boolean;
  canAssessTasks: () => boolean;
  canManageBoard: () => boolean;
  canAccessBoardSpace: () => boolean;
  canManageAdmin: () => boolean;
  canManageDepartment: (deptId?: string) => boolean;

  // Reset to initial demo data
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'apex_task_engine_v5_';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load or fallback to initial with safety
  const safeLoad = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch (e) {
      console.warn(`Failed to read ${key} from storage:`, e);
      return fallback;
    }
  };

  const safeSave = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`Failed to save ${key} to storage (quota or security):`, e);
    }
  };

  const [users, setUsers] = useState<User[]>(() => safeLoad(`${STORAGE_KEY_PREFIX}users`, initialUsers));
  const [departments, setDepartments] = useState<Department[]>(() => safeLoad(`${STORAGE_KEY_PREFIX}departments`, initialDepartments));
  const [drafts, setDrafts] = useState<Draft[]>(() => safeLoad(`${STORAGE_KEY_PREFIX}drafts`, initialDrafts));
  const [projects, setProjects] = useState<Project[]>(() => safeLoad(`${STORAGE_KEY_PREFIX}projects`, initialProjects));
  const [tasks, setTasks] = useState<Task[]>(() => safeLoad(`${STORAGE_KEY_PREFIX}tasks`, initialTasks));

  // Current active user (defaults to Ops Manager Dmitry for easy testing of core workflows)
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      return localStorage.getItem(`${STORAGE_KEY_PREFIX}currentUserId`) || 'user-ops';
    } catch {
      return 'user-ops';
    }
  });

  const [activeSpace, setActiveSpace] = useState<ActiveSpace>('board');
  const [activeView, setActiveView] = useState<ActiveView>('kanban');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('dept-office');
  const [filterMyTasksOnly, setFilterMyTasksOnly] = useState<boolean>(false);

  // Sync state to LocalStorage safely
  useEffect(() => {
    safeSave(`${STORAGE_KEY_PREFIX}users`, users);
  }, [users]);

  useEffect(() => {
    safeSave(`${STORAGE_KEY_PREFIX}departments`, departments);
  }, [departments]);

  useEffect(() => {
    safeSave(`${STORAGE_KEY_PREFIX}drafts`, drafts);
  }, [drafts]);

  useEffect(() => {
    safeSave(`${STORAGE_KEY_PREFIX}projects`, projects);
  }, [projects]);

  useEffect(() => {
    safeSave(`${STORAGE_KEY_PREFIX}tasks`, tasks);
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}currentUserId`, currentUserId);
    } catch (e) {
      console.warn(e);
    }
  }, [currentUserId]);

  const currentUser: User = users.find(u => u.id === currentUserId) || users[0];

  const canAccessBoardSpace = (): boolean => {
    return currentUser.role === 'admin' || currentUser.role === 'board' || currentUser.role === 'ops_manager';
  };

  // Enforce board space access: users below OM cannot view Board Space
  useEffect(() => {
    if (!canAccessBoardSpace() && activeSpace === 'board') {
      setActiveSpace('departments');
      if (currentUser.departmentId) {
        setSelectedDepartmentId(currentUser.departmentId);
      }
    }
  }, [currentUser.id, currentUser.role, activeSpace]);

  // Helper date shift
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

  const getNowFormatted = () => {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 16);
  };

  // User & Dept CRUD
  const addUser = (userData: Omit<User, 'id'>): User => {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const updateUser = (updated: User) => {
    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
  };

  const deleteUser = (id: string) => {
    if (id === currentUserId) return;
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const addDepartment = (deptData: Omit<Department, 'id'>): Department => {
    const newDept: Department = {
      ...deptData,
      id: `dept-${Date.now()}`
    };
    setDepartments(prev => [...prev, newDept]);
    return newDept;
  };

  const updateDepartment = (updated: Department) => {
    setDepartments(prev => prev.map(d => (d.id === updated.id ? updated : d)));
  };

  const deleteDepartment = (id: string) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
  };

  // Draft operations
  const createDraft = (draftData: Omit<Draft, 'id' | 'createdAt' | 'comments' | 'status'>): Draft => {
    const newDraft: Draft = {
      ...draftData,
      id: `draft-${Date.now()}`,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      comments: []
    };
    setDrafts(prev => [newDraft, ...prev]);
    return newDraft;
  };

  const updateDraft = (updated: Draft) => {
    setDrafts(prev => prev.map(d => (d.id === updated.id ? updated : d)));
  };

  const deleteDraft = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
  };

  const addDraftComment = (draftId: string, content: string, attachmentUrl?: string) => {
    if (!content.trim() && !attachmentUrl) return;
    const newComment = {
      id: `comm-${Date.now()}`,
      authorId: currentUser.id,
      content: content.trim(),
      createdAt: getNowFormatted(),
      attachmentUrl
    };
    setDrafts(prev =>
      prev.map(d => (d.id === draftId ? { ...d, comments: [...(d.comments || []), newComment] } : d))
    );
  };

  // Convert draft to single Task
  const convertDraftToTask = (draftId: string, taskData?: Partial<Task>): Task => {
    const draft = drafts.find(d => d.id === draftId);
    const today = new Date().toISOString().split('T')[0];
    const twoWeeksLater = addDays(today, 14);

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: taskData?.title || draft?.title || 'Новая задача',
      description: taskData?.description || draft?.description || '',
      originDraftId: draftId,
      departmentId: taskData?.departmentId || departments[0]?.id || 'dept-it',
      assignedToId: taskData?.assignedToId,
      coAssigneeIds: taskData?.coAssigneeIds || [],
      startDate: taskData?.startDate || today,
      dueDate: taskData?.dueDate || twoWeeksLater,
      priority: taskData?.priority || draft?.priority || 'medium',
      tags: draft?.tags ? [...draft.tags] : ['Из черновика'],
      images: draft?.images ? [...draft.images] : [],
      boardStatus: 'assessment', // Prompt: попадает в поле ОЦЕНКА операционного менеджера!
      departmentStatus: 'new',
      comments: draft?.comments ? [...draft.comments] : [],
      history: [
        {
          id: `h-${Date.now()}`,
          timestamp: getNowFormatted(),
          actorId: currentUser.id,
          action: `Черновик переквалифицирован в задачу и передан в статус "Оценка" (Операционному менеджеру).`
        }
      ],
      evaluationNotes: ''
    };

    setTasks(prev => [newTask, ...prev]);

    // Update draft status
    if (draft) {
      setDrafts(prev =>
        prev.map(d =>
          d.id === draftId
            ? { ...d, status: 'converted_task', convertedTargetId: newTask.id, convertedType: 'task' }
            : d
        )
      );
    }

    return newTask;
  };

  // Convert draft to complex Project
  const convertDraftToProject = (
    draftId: string,
    projectData?: Partial<Project>,
    subtasksData?: Partial<Task>[]
  ): Project => {
    const draft = drafts.find(d => d.id === draftId);
    const today = new Date().toISOString().split('T')[0];
    const oneMonthLater = addDays(today, 30);

    const projectId = `proj-${Date.now()}`;
    const subtaskIds: string[] = [];

    // If subtasks provided initially, create them in tasks list
    if (subtasksData && subtasksData.length > 0) {
      const createdSubtasks: Task[] = subtasksData.map((st, idx) => {
        const sId = `task-${projectId}-sub-${idx + 1}`;
        subtaskIds.push(sId);
        return {
          id: sId,
          title: st.title || `Этап ${idx + 1}`,
          description: st.description || '',
          projectId,
          originDraftId: draftId,
          departmentId: st.departmentId || departments[0]?.id || 'dept-it',
          assignedToId: st.assignedToId,
          coAssigneeIds: st.coAssigneeIds || [],
          startDate: st.startDate || today,
          dueDate: st.dueDate || addDays(today, 10 + idx * 7),
          priority: st.priority || 'medium',
          tags: st.tags || draft?.tags || [],
          images: [],
          boardStatus: 'assessment',
          departmentStatus: 'new',
          comments: [],
          history: [
            {
              id: `h-st-${Date.now()}-${idx}`,
              timestamp: getNowFormatted(),
              actorId: currentUser.id,
              action: `Подзадача создана в составе проекта.`
            }
          ]
        };
      });
      setTasks(prev => [...createdSubtasks, ...prev]);
    }

    const newProject: Project = {
      id: projectId,
      title: projectData?.title || draft?.title || 'Новый проект',
      description: projectData?.description || draft?.description || '',
      originDraftId: draftId,
      startDate: projectData?.startDate || today,
      dueDate: projectData?.dueDate || oneMonthLater,
      priority: projectData?.priority || draft?.priority || 'high',
      boardStatus: 'assessment', // Needs evaluation by ops manager to break down & assign
      tags: draft?.tags ? [...draft.tags, 'Комплексный проект'] : ['Комплексный проект'],
      comments: draft?.comments ? [...draft.comments] : [],
      subtaskIds,
      departmentIds: projectData?.departmentIds || departments.map(d => d.id),
      history: [
        {
          id: `h-${Date.now()}`,
          timestamp: getNowFormatted(),
          actorId: currentUser.id,
          action: `Черновик переквалифицирован в комплексный проект и направлен на Оценку операционному менеджеру.`
        }
      ],
      createdAt: today
    };

    setProjects(prev => [newProject, ...prev]);

    // Update draft status
    if (draft) {
      setDrafts(prev =>
        prev.map(d =>
          d.id === draftId
            ? { ...d, status: 'converted_project', convertedTargetId: projectId, convertedType: 'project' }
            : d
        )
      );
    }

    return newProject;
  };

  const rejectDraft = (draftId: string, reason?: string) => {
    setDrafts(prev =>
      prev.map(d => {
        if (d.id !== draftId) return d;
        const comment = reason
          ? {
              id: `comm-${Date.now()}`,
              authorId: currentUser.id,
              content: `Отклонено Советом директоров: ${reason}`,
              createdAt: getNowFormatted()
            }
          : undefined;
        return {
          ...d,
          status: 'rejected',
          comments: comment ? [...d.comments, comment] : d.comments
        };
      })
    );
  };

  // Task basic operations
  const createTask = (taskData: Omit<Task, 'id' | 'comments' | 'history'>): Task => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      comments: [],
      history: [
        {
          id: `h-${Date.now()}`,
          timestamp: getNowFormatted(),
          actorId: currentUser.id,
          action: `Задача создана вручную.`
        }
      ]
    };
    setTasks(prev => [newTask, ...prev]);
    return newTask;
  };

  const updateTask = (updated: Task) => {
    setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addTaskComment = (taskId: string, content: string, attachmentUrl?: string) => {
    if (!content.trim() && !attachmentUrl) return;
    const newComment = {
      id: `comm-${Date.now()}`,
      authorId: currentUser.id,
      content: content.trim(),
      createdAt: getNowFormatted(),
      attachmentUrl
    };
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, comments: [...(t.comments || []), newComment] } : t))
    );
  };

  // Bill of Materials (BoM) Methods
  const addMaterialItem = (taskId: string, itemData: Omit<MaterialItem, 'id'>) => {
    const newItem: MaterialItem = {
      ...itemData,
      id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    };
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        const currentMaterials = t.materials || [];
        return {
          ...t,
          materials: [...currentMaterials, newItem]
        };
      })
    );
  };

  const updateMaterialItem = (taskId: string, updatedItem: MaterialItem) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        const currentMaterials = t.materials || [];
        return {
          ...t,
          materials: currentMaterials.map(m => (m.id === updatedItem.id ? updatedItem : m))
        };
      })
    );
  };

  const removeMaterialItem = (taskId: string, materialId: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          materials: (t.materials || []).filter(m => m.id !== materialId)
        };
      })
    );
  };

  const toggleMaterialInStock = (taskId: string, materialId: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          materials: (t.materials || []).map(m =>
            m.id === materialId ? { ...m, inStock: !m.inStock } : m
          )
        };
      })
    );
  };

  // User requirement:
  // "При недоступности некоторых материалов - предлагается создать задачу на приобретение.
  // При наличии специального сотрудника Procurement Officer в департаменте Office - задача автоматически
  // ставит его в исполнители, если его нет - то в исполнители ставится сам ОМ.
  // Сама задача попадает в поле Необходимы материалы (нужно его добавить в пространстве Борда)"
  const createProcurementTaskForMaterials = (parentTaskId: string): Task | null => {
    const parentTask = tasks.find(t => t.id === parentTaskId);
    if (!parentTask) return null;

    const missingMaterials = (parentTask.materials || []).filter(m => !m.inStock);
    if (missingMaterials.length === 0) return null;

    // Find Department "Office"
    const officeDept = departments.find(
      d =>
        d.id === 'dept-office' ||
        d.code.toUpperCase() === 'OFC' ||
        d.name.toLowerCase().includes('office') ||
        d.name.toLowerCase().includes('procurement')
    ) || departments[0];

    // Find Procurement Officer in Office department
    const procurementOfficer = users.find(
      u =>
        u.departmentId === officeDept.id &&
        (u.title.toLowerCase().includes('procurement') ||
         u.name.toLowerCase().includes('procurement') ||
         u.title.toLowerCase().includes('закуп'))
    );

    const omUser = users.find(u => u.role === 'ops_manager') || currentUser;
    const assignedAssignee = procurementOfficer || omUser;

    const today = new Date().toISOString().split('T')[0];
    const due = addDays(today, 5);

    const procurementTaskTitle = `Procurement: Materials for "${parentTask.title}"`;
    const materialsListText = missingMaterials
      .map(m => `• ${m.name} (${m.quantity})${m.notes ? ` - ${m.notes}` : ''}`)
      .join('\n');

    const procurementTaskDesc = `Procurement and supplies acquisition for initiative: "${parentTask.title}".\n\nRequired items:\n${materialsListText}\n\nAssigned: ${
      procurementOfficer
        ? `${procurementOfficer.name} (Procurement Officer, Office)`
        : `${omUser.name} (Operations Manager)`
    }.\n\nPlease procure and verify materials so the main initiative can proceed to execution.`;

    const newProcurementTaskId = `task-proc-${Date.now()}`;

    const createdProcurementTask: Task = {
      id: newProcurementTaskId,
      title: procurementTaskTitle,
      description: procurementTaskDesc,
      departmentId: officeDept.id,
      assignedToId: assignedAssignee.id,
      coAssigneeIds: procurementOfficer && omUser.id !== procurementOfficer.id ? [omUser.id] : [],
      startDate: today,
      dueDate: parentTask.startDate && parentTask.startDate < due ? parentTask.startDate : due,
      priority: 'high',
      tags: ['Procurement', 'Materials', 'BoM'],
      images: [],
      boardStatus: 'materials_needed',
      departmentStatus: 'new',
      comments: [
        {
          id: `comm-proc-${Date.now()}`,
          authorId: currentUser.id,
          content: `Automated procurement task generated for "${parentTask.title}". Assigned to: ${assignedAssignee.name} (${assignedAssignee.title}).`,
          createdAt: getNowFormatted()
        }
      ],
      history: [
        {
          id: `h-proc-${Date.now()}`,
          timestamp: getNowFormatted(),
          actorId: currentUser.id,
          action: `Procurement task created and assigned to ${assignedAssignee.name}.`
        }
      ],
      isProcurementTask: true,
      parentTaskIdForProcurement: parentTask.id
    };

    // Update parent task to 'materials_needed' and link procurementTaskId to missing materials
    setTasks(prev => {
      const updatedParent = prev.map(t => {
        if (t.id === parentTaskId) {
          const updatedMaterials = (t.materials || []).map(m =>
            !m.inStock ? { ...m, procurementTaskId: newProcurementTaskId } : m
          );
          return {
            ...t,
            boardStatus: 'materials_needed' as const,
            materials: updatedMaterials,
            history: [
              ...t.history,
              {
                id: `h-parent-proc-${Date.now()}`,
                timestamp: getNowFormatted(),
                actorId: currentUser.id,
                action: `Procurement task (${newProcurementTaskId}) created for missing materials. Task moved to Board "Materials Needed".`
              }
            ]
          };
        }
        return t;
      });

      return [createdProcurementTask, ...updatedParent];
    });

    return createdProcurementTask;
  };

  // Ops Manager Evaluation & Approval for standalone task
  const evaluateAndApproveTask = (
    taskId: string,
    data: {
      departmentId: string;
      assignedToId?: string;
      coAssigneeIds: string[];
      startDate: string;
      dueDate: string;
      priority?: Priority;
      evaluationNotes?: string;
    }
  ) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        const assignee = users.find(u => u.id === data.assignedToId);
        const dept = departments.find(d => d.id === data.departmentId);
        const historyItem = {
          id: `h-${Date.now()}`,
          timestamp: getNowFormatted(),
          actorId: currentUser.id,
          action: `Операционный менеджер провел оценку. Делегировано в "${dept?.name || data.departmentId}". Ответственный: ${assignee?.name || 'Не назначен'}. Задача переведена в статус "Реализация".`
        };
        return {
          ...t,
          departmentId: data.departmentId,
          assignedToId: data.assignedToId,
          coAssigneeIds: data.coAssigneeIds,
          startDate: data.startDate,
          dueDate: data.dueDate,
          priority: data.priority || t.priority,
          evaluationNotes: data.evaluationNotes,
          boardStatus: 'execution',     // Moves to Execution on Board!
          departmentStatus: 'new',      // Appears in Department Space in "Новые"!
          history: [...t.history, historyItem]
        };
      })
    );
  };

  // Ops Manager Evaluation & Approval for Project
  const evaluateAndApproveProject = (
    projectId: string,
    data: {
      startDate: string;
      dueDate: string;
      evaluationNotes?: string;
      subtasks: {
        title: string;
        description: string;
        departmentId: string;
        assignedToId?: string;
        coAssigneeIds?: string[];
        startDate: string;
        dueDate: string;
        priority: Priority;
      }[];
    }
  ) => {
    const createdSubtaskIds: string[] = [];
    const deptsInvolved = new Set<string>();

    const newSubtasks: Task[] = data.subtasks.map((st, idx) => {
      const sId = `task-p-${projectId}-${Date.now()}-${idx}`;
      createdSubtaskIds.push(sId);
      deptsInvolved.add(st.departmentId);
      const assignee = users.find(u => u.id === st.assignedToId);
      return {
        id: sId,
        title: st.title,
        description: st.description,
        projectId,
        departmentId: st.departmentId,
        assignedToId: st.assignedToId,
        coAssigneeIds: st.coAssigneeIds || [],
        startDate: st.startDate,
        dueDate: st.dueDate,
        priority: st.priority,
        tags: ['Проектная задача'],
        images: [],
        boardStatus: 'execution',
        departmentStatus: 'new',
        comments: [],
        history: [
          {
            id: `h-${Date.now()}-${idx}`,
            timestamp: getNowFormatted(),
            actorId: currentUser.id,
            action: `Подзадача проекта утверждена операционным менеджером. Назначена на: ${assignee?.name || 'Отдел'}.`
          }
        ]
      };
    });

    setTasks(prev => [...newSubtasks, ...prev]);

    setProjects(prev =>
      prev.map(p => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          startDate: data.startDate,
          dueDate: data.dueDate,
          evaluationNotes: data.evaluationNotes,
          boardStatus: 'execution',
          subtaskIds: Array.from(new Set([...p.subtaskIds, ...createdSubtaskIds])),
          departmentIds: Array.from(deptsInvolved),
          history: [
            ...p.history,
            {
              id: `h-${Date.now()}`,
              timestamp: getNowFormatted(),
              actorId: currentUser.id,
              action: `Операционный менеджер декомпозировал проект на ${data.subtasks.length} задач и запустил в реализацию.`
            }
          ]
        };
      })
    );
  };

  // Workflow transition within Department
  const updateTaskDepartmentStatus = (taskId: string, newDeptStatus: DepartmentStage) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;

        // Prompt critical requirement:
        // "Как только задача попадает в поле Сделано в пространстве Департамента,
        // она появляется в поле Ожидает проверки пространства борда."
        let nextBoardStatus = t.boardStatus;
        if (newDeptStatus === 'done') {
          nextBoardStatus = 'awaiting_review';
        } else if (newDeptStatus === 'archive') {
          nextBoardStatus = 'completed';
        } else if (t.boardStatus === 'awaiting_review') {
          // If task moved back from done to in-progress
          nextBoardStatus = 'execution';
        }

        const stageLabels: Record<DepartmentStage, string> = {
          new: 'Новые',
          assessment: 'Оценка',
          execution: 'Реализация',
          review: 'На рассмотрении',
          done: 'Сделано',
          overdue: 'Просрочено',
          archive: 'Архив'
        };

        const historyItem = {
          id: `h-${Date.now()}`,
          timestamp: getNowFormatted(),
          actorId: currentUser.id,
          action: `Статус в департаменте изменен на "${stageLabels[newDeptStatus]}".${
            newDeptStatus === 'done' ? ' Задача отправлена на Борд: "Ожидает проверки".' : ''
          }`
        };

        return {
          ...t,
          departmentStatus: newDeptStatus,
          boardStatus: nextBoardStatus,
          history: [...t.history, historyItem]
        };
      })
    );
  };

  // Ops Manager approves task completed
  // Prompt:
  // "Как только задача проверена Операционным менеджером и он изменил статус на ВЫПОЛНЕНО.
  // Она переносится в поле Архив пространства департамента и автоматически перемещается в колонку Выполнено Борда.
  // Или, если это задача из проекта, помечается выполненой в карте проекта."
  const approveTaskCompletedByOpsManager = (taskId: string) => {
    let affectedProjectId: string | undefined;

    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        affectedProjectId = t.projectId;
        const historyItem = {
          id: `h-${Date.now()}`,
          timestamp: getNowFormatted(),
          actorId: currentUser.id,
          action: `Операционный менеджер проверил результат и утвердил: "ВЫПОЛНЕНО". Задача архивирована в департаменте и завершена на Борде.`
        };
        return {
          ...t,
          boardStatus: 'completed',
          departmentStatus: 'archive',
          completedAt: getNowFormatted(),
          history: [...t.history, historyItem]
        };
      })
    );

    // If belongs to a project, check if project is completed
    if (affectedProjectId) {
      setProjects(prevProjects =>
        prevProjects.map(proj => {
          if (proj.id !== affectedProjectId) return proj;
          // Check other tasks for this project
          const projectTasks = tasks.filter(t => t.projectId === proj.id);
          const allOtherDone = projectTasks.every(t => (t.id === taskId ? true : t.boardStatus === 'completed'));
          
          if (allOtherDone) {
            return {
              ...proj,
              boardStatus: 'completed',
              history: [
                ...proj.history,
                {
                  id: `h-proj-done-${Date.now()}`,
                  timestamp: getNowFormatted(),
                  actorId: currentUser.id,
                  action: `All project subtasks completed. Strategic project successfully finished!`
                }
              ]
            };
          }
          return proj;
        })
      );
    }
  };

  // Ops Manager returns task for revision
  const returnTaskForRevision = (taskId: string, reason: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        const comment = {
          id: `comm-${Date.now()}`,
          authorId: currentUser.id,
          content: `Returned for revision by Operations Manager: ${reason}`,
          createdAt: getNowFormatted()
        };
        const historyItem = {
          id: `h-${Date.now()}`,
          timestamp: getNowFormatted(),
          actorId: currentUser.id,
          action: `Task returned for revision to department with status "Execution". Reason: ${reason}`
        };
        return {
          ...t,
          boardStatus: 'execution',
          departmentStatus: 'execution',
          comments: [...t.comments, comment],
          history: [...t.history, historyItem]
        };
      })
    );
  };

  // Shift task dates (for Timeline drag and +/- controls)
  const shiftTaskDates = (taskId: string, startDeltaDays: number, dueDeltaDays: number) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        const newStart = startDeltaDays !== 0 ? addDays(t.startDate, startDeltaDays) : t.startDate;
        const newDue = dueDeltaDays !== 0 ? addDays(t.dueDate, dueDeltaDays) : t.dueDate;
        return {
          ...t,
          startDate: newStart,
          dueDate: newDue,
          history: [
            ...t.history,
            {
              id: `h-shift-${Date.now()}`,
              timestamp: getNowFormatted(),
              actorId: currentUser.id,
              action: `Timeline dates adjusted: start ${newStart}, due ${newDue}`
            }
          ]
        };
      })
    );
  };

  const updateTaskDatesDirect = (taskId: string, startDate: string, dueDate: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          startDate,
          dueDate,
          history: [
            ...t.history,
            {
              id: `h-date-${Date.now()}`,
              timestamp: getNowFormatted(),
              actorId: currentUser.id,
              action: `Dates updated: ${startDate} - ${dueDate}`
            }
          ]
        };
      })
    );
  };

  const createDirectBoardTask = (data: {
    title: string;
    description: string;
    departmentId?: string;
    assignedToId?: string;
    coAssigneeIds?: string[];
    observerIds?: string[];
    priority: Priority;
    startDate: string;
    dueDate: string;
  }): Task => {
    const today = new Date().toISOString().split('T')[0];
    const deptId = data.departmentId || 'dept-office';
    const newTask: Task = {
      id: `task-board-${Date.now()}`,
      title: data.title,
      description: data.description,
      departmentId: deptId,
      assignedToId: data.assignedToId,
      coAssigneeIds: data.coAssigneeIds || [],
      observerIds: data.observerIds || [],
      startDate: data.startDate || today,
      dueDate: data.dueDate,
      priority: data.priority,
      tags: ['Board Initiative', 'Direct Assignment'],
      images: [],
      boardStatus: 'execution',
      departmentStatus: 'new',
      comments: [],
      createdBy: currentUser.id,
      history: [
        {
          id: `h-${Date.now()}`,
          timestamp: getNowFormatted(),
          actorId: currentUser.id,
          action: `Initiative created directly by Board Member / Executive ${currentUser.name}`
        }
      ]
    };
    setTasks(prev => [newTask, ...prev]);
    return newTask;
  };

  // Permissions helpers
  // Requirement: Board members, Ops Manager and Admins can move start and end dates on timeline.
  // Dept heads can also move dates for their department or assigned tasks.
  const canEditTaskDates = (task: Task): boolean => {
    if (currentUser.role === 'admin' || currentUser.role === 'ops_manager' || currentUser.role === 'board') return true;
    if (currentUser.role === 'dept_head' && (currentUser.departmentId === task.departmentId || task.assignedToId === currentUser.id)) return true;
    return false;
  };

  const canAssessTasks = (): boolean => {
    return currentUser.role === 'admin' || currentUser.role === 'ops_manager';
  };

  const canManageBoard = (): boolean => {
    return currentUser.role === 'admin' || currentUser.role === 'board' || currentUser.role === 'ops_manager';
  };

  const canManageAdmin = (): boolean => {
    return currentUser.role === 'admin';
  };

  const canManageDepartment = (deptId?: string): boolean => {
    if (currentUser.role === 'admin' || currentUser.role === 'ops_manager') return true;
    if (currentUser.role === 'dept_head' && (!deptId || currentUser.departmentId === deptId)) return true;
    return false;
  };

  const resetDemoData = () => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}users`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}departments`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}drafts`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}projects`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}tasks`);
    setUsers(initialUsers);
    setDepartments(initialDepartments);
    setDrafts(initialDrafts);
    setProjects(initialProjects);
    setTasks(initialTasks);
    setCurrentUserId('user-ops');
    setActiveSpace('board');
    setSelectedDepartmentId('dept-office');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUserId,
        activeSpace,
        setActiveSpace,
        activeView,
        setActiveView,
        selectedDepartmentId,
        setSelectedDepartmentId,
        filterMyTasksOnly,
        setFilterMyTasksOnly,
        users,
        departments,
        drafts,
        projects,
        tasks,
        addUser,
        updateUser,
        deleteUser,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        createDraft,
        updateDraft,
        deleteDraft,
        addDraftComment,
        convertDraftToTask,
        convertDraftToProject,
        rejectDraft,
        createTask,
        updateTask,
        deleteTask,
        addTaskComment,
        addMaterialItem,
        updateMaterialItem,
        removeMaterialItem,
        toggleMaterialInStock,
        createProcurementTaskForMaterials,
        evaluateAndApproveTask,
        evaluateAndApproveProject,
        updateTaskDepartmentStatus,
        approveTaskCompletedByOpsManager,
        returnTaskForRevision,
        shiftTaskDates,
        updateTaskDatesDirect,
        canEditTaskDates,
        canAssessTasks,
        canManageBoard,
        canAccessBoardSpace,
        canManageAdmin,
        canManageDepartment,
        resetDemoData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
