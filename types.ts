export enum ProjectType {
  VARIATION = 'Variação',
  DEVELOPMENT = 'Desenvolvimento',
  RELEASE = 'Liberação'
}

export enum ImplementType {
  BASE = 'Base',
  FURGAO = 'Furgão',
  SIDER = 'Sider',
  CAIXA_CARGA = 'Caixa de Carga',
  BASCULANTE = 'Basculante',
  COMPONENTES = 'Componentes',
  OUTROS = 'Outros'
}

export enum IssueType {
  DESIGN_ERROR = 'Erro de Projeto',
  BENDING_ERROR = 'Erro de Dobra',
  CUTTING_ERROR = 'Erro de Corte',
  MATERIAL_ERROR = 'Erro de Material',
  ASSEMBLY_ERROR = 'Erro de Montagem'
}

export enum InnovationType {
  NEW_PROJECT = 'Novo Projeto',
  PRODUCT_IMPROVEMENT = 'Melhoria de Produto'
}

export type UserRole = 'GESTOR' | 'PROJETISTA';

export interface User {
  id: string;
  username: string;
  password: string; // In a real app, this should be hashed. Storing plain for local prototype.
  name: string;
  role: UserRole;
}

export interface PauseRecord {
  reason: string;
  timestamp: string; // ISO string
  durationSeconds: number; // Approximate duration of this pause
}

export interface ProjectSession {
  id: string;
  ns: string;
  projectCode?: string; // New field
  type: ProjectType;
  implementType?: ImplementType; // New field
  startTime: string; // ISO
  endTime?: string; // ISO
  totalActiveSeconds: number;
  pauses: PauseRecord[];
  status: 'COMPLETED' | 'IN_PROGRESS';
  notes?: string;
  userId?: string; // Track who did this project
}

export interface IssueRecord {
  id: string;
  projectNs: string;
  type: IssueType;
  description: string;
  date: string;
  reportedBy?: string; // Track who reported
}

export interface InnovationRecord {
  id: string;
  title: string;
  description: string;
  type: InnovationType;
  currentCost?: number; // Custo atual (se aplicável)
  projectedCost: number; // Custo previsto
  costDifference: number; // Diferença (Positivo = Economia, Negativo = Aumento de Custo)
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED';
  authorId?: string;
  createdAt: string;
}

export interface AppState {
  projects: ProjectSession[];
  issues: IssueRecord[];
  innovations: InnovationRecord[];
}