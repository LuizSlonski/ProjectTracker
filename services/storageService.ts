import { createClient } from '@supabase/supabase-js';
import { AppState, ProjectSession, IssueRecord, User, InnovationRecord } from '../types';

// Supabase Configuration
const SUPABASE_URL = 'https://otajfsjtpucdmkwgmeku.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tUhxD-ixI7mhxhvB5FYVGQ_FCkLGa6h';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const defaultState: AppState = {
  projects: [],
  issues: [],
  innovations: []
};

// --- DATA MANAGEMENT ---

export const fetchAppState = async (): Promise<AppState> => {
  try {
    // Fetch Projects
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('start_time', { ascending: false });

    if (projectsError) throw projectsError;

    // Fetch Issues
    const { data: issuesData, error: issuesError } = await supabase
      .from('issues')
      .select('*')
      .order('date', { ascending: false });

    if (issuesError) throw issuesError;

    // Fetch Innovations
    const { data: innovationsData, error: innovationsError } = await supabase
      .from('innovations')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Note: If table doesn't exist yet, this might error gracefully or need handling
    // We assume table exists based on SQL instructions provided.

    // Map DB columns (snake_case) to Types (camelCase)
    const projects: ProjectSession[] = (projectsData || []).map((p: any) => ({
      id: p.id,
      ns: p.ns,
      projectCode: p.project_code,
      type: p.type,
      implementType: p.implement_type,
      startTime: p.start_time,
      endTime: p.end_time,
      totalActiveSeconds: p.total_active_seconds,
      pauses: typeof p.pauses === 'string' ? JSON.parse(p.pauses) : p.pauses,
      status: p.status,
      notes: p.notes,
      userId: p.user_id
    }));

    const issues: IssueRecord[] = (issuesData || []).map((i: any) => ({
      id: i.id,
      projectNs: i.project_ns,
      type: i.type,
      description: i.description,
      date: i.date,
      reportedBy: i.reported_by
    }));

    const innovations: InnovationRecord[] = (innovationsData || []).map((inv: any) => ({
      id: inv.id,
      title: inv.title,
      description: inv.description,
      type: inv.type,
      currentCost: inv.current_cost,
      projectedCost: inv.projected_cost,
      costDifference: inv.cost_difference,
      status: inv.status,
      authorId: inv.author_id,
      createdAt: inv.created_at
    }));

    return { projects, issues, innovations };
  } catch (error) {
    console.error("Failed to load data from Supabase", error);
    return defaultState;
  }
};

export const addProject = async (project: ProjectSession): Promise<AppState> => {
  try {
    const { error } = await supabase.from('projects').insert([{
      id: project.id,
      ns: project.ns,
      project_code: project.projectCode,
      type: project.type,
      implement_type: project.implementType,
      start_time: project.startTime,
      end_time: project.endTime,
      total_active_seconds: project.totalActiveSeconds,
      pauses: project.pauses, // Supabase handles JSON array automatically if column is jsonb
      status: project.status,
      notes: project.notes,
      user_id: project.userId
    }]);

    if (error) throw error;
    
    return fetchAppState();
  } catch (error) {
    console.error("Failed to add project", error);
    return fetchAppState();
  }
};

export const updateProject = async (project: ProjectSession): Promise<AppState> => {
  try {
    const { error } = await supabase
      .from('projects')
      .update({
        ns: project.ns,
        project_code: project.projectCode,
        type: project.type,
        implement_type: project.implementType,
        end_time: project.endTime,
        total_active_seconds: project.totalActiveSeconds,
        pauses: project.pauses,
        status: project.status,
        notes: project.notes
      })
      .eq('id', project.id);

    if (error) throw error;

    return fetchAppState();
  } catch (error) {
    console.error("Failed to update project", error);
    return fetchAppState();
  }
};

export const addIssue = async (issue: IssueRecord): Promise<AppState> => {
  try {
    const { error } = await supabase.from('issues').insert([{
      id: issue.id,
      project_ns: issue.projectNs,
      type: issue.type,
      description: issue.description,
      date: issue.date,
      reported_by: issue.reportedBy
    }]);

    if (error) throw error;

    return fetchAppState();
  } catch (error) {
    console.error("Failed to add issue", error);
    return fetchAppState();
  }
};

export const addInnovation = async (innovation: InnovationRecord): Promise<AppState> => {
  try {
    const { error } = await supabase.from('innovations').insert([{
      id: innovation.id,
      title: innovation.title,
      description: innovation.description,
      type: innovation.type,
      current_cost: innovation.currentCost,
      projected_cost: innovation.projectedCost,
      cost_difference: innovation.costDifference,
      status: innovation.status,
      author_id: innovation.authorId,
      created_at: innovation.createdAt
    }]);

    if (error) throw error;
    return fetchAppState();
  } catch (error) {
    console.error("Failed to add innovation", error);
    return fetchAppState();
  }
};

export const updateInnovationStatus = async (id: string, status: string): Promise<AppState> => {
  try {
    const { error } = await supabase
      .from('innovations')
      .update({ status: status })
      .eq('id', id);

    if (error) throw error;
    return fetchAppState();
  } catch (error) {
    console.error("Failed to update innovation status", error);
    return fetchAppState();
  }
};

// --- USER MANAGEMENT ---

export const fetchUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Failed to fetch users", error);
    return [];
  }
};

export const registerUser = async (user: User): Promise<boolean> => {
  try {
    // Check if user exists (client side check for simplicity, ideally DB constraint)
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', user.username)
      .single();

    if (existing) return false;

    const { error } = await supabase.from('users').insert([{
      id: user.id,
      name: user.name,
      username: user.username,
      password: user.password,
      role: user.role
    }]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Failed to register user", error);
    return false;
  }
};

export const authenticateUser = async (username: string, password: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) return null;
    return data as User;
  } catch (error) {
    console.error("Auth error", error);
    return null;
  }
};