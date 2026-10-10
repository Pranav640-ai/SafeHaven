export type Source = {
    title: string;
    url: string;
    trust: string;
};
export type Place = {
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    region: string;
    timezone: string;
};
export type Day = {
    date: string;
    max_c: number | null;
    min_c: number | null;
    rain_mm: number | null;
    wind_kmh: number | null;
    weather_code: number | null;
    signals: string[];
};
export type Weather = {
    place: Place;
    days: Day[];
    fetched_at: string;
    source: Source;
    timezone: string;
    limitations: string;
};
export type Report = {
    id: string;
    title: string;
    url: string;
    source: string;
    trust: string;
    published_at: string | null;
    historical: boolean;
    distance_km: number | null;
    latitude?: number;
    longitude?: number;
    scope: string;
};
export type Incidents = {
    reports: Report[];
    fetched_at: string;
    errors: string[];
    coverage: string;
};
export type Stop = {
    id: string;
    date: string;
    activity: string;
    kind: 'outdoor' | 'water' | 'indoor' | 'booking';
    place: Place;
};
export type Plan = {
    stops: {
        original: Stop;
        alternative: string;
        alternative_date?:string;
        alternative_kind?:Stop['kind'];
        changed: boolean;
        reasons: string[];
        community_reports?: {id:string;description:string;distance_km:number;trust:string;observed_at:string}[];
        assessment: string;
        bulletins?: {id:string;title:string;source_url:string;trust:string}[];
        source: Source | null;
        fetched_at: string | null;
    }[];
    engine: string;
    generated_at: string;
    limitations: string;
};
export type Guidance = {
    hazard: string;
    language: string;
    requested_language: string;
    steps: string[];
    english_steps: string[];
    source: Source;
    translation: string;
    prepared_at: string;
    content_review_date: string;
    limitations: string;
};
export type Membership = {
    group_id: string;
    member_id: string;
    token: string;
    invite?: string;
    name: string;
};
export type Group = {
    name: string;
    members: {
        id: string;
        name: string;
        status: string;
        updated: string | null;
        event_at: string | null;
    }[];
    fetched_at: string;
};
const configured = (import.meta as ImportMeta & {
    env: Record<string, string>;
}).env.VITE_API_BASE_URL || '';
const apiBase=configured.replace(/\/+$/,'');
export async function api<T>(path: string, body?: unknown, token?: string, method?: string): Promise<T> {
    const abort = new AbortController();
    const timeout = window.setTimeout(() => abort.abort(), 90000);
    try {
        const response = await fetch(`${apiBase}/api${path}`, { method: method || (body === undefined ? 'GET' : 'POST'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: abort.signal, cache: 'no-store' });
        if (!response.ok) {
            let message = 'Service unavailable. Please retry.';
            try {
                const data = await response.json();
                if (typeof data.detail === 'string')
                    message = data.detail;
            }
            catch { }
            throw new Error(message);
        }
        if (!response.headers.get('content-type')?.includes('application/json'))
            throw new Error('Meridian service is unavailable. Please try again when connected.');
        return await response.json() as T;
    }
    catch (e) {
        if (!navigator.onLine)
            throw new Error('You are offline. Open previously saved information in your safety pack.');
        throw e;
    }
    finally {
        window.clearTimeout(timeout);
    }
}
