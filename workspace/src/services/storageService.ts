import { supabase } from '../lib/supabase';

export async function uploadImage(file: File, folder: string = 'progress') {
  const fileName = `${folder}/${Date.now()}-${file.name}`;

  const { data: uploadData, error } = await supabase.storage
    .from('workspace-files')
    .upload(fileName, file);

  console.log("Supabase upload:", uploadData);
  console.log("Supabase error:", error);

  if (error) {
    alert(error.message);
    throw error;
  }

  const { data } = supabase.storage
    .from('workspace-files')
    .getPublicUrl(fileName);

  return data.publicUrl;
}