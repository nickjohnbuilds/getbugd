# taplog

The getbugd tap-to-log app. Vite + React, deployed on Cloudflare Pages.

```
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
```

Demo mode (dev server only): open `http://localhost:5173/?demo` to use fake
tubs with a pretend login. Nothing touches the real database, and it isn't
included in `npm run build`. Close the tab to leave it.

Cloudflare Pages settings: root directory `taplog`, build command `npm run build`, output directory `dist`.
