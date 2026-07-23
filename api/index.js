let app = null;

export default async function handler(req, res) {
  if (!app) {
    try {
      const bundlePath = "./server-bundle.cjs";
      const serverModule = await import(bundlePath);
      let rawApp = serverModule.default || serverModule;
      if (rawApp && typeof rawApp === "object" && typeof rawApp.default === "function") {
        rawApp = rawApp.default;
      }
      if (typeof rawApp !== "function" && typeof serverModule === "function") {
        rawApp = serverModule;
      }
      app = rawApp;
    } catch (err) {
      console.error("[Vercel Handler Error] Failed to load backend server bundle:", err);
      return res.status(500).json({
        error: "Failed to load backend server bundle",
        message: err.message || String(err),
        stack: err.stack,
        code: err.code || "BUNDLE_LOAD_ERROR"
      });
    }
  }

  try {
    return app(req, res);
  } catch (err) {
    console.error("[Vercel Execution Error] Error serving API request:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: err.message || String(err)
    });
  }
}

