
import { ProjectType, IssueType, ImplementType } from './types';

export const PROJECT_TYPES = [
  ProjectType.RELEASE,
  ProjectType.VARIATION,
  ProjectType.DEVELOPMENT
];

export const IMPLEMENT_TYPES = [
  ImplementType.BASE,
  ImplementType.FURGAO,
  ImplementType.SIDER,
  ImplementType.CAIXA_CARGA,
  ImplementType.BASCULANTE,
  ImplementType.COMPONENTES,
  ImplementType.OUTROS
];

export const FLOORING_TYPES = [
  'M/F 20mm',
  'M/F 30mm',
  'Omega 28mm',
  'Sonata',
  'XDZ 3mm',
  'XDZ 4,75mm',
  'Naval 15mm',
  'Naval 18mm',
  'Naval 24mm',
  'Naval 27mm'
];

export const ISSUE_TYPES = [
  IssueType.DESIGN_ERROR,
  IssueType.BENDING_ERROR,
  IssueType.CUTTING_ERROR,
  IssueType.MATERIAL_ERROR,
  IssueType.ASSEMBLY_ERROR
];

export const STORAGE_KEY = 'design_track_pro_data';
