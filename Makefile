ifneq (,$(wildcard .env))
  include .env
  export
endif
# .env.local (non versionné) : contient la clé privée VAPID et le sujet, lus par
# la cible `supabase-secrets`.
ifneq (,$(wildcard .env.local))
  include .env.local
  export
endif

# Régénère les types TypeScript depuis le schéma distant.
# Deux fichiers à garder en phase : `src/lib/database.types.ts` (historique) et
# `src/integrations/supabase/types.ts` (importé par le client Supabase). On génère
# une fois puis on copie, sinon les nouvelles tables restent non typées côté client.
supabase-types:
	npx supabase gen types typescript --project-id $(SUPABASE_PROJECT_ID) --schema public > src/lib/database.types.ts
	cp src/lib/database.types.ts src/integrations/supabase/types.ts

# Applique les migrations locales à la base distante liée.
supabase-migrate:
	npx supabase db push

# Déploie une Edge Function par son nom (--use-api : bundling distant, pas de Docker).
#   make deploy-fn FN=send-event-notification
deploy-fn:
	@test -n "$(FN)" || { echo "Usage: make deploy-fn FN=<nom-de-la-fonction>"; exit 1; }
	npx supabase functions deploy $(FN) --use-api

# Déploie toutes les Edge Functions (chaque dossier de supabase/functions sauf _shared).
deploy-fns:
	@for fn in $$(ls supabase/functions | grep -v '^_'); do \
		echo "▸ deploy $$fn"; \
		npx supabase functions deploy $$fn --use-api || exit 1; \
	done

# Configure les secrets VAPID de l'Edge Function (valeurs lues depuis .env.local).
supabase-secrets:
	npx supabase secrets set \
		VAPID_PUBLIC_KEY="$(NEXT_PUBLIC_VAPID_PUBLIC_KEY)" \
		VAPID_PRIVATE_KEY="$(VAPID_PRIVATE_KEY)" \
		VAPID_SUBJECT="$(VAPID_SUBJECT)"

# Configure les secrets Resend (e-mails sortants + redirection des mails entrants).
# RESEND_FROM doit utiliser un domaine expéditeur vérifié dans Resend.
supabase-secrets-email:
	npx supabase secrets set \
		RESEND_API_KEY="$(RESEND_API_KEY)" \
		RESEND_FROM="$(RESEND_FROM)" \
		SITE_URL="$(NEXT_PUBLIC_SITE_URL)" \
		RESEND_EMAIL_RECEIVED_FORWARD="$(RESEND_EMAIL_RECEIVED_FORWARD)" \
		RESEND_WEBHOOK_SECRET="$(RESEND_WEBHOOK_SECRET)"

# Déploiement complet de la fonctionnalité notifications push :
# migration + secrets + déploiement de toutes les fonctions.
push-setup: supabase-migrate supabase-secrets deploy-fns

.PHONY: supabase-types supabase-migrate deploy-fn deploy-fns supabase-secrets supabase-secrets-email push-setup
