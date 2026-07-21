let app = null;

export default async function handler(req, res) {
  if (!app) {
    const bundlePath = "./server-bundle.cjs";
    const serverModule = await import(bundlePath);
    app = serverModule.default || serverModule;
  }
  return app(req, res);
}
