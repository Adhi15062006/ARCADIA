let app: any = null;
let importError: any = null;

async function loadApp() {
  if (app) return app;
  try {
    const serverModule = await import("../dist/server.cjs");
    app = serverModule.default || serverModule;
    return app;
  } catch (err: any) {
    importError = {
      message: err.message,
      stack: err.stack,
      code: err.code
    };
    console.error("Failed to load server bundle:", err);
    throw err;
  }
}

export default async function handler(req: any, res: any) {
  try {
    const resolvedApp = await loadApp();
    return resolvedApp(req, res);
  } catch (err: any) {
    res.status(500).json({
      error: "Vercel serverless entrypoint failed to import server bundle",
      details: importError || { message: err.message, stack: err.stack }
    });
  }
}
