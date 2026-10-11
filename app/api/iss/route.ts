const ISS_LOCATION_URL = "https://api.wheretheiss.at/v1/satellites/25544?units=kilometers";

export async function GET() {
  try {
    const response = await fetch(ISS_LOCATION_URL, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) {
      return Response.json({ error: "ISS position unavailable" }, { status: 502 });
    }

    const data: {
      name?: string;
      latitude?: number;
      longitude?: number;
      altitude?: number;
      velocity?: number;
      timestamp?: number;
      units?: string;
    } = await response.json();
    const { latitude, longitude, altitude, velocity, timestamp } = data;

    if (
      data.name !== "iss" || data.units !== "kilometers" ||
      typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      typeof altitude !== "number" || !Number.isFinite(altitude) || altitude <= 0 ||
      typeof velocity !== "number" || !Number.isFinite(velocity) || velocity <= 0 ||
      typeof timestamp !== "number" || !Number.isFinite(timestamp)
    ) {
      return Response.json({ error: "Invalid ISS position" }, { status: 502 });
    }

    return Response.json(
      { latitude, longitude, altitude, velocity, timestamp },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return Response.json({ error: "ISS position unavailable" }, { status: 503 });
  }
}
