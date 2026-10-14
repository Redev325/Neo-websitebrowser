# Neo Browser

Neo Browser officially built in using NEO search™ you can now search up about anything in the neo browser (coulldn't use duckduck go or microsoft bing so i resorted to my own browser)
enjoy playing games watching youtube or whatever might comfort you using the new browser The games section will be next to come.

Neo Browser's frontend is static. Its proxy backend is designed for **Bunny.net Edge Scripting**, so it does not depend on Vercel, Railway, Render, Netlify, or Cloudflare.

## Frontend and Bunny proxy setup

1. GitHub Pages can serve the existing static frontend at `neosite.devs.surf`, but it cannot execute `/api/proxy` itself.
2. In Bunny.net, create a **Standalone Edge Script** and use `bunny/neo-proxy.ts` as its source.
3. Add a script variable named `ALLOWED_PROXY_HOSTS` containing only hostnames you are authorized and permitted to access, separated by commas. Leave the list small; redirect targets must also be included.
4. Deploy the script and copy the Default Hostname that Bunny provides.
5. Put that hostname in `bunny-proxy-config.js` as `window.NEO_PROXY_ORIGIN = "https://YOUR-BUNNY-SCRIPT-HOSTNAME";` without a trailing slash.
6. Commit the config change and refresh the frontend. Test first with a permitted site you control or a simple public test page.

The proxy is intentionally allow-list based. Do not use it to bypass school/network filtering, authentication, paywalls, or a site's access controls. Static hosts alone cannot run the proxy; the Bunny Edge Script must be deployed and reachable before external-site navigation will work.

## Cursor

The browser injects a Neo cursor/flare into proxied HTML so the visual cursor continues inside the Browser frame. The parent cursor is hidden while the pointer is over the frame.

## Notes

Some complex websites and games may still not work because they can use WebSockets, service workers, custom networking, restrictive security policies, or APIs that need additional proxy-aware handling.


## Search

Typing normal words in the Neo Browser search bar uses the browser's built-in search flow. Direct website URLs continue to use the proxy. The proxy also injects a same-origin cursor bridge into proxied HTML so the Neo cursor can remain visible while the pointer is inside the iframe.

## Performance

Browser proxy routing is configured in `bunny-proxy-config.js`. Proxy responses use `no-store` so dynamic site content is not cached incorrectly.

## Text Randomizer
List of text:
"Insert text" "I see you" "Study more" "Games and more" "Martin is gay" "Hello" "Why are you here" "Is this website goated" "Please press esc refresh and power to go to the movies tab (please don't do it)" "Please press Ctrl shift refresh to go to the games tab" "Please press Ctrl shift and q 2 times to get secret games" "Made with hopes and dreams" "Ok" "I know your IP address" "wsp" "Please never enter this website again" "This is a dream and you are hallucinating being here" "Insert funny joke" "Next neo update is in 2099" "Welcome ig" "We have been notified to ban you from this website please do not come back" "I know what you did" "Ouu Shi" "Hi thanks for seeing this website with a lot of games" "you are not supposed to be here" "Error 463: failed to parse packaging" "Error 436: If you see this error your data has been breached and your information is public" "Please dont take any of these jokes to seriously" "I know where you live" "Ip address found!:198.125.87.210" "if you see this congratulations you have found the most rarest text insert ever" "OOPS if you happen to see this text Were sorry!" "Send yams" "this text is from 2026" "Wsp" "Please exit this website immediately as your account has been compromised." "Please-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exit" "Um I cant type anything??????" "Please help me code this website" "I know what you're doing right now"

Keep in mind if you want to remove this fork it and remove it manually or disable the setting in neo website
