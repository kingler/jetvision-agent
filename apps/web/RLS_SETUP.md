# Row Level Security Setup Instructions

The Row Level Security (RLS) policies have been prepared and are located in:
`lib/database/migrations/rls-policies.sql`

## How to Apply RLS Policies

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to the **SQL Editor** section
3. Copy the contents of `lib/database/migrations/rls-policies.sql`
4. Paste into the SQL editor
5. Click **Run** to execute all policies

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref fshvzvxqgwgoujtcevyy

# Apply the RLS policies
supabase db push lib/database/migrations/rls-policies.sql
```

### Option 3: Via API (Advanced)

You can use the provided script:

```bash
bunx tsx apply-rls-policies.ts
```

Note: This method may require additional configuration for SQL execution permissions.

## What These Policies Do

The RLS policies ensure that:

1. **Users Table**: Users can only view and update their own profile
2. **Conversations**: Users can only access their own conversations
3. **Messages**: Users can only see messages in their conversations
4. **Apollo Data**: Users can only access their own leads and campaigns
5. **Bookings**: Users can only view their own bookings
6. **Analytics**: Users can create events, but viewing is restricted

## Verification

After applying the policies, you can verify they're active:

1. Go to the Supabase dashboard
2. Navigate to **Authentication** → **Policies**
3. You should see all the policies listed for each table

## Testing RLS

The integration tests (`test-database-integration.ts`) will work with service role key.
For production, ensure your application uses the anon key for client-side operations,
which will enforce RLS policies automatically.

## Important Notes

- RLS is already enabled on all tables via the migration
- Policies use Clerk ID for authentication (`auth.uid()::text = clerk_id`)
- Service role key bypasses RLS (use only on server-side)
- Anon key enforces RLS (use on client-side)