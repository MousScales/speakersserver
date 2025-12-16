-- Storage Bucket Policies for profile-pictures
-- 
-- IMPORTANT: First create the bucket through Supabase Dashboard:
-- 1. Go to Storage in left sidebar
-- 2. Click "New bucket"
-- 3. Name: profile-pictures
-- 4. Set to Public
-- 5. Click "Create bucket"
--
-- Then run this SQL to set up the policies

-- Policy 1: Allow authenticated users to upload their own profile pictures
CREATE POLICY "Users can upload own profile pictures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profile-pictures'::text 
    AND (storage.foldername(name))[1] = 'profiles'::text
    AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy 2: Allow public read access to all profile pictures
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-pictures'::text);

-- Policy 3: Allow users to update their own profile pictures
CREATE POLICY "Users can update own profile pictures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profile-pictures'::text 
    AND auth.uid()::text = (storage.foldername(name))[2]
)
WITH CHECK (
    bucket_id = 'profile-pictures'::text 
    AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy 4: Allow users to delete their own profile pictures
CREATE POLICY "Users can delete own profile pictures"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile-pictures'::text 
    AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Alternative: Simpler policy if the above doesn't work
-- This allows all authenticated users to upload to the bucket
-- (Less secure but easier to set up)
/*
CREATE POLICY "Authenticated users can upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-pictures'::text);

CREATE POLICY "Public can read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-pictures'::text);
*/

