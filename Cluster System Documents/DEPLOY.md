# Deployment Guide - Cluster System Updates

## Pre-Deployment Checklist

Before deploying, ensure:
- ✅ All code has been reviewed
- ✅ No linting errors present
- ✅ Local testing completed (if possible)
- ✅ Supabase CLI is installed and authenticated

## Deployment Steps

### Step 1: Apply Database Migration

```bash
# Navigate to project root
cd C:\Users\myvag\briandump1\brain-dump-1

# Apply the migration
supabase db push

# Or if using remote:
supabase db push --db-url YOUR_DATABASE_URL
```

**What this does:**
- Adds `is_manual` column to `clusters` table
- Adds `updated_at` column to `clusters` table
- Creates indexes for performance
- Creates trigger for auto-updating `updated_at`

**Verify:**
```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clusters';
```

---

### Step 2: Deploy Edge Functions

#### Deploy generate-clusters (updated)

```bash
supabase functions deploy generate-clusters
```

**What changed:**
- Complete rewrite with Gemini AI
- Threshold validation (10 thoughts minimum)
- Chunking protocol for scalability
- Structured JSON response schema

**Verify deployment:**
```bash
# Check logs
supabase functions logs generate-clusters

# Test with curl (replace with your auth token)
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-clusters' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

#### Deploy find-related-thoughts (new)

```bash
supabase functions deploy find-related-thoughts
```

**What this does:**
- Creates new edge function for collaboration feature
- Allows AI-powered finding of related thoughts

**Verify deployment:**
```bash
# Check logs
supabase functions logs find-related-thoughts

# Test with curl (replace with your auth token and cluster ID)
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/find-related-thoughts' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"clusterId": "YOUR_CLUSTER_ID"}'
```

---

### Step 3: Verify Environment Variables

Ensure these are set in Supabase Dashboard → Settings → Edge Functions:

```
LOVABLE_API_KEY=your_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

---

### Step 4: Deploy Frontend

If using Vercel, Netlify, or similar:

```bash
# Build the frontend
npm run build

# Deploy (depends on your platform)
# Vercel:
vercel --prod

# Netlify:
netlify deploy --prod

# Or push to git and let CI/CD handle it
git add .
git commit -m "feat: implement intelligent cluster system with AI collaboration"
git push origin main
```

---

### Step 5: Post-Deployment Testing

#### A. Smoke Test - Basic Functionality

1. **Login** to your app
2. **Navigate** to Brain Dump page
3. **Add 5 thoughts** (any content)
4. **Go to Clusters tab**
5. **Verify**: Should see empty state with "Add at least 10 thoughts"
6. **Add 6 more thoughts** (total 11)
7. **Verify**: Generate button should appear with count
8. **Click generate**
9. **Verify**: Loading state shows "Analyzing your thoughts..."
10. **Verify**: Success toast appears with cluster count
11. **Verify**: Clusters display with correct names and thoughts

#### B. Manual Cluster Test

1. **Click** "Create Cluster"
2. **Enter** a name (e.g., "Test Cluster")
3. **Verify**: Cluster created and appears in list
4. **Verify**: Shows 0 thoughts
5. *(Note: Manual adding thoughts not yet implemented in UI)*

#### C. Rename Test

1. **Click** pencil icon on any cluster
2. **Change** the name
3. **Press** Enter
4. **Verify**: Name updates and toast appears
5. **Click** pencil again, press Escape
6. **Verify**: Edit cancels without changing name

#### D. Find Related Test

1. **Ensure** you have a cluster with 2+ thoughts
2. **Ensure** you have unclustered thoughts
3. **Click** "Find related thoughts"
4. **Verify**: Loading state shows
5. **Verify**: Toast shows count of thoughts added (or "none found")
6. **Verify**: Cluster updates with new thoughts

#### E. Large Scale Test (if possible)

1. **Create** 250+ thoughts (can use script)
2. **Click** generate
3. **Monitor** edge function logs for chunking
4. **Verify**: Multiple chunks processed
5. **Verify**: No duplicate clusters
6. **Verify**: All thoughts assigned

---

### Step 6: Monitor Performance

#### Check Edge Function Logs

```bash
# Watch generate-clusters logs in real-time
supabase functions logs generate-clusters --tail

# Watch find-related-thoughts logs
supabase functions logs find-related-thoughts --tail
```

#### Monitor for:
- ❌ Errors or exceptions
- ⏱️ Slow response times (>30s for clustering)
- 💰 High API costs (check Lovable/Gemini dashboard)
- 🔄 Retry patterns or timeouts

