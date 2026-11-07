import { User, Department, Draft, Task, Project } from '../types';

export const initialDepartments: Department[] = [
  {
    id: 'dept-office',
    name: 'Office & Procurement',
    code: 'OFC',
    description: 'Corporate facilities, office administration, hardware logistics, and global procurement',
    headId: 'user-head-office',
    color: '#10B981' // Emerald
  },
  {
    id: 'dept-eng',
    name: 'Engineering',
    code: 'ENG',
    description: 'Software architecture, cloud infrastructure, web and mobile platforms',
    headId: 'user-head-eng',
    color: '#3B82F6' // Blue
  },
  {
    id: 'dept-design',
    name: 'Product Design',
    code: 'DSN',
    description: 'UI/UX design, design system, user research, and brand identity',
    headId: 'user-head-design',
    color: '#8B5CF6' // Purple
  },
  {
    id: 'dept-marketing',
    name: 'Growth & Marketing',
    code: 'MKT',
    description: 'Performance marketing, branding, communications, and customer acquisition',
    headId: 'user-head-mkt',
    color: '#EC4899' // Pink
  }
];

export const initialUsers: User[] = [
  {
    id: 'user-admin',
    name: 'Alexander Wright',
    email: 'alexander.wright@company.internal',
    role: 'admin',
    title: 'System Administrator',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-board-1',
    name: 'Victoria Sterling',
    email: 'victoria.sterling@company.internal',
    role: 'board',
    title: 'Board Director & Strategy',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-board-2',
    name: 'Marcus Vance',
    email: 'marcus.vance@company.internal',
    role: 'board',
    title: 'Board Director & Finance',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-ops',
    name: 'Oliver Hayes',
    email: 'oliver.hayes@company.internal',
    role: 'ops_manager',
    title: 'Chief Operations Manager (OM)',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  // Office & Procurement Department
  {
    id: 'user-head-office',
    name: 'Eleanor Bennett',
    email: 'eleanor.bennett@company.internal',
    role: 'dept_head',
    departmentId: 'dept-office',
    title: 'Head of Office & Operations',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-procurement',
    name: 'James Miller',
    email: 'james.miller@company.internal',
    role: 'employee',
    departmentId: 'dept-office',
    title: 'Procurement Officer',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-emp-office-1',
    name: 'Sophia Chen',
    email: 'sophia.chen@company.internal',
    role: 'employee',
    departmentId: 'dept-office',
    title: 'Office Coordinator',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
  },
  // Engineering Department
  {
    id: 'user-head-eng',
    name: 'David Lawson',
    email: 'david.lawson@company.internal',
    role: 'dept_head',
    departmentId: 'dept-eng',
    title: 'Head of Engineering',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-emp-eng-1',
    name: 'Lucas Reed',
    email: 'lucas.reed@company.internal',
    role: 'employee',
    departmentId: 'dept-eng',
    title: 'Senior Software Engineer',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-emp-eng-2',
    name: 'Emily Watson',
    email: 'emily.watson@company.internal',
    role: 'employee',
    departmentId: 'dept-eng',
    title: 'Backend Systems Architect',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  // Product Design Department
  {
    id: 'user-head-design',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@company.internal',
    role: 'dept_head',
    departmentId: 'dept-design',
    title: 'Head of Product Design',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-emp-dsn-1',
    name: 'Liam Foster',
    email: 'liam.foster@company.internal',
    role: 'employee',
    departmentId: 'dept-design',
    title: 'Senior UI/UX Designer',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-emp-dsn-2',
    name: 'Chloe Martin',
    email: 'chloe.martin@company.internal',
    role: 'employee',
    departmentId: 'dept-design',
    title: 'Brand & Motion Designer',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
  },
  // Marketing Department
  {
    id: 'user-head-mkt',
    name: 'Olivia Taylor',
    email: 'olivia.taylor@company.internal',
    role: 'dept_head',
    departmentId: 'dept-marketing',
    title: 'Head of Marketing',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-emp-mkt-1',
    name: 'Noah Brooks',
    email: 'noah.brooks@company.internal',
    role: 'employee',
    departmentId: 'dept-marketing',
    title: 'Growth Marketing Specialist',
    avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80'
  }
];

export const initialDrafts: Draft[] = [
  {
    id: 'draft-1',
    title: 'Next-Gen Enterprise Analytics & Client Portal',
    description: 'Establish a unified real-time analytics hub for enterprise B2B customers, complete with contract lifecycle tracking, automated billing statements, and telemetry APIs.',
    images: [],
    tags: ['Strategy', 'Enterprise', 'B2B', 'Q4 Initiative'],
    priority: 'high',
    status: 'draft',
    createdBy: 'user-board-1',
    createdAt: '2026-11-01',
    comments: [
      {
        id: 'comm-1-1',
        authorId: 'user-board-2',
        content: 'Strongly support this initiative. This will reduce client account inquiries by at least 35%. Ready for Ops assessment.',
        createdAt: '2026-11-01 14:20'
      }
    ]
  }
];

// Clean slate: all active tasks and projects wiped per user request
export const initialProjects: Project[] = [];
export const initialTasks: Task[] = [];
