
function sleep(ms) {
  return new Promise((resolve) => setTimeout(() => resolve(), ms));
}

const redirect = 'manual';
const ALLOWED_ORIGINS = ["http://localhost:9990", "https://replayweb.page"];


addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});


async function handleRequest(request) {
  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }

  const requestPath = request.url.split(request.headers.get("host"), 2)[1];

  if (requestPath.startsWith("/g/")) {
    return await handleGDrive(requestPath.slice("/g/".length), request);  
  }

  if (requestPath.startsWith("/c/")) {
    return await handleCORSCheck(requestPath.slice("/c/".length), request);  
  }

  return json({"error": "wrong path"}, request);
}


// CORS check
// ===========================================================================
async function handleCORSCheck(url, request) {

  const origin = request.headers.get("Origin") || "https://example.com";

  const headers = new Headers();
  headers.set("Origin", origin);

  try {
    const resp = await fetch(url, {headers, method: "HEAD"});
    if (resp.status != 200) {
      return json({"error": "invalid status: " + resp.status}, request);
    }

    const acao = resp.headers.get("Access-Control-Allow-Origin");
    const cors = (acao === origin || acao === "*");

    return json({size: Number(resp.headers.get("content-length")), cors}, request);

  } catch (e) {
    return json({"error": e.toString()}, request);
  }
}



// GDrive
// ===========================================================================
async function handleGDrive(fileId, request) {
  // intial request
  let reqUrl = `https://drive.google.com/u/2/uc?id=${fileId}&export=download`;

  let resp = await fetch(reqUrl, {redirect});

  let count = 0;

  while (count++ < 3) {
    if (!resp) {
      return json(null, request);
    }

    //console.log(resp.status, Object.fromEntries(resp.headers.entries()));

    result = await getUrlFromRedir(resp, request);
    if (result) {
      return result;
    }

    resp = await handleConfirm(resp, reqUrl);
  }

  return json(null, request);
}

async function getUrlFromRedir(resp, request) {
  if (resp.status === 302) {
    const loc = resp.headers.get("Location");
    if (loc.startsWith("https://accounts.google.com/ServiceLogin")) {
      return json({auth: true}, request);
    }

    if (loc.indexOf("googleusercontent.com") < 0) {
      return null;
    }

    let test = true;
    let name = null;
    let size = null;
    const url = loc;

    if (test) {
      const cf = {"cacheTtl": "0"}

      //const abort = new AbortController();
      //const signal = abort.signal;
      const resp2 = await fetch(loc, {headers: {"Range": "bytes=0-", "Accept-Encoding": "identity"}, cf})
      //abort.abort();

      const disp = resp2.headers.get("content-disposition");

      if (disp) {
        const m = disp.match(/filename="(.*)"/);
        name = m[1];
      }

      size = resp2.headers.get("content-length");
      if (size == null) {
        let range = resp2.headers.get("content-range");
        range = range.split("/");
        if (range.length == 2) {
          size = range[1];
        }
      }
      size = Number(size || 0);
      console.log(resp2.status, Object.fromEntries(resp2.headers.entries()));
    }

    return json({url, name, size}, request);
  }
}

function handleConfirm(resp, reqUrl) {
  if (resp.status !== 200) {
    return;
  }
  
  const cookies = resp.headers.get("set-cookie");

  if (!cookies) {
    return;
  }

  const m = cookies.match(/(download_[^=]+)=([^;]+)/);
  if (!m) {
    return;
  }

  const newUrl = reqUrl + '&confirm=' + m[2];

  const headers = new Headers();
  headers.set("Cookie", m[0]);

  return fetch(newUrl, {headers, redirect});
}


// ===========================================================================
function json(data, request) {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", request.headers.get("Origin"));
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Content-Type", "application/json");

  return new Response(data ? JSON.stringify(data) : "{}", {status: 200, headers});
}


// ===========================================================================
function handleOptions(request) {

  const origin = request.headers.get('Origin');
  if (ALLOWED_ORIGINS.length && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(null);
  }

  // Make sure the necesssary headers are present
  // for this to be a valid pre-flight request
  if (
    request.headers.get('Origin') !== null &&
    request.headers.get('Access-Control-Request-Method') !== null &&
    request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS pre-flight request.
    // If you want to check the requested method + headers
    // you can do that here.
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Method": request.headers.get('Access-Control-Request-Method'),
        "Access-Control-Allow-Headers": request.headers.get('Access-Control-Request-Headers'),
        "Access-Control-Allow-Origin": request.headers.get("Origin"),
        "Access-Control-Allow-Credentials": "true"
      }
    });
  } else {
    // Handle standard OPTIONS request.
    // If you want to allow other HTTP Methods, you can do that here.
    return new Response(null, {
      headers: {
        Allow: 'GET, HEAD, POST, OPTIONS',
      },
    })
  }
}



