import { initializeWorkspace } from "./workspaceManager.js";

const template = process.argv[2] || "empty";
const result = initializeWorkspace(template);
console.log(JSON.stringify(result, null, 2));
