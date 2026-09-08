export function sitePath(value: string): string {
 const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
 return value.startsWith('/') && !value.startsWith('//') && !(base && (value === base || value.startsWith(base + '/'))) ? base + value : value;
}
