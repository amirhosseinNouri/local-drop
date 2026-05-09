import os from "node:os";

const port = process.env.PORT ?? "3000";
const ifaces = os.networkInterfaces();
const addrs = [];
for (const list of Object.values(ifaces)) {
  if (!list) continue;
  for (const ni of list) {
    if (ni.family === "IPv4" && !ni.internal) addrs.push(ni.address);
  }
}

console.log("\nLocalDrop will be reachable at:");
console.log(`  http://localhost:${port}`);
for (const a of addrs) console.log(`  http://${a}:${port}`);
console.log("");
