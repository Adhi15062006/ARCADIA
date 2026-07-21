import appBundle from "../dist/server.cjs";

const app = appBundle.default || appBundle;

export default function handler(req, res) {
  return app(req, res);
}
