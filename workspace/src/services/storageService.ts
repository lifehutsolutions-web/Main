import { supabase } from '../lib/supabase';

export async function uploadImage(file: File, folder: string = 'progress') {
  const fileName = `${folder}/${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
    .from('workspace-files')
    .upload(fileName, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from('workspace-files')
    .getPublicUrl(fileName);

  return data.publicUrl;
}