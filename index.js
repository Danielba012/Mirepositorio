const express = require("express");
const https = require("https");
const http = require("http");
const { URL } = require("url");

const app = express();
const PORT = process.env.PORT || 5000;

async function followRedirects(url, maxRedirects = 10) {
  let currentUrl = url;
  let redirectCount = 0;

  while (redirectCount < maxRedirects) {
    try {
      const finalUrl = await new Promise((resolve, reject) => {
        const parsedUrl = new URL(currentUrl);
        const client = parsedUrl.protocol === "https:" ? https : http;

        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0"
          },
          timeout: 5000
        };

        const req = client.request(options, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const redirectUrl = new URL(res.headers.location, currentUrl).href;
            resolve({ redirected: true, url: redirectUrl });
          } else {
            resolve({ redirected: false, url: currentUrl });
          }
        });

        req.on("error", reject);
        req.on("timeout", () => {
          req.destroy();
          reject(new Error("Request timeout"));
        });

        req.end();
      });

      if (!finalUrl.redirected) return currentUrl;
      currentUrl = finalUrl.url;
      redirectCount++;
    } catch (error) {
      throw error;
    }
  }

  throw new Error("Demasiados redirects");
}

app.get("/", async (req, res) => {
  const link = req.query.link;
  if (!link) return res.status(400).send("Falta el parámetro 'link'");

  try {
    new URL(link);
    const finalUrl = await followRedirects(link);
    return res.json({ finalUrl });
  } catch (error) {
    res.status(500).send("Error al resolver la URL: " + error.message);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

