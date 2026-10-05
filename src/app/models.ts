export type MediaType = 'movie' | 'tv';
export type MediaFilter = MediaType | 'both' | 'reality';
export type View = 'discover' | 'similar' | 'favorites' | 'platforms' | 'news' | 'filter' | 'matches' | 'statistics' | 'group' | 'settings';
export type Decision = 'like' | 'dislike' | 'seen';
export interface Provider {provider_id: number; provider_name: string; logo_path: string;}
export interface Genre {id: number; name: string;}
export interface Country {iso_3166_1: string; native_name: string; english_name: string;}
export interface Title {id: number; media_type: MediaType; title: string; overview: string; poster_path: string | null; backdrop_path: string | null; date: string; rating: number; runtime: number | null; seasons: number | null; genres: Genre[]; countries: string[]; providers: Provider[]; watch_url: string; popularity?: number; group_likes?: number; my_decision?: Decision | null; seen_by_group?: boolean; can_vote?: boolean;}
export interface Member {uid: string; display_name: string; photo_url: string;}
export interface Invitation {id: number; group_id: number; name: string; expires_at: string;}
export interface GroupInvite {id: number; email: string; status: string; email_sent: number | string; expires_at: string;}
export interface Group {id: number; name: string; owner_uid: string; invite_code: string; region: string; media_type: MediaType | 'both'; providers: number[]; excluded_genres: number[]; excluded_countries: string[]; members: Member[]; invites: GroupInvite[]; match_count: number; filter_version: number;}
export interface AppUser {uid: string; display_name: string; email: string; photo_url: string;}
export interface Match {id: number; created_at: string; title: Title;}
export interface MemberVote {uid: string; display_name: string; decision: Decision | null;}
export interface Favorite {title: Title; liked_at: string; seen: boolean; matched: boolean; votes: MemberVote[];}
export interface FavoritesPage {items: Favorite[]; next_page: number | null;}
export type StatisticsDecision = 'like' | 'dislike' | 'seen' | 'match';
export interface StatisticsItem {id: number | string; name: string; count: number;}
export interface StatisticsBucket {decision: StatisticsDecision; title_count: number; genres: StatisticsItem[]; countries: StatisticsItem[]; platforms: StatisticsItem[];}
export interface GroupStatistics {statuses: StatisticsBucket[];}
export interface AppNotification {id: number | string; group_id: number | string; match_id: number | string; message: string; read_at: string | null; created_at: string; active: number | string;}
export interface TelegramStatus {configured: boolean; linked: boolean; enabled: boolean; username: string | null;}
export interface Bootstrap {user: AppUser; groups: Group[]; invitations: Invitation[]; telegram: TelegramStatus; tmdb_configured: boolean;}
export interface Catalog {providers: Provider[]; movie_genres: Genre[]; tv_genres: Genre[]; countries: Country[];}
export interface Deck {titles: Title[]; next_page: number | null; filter_version: number; reason: string | null;}
export interface InstallPrompt extends Event {prompt(): Promise<void>; userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;}
