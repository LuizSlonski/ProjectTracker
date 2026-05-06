
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
  IssueType.ALINHAMENTO_EIXOS,
  IssueType.ALMOXARIFADO,
  IssueType.BASCULANTE,
  IssueType.BASES,
  IssueType.CARPINTARIA,
  IssueType.CHAPEACAO,
  IssueType.COMERCIAL,
  IssueType.CORTE_DOBRA,
  IssueType.ELETRICA_ABS_EBS,
  IssueType.ENGENHARIA,
  IssueType.MECANICA,
  IssueType.MECANICA_SOBRE_CHASSI,
  IssueType.MECANICA_SR,
  IssueType.MONTAGEM_ACESSORIOS,
  IssueType.MONTAGEM_CAIXA_CARGA,
  IssueType.MONTAGEM_CHASSI,
  IssueType.MONTAGEM_LONADO,
  IssueType.MONTAGEM_TETO,
  IssueType.OFICINA,
  IssueType.OPERADOR_EMPILHADEIRA,
  IssueType.PCP_COMPONENTES,
  IssueType.PCP_PECAS,
  IssueType.PINTURA,
  IssueType.PORTAS,
  IssueType.QUALIDADE_INSPECAO_FINAL
];

export const STORAGE_KEY = 'design_track_pro_data';
