---
name: Optimize Login to Dashboard Performance
overview: Speed up the login-to-dashboard redirect by optimizing database queries, removing redundant calls, and improving the redirect flow.
todos: []
---

# Optimize Login to Dashboard Performance

## Problem Analysis

The delay after login is caused by several bottlenecks:

1. **Dashboard page loads ALL topics with ALL items** - Most critical issue

   - Currently loads every research item for every topic just to count them
   - If user has 10 topics with 100 items each = 1000 database rows loaded
   - Then filters in JavaScript instead of using database aggregation

2. **Dashboard layout makes redundant database query**

   - Queries user table to get `isAdmin` 
   - But `isAdmin` is already in JWT token (available in session)
   - Unnecessary database round-trip on every page load

3. **Login redirect uses router.refresh()**

   - `router.push()` followed by `router.refresh()` may cause double work
   - Could use Next.js redirect instead

4. **No database query optimization**

   - Using `include` to load all items, then counting in JavaScript
   - Should use Prisma `_count` aggregation instead

## Optimization Strategy

### Priority 1: Optimize Dashboard Query (Biggest Impact)

**Current code** (`src/app/(dashboard)/dashboard/page.tsx`):

```typescript
const topics = await db.topic.findMany({
  where: { userId: session!.user!.id },
  orderBy: { position: "asc" },
  include: {
    items: {
      select: { type: true },
    },
  },
});

// Then counts in JavaScript
itemCounts: {
  websites: topic.items.filter((i) => i.type === "WEBSITE").length,
  articles: topic.items.filter((i) => i.type === "ARTICLE").length,
  // ...
}
```

**Optimized approach**:

- Use Prisma `_count` aggregation to count items by type
- Load only topic data, not all items
- Count happens in database, not JavaScript

**Expected improvement**: 80-90% faster for users with many items

### Priority 2: Remove Redundant Admin Check

**Current code** (`src/app/(dashboard)/layout.tsx`):

```typescript
const user = await db.user.findUnique({
  where: { id: session.user.id },
  select: { isAdmin: true },
});
```

**Optimized approach**:

- Use `isAdmin` from session (already in JWT token)
- Remove database query entirely

**Expected improvement**: Eliminates one database query per page load

### Priority 3: Optimize Login Redirect

**Current code** (`src/app/(auth)/login/page.tsx`):

```typescript
router.push("/dashboard");
router.refresh();
```

**Optimized approach**:

- Use Next.js `redirect()` from server action
- Or use `window.location.href` for immediate navigation
- Remove `router.refresh()` if not needed

**Expected improvement**: Faster perceived redirect

### Priority 4: Add Database Indexes (If Missing)

Verify indexes exist for:

- `Topic.userId` (already exists)
- `ResearchItem.topicId` (already exists)
- Consider composite index for common queries

## Implementation Plan

### Step 1: Optimize Dashboard Query

**File**: `src/app/(dashboard)/dashboard/page.tsx`

Replace the query to use aggregation:

```typescript
const topics = await db.topic.findMany({
  where: { userId: session!.user!.id },
  orderBy: { position: "asc" },
  include: {
    _count: {
      select: {
        items: {
          where: { type: "WEBSITE" },
        },
      },
    },
  },
});
```

Actually, Prisma doesn't support conditional counts in `_count`. Better approach:

```typescript
// Get topics without items
const topics = await db.topic.findMany({
  where: { userId: session!.user!.id },
  orderBy: { position: "asc" },
});

// Get counts in parallel using aggregation
const topicIds = topics.map(t => t.id);
const itemCounts = await db.researchItem.groupBy({
  by: ['topicId', 'type'],
  where: { topicId: { in: topicIds } },
  _count: true,
});

// Or use raw query for better performance
const itemCounts = await db.$queryRaw`
  SELECT 
    "topicId",
    type,
    COUNT(*) as count
  FROM "ResearchItem"
  WHERE "topicId" IN (${Prisma.join(topicIds)})
  GROUP BY "topicId", type
`;
```

**Best approach**: Use a single optimized query with Prisma's aggregation or raw SQL.

### Step 2: Remove Redundant Admin Query

**File**: `src/app/(dashboard)/layout.tsx`

Change:

```typescript
// OLD
const user = await db.user.findUnique({
  where: { id: session.user.id },
  select: { isAdmin: true },
});
const isAdmin = user?.isAdmin ?? false;

// NEW
const isAdmin = session.user.isAdmin ?? false;
```

### Step 3: Optimize Login Redirect

**File**: `src/app/(auth)/login/page.tsx`

Options:

- **Option A**: Use `window.location.href` for immediate redirect
- **Option B**: Remove `router.refresh()` if not needed
- **Option C**: Use Next.js server action with redirect

**Recommended**: Option A for fastest perceived redirect

### Step 4: Add Loading State

**File**: `src/app/(auth)/login/page.tsx`

Add optimistic UI update:

- Show loading state immediately
- Redirect before waiting for full page load
- Use skeleton/loading state on dashboard

## Expected Performance Improvements

| Optimization | Current | Optimized | Improvement |

|-------------|---------|-----------|-------------|

| Dashboard query (10 topics, 100 items each) | ~500ms | ~50ms | 90% faster |

| Layout admin check | ~20ms | 0ms | Eliminated |

| Login redirect | ~100ms | ~10ms | 90% faster |

| **Total** | **~620ms** | **~60ms** | **~90% faster** |

## Additional Optimizations (Future)

1. **Streaming SSR**: Use React Server Components streaming
2. **Caching**: Cache topic list with revalidation
3. **Pagination**: Load topics in batches if user has many
4. **Prefetching**: Prefetch dashboard data on login page hover
5. **Database connection pooling**: Ensure optimal pool size

## Testing

After implementation, measure:

- Time from login click to dashboard visible
- Database query execution time
- Total page load time
- User-perceived performance

## Rollout Strategy

1. Implement dashboard query optimization (biggest impact)
2. Remove redundant admin query
3. Optimize redirect
4. Monitor performance metrics
5. Add loading states for better UX