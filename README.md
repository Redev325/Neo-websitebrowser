# Neo Browser

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

## Text Randomizer
List of text:
"Insert text" "I see you" "Study more" "Games and more" "Martin is gay" "Hello" "Why are you here" "Is this website goated" "Please press esc refresh and power to go to the movies tab (please don't do it)" "Please press Ctrl shift refresh to go to the games tab" "Please press Ctrl shift and q 2 times to get secret games" "Made with hopes and dreams" "Ok" "I know your IP address" "wsp" "Please never enter this website again" "This is a dream and you are hallucinating being here" "Insert funny joke" "Next neo update is in 2099" "Welcome ig" "We have been notified to ban you from this website please do not come back" "I know what you did" "Ouu Shi" "Hi thanks for seeing this website with a lot of games" "you are not supposed to be here" "Error 463: failed to parse packaging" "Error 436: If you see this error your data has been breached and your information is public" "Please dont take any of these jokes to seriously" "I know where you live" "Ip address found!:198.125.87.210" "if you see this congratulations you have found the most rarest text insert ever" "OOPS if you happen to see this text Were sorry!" "Send yams" "this text is from 2026" "Wsp" "Please exit this website immediately as your account has been compromised." "Please-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exit" "Um I cant type anything??????" "Please help me code this website" "I know what you're doing right now"

Keep in mind if you want to remove this fork it and remove it manually or disable the setting in neo website
