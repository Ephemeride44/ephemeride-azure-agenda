import { assertEquals } from "jsr:@std/assert@1";
import {
  bareAddress,
  buildForwardEmail,
  buildFrom,
  parseForwardAddresses,
  selectAttachments,
  senderName,
} from "./forward.ts";

Deno.test("parseForwardAddresses : sépare, trim, ignore les vides", () => {
  assertEquals(parseForwardAddresses("a@x.com, b@y.com ,, c@z.com"), [
    "a@x.com",
    "b@y.com",
    "c@z.com",
  ]);
  assertEquals(parseForwardAddresses(undefined), []);
  assertEquals(parseForwardAddresses(""), []);
});

Deno.test("bareAddress : extrait l'adresse e-mail", () => {
  assertEquals(bareAddress("Jean Dupont <jean@x.com>"), "jean@x.com");
  assertEquals(bareAddress("jean@x.com"), "jean@x.com");
});

Deno.test("senderName : nom d'affichage, sinon adresse", () => {
  assertEquals(senderName("Jean Dupont <jean@x.com>"), "Jean Dupont");
  assertEquals(senderName('"Jean Dupont" <jean@x.com>'), "Jean Dupont");
  assertEquals(senderName("jean@x.com"), "jean@x.com");
});

Deno.test("buildFrom : nom d'origine + domaine vérifié", () => {
  assertEquals(
    buildFrom("Éphéméride <bonjour@ephemeride.link>", "Jean Dupont <jean@x.com>"),
    "Jean Dupont (via Éphéméride) <bonjour@ephemeride.link>",
  );
});

Deno.test("selectAttachments : ignore inline et hors budget", () => {
  const metas = [
    { id: "1", filename: "inline.png", content_type: "image/png", content_disposition: "inline", size: 10 },
    { id: "2", filename: "doc.pdf", content_type: "application/pdf", content_disposition: "attachment", size: 100 },
    { id: "3", filename: "big.zip", content_type: "application/zip", content_disposition: "attachment", size: 1000 },
  ];
  const { keep, skipped } = selectAttachments(metas, 500);
  assertEquals(keep.map((a) => a.filename), ["doc.pdf"]);
  assertEquals(skipped, ["big.zip"]);
});

Deno.test("buildForwardEmail : compose from/to/reply_to/subject + bandeau", () => {
  const out = buildForwardEmail({
    received: {
      id: "e1",
      from: "Jean Dupont <jean@x.com>",
      to: ["contact@ephemeride.link"],
      subject: "Bonjour",
      html: "<p>Salut</p>",
      text: "Salut",
    },
    forwardTo: ["leny.bernard@gmail.com"],
    resendFrom: "Éphéméride <bonjour@ephemeride.link>",
    attachments: [{ filename: "doc.pdf", content: "QUJD", content_type: "application/pdf" }],
    skippedAttachments: [],
  });
  assertEquals(out.from, "Jean Dupont (via Éphéméride) <bonjour@ephemeride.link>");
  assertEquals(out.to, ["leny.bernard@gmail.com"]);
  assertEquals(out.reply_to, "jean@x.com");
  assertEquals(out.subject, "Bonjour");
  assertEquals(out.attachments?.length, 1);
  assertEquals(out.html?.includes("Redirigé via Éphéméride"), true);
  assertEquals(out.html?.includes("<p>Salut</p>"), true);
  assertEquals(out.text?.includes("Salut"), true);
});

Deno.test("buildForwardEmail : échappe le HTML injecté dans le bandeau", () => {
  const out = buildForwardEmail({
    received: {
      id: "e3",
      from: "<script>@x.com",
      to: ["contact@ephemeride.link"],
      subject: "XSS",
      html: "<p>Salut</p>",
    },
    forwardTo: ["leny.bernard@gmail.com"],
    resendFrom: "Éphéméride <bonjour@ephemeride.link>",
    attachments: [],
    skippedAttachments: ["<img src=x>.zip"],
  });
  // Le markup injecté via le From d'origine ne doit pas apparaître littéralement.
  assertEquals(out.html?.includes("<script>"), false);
  assertEquals(out.html?.includes("&lt;script&gt;"), true);
  // Le nom de fichier skipped est échappé dans le skippedLine.
  assertEquals(out.html?.includes("<img src=x>"), false);
  assertEquals(out.html?.includes("&lt;img src=x&gt;"), true);
  // Le corps HTML d'origine reste transmis tel quel.
  assertEquals(out.html?.includes("<p>Salut</p>"), true);
});

Deno.test("buildForwardEmail : corps minimal si ni html ni text", () => {
  const out = buildForwardEmail({
    received: { id: "e2", from: "jean@x.com", to: ["c@ephemeride.link"], subject: "Vide" },
    forwardTo: ["leny.bernard@gmail.com"],
    resendFrom: "Éphéméride <bonjour@ephemeride.link>",
    attachments: [],
    skippedAttachments: ["gros.zip"],
  });
  assertEquals(out.html, undefined);
  assertEquals(out.text?.includes("(message sans contenu)"), true);
  assertEquals(out.text?.includes("gros.zip"), true);
  assertEquals(out.attachments, undefined);
});
