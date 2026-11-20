import { useEffect, useState } from "react";
import "./App.css";

interface City {
  name: string;
  country?: string;
  latitude: number;
  longitude: number;
}

interface WeatherData {
  current: {
    temperature_2m: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

function App() {
  const [selectedCity, setSelectedCity] = useState("Lagos");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("Lagos");

  async function getWeather(cityName: string) {
    if (!cityName.trim()) {
      setError("Please enter a city name.");
      return;
    }

    setLoading(true);
    setError("");
    setWeather(null);

    try {
      let location: City | null = null;

      // Step 1: Search for the city using Open-Meteo.
      const geocodingUrl =
        `https://geocoding-api.open-meteo.com/v1/search` +
        `?name=${encodeURIComponent(cityName.trim())}&count=1`;

      const locationResponse = await fetch(geocodingUrl);

      if (!locationResponse.ok) {
        throw new Error("Unable to search for this city.");
      }

      const locationData = await locationResponse.json();

      if (locationData.results?.length > 0) {
        location = locationData.results[0];
      } else {
        // Step 2: Try Photon if Open-Meteo finds no city.
        const photonUrl =
          `https://photon.komoot.io/api/` +
          `?q=${encodeURIComponent(cityName.trim())}` +
          `&limit=1&layer=city`;

        const photonResponse = await fetch(photonUrl);

        if (photonResponse.ok) {
          const photonData = await photonResponse.json();
          const feature = photonData.features?.[0];

          if (feature) {
            location = {
              name: feature.properties.name,
              country: feature.properties.country,
              latitude: feature.geometry.coordinates[1],
              longitude: feature.geometry.coordinates[0],
            };
          }
        }
      }

      if (!location) {
        throw new Error(
          `City "${cityName.trim()}" was not found. Please check the spelling.`
        );
      }

      // Step 3: Fetch the current weather and four days of forecast data.
      const weatherUrl =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${location.latitude}` +
        `&longitude=${location.longitude}` +
        `&current=temperature_2m` +
        `&daily=temperature_2m_max,temperature_2m_min` +
        `&forecast_days=4&timezone=auto`;

      const weatherResponse = await fetch(weatherUrl);

      if (!weatherResponse.ok) {
        throw new Error("Unable to retrieve weather information.");
      }

      const weatherData: WeatherData = await weatherResponse.json();

      setWeather(weatherData);
      setSelectedCity(
        location.country
          ? `${location.name}, ${location.country}`
          : location.name
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // Load Lagos weather when the application first opens.
  useEffect(() => {
    getWeather("Lagos");
  }, []);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    getWeather(searchInput);
  }

  function formatDate(date: string) {
    return new Date(`${date}T12:00:00`).toLocaleDateString("en", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <main className="app">
      <header className="header">
        <div className="logo">☀️ WeatherNow</div>
        <p>Your daily weather forecast</p>
      </header>

      <section className="weather-container">
        <h1>Weather Forecast</h1>

        <p className="subtitle">
          Search for a city to check its current weather.
        </p>

        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Enter city name..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            aria-label="City name"
          />

          <button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {loading && (
          <p className="status-message">Loading weather information...</p>
        )}

        {error && (
          <div className="error-message" role="alert">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && weather && (
          <>
            <section className="current-weather">
              <p className="location">📍 {selectedCity}</p>

              <p className="current-label">Current Temperature</p>

              <h2>{Math.round(weather.current.temperature_2m)}°C</h2>

              <p className="description">
                Current temperature measured 2 metres above the ground.
              </p>
            </section>

            <section className="forecast-section">
              <h3>Forecast for the Next 3 Days</h3>

              <div className="forecast-grid">
                {weather.daily.time.slice(1, 4).map((date, index) => (
                  <article className="forecast-card" key={date}>
                    <p className="forecast-date">{formatDate(date)}</p>

                    <div className="weather-icon">🌤️</div>

                    <p className="temperature-range">
                      <span className="max-temperature">
                        {Math.round(
                          weather.daily.temperature_2m_max[index + 1]
                        )}
                        °C
                      </span>

                      <span className="min-temperature">
                        {Math.round(
                          weather.daily.temperature_2m_min[index + 1]
                        )}
                        °C
                      </span>
                    </p>

                    <p className="forecast-label">High / Low</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </section>

      <footer className="footer">
        <p>Weather information provided by Open-Meteo.</p>
      </footer>
    </main>
  );
}

export default App;