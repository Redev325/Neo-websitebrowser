# Neo Browser
<img width="2000" height="2000" alt="2026_09_16_0yg_Kleki (1)" src="https://github.com/user-attachments/assets/387f6d4b-a4d7-4998-b675-57bd4098a91f" />


Neo Browser officially built in using NEO search™ you can now search up about anything in the neo browser (coulldn't use duckduck go or microsoft bing so i resorted to my own browser)
enjoy playing games watching youtube or whatever might comfort you using the new browser The games section will be next to come.

Neo Browser is a static web UI with a proxy backend. The repository now supports **both Vercel and Railway** without changing the Browser frontend.

## Deploy on Vercel

1. Put the project in a GitHub repository.
2. Import that repository into Vercel.
3. Deploy the project root containing `index.html`, `assets/`, `static/`, `api/proxy.js`, and `vercel.json`.
4. Vercel runs `api/proxy.js` and `api/search.js` as serverless functions.
5. The Browser page uses `/api/proxy?url=...` automatically.

## Deploy on Railway

Railway runs the same repository as a normal Node server.

1. Create a new Railway project.
2. Choose **Deploy from GitHub repo**.
3. Select `Redev325/Neo-websitebrowser`.
4. Railway detects `package.json` and runs `npm start`.
5. Open the generated Railway public domain.

`server.js` serves the static frontend and routes `/api/proxy` and `/api/search` to the existing handlers. Railway supplies the `PORT` environment variable automatically, and the server listens on `0.0.0.0`.

You do **not** need to change the Browser's frontend URL when using Railway because the frontend and proxy are served by the same Railway service.

## GitHub Pages

GitHub Pages can host the static frontend, but it cannot execute the proxy backend. For the proxy to work, use Vercel, Railway, or another backend that can run the API.

## Public use

The proxy is intended for normal web fetching. It blocks local/private network targets and checks redirect destinations. It does not bypass CAPTCHAs, authentication, paywalls, or other access controls.

## Cursor

The browser injects a Neo cursor/flare into proxied HTML so the visual cursor continues inside the Browser frame. The parent cursor is hidden while the pointer is over the frame.

## Notes

Some complex websites and games may still not work because they can use WebSockets, service workers, custom networking, restrictive security policies, or APIs that need additional proxy-aware handling.

## Search

Typing normal words in the Neo Browser search bar uses the browser's built-in search flow. Direct website URLs continue to use the proxy. The proxy also injects a same-origin cursor bridge into proxied HTML so the Neo cursor can remain visible while the pointer is inside the iframe.

## Performance

Built assets are cacheable for one year on Vercel, browser logo assets use WebP, duplicate font loading was removed, and the Base44 editor badge script is not loaded.
