import { Injectable } from '@angular/core';
import { initializeApp, FirebaseOptions } from 'firebase/app';
import { getAuth, onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { AppUser } from './models';
declare global {interface Window {pelisConfig: {apiBaseUrl: string; firebase: FirebaseOptions};}}
export class ApiError extends Error {constructor(message: string, public code = '', public status = 0) {super(message);}}
@Injectable({providedIn: 'root'})
export class ApiService {
  readonly firebaseAuth = getAuth(initializeApp(window.pelisConfig.firebase));
  readonly base = window.pelisConfig.apiBaseUrl.replace(/\/$/, '');
  async ready(): Promise<User | null> {await this.firebaseAuth.authStateReady(); return this.firebaseAuth.currentUser;}
  async google(): Promise<void> {await signInWithPopup(this.firebaseAuth, new GoogleAuthProvider()); await this.sync();}
  async email(email: string, password: string, name?: string): Promise<void> {
    if (name !== undefined) {const result = await createUserWithEmailAndPassword(this.firebaseAuth, email, password); await updateProfile(result.user, {displayName: name}); await sendEmailVerification(result.user);}
    else await signInWithEmailAndPassword(this.firebaseAuth, email, password);
    await this.sync();
  }
  async sync(): Promise<AppUser> {const d = await this.request<{user: AppUser}>('auth/login', 'POST', {id_token: await this.firebaseAuth.currentUser?.getIdToken()}); return d.user;}
  async verify(): Promise<void> {const u = this.firebaseAuth.currentUser; if (u) await sendEmailVerification(u);}
  async refreshUser(): Promise<void> {const u = this.firebaseAuth.currentUser; if (u) {await u.reload(); await u.getIdToken(true);}}
  async reset(email: string): Promise<void> {await sendPasswordResetEmail(this.firebaseAuth, email);}
  async logout(): Promise<void> {try {await this.request('auth/logout', 'POST', {});} finally {await signOut(this.firebaseAuth);}}
  onChange(callback: (user: User | null) => void): () => void {return onAuthStateChanged(this.firebaseAuth, callback);}
  async get<T>(endpoint: string, query: Record<string,string | number> = {}): Promise<T> {const qs = new URLSearchParams(Object.entries(query).map(([k,v]) => [k,String(v)])); return this.request<T>('pelisenpareja/' + endpoint + (qs.size ? '?' + qs.toString() : ''));}
  async post<T>(endpoint: string, body: unknown): Promise<T> {return this.request<T>('pelisenpareja/' + endpoint, 'POST', body);}
  private async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    if (!navigator.onLine) throw new ApiError('Estás sin conexión. Vuelve a conectarte para guardar los cambios.', 'OFFLINE');
    const token = await this.firebaseAuth.currentUser?.getIdToken();
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch(`${this.base}/${path}`, {method, headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})}, ...(body !== undefined ? {body: JSON.stringify(body)} : {}), signal: controller.signal, cache: 'no-store'});
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new ApiError(data?.message || `La API no está disponible (${response.status}).`, data?.code || 'API_ERROR', response.status);
      return data.data as T;
    } catch (e) {if (e instanceof ApiError) throw e; throw new ApiError(e instanceof DOMException && e.name === 'AbortError' ? 'La consulta está tardando demasiado. Inténtalo de nuevo.' : 'No se pudo conectar con la API. Comprueba tu conexión.', 'NETWORK');}
    finally {clearTimeout(timer);}
  }
}
