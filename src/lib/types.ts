export interface BitrixTask {
  id: string;
  title: string;
  status: number;
  stageId: string;
  groupId: number;
  createdDate: string;
  closedDate: string | null;
  responsibleId: number;
  deadline: string | null;
  description: string;
  priority: number;
  durationFact: number;
  tags?: string[];
  chatId?: number;
  // Computed fields
  responsibleName?: string;
  responsibleLastName?: string;
  responsibleAvatar?: string;
  groupName?: string;
  stageTitle?: string;
  taskType?: string;
}

export interface BitrixCachedTask extends BitrixTask {
  lastUpdated: number;
}

export interface BitrixUser {
  ID: string;
  NAME: string;
  LAST_NAME: string;
  PERSONAL_PHOTO?: string;
  AVATAR?: string;
}

export interface BitrixStage {
  id: string;
  title: string;
  color: string;
  sort: number;
}

export interface TasksResponse {
  tasks: BitrixTask[];
  total: number;
  next?: number;
}

export interface UsersMap {
  [key: number]: {
    name: string;
    lastName: string;
    avatar: string;
  };
}

export interface StagesMap {
  [key: string]: {
    title: string;
    color: string;
  };
}

export type StatusFilter = 'all' | 'new' | 'in_progress' | 'overdue' | 'review' | 'completed';

export interface DashboardState {
  statusFilter: StatusFilter;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
  selectedTaskId: string | null;
}
