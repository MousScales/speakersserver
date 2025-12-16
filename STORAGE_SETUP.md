# Storage Setup for Profile Pictures

To enable profile picture uploads, you need to create a storage bucket in Supabase.

## Steps:

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Name it: `profile-pictures`
5. Set it to **Public** (so images can be accessed via URL)
6. Click **Create bucket**

## Storage Policies:

After creating the bucket, set up the following policies in the **Policies** tab:

### Policy 1: Allow authenticated users to upload
- Policy name: "Users can upload own profile pictures"
- Allowed operation: INSERT
- Target roles: authenticated
- Policy definition:
```sql
(bucket_id = 'profile-pictures'::text) AND ((storage.foldername(name))[1] = 'profiles'::text) AND (auth.uid()::text = (storage.foldername(name))[2])
```

### Policy 2: Allow public read access
- Policy name: "Anyone can view profile pictures"
- Allowed operation: SELECT
- Target roles: public
- Policy definition:
```sql
bucket_id = 'profile-pictures'::text
```

### Policy 3: Allow users to update their own pictures
- Policy name: "Users can update own profile pictures"
- Allowed operation: UPDATE
- Target roles: authenticated
- Policy definition:
```sql
(bucket_id = 'profile-pictures'::text) AND (auth.uid()::text = (storage.foldername(name))[2])
```

### Policy 4: Allow users to delete their own pictures
- Policy name: "Users can delete own profile pictures"
- Allowed operation: DELETE
- Target roles: authenticated
- Policy definition:
```sql
(bucket_id = 'profile-pictures'::text) AND (auth.uid()::text = (storage.foldername(name))[2])
```

## Alternative: Simple Public Upload

If the above policies are too complex, you can use a simpler approach:

1. Make the bucket **Public**
2. Add a single policy for INSERT:
   - Policy name: "Authenticated users can upload"
   - Allowed operation: INSERT
   - Target roles: authenticated
   - Policy definition: `true` (allows all authenticated users to upload)

Note: This is less secure but simpler to set up. For production, use the more restrictive policies above.

