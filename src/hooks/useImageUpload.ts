import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseImageUploadOptions {
  bucket: string;
  maxSizeMB?: number;
}

export function useImageUpload({ bucket, maxSizeMB = 2 }: UseImageUploadOptions) {
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File, path: string): Promise<string | null> => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      throw new Error(`Arquivo muito grande. Máximo ${maxSizeMB}MB.`);
    }

    setUploading(true);
    try {
      // Delete existing file first (ignore error if doesn't exist)
      await supabase.storage.from(bucket).remove([path]);

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return urlData.publicUrl;
    } finally {
      setUploading(false);
    }
  };

  const remove = async (path: string) => {
    await supabase.storage.from(bucket).remove([path]);
  };

  return { upload, remove, uploading };
}
