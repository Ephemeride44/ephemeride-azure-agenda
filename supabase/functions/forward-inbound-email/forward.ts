// Logique pure de recomposition d'un mail entrant Resend vers une redirection.
// Aucune dépendance réseau ici → testable unitairement avec `deno test`.

export interface InboundAttachmentMeta {
  id: string;
  filename: string;
  content_type: string;
  content_disposition: string; // "inline" | "attachment"
  content_id?: string;
  size?: number;
  download_url?: string;
}

export interface ReceivedEmail {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string[];
}

export interface OutboundAttachment {
  filename: string;
  content: string; // base64
  content_type?: string;
}

export interface ForwardEmail {
  from: string;
  to: string[];
  reply_to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: OutboundAttachment[];
}

// "a@x.com, b@y.com" -> ["a@x.com", "b@y.com"]
export function parseForwardAddresses(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
}

// "Jean Dupont <jean@x.com>" -> "jean@x.com" ; "jean@x.com" -> "jean@x.com"
export function bareAddress(addr: string): string {
  const m = addr.match(/<([^>]+)>/);
  return (m ? m[1] : addr).trim();
}

// "Jean Dupont <jean@x.com>" -> "Jean Dupont" ; "jean@x.com" -> "jean@x.com"
export function senderName(from: string): string {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<[^>]+>\s*$/);
  const name = m && m[1] ? m[1].trim() : "";
  return name || bareAddress(from);
}

// from d'envoi : nom de l'expéditeur d'origine, adresse de notre domaine vérifié.
export function buildFrom(resendFrom: string, originalFrom: string): string {
  return `${senderName(originalFrom)} (via Éphéméride) <${bareAddress(resendFrom)}>`;
}

// Garde les pièces jointes "réelles" (non inline) tant que le budget n'est pas
// dépassé ; renvoie aussi les noms ignorés pour les signaler dans le bandeau.
export function selectAttachments(
  metas: InboundAttachmentMeta[],
  maxTotalBytes: number,
): { keep: InboundAttachmentMeta[]; skipped: string[] } {
  const keep: InboundAttachmentMeta[] = [];
  const skipped: string[] = [];
  let total = 0;
  for (const a of metas) {
    if (a.content_disposition === "inline") continue; // déjà embarquée dans le HTML (data_uri)
    const size = a.size ?? 0;
    if (total + size > maxTotalBytes) {
      skipped.push(a.filename);
      continue;
    }
    total += size;
    keep.push(a);
  }
  return { keep, skipped };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function bannerHtml(originalFrom: string, originalTo: string[], skipped: string[]): string {
  const skippedLine = skipped.length
    ? `<br/>Pièces jointes trop volumineuses, non incluses : ${skipped.map(escapeHtml).join(", ")}.`
    : "";
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#64748b;border-left:3px solid #ED9873;padding:8px 12px;margin:0 0 16px;background:#faf3ec;">
  Redirigé via Éphéméride — de <strong>${escapeHtml(originalFrom)}</strong>, à l'origine vers ${originalTo.map(escapeHtml).join(", ")}.${skippedLine}
</div>`;
}

function bannerText(originalFrom: string, originalTo: string[], skipped: string[]): string {
  const skippedLine = skipped.length
    ? `\nPièces jointes trop volumineuses, non incluses : ${skipped.join(", ")}.`
    : "";
  return `Redirigé via Éphéméride — de ${originalFrom}, à l'origine vers ${originalTo.join(", ")}.${skippedLine}\n\n`;
}

export function buildForwardEmail(params: {
  received: ReceivedEmail;
  forwardTo: string[];
  resendFrom: string;
  attachments: OutboundAttachment[];
  skippedAttachments: string[];
}): ForwardEmail {
  const { received, forwardTo, resendFrom, attachments, skippedAttachments } = params;
  const to = received.to ?? [];
  const out: ForwardEmail = {
    from: buildFrom(resendFrom, received.from),
    to: forwardTo,
    reply_to: bareAddress(received.from),
    subject: received.subject ?? "(sans objet)",
  };
  if (received.html != null) {
    out.html = bannerHtml(received.from, to, skippedAttachments) + received.html;
  }
  if (received.text != null) {
    out.text = bannerText(received.from, to, skippedAttachments) + received.text;
  }
  // Si ni html ni text, garantir un corps minimal.
  if (out.html == null && out.text == null) {
    out.text = bannerText(received.from, to, skippedAttachments) + "(message sans contenu)";
  }
  if (attachments.length > 0) out.attachments = attachments;
  return out;
}
