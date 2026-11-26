async function refreshAuthSession() {
  const res = await fetch("/api/auth/session");
  const data = await res.json();
  const container = document.getElementById("authArea");
  container.innerHTML = "";

  if (data.user) {
    const pill = document.createElement("span");
    pill.className = "oauth-pill";
    pill.textContent = `${data.user.name} (${data.user.provider})`;

    const logoutBtn = document.createElement("button");
    logoutBtn.type = "button";
    logoutBtn.className = "btn-secondary";
    logoutBtn.textContent = "Disconnect OAuth";
    logoutBtn.addEventListener("click", async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      await refreshAuthSession();
    });

    container.append(pill, logoutBtn);
    document.getElementById("tierLabel").textContent = "OAuth Authenticated (30 req / 60s)";
  } else {
    const localLink = document.createElement("a");
    localLink.href = "/auth/local";
    localLink.className = "btn-primary";
    localLink.textContent = "Connect OAuth 2.0";
    container.appendChild(localLink);

    if (data.githubConfigured) {
      const ghLink = document.createElement("a");
      ghLink.href = "/auth/github";
      ghLink.className = "btn-secondary";
      ghLink.textContent = "GitHub OAuth";
      container.appendChild(ghLink);
    }

    document.getElementById("tierLabel").textContent = "Guest (10 req / 60s)";
  }
}

async function fetchCityWeather(city) {
  const errorBox = document.getElementById("errorPanel");
  const results = document.getElementById("weatherResults");
  errorBox.hidden = true;

  const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
  const limit = response.headers.get("X-RateLimit-Limit");
  const remaining = response.headers.get("X-RateLimit-Remaining");
  const reqId = response.headers.get("X-Request-Id");

  if (limit !== null && remaining !== null) {
    document.getElementById("remainingLabel").textContent = `${remaining} / ${limit}`;
  }

  const data = await response.json();
  if (!response.ok) {
    errorBox.hidden = false;
    const err = data.error || {};
    errorBox.textContent = "";
    const prefix = document.createElement("strong");
    prefix.textContent = `HTTP ${response.status} (${err.code || "ERROR"}): `;
    const msg = document.createTextNode(`${err.message || "Request failed"} `);
    const trace = document.createElement("small");
    trace.textContent = `[reqId: ${reqId || "n/a"}]`;
    errorBox.append(prefix, msg, trace);
    return;
  }

  document.getElementById("sourceLabel").textContent = data.cached
    ? "Server TTL Cache HIT"
    : "Live Open-Meteo Fetch";

  document.getElementById("locName").textContent = data.location.name;
  document.getElementById("locSub").textContent = [
    data.location.region,
    data.location.country,
    `${data.location.latitude.toFixed(2)}, ${data.location.longitude.toFixed(2)}`
  ]
    .filter(Boolean)
    .join(" · ");

  document.getElementById("condBadge").textContent = data.current.condition;
  document.getElementById("tempVal").textContent = Math.round(data.current.temperatureC);
  document.getElementById("feelsLike").textContent = `${data.current.feelsLikeC} °C`;
  document.getElementById("humidity").textContent = `${data.current.humidityPct}%`;
  document.getElementById("windSpeed").textContent = `${data.current.windKmh} km/h`;
  document.getElementById("usAqi").textContent = data.airQuality
    ? `${data.airQuality.usAqi} (PM2.5: ${data.airQuality.pm25})`
    : "Unavailable";

  const list = document.getElementById("forecastList");
  list.innerHTML = "";
  data.dailyForecast.forEach((day) => {
    const row = document.createElement("div");
    row.className = "forecast-row";

    const dateEl = document.createElement("strong");
    dateEl.className = "tabular";
    dateEl.textContent = day.date;

    const condEl = document.createElement("span");
    condEl.textContent = `${day.condition} · Rain ${day.rainChance}%`;

    const rangeEl = document.createElement("strong");
    rangeEl.className = "tabular";
    rangeEl.textContent = `${Math.round(day.tempMin)}° / ${Math.round(day.tempMax)}°C`;

    row.append(dateEl, condEl, rangeEl);
    list.appendChild(row);
  });

  results.hidden = false;
}

document.addEventListener("DOMContentLoaded", async () => {
  await refreshAuthSession();

  document.getElementById("cityForm").addEventListener("submit", (event) => {
    event.preventDefault();
    fetchCityWeather(document.getElementById("cityInput").value);
  });

  document.querySelectorAll(".city-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.getElementById("cityInput").value = chip.dataset.city;
      fetchCityWeather(chip.dataset.city);
    });
  });

  document.getElementById("testNotFoundBtn").addEventListener("click", () => {
    fetchCityWeather("zzznonexistentcity999");
  });

  document.getElementById("testRateLimitBtn").addEventListener("click", async () => {
    for (let i = 0; i < 32; i += 1) {
      await fetchCityWeather("Coimbatore");
      if (!document.getElementById("errorPanel").hidden) {
        break;
      }
    }
  });

  fetchCityWeather("Coimbatore");
});
