// Send Email Hook (Supabase Auth) : Supabase délègue ICI l'envoi de TOUS les
// e-mails d'authentification (confirmation d'inscription, lien magique,
// réinitialisation de mot de passe, changement d'e-mail). On compose un e-mail
// en français, avec le logo, et on l'envoie via Resend.
//
// Configuration (dashboard Supabase → Authentication → Hooks → Send Email) :
//   - pointer vers cette fonction,
//   - copier le secret généré dans le secret `SEND_EMAIL_HOOK_SECRET`.
// Déploiement : `supabase functions deploy send-auth-email --no-verify-jwt --use-api`
//
// Secrets : RESEND_API_KEY (requis), SITE_URL (logo / liens), SEND_EMAIL_HOOK_SECRET.

import { Webhook } from "npm:standardwebhooks@1.0.0";

const FROM = "Éphéméride <bonjour@ephemeride.link>";

interface EmailData {
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url?: string;
}
interface HookPayload {
  user: { email: string };
  email_data: EmailData;
}

// Sujet / contenu selon le type d'e-mail d'auth.
function copyFor(type: string): { subject: string; heading: string; intro: string; cta: string } {
  switch (type) {
    case "signup":
      return {
        subject: "Confirmez votre inscription",
        heading: "Bienvenue sur Éphéméride !",
        intro: "Plus qu'une étape : confirmez votre adresse e-mail pour activer votre compte et commencer à suivre vos événements du vignoble nantais.",
        cta: "Confirmer mon adresse",
      };
    case "magiclink":
      return {
        subject: "Votre lien de connexion",
        heading: "Connexion à Éphéméride",
        intro: "Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien est valable quelques minutes.",
        cta: "Me connecter",
      };
    case "recovery":
      return {
        subject: "Réinitialisez votre mot de passe",
        heading: "Mot de passe oublié ?",
        intro: "Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
        cta: "Réinitialiser mon mot de passe",
      };
    case "email_change":
    case "email_change_new":
      return {
        subject: "Confirmez votre nouvelle adresse e-mail",
        heading: "Changement d'adresse e-mail",
        intro: "Confirmez votre nouvelle adresse e-mail pour qu'elle soit associée à votre compte Éphéméride.",
        cta: "Confirmer la nouvelle adresse",
      };
    case "invite":
      return {
        subject: "Vous êtes invité·e sur Éphéméride",
        heading: "Vous avez été invité·e",
        intro: "Rejoignez Éphéméride en confirmant votre adresse e-mail ci-dessous.",
        cta: "Rejoindre Éphéméride",
      };
    default:
      return {
        subject: "Action requise sur votre compte",
        heading: "Éphéméride",
        intro: "Cliquez sur le bouton ci-dessous pour continuer.",
        cta: "Continuer",
      };
  }
}

function buildHtml(opts: { heading: string; intro: string; cta: string; url: string; logo: string }): string {
  const { heading, intro, cta, url, logo } = opts;
  return `
  <div style="margin:0;padding:0;background:#faf3ec;">
    <div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1B263B;">
      <div style="text-align:center;margin-bottom:24px;">
        <img src="${logo}" alt="Éphéméride" style="height:40px;width:auto;" />
      </div>
      <div style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(27,38,59,.08);">
        <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">${heading}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">${intro}</p>
        <div style="text-align:center;margin:0 0 24px;">
          <a href="${url}" style="display:inline-block;background:#ED9873;color:#1B263B;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:9999px;">${cta}</a>
        </div>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#94a3b8;">
          Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br/>
          <a href="${url}" style="color:#8B7BB8;word-break:break-all;">${url}</a>
        </p>
      </div>
      <p style="text-align:center;margin:24px 0 0;font-size:12px;color:#94a3b8;">
        Éphéméride — l'agenda culturel et citoyen du vignoble nantais.
      </p>
    </div>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return new Response(JSON.stringify({ error: "RESEND_API_KEY manquant" }), { status: 500 });
  const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://ephemeride.link").replace(/\/$/, "");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");

  const raw = await req.text();

  // Vérifie la signature standardwebhooks émise par Supabase (si le secret est
  // configuré). Sinon on continue (à configurer pour sécuriser le hook).
  let payload: HookPayload;
  try {
    if (hookSecret) {
      const wh = new Webhook(hookSecret.replace(/^v1,whsec_/, ""));
      payload = wh.verify(raw, {
        "webhook-id": req.headers.get("webhook-id") ?? "",
        "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
        "webhook-signature": req.headers.get("webhook-signature") ?? "",
      }) as HookPayload;
    } else {
      console.warn("[send-auth-email] SEND_EMAIL_HOOK_SECRET non configuré : signature non vérifiée.");
      payload = JSON.parse(raw) as HookPayload;
    }
  } catch (err) {
    console.error("[send-auth-email] signature invalide :", err);
    return new Response(JSON.stringify({ error: "signature invalide" }), { status: 401 });
  }

  const { user, email_data } = payload;
  const { token_hash, email_action_type, redirect_to, site_url } = email_data;

  // Lien de vérification : endpoint natif Supabase, qui redirige ensuite vers
  // `redirect_to` après confirmation.
  const redirect = redirect_to || site_url || SITE_URL;
  const verifyUrl =
    `${SUPABASE_URL}/auth/v1/verify?token=${encodeURIComponent(token_hash)}` +
    `&type=${encodeURIComponent(email_action_type)}&redirect_to=${encodeURIComponent(redirect)}`;

  const { subject, heading, intro, cta } = copyFor(email_action_type);
  const html = buildHtml({
    heading,
    intro,
    cta,
    url: verifyUrl,
    logo: `${SITE_URL}/images/ephemeride-logo-lite.png`,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: user.email, subject, html }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("[send-auth-email] échec Resend :", res.status, detail);
    return new Response(JSON.stringify({ error: "échec de l'envoi" }), { status: 500 });
  }

  return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
});
