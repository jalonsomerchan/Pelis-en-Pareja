import { Decision } from './models';
export function swipeDecision(x: number, y: number): Decision | null {return Math.abs(x) >= 95 && Math.abs(x) > Math.abs(y) * 1.25 ? (x > 0 ? 'like' : 'dislike') : null;}
export function duration(minutes: number | null): string {if (!minutes) return ''; const h = Math.floor(minutes / 60); const m = minutes % 60; return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');}
