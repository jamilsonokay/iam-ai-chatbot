import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { geminiProModel } from "@/ai";
import {
  generateReservationPrice,
  generateSampleFlightSearchResults,
  generateSampleFlightStatus,
  generateSampleSeatSelection,
} from "@/ai/actions";
import { auth } from "@/app/(auth)/auth";
import {
  createReservation,
  deleteChatById,
  getChatById,
  getReservationById,
  saveChat,
} from "@/db/queries";
import { generateUUID } from "@/lib/utils";

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } =
    await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = convertToCoreMessages(messages).filter(
    (message) => message.content.length > 0,
  );

  const result = await streamText({
    model: geminiProModel,
    system: `\n
        - you help users book flights!
        - always answer in the language the user is speaking
        - keep your responses limited to a sentence.
        - DO NOT output lists.
        - after every tool call, pretend you're showing the result to the user and keep your response limited to a phrase.
        - today's date is ${new Date().toLocaleDateString()}.
        - ask follow up questions to nudge user into the optimal flow
        - always ask for any details you don't know, like name of passenger, etc.'
        - C and D are aisle seats, A and F are window seats, B and E are middle seats
        - assume the most popular airports for the origin and destination
        - here's the optimal flow
          - search for flights
          - choose flight
          - select seats
          - create reservation (ask user whether to proceed with payment or change reservation)
          - authorize payment (requires user consent, wait for user to finish payment and let you know when done)
          - display boarding pass (DO NOT display boarding pass without verifying payment)
        '
      `,
    messages: coreMessages,
    tools: {
      getWeather: {
        description: "Get the current weather at a location",
        parameters: z.object({
          location: z.string().describe("The city name to get the weather for"),
        }),
        execute: async ({ location }) => {
          try {
            // Chave de API do OpenWeatherMap - você precisará registrar-se para obter uma chave gratuita
            // Registre-se em: https://home.openweathermap.org/users/sign_up
            const apiKey = process.env.OPENWEATHERMAP_API_KEY;
            
            if (!apiKey) {
              return { error: "Chave de API do OpenWeatherMap não configurada. Por favor, configure a variável de ambiente OPENWEATHERMAP_API_KEY." };
            }
            
            // Obter dados meteorológicos diretamente usando o nome da cidade
            const weatherResponse = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric&lang=pt_br`
            );
            
            if (!weatherResponse.ok) {
              if (weatherResponse.status === 404) {
                return { error: `Não foi possível encontrar a cidade ${location}. Por favor, verifique o nome e tente novamente.` };
              }
              throw new Error(`Erro na API: ${weatherResponse.status}`);
            }
            
            const currentWeatherData = await weatherResponse.json();
            
            // Obter previsão horária para as próximas horas
            const forecastResponse = await fetch(
              `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric&lang=pt_br`
            );
            
            if (!forecastResponse.ok) {
              throw new Error(`Erro na API de previsão: ${forecastResponse.status}`);
            }
            
            const forecastData = await forecastResponse.json();
            
            // Formatar os dados para corresponder à estrutura esperada pelo componente Weather
            const hourlyTimes = [];
            const hourlyTemps = [];
            
            // Extrair dados horários da previsão
            for (let i = 0; i < Math.min(24, forecastData.list.length); i++) {
              hourlyTimes.push(forecastData.list[i].dt_txt);
              hourlyTemps.push(forecastData.list[i].main.temp);
            }
            
            // Construir objeto no formato esperado pelo componente Weather
            const weatherData = {
              latitude: currentWeatherData.coord.lat,
              longitude: currentWeatherData.coord.lon,
              timezone: "auto",
              timezone_abbreviation: "GMT",
              current_units: {
                time: "iso8601",
                interval: "seconds",
                temperature_2m: "°C"
              },
              current: {
                time: new Date().toISOString(),
                interval: 900,
                temperature_2m: currentWeatherData.main.temp
              },
              hourly_units: {
                time: "iso8601",
                temperature_2m: "°C"
              },
              hourly: {
                time: hourlyTimes,
                temperature_2m: hourlyTemps
              },
              daily_units: {
                time: "iso8601",
                sunrise: "iso8601",
                sunset: "iso8601"
              },
              daily: {
                time: [new Date().toISOString().split('T')[0]],
                sunrise: [new Date(currentWeatherData.sys.sunrise * 1000).toISOString()],
                sunset: [new Date(currentWeatherData.sys.sunset * 1000).toISOString()]
              }
            };
            
            return weatherData;
          } catch (error) {
            console.error("Erro ao obter dados meteorológicos:", error);
            return { error: `Ocorreu um erro ao obter dados meteorológicos para ${location}. Por favor, tente novamente mais tarde.` };
          }
        },
      },
      displayFlightStatus: {
        description: "Display the status of a flight",
        parameters: z.object({
          flightNumber: z.string().describe("Flight number"),
          date: z.string().describe("Date of the flight"),
        }),
        execute: async ({ flightNumber, date }) => {
          const flightStatus = await generateSampleFlightStatus({
            flightNumber,
            date,
          });

          return flightStatus;
        },
      },
      searchFlights: {
        description: "Search for flights based on the given parameters",
        parameters: z.object({
          origin: z.string().describe("Origin airport or city"),
          destination: z.string().describe("Destination airport or city"),
        }),
        execute: async ({ origin, destination }) => {
          const results = await generateSampleFlightSearchResults({
            origin,
            destination,
          });

          return results;
        },
      },
      selectSeats: {
        description: "Select seats for a flight",
        parameters: z.object({
          flightNumber: z.string().describe("Flight number"),
        }),
        execute: async ({ flightNumber }) => {
          const seats = await generateSampleSeatSelection({ flightNumber });
          return seats;
        },
      },
      createReservation: {
        description: "Display pending reservation details",
        parameters: z.object({
          seats: z.string().array().describe("Array of selected seat numbers"),
          flightNumber: z.string().describe("Flight number"),
          departure: z.object({
            cityName: z.string().describe("Name of the departure city"),
            airportCode: z.string().describe("Code of the departure airport"),
            timestamp: z.string().describe("ISO 8601 date of departure"),
            gate: z.string().describe("Departure gate"),
            terminal: z.string().describe("Departure terminal"),
          }),
          arrival: z.object({
            cityName: z.string().describe("Name of the arrival city"),
            airportCode: z.string().describe("Code of the arrival airport"),
            timestamp: z.string().describe("ISO 8601 date of arrival"),
            gate: z.string().describe("Arrival gate"),
            terminal: z.string().describe("Arrival terminal"),
          }),
          passengerName: z.string().describe("Name of the passenger"),
        }),
        execute: async (props) => {
          const { totalPriceInUSD } = await generateReservationPrice(props);
          const session = await auth();

          const id = generateUUID();

          if (session && session.user && session.user.id) {
            await createReservation({
              id,
              userId: session.user.id,
              details: { ...props, totalPriceInUSD },
            });

            return { id, ...props, totalPriceInUSD };
          } else {
            return {
              error: "User is not signed in to perform this action!",
            };
          }
        },
      },
      authorizePayment: {
        description:
          "User will enter credentials to authorize payment, wait for user to repond when they are done",
        parameters: z.object({
          reservationId: z
            .string()
            .describe("Unique identifier for the reservation"),
        }),
        execute: async ({ reservationId }) => {
          return { reservationId };
        },
      },
      verifyPayment: {
        description: "Verify payment status",
        parameters: z.object({
          reservationId: z
            .string()
            .describe("Unique identifier for the reservation"),
        }),
        execute: async ({ reservationId }) => {
          const reservation = await getReservationById({ id: reservationId });

          if (reservation.hasCompletedPayment) {
            return { hasCompletedPayment: true };
          } else {
            return { hasCompletedPayment: false };
          }
        },
      },
      displayBoardingPass: {
        description: "Display a boarding pass",
        parameters: z.object({
          reservationId: z
            .string()
            .describe("Unique identifier for the reservation"),
          passengerName: z
            .string()
            .describe("Name of the passenger, in title case"),
          flightNumber: z.string().describe("Flight number"),
          seat: z.string().describe("Seat number"),
          departure: z.object({
            cityName: z.string().describe("Name of the departure city"),
            airportCode: z.string().describe("Code of the departure airport"),
            airportName: z.string().describe("Name of the departure airport"),
            timestamp: z.string().describe("ISO 8601 date of departure"),
            terminal: z.string().describe("Departure terminal"),
            gate: z.string().describe("Departure gate"),
          }),
          arrival: z.object({
            cityName: z.string().describe("Name of the arrival city"),
            airportCode: z.string().describe("Code of the arrival airport"),
            airportName: z.string().describe("Name of the arrival airport"),
            timestamp: z.string().describe("ISO 8601 date of arrival"),
            terminal: z.string().describe("Arrival terminal"),
            gate: z.string().describe("Arrival gate"),
          }),
        }),
        execute: async (boardingPass) => {
          return boardingPass;
        },
      },
    },
    onFinish: async ({ responseMessages }) => {
      if (session.user && session.user.id) {
        try {
          await saveChat({
            id,
            messages: [...coreMessages, ...responseMessages],
            userId: session.user.id,
          });
        } catch (error) {
          console.error("Failed to save chat");
        }
      }
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({});
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}