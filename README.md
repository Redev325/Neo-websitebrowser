# Neo Browser

Neo Browser officially built in using NEO search™ you can now search up about anything in the neo browser (coulldn't use duckduck go or microsoft bing so i resorted to my own browser)
enjoy playing games watching youtube or whatever might comfort you using the new browser The games section will be next to come.

Neo Browser can be served as a static website at your existing `.devs.surf` address. **Devs.Surf supplies the subdomain and DNS; it does not execute a server-side proxy by itself.** This static-only browser mode does not require Bunny Edge Scripting, Render, Railway, or another proxy backend.

## Static-only browser navigation

- Typing a website URL loads that address directly in Neo's browser frame.
- The browser toolbar includes an **Open current site in a new tab** control for websites that refuse to render inside an iframe.
- Sites that block framing, require special authentication, rely on unsupported browser features, or restrict network access may not work inside the frame. Opening a page separately may help with ordinary embed restrictions, but it does not bypass network or site access controls.
- This mode does not proxy or rewrite requests. Cross-origin browser security also prevents Neo from reading every site's internal URL and title, so the Back/Forward controls can only track navigation Neo itself observes.
- Plain text searches continue to open a normal browser tab.

To keep this version static-only, `bunny-proxy-config.js` is no longer loaded by the page. The older server-side proxy code in the repository is not used by this static mode.

## Cursor

The existing Neo cursor effects remain part of the parent website. Static-only mode does not inject cursor code into external pages.

## Notes

Some complex websites and games may still not work because they can use WebSockets, service workers, custom networking, restrictive security policies, or APIs that need additional proxy-aware handling.


## Search and navigation

Typing plain text in the browser address field opens a normal browser search tab. Explicit website URLs are loaded directly in the browser frame. Because there is no server-side proxy in static-only mode, pages that prohibit iframe embedding must be opened separately, and pages may navigate internally without Neo being able to read their cross-origin URL.

## Performance

This version sends requests directly from the user's browser to the requested website. It does not relay responses through Neo or cache other sites' responses.

## Text Randomizer
List of text:
"Insert text" "I see you" "Study more" "Games and more" "Martin is gay" "Hello" "Why are you here" "Is this website goated" "Please press esc refresh and power to go to the movies tab (please don't do it)" "Please press Ctrl shift refresh to go to the games tab" "Please press Ctrl shift and q 2 times to get secret games" "Made with hopes and dreams" "Ok" "I know your IP address" "wsp" "Please never enter this website again" "This is a dream and you are hallucinating being here" "Insert funny joke" "Next neo update is in 2099" "Welcome ig" "We have been notified to ban you from this website please do not come back" "I know what you did" "Ouu Shi" "Hi thanks for seeing this website with a lot of games" "you are not supposed to be here" "Error 463: failed to parse packaging" "Error 436: If you see this error your data has been breached and your information is public" "Please dont take any of these jokes to seriously" "I know where you live" "Ip address found!:198.125.87.210" "if you see this congratulations you have found the most rarest text insert ever" "OOPS if you happen to see this text Were sorry!" "Send yams" "this text is from 2026" "Wsp" "Please exit this website immediately as your account has been compromised." "Please-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exitPlease-exit" "Um I cant type anything??????" "Please help me code this website" "I know what you're doing right now"

Keep in mind if you want to remove this fork it and remove it manually or disable the setting in neo website
