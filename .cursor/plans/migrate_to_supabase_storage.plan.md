---
name: Migrate to Supabase Storage
overview: Switch image storage from Vercel Blob Storage to Supabase Storage for production use
todos: []
---

# Migration Plan: Switch to Supabase Storage for Images

## Overview

Replace Vercel Blob Storage with Supabase Storage for production image storage. This will provide better control, cost efficiency, and flexibility for image management.

## Current State

- **Current storage**: Vercel Blob Storage (via `@vercel/blob` package)
- **Fallback behavior**: Data URLs in local dev, original URLs in production if blob storage not configured
- **Files to update**:
  - `src/lib/blob-storage.ts` - Main storage functions
  - `src/app/api/topics/[topicId]/research/route.ts` - Research route
  - `src/app/api/cron/research/route.ts` - Cron research route  
  - `src/app/api/topics/[topicId]/items/from-url/route.ts` - URL import route
  - `package.json` - Dependencies
  - `README.md` - Documentation
  - `DEPLOYMENT.md` - Deployment guide

## Implementation Plan

### Phase 1: Setup Supabase

#### 1.1 Install Supabase Client
**Files**: `package.json`

- Add `@supabase/supabase-js` package
- Version: `^2.39.0` (or latest stable)

**Commands**:
```bash
npm install @supabase/supabase-js
```

#### 1.2 Create Supabase Storage Helper
**Files**: `src/lib/supabase-storage.ts` (new file)

Create new file with Supabase Storage functions that mirror the current blob storage API:

- `uploadImageToStorage(dataUrl: string, filename?: string): Promise<{ url: string; storedInStorage: boolean }>`
- `uploadImageFromUrlToStorage(imageUrl: string, filename?: string): Promise<{ url: string; storedInStorage: boolean }>`
- `isStorageAvailable(): boolean`

**Implementation details**:
- Use service role key for server-side uploads (has write permissions)
- Create public bucket named `images` (or `newsletter-images`)
- Store images in organized folders (e.g., `images/{userId}/{timestamp}-{filename}`)
- Generate public URLs using Supabase storage URL format
- Handle errors gracefully with fallback to original URL/data URL
- In production, require Supabase config (throw error if missing)
- In local dev, allow fallback to data URLs if Supabase not configured

#### 1.3 Environment Variables
**Files**: `.env.example`, `README.md`, `DEPLOYMENT.md`

Add new required environment variables:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server-side uploads (keep secret!)
- `SUPABASE_ANON_KEY` - Optional, for future client-side features

**Production requirement**: 
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must be set in production
- Fail gracefully with clear error messages if missing

### Phase 2: Update Storage Implementation

#### 2.1 Replace Blob Storage Functions
**Files**: `src/lib/blob-storage.ts` OR create `src/lib/image-storage.ts`

**Option A**: Replace existing file entirely
- Rename `blob-storage.ts` to `image-storage.ts`
- Replace all Vercel Blob code with Supabase Storage code
- Keep same function signatures for compatibility

**Option B**: Create new file, update imports (recommended for safer migration)
- Create `src/lib/supabase-storage.ts` with new functions
- Update `blob-storage.ts` to import and re-export from Supabase storage
- Later remove `blob-storage.ts` entirely

**Recommended approach**: Option B for gradual migration with rollback capability

#### 2.2 Update Function Calls
**Files**: 
- `src/app/api/topics/[topicId]/research/route.ts`
- `src/app/api/cron/research/route.ts`
- `src/app/api/topics/[topicId]/items/from-url/route.ts`

Update all imports:
```typescript
// Old
import { uploadImageToBlob, uploadImageFromUrlToBlob } from "@/lib/blob-storage";

// New
import { uploadImageToStorage, uploadImageFromUrlToStorage } from "@/lib/supabase-storage";
```

Update function calls:
- `uploadImageToBlob` → `uploadImageToStorage`
- `uploadImageFromUrlToBlob` → `uploadImageFromUrlToStorage`
- `storedInBlob` → `storedInStorage` (in return values)

#### 2.3 Update Storage Availability Check
**Files**: Any files that call `isBlobStorageAvailable()`

Replace with:
```typescript
import { isStorageAvailable } from "@/lib/supabase-storage";
```

### Phase 3: Supabase Setup & Configuration

#### 3.1 Create Storage Bucket
**Manual steps** (done in Supabase dashboard):

1. Go to Supabase project dashboard
2. Navigate to Storage
3. Create new bucket named `images` (or `newsletter-images`)
4. Set bucket to **public** (allows public access to images)
5. Configure CORS if needed (allow all origins for image access)
6. Optional: Set up bucket policies for access control

**Bucket settings**:
- **Public**: Yes (for public image URLs)
- **File size limit**: 10MB (or appropriate limit)
- **Allowed MIME types**: `image/*` (jpg, png, gif, webp, svg)

#### 3.2 Storage Path Structure
**Recommended structure**:
```
images/
  {userId}/
    {timestamp}-{random}.{ext}
```

Or flatter structure:
```
images/
  {timestamp}-{random}-{userId}.{ext}
```

