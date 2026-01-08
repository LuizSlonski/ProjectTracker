
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
  PRODUCT_IMPROVEMENT = 'Melhoria de Produto',
  PROCESS_OPTIMIZATION = 'Otimização de Processo'
}

export enum CalculationType {
  PER_UNIT = 'Por Unidade Produzida',
  RECURRING_MONTHLY = 'Recorrente (Mensal)',
  ONE_TIME = 'Valor Único / Fixo'
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
  
  // Advanced Calculation Fields
  calculationType: CalculationType;
  unitSavings: number; // The base value (e.g., saving per unit, or value per month)
  quantity: number; // Multiplier (e.g., units per year, or 12 months)
  totalAnnualSavings: number; // The calculated total: unitSavings * quantity (if recurring/unit)
  investmentCost?: number; // Cost to implement (optional)

  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED';
  authorId?: string;
  createdAt: string;
}

export interface AppState {
  projects: ProjectSession[];
  issues: IssueRecord[];
  innovations: InnovationRecord[];
}
