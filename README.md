## ReplayWeb.page CORS Helper

<img src="/assets/logo.svg" width="24" height="24">

This is an optional, tiny utility script that runs as a [Cloudflare Worker](https://workers.cloudflare.com/), and is designed to improve experience for
https://replayweb.page/ by getting around CORS restrictions when trying to load a web archive.

It's main function is to determine if a Google Drive file is public access, and if so, resolve the public
URL and pass back to [ReplayWeb.page](https://replayweb.page/) so that the file can be loaded directly.
It does not actually proxy any content.

Running this script is not required to use [ReplayWeb.page](https://replayweb.page/), without it,
ReplayWeb.page will assume all Google Drive URLs are not public.

### Google Drive Access CORS Check


API: -> `<script endpoint>/g/<google drive fileId>`
Returns:
  - `{auth: true}` - if file is not public
  - `{url, name, size}` - if file is public and can be downloaded directly.


### CORS size check

Another API is to simply check the `Content-Length`, which occasionally is not available due to CORS (if `Access-Control-Expose-Headers` is not set)

API: -> `<script endpoint>/c/<ur>`
Returns:
  - `{size, cors}` - size of file and if CORS access from origin domain is available
  - `{error}` - if an error occurs


### Usage

Copy the `wrangler.toml.sample` -> `wrangler.toml` and fill in credentials. Publish with `wrangler publish`
See [Cloudflare Worker API Docs](https://developers.cloudflare.com/workers/tooling/wrangler) for more details.


### LICENSE

This utility is licensed under the MIT License

