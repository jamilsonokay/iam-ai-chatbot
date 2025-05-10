"use client";

import cx from "classnames";
import { format, isWithinInterval } from "date-fns";
import { useEffect, useState } from "react";
import { getCoordinates } from "@/lib/utils";

interface WeatherProps {
  location?: string;
}

interface WeatherAtLocation {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: {
    time: string;
    interval: string;
    temperature_2m: string;
  };
  current: {
    time: string;
    interval: number;
    temperature_2m: number;
  };
  hourly_units: {
    time: string;
    temperature_2m: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
  };
  daily_units: {
    time: string;
    sunrise: string;
    sunset: string;
  };
  daily: {
    time: string[];
    sunrise: string[];
    sunset: string[];
  };
}

function n(num: number): number {
  return Math.ceil(num);
}

export async function getWeather(location: string) {
  try {
    // Converter nome do local para coordenadas
    const { lat, lng } = await getCoordinates(location);
    
    // Buscar dados meteorológicos
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
    );
    
    return await response.json();
  } catch (error) {
    console.error('Weather fetch error:', error);
    throw new Error('Erro ao buscar dados meteorológicos');
  }
}

export function Weather({ location }: WeatherProps) {
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Buscar dados da API
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (location) {
          // Se receber um local por prop
          const coords = await getCoordinates(location);
          setCoordinates(coords);
        } else {
          // Se não, usar geolocalização do navegador
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          setCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        }
      } catch (error) {
        console.error('Error getting coordinates:', error);
      }
    };

    fetchData();
  }, [location]);

  // Configurar responsividade
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (loading) return <div className="p-4 text-blue-50">Carregando...</div>;
  if (error) return <div className="p-4 text-red-500">Erro: {error}</div>;
  if (!weatherData) return null;

  // Lógica para processar dados
  const currentHigh = Math.max(...weatherData.hourly.temperature_2m.slice(0, 24));
  const currentLow = Math.min(...weatherData.hourly.temperature_2m.slice(0, 24));

  const isDay = isWithinInterval(new Date(weatherData.current.time), {
    start: new Date(weatherData.daily.sunrise[0]),
    end: new Date(weatherData.daily.sunset[0]),
  });

  const hoursToShow = isMobile ? 5 : 6;
  const currentTimeIndex = weatherData.hourly.time.findIndex(
    (time) => new Date(time) >= new Date(weatherData.current.time)
  );

  const displayTimes = weatherData.hourly.time.slice(
    currentTimeIndex,
    currentTimeIndex + hoursToShow
  );
  const displayTemperatures = weatherData.hourly.temperature_2m.slice(
    currentTimeIndex,
    currentTimeIndex + hoursToShow
  );

  return (
    <div
      className={cx(
        "flex flex-col gap-4 rounded-2xl p-4",
        {
          "bg-blue-400": isDay,
          "bg-indigo-900": !isDay,
        }
      )}
    >
      {/* ... (mesmo JSX do componente original) */}
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-row gap-2 items-center">
          <div
            className={cx(
              "size-10 rounded-full",
              {
                "bg-yellow-300": isDay,
                "bg-indigo-100": !isDay,
              }
            )}
          />
          <div className="text-4xl font-medium text-blue-50">
            {n(weatherData.current.temperature_2m)}
            {weatherData.current_units.temperature_2m}
          </div>
        </div>

        <div className="text-blue-50">{`H:${n(currentHigh)}° L:${n(currentLow)}°`}</div>
      </div>

      <div className="flex flex-row justify-between">
        {displayTimes.map((time, index) => (
          <div key={time} className="flex flex-col items-center gap-1">
            <div className="text-blue-100 text-xs">
              {format(new Date(time), "ha")}
            </div>
            <div
              className={cx(
                "size-6 rounded-full",
                {
                  "bg-yellow-300": isDay,
                  "bg-indigo-200": !isDay,
                }
              )}
            />
            <div className="text-blue-50 text-sm">
              {n(displayTemperatures[index])}
              {weatherData.hourly_units.temperature_2m}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
