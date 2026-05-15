import { safeExecute } from "../app/js/errors/userErrorService.js";
import { initializeWorkspace } from "../app/js/setup/workspaceManager.js";

initializeWorkspace("cakes");
const result = safeExecute("demo-broken-operation", () => {
  throw new Error("Simulated technical failure");
});
console.log(JSON.stringify(result, null, 2));
