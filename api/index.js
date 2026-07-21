let app = null;
let loadError = null;

export default async function handler(req, res) {
  if (!app) {
    try {
      const bundlePath = "./server-bundle.cjs";
      const serverModule = await import(bundlePath);
      app = serverModule.default || serverModule;
    } catch (err) {
      loadError = {
        message: err.message,
        stack: err.stack,
        code: err.code
      };
    }
  }

  if (loadError) {
    return res.status(500).json({
      error: "Failed to load backend server bundle",
      details: loadError
    });
  }

  return app(req, res);
}
