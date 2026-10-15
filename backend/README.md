# Neo WebsiteBrowser proxy backend (v2)

This folder contains a standalone Node.js API that can be deployed separately from the existing Neo frontend. It does not replace or modify the browser UI.

## Deploy on Render

Create a **Web Service** from this repository and configure:

- **Branch:** `proxy-rebuild-render` (for testing only)
- **Root Directory:** `backend`
- **Runtime:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`

Add these environment variables in Render:

- `ALLOWED_PROXY_HOSTS` = `neosite.devs.surf`
- `FRONTEND_ORIGINS` = `https://neosite.devs.surf`
- `PROXY_PUBLIC_ORIGIN` = the public origin that users will call (initially the Render `.onrender.com` URL; if a Bunny Pull Zone is later placed in front, use that public Bunny hostname instead)

Only put hostnames you own or are authorized to test in `ALLOWED_PROXY_HOSTS`. Separate hostnames with commas; do not include `https://` or paths. This backend deliberately rejects all other target hosts, follows redirects only to allowed hosts, does not forward cookies or authorization headers, rejects private-network DNS results, and only supports GET/HEAD requests.

## Test after deployment

1. Open `/healthz`. It should return JSON with `"status":"ok"` and `"proxyConfigured":true`.
2. Test the permitted site using `/api/proxy?url=https%3A%2F%2Fneosite.devs.surf%2F`.
3. Do **not** update `bunny-proxy-config.js` until the service responds correctly. After testing, set `window.NEO_PROXY_ORIGIN` to the intended public proxy origin.

This is a restricted proxy for authorized testing, not an open proxy and not a way to bypass school/network filtering, login requirements, site access rules, or embedding restrictions. Source CSP and frame restrictions are preserved; sites that disallow embedding may not work inside the viewer.
