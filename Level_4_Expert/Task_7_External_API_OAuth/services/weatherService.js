const { NotFoundError, UpstreamApiError, ValidationError } = require("../middleware/errorHandler");

const WEATHER_LABELS = {
  0: "Clear Sky",
  1: "Mainly Clear",
  2: "Partly Cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing Rime Fog",
  51: "Light Drizzle",
  53: "Moderate Drizzle",
  55: "Dense Drizzle",
  61: "Light Rain",
  63: "Moderate Rain",
  65: "Heavy Rain",
  71: "Light Snow",
  80: "Rain Showers",
  95: "Thunderstorm"
};

const responseCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchJsonWithTimeout(url, serviceName) {
  let response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(6500),
      headers: { Accept: "application/json" }
    });
  } catch (err) {
    throw new UpstreamApiError(serviceName, err.name === "TimeoutError" ? "request timed out" : err.message);
  }

  if (!response.ok) {
    throw new UpstreamApiError(serviceName, `HTTP ${response.status}`);
  }
  return response.json();
}

async function getCitySnapshot(rawCity) {
  const city = String(rawCity || "").trim();
  if (city.length < 2 || city.length > 80) {
    throw new ValidationError("City query must be between 2 and 80 characters.");
  }

  const cacheKey = city.toLowerCase();
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.payload, cached: true };
  }

  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const geoData = await fetchJsonWithTimeout(geoUrl, "Open-Meteo Geocoding");

  if (!geoData.results || geoData.results.length === 0) {
    throw new NotFoundError(`No matching location found for "${city}".`);
  }

  const place = geoData.results[0];
  const lat = place.latitude;
  const lon = place.longitude;

  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    "&timezone=auto&forecast_days=5";

  const aqiUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
    "&current=us_aqi,pm2_5,pm10";

  const [forecastOutcome, aqiOutcome] = await Promise.allSettled([
    fetchJsonWithTimeout(forecastUrl, "Open-Meteo Forecast"),
    fetchJsonWithTimeout(aqiUrl, "Open-Meteo Air Quality")
  ]);

  if (forecastOutcome.status === "rejected") {
    throw forecastOutcome.reason;
  }

  const forecast = forecastOutcome.value;
  const aqi = aqiOutcome.status === "fulfilled" ? aqiOutcome.value : null;

  const current = forecast.current || {};
  const daily = forecast.daily || {};

  const days = (daily.time || []).map((date, idx) => ({
    date,
    condition: WEATHER_LABELS[daily.weather_code?.[idx]] || "Variable",
    tempMax: daily.temperature_2m_max?.[idx],
    tempMin: daily.temperature_2m_min?.[idx],
    rainChance: daily.precipitation_probability_max?.[idx] ?? 0
  }));

  const payload = {
    cached: false,
    fetchedAt: new Date().toISOString(),
    location: {
      name: place.name,
      region: place.admin1 || "",
      country: place.country || "",
      latitude: lat,
      longitude: lon,
      timezone: forecast.timezone || "UTC"
    },
    current: {
      temperatureC: current.temperature_2m,
      feelsLikeC: current.apparent_temperature,
      humidityPct: current.relative_humidity_2m,
      windKmh: current.wind_speed_10m,
      condition: WEATHER_LABELS[current.weather_code] || "Clear"
    },
    airQuality: aqi && aqi.current
      ? {
          usAqi: aqi.current.us_aqi,
          pm25: aqi.current.pm2_5,
          pm10: aqi.current.pm10
        }
      : null,
    dailyForecast: days
  };

  responseCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + CACHE_TTL_MS
  });

  return payload;
}

module.exports = {
  getCitySnapshot
};
