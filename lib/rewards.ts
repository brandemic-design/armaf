export interface MarketReward {
  country: string;
  coordinates: string;
  rewardHint: string;
  dropDate?: string;
}

export const MARKET_REWARDS: Record<string, MarketReward> = {
  US: {
    country: "United States",
    coordinates: "40.7128° N, 74.0060° W",
    rewardHint: "The vault opens in the city that never sleeps.",
  },
  GB: {
    country: "United Kingdom",
    coordinates: "51.5074° N, 0.1278° W",
    rewardHint: "The mission reaches the banks of the Thames.",
  },
  AE: {
    country: "United Arab Emirates",
    coordinates: "25.2048° N, 55.2708° E",
    rewardHint: "The desert holds the final key.",
  },
  IN: {
    country: "India",
    coordinates: "19.0760° N, 72.8777° E",
    rewardHint: "The mission lands on the western coast.",
  },
  SA: {
    country: "Saudi Arabia",
    coordinates: "24.7136° N, 46.6753° E",
    rewardHint: "The vault awaits in the capital of the desert kingdom.",
  },
  BR: {
    country: "Brazil",
    coordinates: "23.5505° S, 46.6333° W",
    rewardHint: "The heist reaches South America's largest city.",
  },
  MX: {
    country: "Mexico",
    coordinates: "19.4326° N, 99.1332° W",
    rewardHint: "The coordinates point to the heart of the Americas.",
  },
  DE: {
    country: "Germany",
    coordinates: "52.5200° N, 13.4050° E",
    rewardHint: "The mission crosses into Europe's center.",
  },
  FR: {
    country: "France",
    coordinates: "48.8566° N, 2.3522° E",
    rewardHint: "The city of light conceals the vault.",
  },
  NG: {
    country: "Nigeria",
    coordinates: "6.5244° N, 3.3792° E",
    rewardHint: "The mission reaches the coast of West Africa.",
  },
};

export function getMarketReward(countryCode: string): MarketReward {
  return (
    MARKET_REWARDS[countryCode] ?? {
      country: "Unknown",
      coordinates: "Classified",
      rewardHint: "Your coordinates are locked. Stay tuned for the drop.",
    }
  );
}
