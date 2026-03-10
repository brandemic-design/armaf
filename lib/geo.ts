const IPINFO_TOKEN = process.env.IPINFO_TOKEN;

export async function detectCountry(ip: string): Promise<string> {
  if (!IPINFO_TOKEN || ip === "127.0.0.1" || ip === "::1") {
    return "US"; // default fallback
  }

  try {
    const res = await fetch(`https://ipinfo.io/${ip}?token=${IPINFO_TOKEN}`, {
      next: { revalidate: 86400 },
    });
    const data = await res.json();
    return data.country || "US";
  } catch {
    return "US";
  }
}
