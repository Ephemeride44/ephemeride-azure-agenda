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
supabase-types:
	npx supabase gen types typescript --project-id $(SUPABASE_PROJECT_ID) --schema public > src/lib/database.types.ts

# Applique les migrations locales à la base distante liée.
supabase-migrate:
	npx supabase db push

# Déploie l'Edge Function d'envoi de notifications push.
# --use-api : bundling distant (pas besoin de Docker en local).
supabase-deploy-notif:
	npx supabase functions deploy send-event-notification --use-api

# Configure les secrets VAPID de l'Edge Function (valeurs lues depuis .env.local).
supabase-secrets:
	npx supabase secrets set \
		VAPID_PUBLIC_KEY="$(NEXT_PUBLIC_VAPID_PUBLIC_KEY)" \
		VAPID_PRIVATE_KEY="$(VAPID_PRIVATE_KEY)" \
		VAPID_SUBJECT="$(VAPID_SUBJECT)"

# Configure les secrets Resend pour le fallback e-mail (valeurs depuis .env.local).
# RESEND_FROM doit utiliser un domaine expéditeur vérifié dans Resend.
supabase-secrets-email:
	npx supabase secrets set \
		RESEND_API_KEY="$(RESEND_API_KEY)" \
		RESEND_FROM="$(RESEND_FROM)" \
		SITE_URL="$(NEXT_PUBLIC_SITE_URL)"

# Déploiement complet de la fonctionnalité notifications push :
# migration + secrets + déploiement de la fonction.
push-setup: supabase-migrate supabase-secrets supabase-deploy-notif

.PHONY: supabase-types supabase-migrate supabase-deploy-notif supabase-secrets supabase-secrets-email push-setup
