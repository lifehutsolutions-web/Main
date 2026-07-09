import { supabase } from '../lib/supabase';

export async function uploadImage(file: File, folder: string = 'progress'): Promise<string> {
  if (!supabase) {
    console.warn("Supabase is not configured. Falling back to local Base64 data URL.");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to read file as data URL"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

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