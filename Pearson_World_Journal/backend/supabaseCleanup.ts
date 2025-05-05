import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!; // Use service role key for deletion
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'images';

/**
 * Recursively lists all files in the Supabase Storage bucket.
 */
async function listAllFiles(prefix = ''): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(prefix, {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' }
    });

  if (error) {
    console.error('Error listing files in:', prefix, error.message);
    return [];
  }

  let files: string[] = [];

  for (const item of data || []) {
    if (item && item.name) {
      if (item.metadata === null) {
        // This is a folder
        const nestedFiles = await listAllFiles(`${prefix}${item.name}/`);
        files.push(...nestedFiles);
      } else {
        // This is a file
        files.push(`${prefix}${item.name}`);
      }
    }
  }

  return files;
}

async function cleanupUnusedImages() {
  console.log('🚀 Starting unused image cleanup...');

  // Step 1: Get all image paths from the database
  const { data: waypoints, error: dbError } = await supabase
    .from('waypoints')
    .select('images');

  if (dbError) {
    console.error('❌ Error fetching waypoints:', dbError.message);
    return;
  }

  const usedPaths = new Set(
    waypoints
      .flatMap(wp => wp.images || [])
      .map((url: string) =>
        url.replace(`${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/`, '')
      )
  );

  // Step 2: List all actual files in the bucket
  const allFiles = await listAllFiles();
  console.log(`📦 Total files in bucket: ${allFiles.length}`);
  console.log(`🗃️ Total used in DB: ${usedPaths.size}`);

  // Step 3: Identify unused files
  const unusedFiles = allFiles.filter(path => !usedPaths.has(path));

  if (unusedFiles.length === 0) {
    console.log('✅ No unused images to delete.');
    return;
  }

  console.log(`🗑️ Found ${unusedFiles.length} unused image(s). Deleting...`);

  const { error: deleteError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(unusedFiles);

  if (deleteError) {
    console.error('❌ Error deleting files:', deleteError.message);
  } else {
    console.log('✅ Deleted unused images:', unusedFiles);
  }
}

cleanupUnusedImages();