import { execSync } from "child_process";

try {
  const out = execSync("cd /home/team/shared/site && git status --short", { encoding: "utf-8" });
  console.log("GIT STATUS:", out);
} catch (e: any) {
  console.error("ERROR:", e.message);
}
