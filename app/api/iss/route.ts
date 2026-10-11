const ISS_LOCATION_URL = "http://api.open-notify.org/iss-now.json";

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
      message?: string;
      iss_position?: { latitude?: string; longitude?: string };
    } = await response.json();
    const latitude = Number(data.iss_position?.latitude);
    const longitude = Number(data.iss_position?.longitude);

    if (
      data.message !== "success" ||
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    ) {
      return Response.json({ error: "Invalid ISS position" }, { status: 502 });
    }

    return Response.json(
      { latitude, longitude },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return Response.json({ error: "ISS position unavailable" }, { status: 503 });
  }
}
