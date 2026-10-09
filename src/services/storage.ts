import { useState } from 'react';
export function read<T>(key: string, fallback: T): T { try {
    const raw = localStorage.getItem(`safehaven:${key}`);
    return raw ? JSON.parse(raw) as T : fallback;
}
catch {
    return fallback;
} }
export function save(key: string, value: unknown) { localStorage.setItem(`safehaven:${key}`, JSON.stringify(value)); }
export function useSaved<T>(key: string, fallback: T): [
    T,
    (value: T | ((old: T) => T)) => void
] {
    const [value, setValue] = useState<T>(() => read(key, fallback));
    const update = (next: T | ((old: T) => T)) => setValue(old => { const result = typeof next === 'function' ? (next as (old: T) => T)(old) : next; save(key, result); return result; });
    return [value, update];
}
export const stamp = (value: string | null | undefined) => value ? new Date(value).toLocaleString() : 'Not received';
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
