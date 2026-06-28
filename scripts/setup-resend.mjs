/**
 * Resend domain setup helper for Royaale Luxe.
 *
 * Usage:
 *   1. Add RESEND_API_KEY to .env.local (from https://resend.com/api-keys)
 *   2. npm run resend:setup          — add domain + print DNS records
 *   3. Add DNS records at your registrar, wait a few minutes
 *   4. npm run resend:verify         — trigger verification check
 *   5. npm run resend:test           — send a test order-style email
 */
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error("Missing .env.local — copy from .env.example first.");
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function printDnsTable(records) {
  console.log("\n┌─────────────────────────────────────────────────────────────────┐");
  console.log("│  Add these DNS records at your domain registrar                 │");
  console.log("└─────────────────────────────────────────────────────────────────┘\n");

  if (!records?.length) {
    console.log("  (No records returned — check https://resend.com/domains)\n");
    return;
  }

  for (const record of records) {
    const type = record.type || record.record_type || "?";
    const name = record.name || record.record || "—";
    const value = record.value || record.content || "—";
    const priority = record.priority != null ? ` (priority ${record.priority})` : "";
    const status = record.status ? ` [${record.status}]` : "";

    console.log(`  Type:     ${type}${priority}${status}`);
    console.log(`  Name/Host: ${name}`);
    console.log(`  Value:    ${value}`);
    console.log("");
  }

  console.log("  Tips:");
  console.log("  • Use Resend's copy buttons — values must match exactly");
  console.log("  • Records go on the subdomain Resend shows (usually send.yourdomain.com)");
  console.log("  • DNS can take 5–72 hours; usually ~15 minutes");
  console.log("  • Debug at https://dns.email\n");
}

async function findOrCreateDomain(resend, domainName) {
  const list = await resend.domains.list();
  if (list.error) throw new Error(list.error.message);

  const existing = list.data?.data?.find(
    (d) => d.name.toLowerCase() === domainName.toLowerCase()
  );
  if (existing) {
    console.log(`✓ Domain already in Resend: ${existing.name} (${existing.status})`);
    const detail = await resend.domains.get(existing.id);
    if (detail.error) throw new Error(detail.error.message);
    return detail.data;
  }

  console.log(`Adding domain to Resend: ${domainName} ...`);
  const created = await resend.domains.create({
    name: domainName,
    capabilities: { sending: "enabled", receiving: "disabled" },
  });
  if (created.error) throw new Error(created.error.message);

  console.log(`✓ Domain added (status: ${created.data.status})`);
  return created.data;
}

function ensureEnvComments(domain, fromEmail) {
  let content = readFileSync(envPath, "utf8");
  const updates = {
    RESEND_DOMAIN: domain,
    RESEND_FROM_EMAIL: fromEmail,
  };

  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    if (content.includes(`${key}=`)) {
      content = content.replace(new RegExp(`^#?\\s*${key}=.*$`, "m"), line);
    } else {
      content += `\n${line}`;
    }
  }

  if (!content.includes("RESEND_API_KEY=") || content.match(/^#\s*RESEND_API_KEY=/m)) {
    console.log("\n⚠ Add your API key to .env.local:");
    console.log("  RESEND_API_KEY=re_xxxxxxxx   ← from https://resend.com/api-keys\n");
  }

  writeFileSync(envPath, content.endsWith("\n") ? content : `${content}\n`);
  console.log(`✓ Updated .env.local (RESEND_DOMAIN, RESEND_FROM_EMAIL)`);
}

