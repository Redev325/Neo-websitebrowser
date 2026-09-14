# Neo Browser

Neo Browser is a static web UI with a Vercel serverless proxy.

## Deploy on Vercel

1. Put the project in a GitHub repository.
2. Import that repository into Vercel.
3. Deploy it with the project root containing:
   - `index.html`
   - `assets/`
   - `static/`
   - `api/proxy.js`
   - `vercel.json`
4. The Browser page uses `/api/proxy?url=...` automatically.

## GitHub Pages

GitHub Pages can host the static frontend, but it cannot execute
`api/proxy.js`. For the proxy to work, deploy the same repository on Vercel
(or another serverless backend) and keep the frontend pointed at that backend.

## Public use

The proxy is intended for normal web fetching. It blocks local/private
network targets and checks redirect destinations. It does not bypass
CAPTCHAs, authentication, paywalls, or other access controls.

## Cursor

The browser injects a Neo cursor/flare into proxied HTML so the visual cursor continues inside the Browser frame. The parent cursor is hidden while the pointer is over the frame.

## Notes

Some complex websites and games may still not work because they can use
WebSockets, service workers, custom networking, restrictive security
policies, or APIs that need additional proxy-aware handling.


## Search

Typing normal words in the Neo Browser search bar uses DuckDuckGo's
non-JavaScript HTML results interface, which DuckDuckGo documents as a
lightweight search option. Direct URLs continue to use the Vercel proxy.

The browser also injects a small same-origin cursor bridge into proxied HTML
so the Neo cursor can remain visible while the pointer is inside the iframe.

## Performance

Built assets are cacheable for one year on Vercel, browser logo assets use WebP, duplicate font loading was removed, and the Base44 editor badge script is not loaded.

## Search behavior

Search terms use Neo's built-in search hub. DuckDuckGo results are opened directly because some providers do not allow their result pages to be embedded or fetched reliably by server-side proxies. Direct website URLs continue to use the Vercel proxy.
