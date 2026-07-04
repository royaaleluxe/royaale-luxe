import { spawnSync } from "node:child_process";

const env = { ...process.env };

if (
  env.SITE_ROLE === "admin" ||
  env.NEXT_PUBLIC_SITE_MODE === "admin" ||
  process.argv.includes("--admin")
) {
  env.NEXT_PUBLIC_SITE_MODE = "admin";
  console.log("Building admin site (NEXT_PUBLIC_SITE_MODE=admin)");
} else {
  console.log("Building storefront site");
}

const result = spawnSync("npx", ["next", "build"], {
  stdio: "inherit",
  env,
  shell: true,
});

process.exit(result.status ?? 1);
