import express from "express";
import { config } from "./config";
import fetchRouter from "./routes/fetch";
import metricsRouter from "./routes/metrics";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/fetch", fetchRouter);
app.use("/api/metrics", metricsRouter);

app.listen(config.port, () => {
  console.log(`PR Metrics API running on port ${config.port}`);
});
