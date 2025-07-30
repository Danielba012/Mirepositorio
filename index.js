const express = require("express");
const https = require("https");
const http = require("http");
const { URL } = require("url");

const app = express();
const PORT = process.env.PORT || 5000;

// Función para seguir redirects manualmente
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
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          },
          timeout: 5000
        };

        const req = client.request(options, (res) => {
          // Si es un redirect
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            // Resolver URL relativa si es necesaria
            const redirectUrl = new URL(res.headers.location, currentUrl).href;
            resolve({ redirected: true, url: redirectUrl });
          } else {
            // No hay más redirects
            resolve({ redirected: false, url: currentUrl });
          }
        });

        req.on("error", (err) => {
          reject(err);
        });

        req.on("timeout", () => {
          req.destroy();
          reject(new Error("Request timeout"));
        });

        req.end();
      });

      if (!finalUrl.redirected) {
        return currentUrl;
      }

      currentUrl = finalUrl.url;
      redirectCount++;
    } catch (error) {
      throw error;
    }
  }

  // Si llegamos aquí, hay demasiados redirects
  throw new Error("Demasiados redirects");
}

app.get("/", async (req, res) => {
  const link = req.query.link;

  if (!link) {
    return res.status(400).send("Falta el parámetro 'link'");
  }

  try {
    // Validar URL
    new URL(link);
    
    console.log(`Resolviendo URL: ${link}`);
    
    // Seguir redirects
    const finalUrl = await followRedirects(link);

    console.log(`URL final: ${finalUrl}`);
    return res.json({ finalUrl });
  } catch (error) {
    console.error("Error al resolver URL:", error.message);
    res.status(500).send("Error al resolver la URL: " + error.message);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`API funcionando correctamente`);
});
