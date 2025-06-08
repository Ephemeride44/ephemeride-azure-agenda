ifneq (,$(wildcard .env))
  include .env
  export
endif

supabase-types:
	npx supabase gen types typescript --project-id $(SUPABASE_PROJECT_ID) --schema public > src/lib/database.types.ts
