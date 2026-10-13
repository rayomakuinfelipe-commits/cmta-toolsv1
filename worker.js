
const UPSTREAM = "https://aviationweather.gov/api/data";
const CHILE_BBOX = "-56,-110,-17,-66";

export default {
  async fetch(request) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "GET") {
      return Response.json(
        { error: "Método no permitido" },
        { status: 405, headers: cors }
      );
    }

    const url = new URL(request.url);
    const type = (url.searchParams.get("type") || "metar").toLowerCase();

    if (!["metar", "taf"].includes(type)) {
      return Response.json(
        { error: "Usa type=metar o type=taf" },
        { status: 400, headers: cors }
      );
    }

    const ids = url.searchParams.get("ids");
    const upstream = new URL(`${UPSTREAM}/${type}`);
    upstream.searchParams.set("format", "json");

    if (ids) {
      const validIds = ids.toUpperCase().split(",").map(x => x.trim());

      if (validIds.length > 30 || validIds.some(x => !/^[A-Z]{4}$/.test(x))) {
        return Response.json(
          { error: "Usa hasta 30 códigos ICAO de cuatro letras" },
          { status: 400, headers: cors }
        );
      }

      upstream.searchParams.set("ids", validIds.join(","));
    } else {
      upstream.searchParams.set("bbox", CHILE_BBOX);
    }

    try {
      const response = await fetch(upstream.toString(), {
        headers: { "Accept": "application/json" }
      });

      if (!response.ok) {
        return Response.json(
          {
            error: "La fuente meteorológica respondió con un error",
            upstreamStatus: response.status
          },
          { status: response.status, headers: cors }
        );
      }

      const data = await response.json();

      return Response.json(
        {
          source: "NOAA Aviation Weather Center",
          type,
          fetchedAt: new Date().toISOString(),
          count: Array.isArray(data) ? data.length : 0,
          reports: data
        },
        {
          headers: {
            ...cors,
            "Cache-Control": "public, max-age=60"
          }
        }
      );
    } catch {
      return Response.json(
        { error: "No se pudo conectar con la fuente meteorológica" },
        { status: 502, headers: cors }
      );
    }
  }
};
