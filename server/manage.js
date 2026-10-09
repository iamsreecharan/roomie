import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { createStore } from "./store.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(join(root, ".env"))) process.loadEnvFile(join(root, ".env"));
const [command, handle] = process.argv.slice(2);
if (!["promote", "demote"].includes(command) || !handle) {
  console.error("Usage: node server/manage.js promote|demote HANDLE");
  process.exitCode = 1;
} else {
  const store = createStore(
    process.env.DB_PATH ?? join(root, ".data", "roomverse.sqlite"),
  );
  try {
    const user = store.all("user").find((u) => u.handle === handle);
    if (!user)
      throw new Error(
        "Create this account in Roomverse before assigning an administrator role.",
      );
    if (
      command === "demote" &&
      user.role === "admin" &&
      store.all("user").filter((u) => u.role === "admin" && !u.demo).length <=
        1 &&
      !user.demo
    )
      throw new Error("Keep at least one personal administrator account.");
    user.role = command === "promote" ? "admin" : "user";
    if (command === "promote") {
      user.verified = true;
      user.verification = "VERIFIED";
    }
    store.put("user", user);
    console.log(
      `${handle} now has the ${user.role} role. Sign in again to refresh the interface.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    store.db.close();
  }
}