---

## Rollback Plan

If something goes wrong:

### Rollback Database Migration

```bash
# If using Supabase migrations, revert to previous migration
# Create a down migration:
```

```sql
-- rollback_cluster_fields.sql
ALTER TABLE public.clusters DROP COLUMN IF EXISTS is_manual;
ALTER TABLE public.clusters DROP COLUMN IF EXISTS updated_at;
DROP TRIGGER IF EXISTS clusters_updated_at_trigger ON public.clusters;
DROP FUNCTION IF EXISTS update_clusters_updated_at();
```

### Rollback Edge Functions

```bash
# Redeploy previous version from git
git checkout HEAD~1 supabase/functions/generate-clusters/index.ts
supabase functions deploy generate-clusters

# Delete new function
supabase functions delete find-related-thoughts
```

### Rollback Frontend

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or redeploy previous version
git checkout HEAD~1
npm run build
# deploy...
```

---

## Common Issues & Solutions

### Issue: "Need at least 10 thoughts" but I have more

**Solution:**
- Check if thoughts are already clustered
- Run this query to count unclustered:
```sql
SELECT COUNT(*) 
FROM thoughts t
LEFT JOIN thought_clusters tc ON t.id = tc.thought_id
WHERE tc.thought_id IS NULL AND t.status = 'active';
```

### Issue: Edge function times out

**Solution:**
- Check if chunking is working (look for logs: "Processing X thoughts in Y chunks")
- Reduce CHUNK_SIZE from 200 to 100 in generate-clusters/index.ts
- Check Gemini API status

### Issue: Clusters have generic names like "Related Ideas"

**Solution:**
- Check if Gemini API is responding correctly
- Verify prompt is being sent properly (check logs)
- Try a different AI model
- Ensure thoughts have descriptive titles/content

### Issue: "AI request failed: 401"

**Solution:**
- Verify LOVABLE_API_KEY is set in Supabase
- Check if API key is valid
- Ensure edge function has access to secrets

### Issue: Find related thoughts returns nothing

**Solution:**
- Ensure cluster has at least 2 thoughts
- Ensure there are unclustered thoughts available
- Check edge function logs for AI response
- Verify thought content is descriptive enough

---

## Performance Benchmarks

Expected performance (approximate):

| Thought Count | Processing Time | Chunks | API Calls |
|--------------|----------------|--------|-----------|
| 10-50        | 3-8 seconds    | 1      | 1-2       |
| 51-200       | 8-15 seconds   | 1      | 1-2       |
| 201-400      | 15-25 seconds  | 2      | 2-3       |
| 401-1000     | 25-60 seconds  | 5      | 5-6       |

If significantly slower:
- Check network latency to Gemini API
- Check database query performance
- Consider optimizing thought fetching

---

## Success Indicators

Deployment is successful when:

✅ Database migration applied without errors
✅ Both edge functions deployed successfully
✅ Frontend builds and deploys without errors
✅ Generate button only appears with 10+ thoughts
✅ Clustering produces meaningful names
✅ Chunking works for 200+ thoughts
✅ Manual cluster creation works
✅ Rename functionality works
✅ Find related thoughts works
✅ No errors in browser console
✅ No errors in edge function logs
✅ Loading states and toasts display correctly

---

## Support & Debugging

### Useful Commands

```bash
# Check Supabase status
supabase status

# View all edge functions
supabase functions list

# View specific function logs with filters
supabase functions logs generate-clusters --filter "error"

# Check database connection
supabase db ping

# Run migrations locally first
supabase db reset # WARNING: destroys local data

# Test edge functions locally
supabase functions serve
```

### Debug Checklist

- [ ] Check browser console for errors
- [ ] Check edge function logs
- [ ] Check database RLS policies
- [ ] Verify API keys are set
- [ ] Check network tab for failed requests
- [ ] Verify user authentication
- [ ] Check thought count in database
- [ ] Verify cluster count in database

---

## Next Steps After Deployment

1. **Gather User Feedback**
   - How are cluster names?
   - Is the threshold (10) appropriate?
   - Are related thoughts accurate?

2. **Monitor Costs**
   - Track Gemini API usage
   - Optimize if needed

3. **Iterate**
   - Add drag-and-drop for manual assignment
   - Add cluster deletion
   - Add cluster merging
   - Improve AI prompts based on results

4. **Document**
   - Create user guide
   - Record common cluster patterns
   - Build FAQ

---

Good luck with deployment! 🚀

If you encounter issues not covered here, check:
- Edge function logs first
- Browser console second
- Database state third