Benefits of user folders: easier cleanup, better organization, potential user quotas later

### Phase 4: Update Documentation

#### 4.1 README.md
**File**: `README.md`

Update environment variables section:
- Remove `BLOB_READ_WRITE_TOKEN`
- Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Update description to mention Supabase Storage

#### 4.2 DEPLOYMENT.md
**File**: `DEPLOYMENT.md`

Update deployment guide:
- Replace Vercel Blob setup instructions with Supabase Storage setup
- Add steps for creating Supabase project
- Add instructions for creating storage bucket
- Update environment variables table

#### 4.3 Add Supabase Setup Guide
**File**: `docs/supabase-setup.md` (new)

Create detailed setup guide:
- How to create Supabase project
- How to create storage bucket
- How to get API keys
- Bucket configuration recommendations
- Troubleshooting common issues

### Phase 5: Error Handling & Validation

#### 5.1 Production Requirements
**Files**: `src/lib/supabase-storage.ts`

Add validation:
- Check if `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in production
- Throw clear error if missing (don't silently fail)
- In local dev, allow fallback to data URLs

**Code pattern**:
```typescript
const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';

if (isProduction && !process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is required in production');
}
```

#### 5.2 Error Handling
- Handle Supabase errors gracefully
- Log errors for debugging
- Fallback behavior:
  - Production: Keep original URL (don't store)
  - Local dev: Use data URL
- Clear error messages for missing configuration

### Phase 6: Cleanup (Optional)

#### 6.1 Remove Vercel Blob Dependency
**Files**: `package.json`

After successful migration:
- Remove `@vercel/blob` from dependencies
- Run `npm install` to update lock file

**Note**: Keep for now during transition, remove in follow-up PR

#### 6.2 Remove Old Blob Storage Code
**Files**: `src/lib/blob-storage.ts`

After all imports updated:
- Delete `blob-storage.ts` if replaced entirely
- Or remove if using wrapper approach

## File Changes Summary

### New Files
1. `src/lib/supabase-storage.ts` - Supabase Storage implementation
2. `docs/supabase-setup.md` - Setup documentation

### Modified Files
1. `package.json` - Add @supabase/supabase-js dependency
2. `src/lib/blob-storage.ts` - Update to use Supabase OR remove
3. `src/app/api/topics/[topicId]/research/route.ts` - Update imports
4. `src/app/api/cron/research/route.ts` - Update imports
5. `src/app/api/topics/[topicId]/items/from-url/route.ts` - Update imports
6. `README.md` - Update environment variables
7. `DEPLOYMENT.md` - Update deployment instructions
8. `.env.example` - Add Supabase variables (if exists)

## Testing Checklist

### Local Development
- [ ] Test image upload from data URL (draft editor)
- [ ] Test image upload from external URL (research)
- [ ] Test with Supabase configured
- [ ] Test without Supabase (should fallback to data URLs)
- [ ] Verify images are accessible via Supabase URLs

### Production
- [ ] Verify Supabase bucket is created and public
- [ ] Test image uploads work in production
- [ ] Verify images are publicly accessible
- [ ] Test with missing Supabase config (should error clearly)
- [ ] Verify old images (Vercel Blob URLs) still work (if any)

### Edge Cases
- [ ] Test with large images
- [ ] Test with unsupported image formats
- [ ] Test error handling (network failures, invalid credentials)
- [ ] Test duplicate uploads (same image URL)
- [ ] Verify image URLs are correctly stored in database

## Migration Notes

### Backward Compatibility
- Existing images stored in Vercel Blob will continue to work (their URLs won't change)
- New images will use Supabase Storage
- No database migration needed (URLs are just strings)

### Rollback Plan
If issues arise:
1. Revert code changes
2. Keep `@vercel/blob` in dependencies
3. Add back `BLOB_READ_WRITE_TOKEN` to environment variables
4. Deploy previous version

### Performance Considerations
- Supabase Storage provides CDN delivery (fast)
- Consider image optimization in future (resize, compress)
- Monitor storage usage in Supabase dashboard

## Implementation Order

1. **Phase 1**: Install Supabase and create storage helper
2. **Phase 2**: Update all storage function calls
3. **Phase 3**: Set up Supabase bucket (manual)
4. **Phase 4**: Update documentation
5. **Phase 5**: Test thoroughly
6. **Phase 6**: Deploy to production
7. **Phase 7**: Monitor and verify
8. **Phase 8**: Cleanup (remove Vercel Blob dependency)

## Success Criteria

- [ ] All images upload successfully to Supabase Storage in production
- [ ] Images are publicly accessible via Supabase URLs
- [ ] No functionality breaks (drafts, research, etc.)
- [ ] Documentation updated
- [ ] Error handling works correctly
- [ ] Local dev still works with/without Supabase

## Future Enhancements (Out of Scope)

- Image optimization/resizing before upload
- User-specific storage quotas
- Image deletion API (cleanup unused images)
- Storage usage analytics
- Image CDN configuration
- Automatic cleanup of old images
