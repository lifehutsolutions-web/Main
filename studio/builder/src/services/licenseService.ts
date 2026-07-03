import { supabase } from '../lib/supabase';
import { License } from '../types';

/**
 * Checks if the user has an active license for a given template.
 */
export async function checkUserLicense(userId: string, templateId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('licenses')
      .select('id, active')
      .eq('user_id', userId)
      .eq('template_id', templateId)
      .eq('active', true);

    if (error) {
      console.error('Error checking license:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (e) {
    console.error('Failed to query license database', e);
    return false;
  }
}

/**
 * Retrieves all active licenses for a user.
 */
export async function getUserLicenses(userId: string): Promise<License[]> {
  try {
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true);

    if (error) {
      console.error('Error getting user licenses:', error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error('Failed to get licenses from database', e);
    return [];
  }
}
