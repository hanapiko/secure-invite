import { createClient } from './supabase'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_DOCUMENT_TYPES = ['application/pdf']

export interface UploadResult {
  url: string | null
  error: string | null
}

export async function uploadFile(
  file: File,
  bucket: 'profiles' | 'documents' | 'products'
): Promise<UploadResult> {
  const supabase = createClient()

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return { url: null, error: 'File size must be less than 5MB' }
  }

  // Validate file type
  let allowedTypes: string[]
  switch (bucket) {
    case 'profiles':
    case 'products':
      allowedTypes = ALLOWED_IMAGE_TYPES
      break
    case 'documents':
      allowedTypes = ALLOWED_DOCUMENT_TYPES
      break
  }

  if (!allowedTypes.includes(file.type)) {
    return { url: null, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` }
  }

  try {
    // Generate unique file name
    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      return { url: null, error: error.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    return { url: urlData.publicUrl, error: null }
  } catch (error: any) {
    return { url: null, error: error.message || 'Upload failed' }
  }
}

export async function deleteFile(
  fileUrl: string,
  bucket: 'profiles' | 'documents' | 'products'
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient()

  try {
    // Extract file name from URL
    const fileName = fileUrl.split('/').pop()
    if (!fileName) {
      return { success: false, error: 'Invalid file URL' }
    }

    const { error } = await supabase.storage.from(bucket).remove([fileName])

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error: any) {
    return { success: false, error: error.message || 'Delete failed' }
  }
}
