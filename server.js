import path from "node:path";
import express from "express";
import { rootDir } from "./lib/paths.js";

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(rootDir, "public")));

app.listen(port, () => {
  console.log(`VEX IQ Level Up Match Toolkit running at http://localhost:${port}`);
});
