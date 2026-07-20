import { supabase } from '../lib/supabase';
import { Project } from '../types';

export interface SavedProject {
  id: string;
  user_id: string;
  template_id: string;
  industry_id: string;
  config: any; // stores full Project object
  created_at?: string;
  updated_at?: string;
}

/**
 * Saves or updates a project in the Supabase database.
 * Uses upsert to either create a new record or update an existing one.
 */
export async function saveProjectToDb(
  userId: string,
  project: Project,
  existingProjectId?: string
): Promise<string> {
  const templateId = project.metadata.templateId;
  const industryId = project.metadata.industryId;

  const payload: Partial<SavedProject> = {
    user_id: userId,
    template_id: templateId,
    industry_id: industryId,
    config: project,
    updated_at: new Date().toISOString(),
  };

  if (existingProjectId) {
    payload.id = existingProjectId;
  }

  const { data, error } = await supabase
    .from('projects')
    .upsert(payload, { onConflict: 'id' })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving project to Supabase:', error);
    throw error;
  }

  return data?.id || existingProjectId || '';
}

/**
 * Fetches all saved projects for a specific user.
 */
export async function getUserProjects(userId: string): Promise<SavedProject[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error loading user projects from Supabase:', error);
    throw error;
  }

  return data || [];
}

/**
 * Deletes a specific project from Supabase.
 */
export async function deleteProjectFromDb(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('Error deleting project from Supabase:', error);
    throw error;
  }
}
