// ABC Hospital PR System — backend entrypoint.
// All logic lives under ./src/server; this file just boots it so the existing
// scripts (npm run dev -> tsx server.ts) keep working unchanged.
import { createApp, startServer } from "./src/server/app";

startServer(createApp());
