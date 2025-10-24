import { db } from "@/lib/db";
import { emailRecipients } from "@/lib/db/schema";
import { createId } from "@paralleldrive/cuid2";

const recipients = [
  { email: "koichi.miyazaki@furukawaelectric.com", name: "宮崎 浩一 / Koichi Miyazaki" },
  { email: "jun.nishina@furukawaelectric.com", name: "仁科 潤 / Jun Nishina" },
  { email: "kohei.hayashida@furukawaelectric.com", name: "林田 航平 / Kohei Hayashida" },
  { email: "masahiro.goto@furukawaelectric.com", name: "五藤 正広 / Masahiro Goto" },
  { email: "masahiro.imahashi@furukawaelectric.com", name: "今橋 理宏 / Masahiro Imahashi" },
  { email: "shun.inoue@furukawaelectric.com", name: "井ノ上 駿 / Shun Inoue" },
  { email: "sorata.iura@furukawaelectric.com", name: "井浦 空太 / Sorata Iura" },
  { email: "takumi.ushioda@furukawaelectric.com", name: "潮田 匠史 / Takumi Ushioda" },
  { email: "wakana.fukushima@furukawaelectric.com", name: "福嶋 若菜 / Wakana Fukushima" },
  { email: "yuya.tanabe@furukawaelectric.com", name: "田邊 祐弥 / Yuya Tanabe" },
  { email: "akira.miyagawa@furukawaelectric.com", name: "宮川 晶 / Akira Miyagawa" },
  { email: "fumiha.pf.aoki@furukawaelectric.com", name: "青木 文葉 / Fumiha Aoki" },
  { email: "kubo.mikio@furukawaelectric.com", name: "久保 幹郎 / Kubo Mikio" },
  { email: "miku.yamasaki@furukawaelectric.com", name: "山崎 美来 / Miku Yamasaki" },
  { email: "noriko.ekato.otani@furukawaelectric.com", name: "大谷 紀子 / Noriko Otani" },
  { email: "riho.panda.tanaka@furukawaelectric.com", name: "田中 利歩 / Riho Tanaka" },
  { email: "risa.honda@furukawaelectric.com", name: "本多 里彩 / Risa Honda" },
  { email: "sawako.ogawa@furukawaelectric.com", name: "小川 佐和子 / Sawako Ogawa" },
  { email: "shogo.kawabe@furukawaelectric.com", name: "川邊 翔吾 / Shogo Kawabe" },
  { email: "takayuki.ishii@furukawaelectric.com", name: "石井 孝幸 / Takayuki Ishii" },
  { email: "taketo.matsuyama@furukawaelectric.com", name: "松山 健人 / Taketo Matsuyama" },
  { email: "yuji.chem.ichikawa@furukawaelectric.com", name: "市川 祐司 / Yuji Ichikawa" },
  { email: "yuka.murata@furukawaelectric.com", name: "村田 佑香 / Yuka Murata" },
];

async function main() {
  const org = process.env.ALLOWED_GH_ORG;
  if (!org) {
    throw new Error("ALLOWED_GH_ORG is not set");
  }

  console.log(`Adding ${recipients.length} recipients for org: ${org}`);

  for (const recipient of recipients) {
    try {
      await db.insert(emailRecipients).values({
        id: createId(),
        org,
        email: recipient.email,
        name: recipient.name,
        active: true,
      });
      console.log(`✓ Added: ${recipient.name} <${recipient.email}>`);
    } catch (error) {
      console.error(`✗ Failed to add ${recipient.email}:`, error);
    }
  }

  console.log("\nDone!");
  process.exit(0);
}

main();