async function setup() {
  const env = loadEnv();
  const domain = env.RESEND_DOMAIN || "royaaleluxe.com";
  const fromEmail = env.RESEND_FROM_EMAIL || `Royaale Luxe <orders@${domain}>`;

  console.log("\n═══════════════════════════════════════");
  console.log("  Royaale Luxe — Resend Domain Setup");
  console.log("═══════════════════════════════════════\n");
  console.log(`  Domain:  ${domain}`);
  console.log(`  From:    ${fromEmail}\n`);

  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.log("No RESEND_API_KEY in .env.local yet.\n");
    console.log("Manual setup:");
    console.log("  1. Sign up at https://resend.com");
    console.log("  2. Domains → Add Domain → enter:", domain);
    console.log("  3. Copy DNS records into your registrar (Namecheap, GoDaddy, etc.)");
    console.log("  4. API Keys → Create → add to .env.local:");
    console.log("       RESEND_API_KEY=re_xxxxxxxx");
    console.log(`       RESEND_FROM_EMAIL=${fromEmail}`);
    console.log(`       RESEND_DOMAIN=${domain}`);
    console.log("  5. Run: npm run resend:setup\n");
    ensureEnvComments(domain, fromEmail);
    process.exit(0);
  }

  const resend = new Resend(apiKey);
  const domainData = await findOrCreateDomain(resend, domain);

  printDnsTable(domainData.records);
  ensureEnvComments(domain, fromEmail);

  console.log("Next steps:");
  console.log("  1. Add the DNS records above at your registrar");
  console.log("  2. Run: npm run resend:verify");
  console.log("  3. When verified, run: npm run resend:test you@email.com\n");
}

async function verify() {
  const env = loadEnv();
  const apiKey = env.RESEND_API_KEY?.trim();
  const domain = env.RESEND_DOMAIN || "royaaleluxe.com";

  if (!apiKey) {
    console.error("Add RESEND_API_KEY to .env.local first.");
    process.exit(1);
  }

  const resend = new Resend(apiKey);
  const list = await resend.domains.list();
  if (list.error) throw new Error(list.error.message);

  const match = list.data?.data?.find((d) => d.name.toLowerCase() === domain.toLowerCase());
  if (!match) {
    console.error(`Domain "${domain}" not found in Resend. Run: npm run resend:setup`);
    process.exit(1);
  }

  console.log(`Verifying ${match.name} ...`);
  const result = await resend.domains.verify(match.id);
  if (result.error) throw new Error(result.error.message);

  const detail = await resend.domains.get(match.id);
  if (detail.error) throw new Error(detail.error.message);

  console.log(`\nStatus: ${detail.data.status}`);
  if (detail.data.status === "verified") {
    console.log("✓ Domain verified — you can send from", env.RESEND_FROM_EMAIL || `orders@${domain}`);
  } else {
    console.log("⏳ Still pending — DNS may need more time. Re-run verify in a few minutes.");
    printDnsTable(detail.data.records);
  }
}

async function testSend() {
  const env = loadEnv();
  const apiKey = env.RESEND_API_KEY?.trim();
  const to = process.argv[3] || env.RESEND_TEST_TO;

  if (!apiKey) {
    console.error("Add RESEND_API_KEY to .env.local first.");
    process.exit(1);
  }
  if (!to) {
    console.error("Usage: npm run resend:test -- you@email.com");
    process.exit(1);
  }

  const domain = env.RESEND_DOMAIN || "royaaleluxe.com";
  const from = env.RESEND_FROM_EMAIL || `Royaale Luxe <orders@${domain}>`;

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: "Royaale Luxe — Resend test ✓",
    html: `<div style="font-family:Georgia,serif;background:#FFF0F5;padding:32px;">
      <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:24px;border:1px solid #FFD1DC;padding:32px;text-align:center;">
        <p style="font-size:28px;font-style:italic;color:#1A1A1A;margin:0;">Royaale Luxe</p>
        <p style="color:#6B7280;font-size:12px;letter-spacing:0.35em;text-transform:uppercase;margin:8px 0 24px;">Thee Royaale Way</p>
        <p style="color:#1A1A1A;font-size:16px;">Your Resend domain is working. Order confirmations and back-in-stock emails will send from <strong>${from}</strong>.</p>
      </div>
    </div>`,
  });

  if (error) {
    console.error("✗ Send failed:", error.message);
    if (error.message?.includes("domain")) {
      console.log("\nDomain may not be verified yet. Run: npm run resend:verify");
    }
    process.exit(1);
  }

  console.log(`✓ Test email sent to ${to} (id: ${data?.id})`);
}

const cmd = process.argv[2] || "setup";

try {
  if (cmd === "setup") await setup();
  else if (cmd === "verify") await verify();
  else if (cmd === "test") await testSend();
  else {
    console.error("Unknown command. Use: setup | verify | test");
    process.exit(1);
  }
} catch (err) {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
}
