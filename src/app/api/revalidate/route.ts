import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Revalidation ISR à la demande, déclenchée après une mutation admin
 * (création / édition / suppression d'événement, changement de réglages).
 *
 * Autorisation, au choix :
 *  - header `x-revalidate-secret` == REVALIDATE_SECRET (usage serveur / webhook) ;
 *  - header `Authorization: Bearer <access_token>` d'une session Supabase valide
 *    (cas du navigateur admin : seuls les espaces admin appellent cette route).
 *
 * Corps JSON optionnel : { slug?: string, department?: string }
 */
async function isAuthorized(request: NextRequest): Promise<boolean> {
  const secret = process.env.REVALIDATE_SECRET;
  const providedSecret = request.headers.get("x-revalidate-secret");
  if (secret && providedSecret && providedSecret === secret) return true;

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : null;
  if (token) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user) return true;
  }

  // Si aucun secret n'est configuré, on autorise (déploiement local / dev).
  if (!secret) return true;

  return false;
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ revalidated: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { slug?: string; department?: string } = {};
  try {
    body = await request.json();
  } catch {
    // pas de body
  }

  // La home et le sitemap reflètent toute mutation d'événement.
  revalidatePath("/");
  revalidatePath("/sitemap.xml");

  if (body.slug) revalidatePath(`/evenement/${body.slug}`);
  if (body.department) revalidatePath(`/departement/${body.department}`);

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
