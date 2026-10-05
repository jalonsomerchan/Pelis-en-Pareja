import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiError, ApiService } from './api.service';
import { AppNotification, AppUser, Bootstrap, Catalog, Decision, Deck, Favorite, FavoritesPage, Group, GroupStatistics, InstallPrompt, Invitation, Match, MediaFilter, StatisticsBucket, StatisticsDecision, StatisticsItem, TelegramStatus, Title, View } from './models';
import { DEMO_CATALOG, DEMO_GROUP, DEMO_PARTNER_VOTES, DEMO_TITLES } from './demo';
import { mergePriorities, needsInitialCoverage, titleKey } from './recommendations';
import { duration, swipeDecision } from './swipe';
import { ModalFocusDirective } from './modal-focus.directive';
import { SwUpdate } from '@angular/service-worker';

type FilterMedia = 'movie'|'tv'|'reality';
type FilterDateRange = 'all'|'month'|'year'|'2020s'|'2010s'|'2000s'|'1990s'|'1980s'|'1970s'|'1960s'|'before1960';
type FilterSort = 'popularity.desc'|'revenue.desc'|'vote_average.desc'|'vote_count.desc';

@Component({selector:'app-root',standalone:true,imports:[FormsModule,ModalFocusDirective],templateUrl:'./app.component.html'})
export class AppComponent implements OnDestroy {
  readonly api = inject(ApiService);
  readonly updates = inject(SwUpdate);
  readonly updateAvailable = signal(false);
  readonly user = signal<AppUser | null>(null);
  readonly groups = signal<Group[]>([]);
  readonly groupId = signal<number | null>(null);
  readonly group = computed(() => this.groups().find(g => g.id === this.groupId()) ?? null);
  readonly owner = computed(() => this.group()?.owner_uid === this.user()?.uid);
  readonly view = signal<View>('discover');
  readonly demo = signal(false);
  readonly initializing = signal(true);
  readonly busy = signal(false);
  readonly pendingVotes = signal(0);
  readonly loadingDeck = signal(false);
  readonly deck = signal<Title[]>([]);
  readonly current = computed(() => this.deck()[0] ?? null);
  readonly discoverMedia = signal<MediaFilter>('both');
  readonly mediaTabs: {id:MediaFilter;label:string}[] = [{id:'tv',label:'Series'},{id:'movie',label:'Películas'},{id:'both',label:'Todo'},{id:'reality',label:'Realities'}];
  readonly favorites = signal<Favorite[]>([]);
  readonly favoritesScope = signal<'mine'|'group'>('mine');
  readonly favoritesPage = signal(1);
  readonly favoritesNext = signal<number | null>(null);
  readonly favoritesBusy = signal(false);
  readonly platformTitles = signal<Title[]>([]);
  readonly platformProvider = signal<number | null>(null);
  readonly platformMode = signal<'recent'|'popular'>('recent');
  readonly platformMedia = signal<MediaFilter>('both');
  readonly platformNext = signal<number | null>(null);
  readonly platformBusy = signal(false);
  readonly selectedProviders = computed(()=>this.catalog()?.providers.filter(p=>this.group()?.providers.includes(p.provider_id)) ?? []);
  readonly newsTitles = signal<Title[]>([]);
  readonly newsMedia = signal<MediaFilter>('both');
  readonly newsNext = signal<number | null>(1);
  readonly newsBusy = signal(false);
  readonly filterMedia = signal<FilterMedia>('movie');
  readonly filterProviderId = signal<number | null>(null);
  readonly filterCountries = signal<string[]>([]);
  readonly filterGenres = signal<number[]>([]);
  readonly filterDateRange = signal<FilterDateRange>('all');
  readonly filterSort = signal<FilterSort>('popularity.desc');
  readonly filterStep = signal(0);
  readonly filterTitles = signal<Title[]>([]);
  readonly filterCurrent = computed(()=>this.filterTitles()[0] ?? null);
  readonly filterNext = signal<number | null>(1);
  readonly filterBusy = signal(false);
  readonly filterHasSearched = signal(false);
  readonly filterEncounteredResults = signal(false);
  readonly filterCountryOptions = [{id:'US',label:'EEUU'},{id:'ES',label:'España'},{id:'GB',label:'UK'},{id:'FR',label:'Francia'},{id:'KR',label:'Corea'},{id:'DE',label:'Alemania'}];
  readonly filterDateOptions: {id:FilterDateRange;label:string}[] = [{id:'all',label:'Cualquier fecha'},{id:'month',label:'Último mes'},{id:'year',label:'Último año'},{id:'2020s',label:'2020–hoy'},{id:'2010s',label:'2010–2019'},{id:'2000s',label:'2000–2009'},{id:'1990s',label:'1990–1999'},{id:'1980s',label:'1980–1989'},{id:'1970s',label:'1970–1979'},{id:'1960s',label:'1960–1969'},{id:'before1960',label:'Antes de 1960'}];
  readonly filterSortOptions: {id:FilterSort;label:string}[] = [{id:'popularity.desc',label:'Popularidad'},{id:'revenue.desc',label:'Ingresos'},{id:'vote_average.desc',label:'Puntuación'},{id:'vote_count.desc',label:'Número de votos'}];
  readonly matches = signal<Match[]>([]);
  readonly statistics = signal<GroupStatistics | null>(null);
  readonly statisticsBusy = signal(false);
  readonly notifications = signal<AppNotification[]>([]);
  readonly unread = computed(() => this.notifications().filter(n => !n.read_at).length);
  readonly invitations = signal<Invitation[]>([]);
  readonly telegram = signal<TelegramStatus>({configured:false,linked:false,enabled:true,username:null});
  readonly catalog = signal<Catalog | null>(null);
  readonly tmdbConfigured = signal(true);
  readonly error = signal('');
  readonly toast = signal('');
  readonly showNotifications = signal(false);
  readonly showGroupForm = signal(false);
  readonly showDetail = signal(false);
  readonly detailTitle = signal<Title | null>(null);
  readonly showMatch = signal<Title | null>(null);
  readonly confirmation = signal<{message:string;action:()=>Promise<void>} | null>(null);
  readonly online = signal(navigator.onLine);
  readonly installPrompt = signal<InstallPrompt | null>(null);
  readonly installed = signal(window.matchMedia('(display-mode: standalone)').matches);
  readonly swipeX = signal(0);
  readonly animateDecision = signal<Decision | null>(null);
  readonly animateTitleKey = signal<string | null>(null);
  readonly catalogBusy = signal(false);
  readonly settingsTab = signal<'platforms'|'filters'>('platforms');
  readonly emailVerified = signal(false);
  readonly mobileMenuOpen = signal(false);
  readonly duration = duration;
  readonly tabs: {id:View;label:string;icon:string}[] = [{id:'discover',label:'Descubrir',icon:'spark'},{id:'favorites',label:'Favoritos',icon:'bookmark'},{id:'platforms',label:'Plataformas',icon:'film'},{id:'news',label:'Novedades',icon:'spark'},{id:'filter',label:'Filter',icon:'sliders'},{id:'matches',label:'Matches',icon:'heart'},{id:'statistics',label:'Estadísticas',icon:'chart'},{id:'group',label:'Mi grupo',icon:'people'},{id:'settings',label:'Ajustes',icon:'sliders'}];
  readonly statisticsDimensions: {id:'genres'|'countries'|'platforms';label:string}[] = [{id:'genres',label:'Categorías'},{id:'countries',label:'Países'},{id:'platforms',label:'Plataformas'}];
  authMode: 'login'|'register'|'reset' = 'login';
  email = ''; password = ''; displayName = '';
  groupName = ''; joinCode = ''; inviteEmail = ''; providerSearch = ''; countrySearch = '';
  inviteLink = ''; telegramLink = '';
  draft = {name:'',region:'ES',media_type:'both' as Group['media_type'],providers:[] as number[],excluded_genres:[] as number[],excluded_countries:[] as string[]};
  private nextPage: number | null = 1;
  private epoch = 0;
  private dragging: {id:number;x:number;y:number} | null = null;
  private interval = window.setInterval(() => void this.poll(),15000);
  private toastTimer = 0;
  private notificationIds = new Set<string>();
  private primedNotifications = false;
  private demoVotes = new Map<string, Decision>();
  private demoLikes = new Map<string,string>();
  private favoriteEpoch = 0;
  private platformEpoch = 0;
  private newsEpoch = 0;
  private filterEpoch = 0;
  private statisticsEpoch = 0;
  private prioritySignature = '';
  private tasteRefreshEpoch = 0;
  private catalogRegion: string | null = null;
  private catalogEpoch = 0;
  private localVoteKeys = new Set<string>();
  private discoveryPrefetches = new Map<string,Promise<void>>();
  private newsPrefetches = new Map<string,Promise<void>>();
  private posterPreloads = new Map<string,HTMLImageElement>();
  private pendingVoteKeys = new Set<string>();
  private updateSubscription = this.updates.versionUpdates.subscribe(event=>{if(event.type==='VERSION_READY')this.updateAvailable.set(true);});
  private notificationPermission = false;
  private disposed = false;
  private authUnsubscribe: (()=>void) | null = null;
  private networkListener = () => {this.online.set(navigator.onLine); if(navigator.onLine) void this.poll();};
  private installListener = (event:Event) => {event.preventDefault();this.installPrompt.set(event as InstallPrompt);};
  private installedListener = () => {this.installed.set(true);this.installPrompt.set(null);};
  private keyboardListener = (event:KeyboardEvent) => {
    if(event.key==='Escape'){this.closeOverlays();return;}
    if(!this.user() || (this.view()!=='discover'&&this.view()!=='filter') || this.showDetail() || this.showNotifications() || this.showMatch() || this.showGroupForm() || this.confirmation()) return;
    if((event.target as HTMLElement)?.closest('input,textarea,select,button,a')) return;
    const active=this.view()==='filter'?this.filterCurrent():this.current();
    if(event.key==='ArrowRight'){event.preventDefault();void this.vote('like',active);}
    if(event.key==='ArrowLeft'){event.preventDefault();void this.vote('dislike',active);}
  };
  constructor(){
    window.addEventListener('online',this.networkListener);window.addEventListener('offline',this.networkListener);
    window.addEventListener('beforeinstallprompt',this.installListener);window.addEventListener('appinstalled',this.installedListener);window.addEventListener('keydown',this.keyboardListener);
    void this.initialize();
  }
  ngOnDestroy(){this.disposed=true;this.updateSubscription.unsubscribe();clearInterval(this.interval);clearTimeout(this.toastTimer);this.authUnsubscribe?.();window.removeEventListener('online',this.networkListener);window.removeEventListener('offline',this.networkListener);window.removeEventListener('beforeinstallprompt',this.installListener);window.removeEventListener('appinstalled',this.installedListener);window.removeEventListener('keydown',this.keyboardListener);}
  private async initialize(){try{const user=await this.api.ready();if(user) await this.bootstrap();this.authUnsubscribe=this.api.onChange(u=>{if(!u && !this.demo()) this.clearSession();});}catch(e){this.setError(e);}finally{this.initializing.set(false);}}
  private setError(e:unknown){const code=(e as {code?:string})?.code;const messages: Record<string,string> = {'auth/invalid-credential':'El correo o la contraseña no son correctos.','auth/email-already-in-use':'Este correo ya tiene una cuenta. Inicia sesión.','auth/weak-password':'Usa una contraseña de al menos 6 caracteres.','auth/invalid-email':'El correo no es válido.','auth/popup-closed-by-user':'Se ha cerrado la ventana de acceso. Puedes intentarlo de nuevo.','auth/popup-blocked':'Permite las ventanas emergentes para acceder con Google.','auth/unauthorized-domain':'Añade el dominio de esta app a los dominios autorizados de Firebase.','auth/operation-not-allowed':'Activa este método de acceso en Firebase Authentication.','auth/network-request-failed':'No se pudo conectar con Firebase. Comprueba tu conexión.','auth/too-many-requests':'Demasiados intentos. Espera un momento y vuelve a intentarlo.'};this.error.set(messages[code ?? ''] || (e instanceof Error ? e.message : 'No se pudo completar la operación.'));}
  private async operation(action:()=>Promise<void>){if(this.busy())return;this.busy.set(true);this.error.set('');try{await action();}catch(e){this.setError(e);}finally{this.busy.set(false);}}
  notify(message:string){this.toast.set(message);clearTimeout(this.toastTimer);this.toastTimer=window.setTimeout(()=>this.toast.set(''),5500);}
  async google(){await this.operation(async()=>{await this.api.google();await this.bootstrap();});}
  async emailAuth(){await this.operation(async()=>{
    if(this.authMode==='reset'){if(!this.email.trim())throw new Error('Introduce tu correo.');await this.api.reset(this.email.trim());this.notify('Si tienes una cuenta, recibirás un enlace para cambiar la contraseña.');this.authMode='login';return;}
    await this.api.email(this.email.trim(),this.password,this.authMode==='register' ? this.displayName.trim() : undefined);this.password='';await this.bootstrap();if(this.authMode==='register')this.notify('Te hemos enviado un correo de verificación.');
  });}
  async retrySession(){await this.operation(()=>this.bootstrap());}
  private async bootstrap(){
    const data=await this.api.get<Bootstrap>('bootstrap');if(this.disposed)return;
    this.notificationPermission = 'Notification' in window && Notification.permission === 'granted';this.user.set(data.user);this.groups.set(data.groups);this.invitations.set(data.invitations);this.telegram.set(data.telegram);this.tmdbConfigured.set(data.tmdb_configured);this.emailVerified.set(!!this.api.firebaseAuth.currentUser?.emailVerified);
    const saved=Number(localStorage.getItem('pelis.activeGroup'));const currentId=this.groupId();const chosen=data.groups.find(g=>g.id===currentId) ?? data.groups.find(g=>g.id===saved) ?? data.groups[0];
    if(chosen){this.groupId.set(chosen.id);this.discoverMedia.set(chosen.media_type);this.setDraft(chosen);await this.refreshView();}else this.showGroupForm.set(true);
    const token=new URL(location.href).searchParams.get('invitation');
    if(token && this.emailVerified()){await this.acceptInvitation(undefined,token);const url=new URL(location.href);url.searchParams.delete('invitation');history.replaceState(null,'',url);}
    await this.loadNotifications();
  }
  enterDemo(){this.demoVotes.clear();this.demoLikes.clear();this.favorites.set([]);this.favoritesPage.set(1);this.platformProvider.set(null);this.filterProviderId.set(null);this.filterTitles.set([]);this.filterNext.set(1);this.filterHasSearched.set(false);this.filterStep.set(0);this.discoverMedia.set('both');this.demo.set(true);this.error.set('');this.initializing.set(false);this.user.set({uid:'demo',display_name:'Tú',email:'demo@ejemplo.es',photo_url:''});this.groups.set([structuredClone(DEMO_GROUP)]);this.groupId.set(1);this.catalog.set(structuredClone(DEMO_CATALOG));this.matches.set([]);this.notifications.set([]);this.invitations.set([]);this.tmdbConfigured.set(true);this.telegram.set({configured:false,linked:false,enabled:true,username:null});this.view.set('discover');this.setDraft(this.group()!);void this.reloadDeck();this.notify('Modo demo: los votos y matches son una simulación.');}
  private clearSession(){this.localVoteKeys.clear();this.epoch++;this.favoriteEpoch++;this.platformEpoch++;this.newsEpoch++;this.filterEpoch++;this.filterBusy.set(false);this.statisticsEpoch++;this.statistics.set(null);this.statisticsBusy.set(false);this.favorites.set([]);this.platformTitles.set([]);this.newsTitles.set([]);this.newsNext.set(1);this.filterTitles.set([]);this.filterNext.set(1);this.filterHasSearched.set(false);this.filterEncounteredResults.set(false);this.detailTitle.set(null);this.user.set(null);this.groups.set([]);this.groupId.set(null);this.deck.set([]);this.matches.set([]);this.notifications.set([]);this.invitations.set([]);this.catalog.set(null);this.showGroupForm.set(false);this.closeOverlays();this.primedNotifications=false;this.notificationIds.clear();}
  async logout(){await this.operation(async()=>{if(!this.demo())await this.api.logout();this.demo.set(false);this.clearSession();this.view.set('discover');});}
  async switchGroup(value:string){if(this.busy())return;const id=Number(value);if(!this.groups().some(g=>g.id===id))return;this.localVoteKeys.clear();this.epoch++;this.favoriteEpoch++;this.platformEpoch++;this.newsEpoch++;this.filterEpoch++;this.filterBusy.set(false);this.statisticsEpoch++;this.statistics.set(null);this.favorites.set([]);this.favoritesPage.set(1);this.platformTitles.set([]);this.newsTitles.set([]);this.newsNext.set(1);this.filterTitles.set([]);this.filterNext.set(1);this.filterHasSearched.set(false);this.filterEncounteredResults.set(false);this.platformProvider.set(null);this.filterProviderId.set(null);this.groupId.set(id);this.discoverMedia.set(this.group()!.media_type);if(!this.demo())localStorage.setItem('pelis.activeGroup',String(id));this.catalog.set(null);this.setDraft(this.group()!);this.showDetail.set(false);this.showMatch.set(null);this.error.set('');await this.refreshView();}
  toggleMobileMenu(){this.mobileMenuOpen.update(open=>!open);}
  closeMobileMenu(){this.mobileMenuOpen.set(false);}
  async navigate(view:View){this.closeMobileMenu();if(view!==this.view())this.favoritesPage.set(1);this.view.set(view);this.error.set('');this.showNotifications.set(false);window.scrollTo(0,0);await this.refreshView();}
  private async refreshView(){if(this.view()==='discover')await this.reloadDeck();if(this.view()==='matches')await this.loadMatches();if(this.view()==='favorites')await this.loadFavorites();if(this.view()==='platforms')await this.loadPlatformFeed();if(this.view()==='news')await this.loadNews();if(this.view()==='filter'){await this.loadCatalog();this.ensureFilterProvider();}if(this.view()==='statistics')await this.loadStatistics();if(this.view()==='settings')await this.loadCatalog();}
  setDraft(g:Group){this.draft={name:g.name,region:g.region,media_type:g.media_type,providers:[...g.providers],excluded_genres:[...g.excluded_genres],excluded_countries:[...g.excluded_countries]};}
  private updateGroup(group:Group){this.groups.update(all=>all.some(g=>g.id===group.id)?all.map(g=>g.id===group.id?group:g):[...all,group]);this.setDraft(group);}
  async createGroup(){await this.operation(async()=>{if(this.demo()){this.notify('Crea una cuenta para guardar un grupo real.');return;}const result=await this.api.post<{group:Group}>('create_group',{name:this.groupName.trim()});this.updateGroup(result.group);this.groupId.set(result.group.id);localStorage.setItem('pelis.activeGroup',String(result.group.id));this.showGroupForm.set(false);this.groupName='';this.view.set('settings');this.catalog.set(null);await this.loadCatalog();this.notify('Grupo creado. Elige vuestras plataformas e invita a tu pareja.');});}
  async joinGroup(){await this.operation(async()=>{if(this.demo()){this.notify('Crea una cuenta para unirte a un grupo real.');return;}const r=await this.api.post<{group:Group}>('join_group',{code:this.joinCode.trim()});this.updateGroup(r.group);this.groupId.set(r.group.id);this.showGroupForm.set(false);this.joinCode='';this.catalog.set(null);this.discoverMedia.set(this.draft.media_type);this.view.set('discover');await this.reloadDeck();this.notify('Ya estás en el grupo.');});}
  async acceptInvitation(id?:number,token?:string){if(this.demo())return;try{const r=await this.api.post<{group:Group}>('accept_invite',token ? {token} : {invitation_id:id});this.updateGroup(r.group);this.groupId.set(r.group.id);this.invitations.update(all=>all.filter(i=>i.id!==id && i.group_id!==r.group.id));this.showGroupForm.set(false);this.catalog.set(null);await this.refreshView();this.notify('Invitación aceptada. ¡A elegir juntos!');}catch(e){this.setError(e);}}
  async invite(){await this.operation(async()=>{if(this.demo()){this.notify('Las invitaciones se enviarán cuando uses una cuenta real.');return;}const r=await this.api.post<{group:Group;email_sent:boolean;invite_url:string;message:string}>('invite_email',{group_id:this.groupId(),email:this.inviteEmail.trim()});this.updateGroup(r.group);this.inviteLink=r.invite_url;this.inviteEmail='';this.notify(r.message);});}
  async cancelInvite(id:number){await this.operation(async()=>{const r=await this.api.post<{group:Group}>('cancel_invite',{group_id:this.groupId(),invitation_id:id});this.updateGroup(r.group);this.notify('Invitación cancelada.');});}
  async copy(text:string){try{await navigator.clipboard.writeText(text);this.notify('Copiado al portapapeles.');}catch{this.notify('No se pudo copiar. Selecciona y copia el texto.');}}
  async shareGroup(){const g=this.group();if(!g)return;const text=`Únete a «${g.name}» en Pelis en pareja con el código ${g.invite_code}. ${location.origin}${location.pathname}`;try{if(navigator.share)await navigator.share({title:'Pelis en pareja',text});else await this.copy(text);}catch{/* Closing a share sheet needs no message. */}}
  confirm(message:string,action:()=>Promise<void>){this.confirmation.set({message,action});}
  async confirmAction(){const c=this.confirmation();if(!c)return;this.confirmation.set(null);await this.operation(c.action);}
  requestRotate(){this.confirm('¿Generar un código nuevo? El código actual dejará de funcionar.',async()=>{if(this.demo())return;const r=await this.api.post<{group:Group}>('rotate_code',{group_id:this.groupId()});this.updateGroup(r.group);this.notify('Código renovado.');});}
  requestResetVotes(){
    const id=this.groupId();if(id===null||!this.owner()||this.demo())return;
    this.confirm('Se eliminarán todos los síes y noes de los miembros, junto con las marcas de visto del grupo. Los matches activos se desactivarán y los avisos anteriores se conservarán; se cancelarán los envíos pendientes. Esta acción no se puede deshacer.',async()=>{
      const r=await this.api.post<{group:Group;deleted_votes:number;deleted_seen:number;deactivated_matches:number}>('reset_votes',{group_id:id});
      if(id!==this.groupId())return;
      this.updateGroup(r.group);
      const prefix=id+':';for(const key of this.localVoteKeys)if(key.startsWith(prefix))this.localVoteKeys.delete(key);
      this.epoch++;this.prioritySignature='';this.deck.set([]);this.nextPage=1;
      this.matches.set([]);this.favorites.set([]);this.favoriteEpoch++;this.favoritesPage.set(1);this.favoritesNext.set(null);this.favoritesBusy.set(false);
      this.platformEpoch++;this.platformTitles.set([]);this.platformNext.set(null);this.platformBusy.set(false);
      void this.loadNotifications().catch(e=>this.setError(e));
      this.notify(`Votaciones reiniciadas: ${r.deleted_votes} votos y ${r.deleted_seen} marcas de visto eliminados; ${r.deactivated_matches} matches desactivados.`);
    });
  }
  requestRemove(uid:string){const self=uid===this.user()?.uid;this.confirm(self?'¿Salir del grupo? Si lo creaste, otro miembro se convertirá en propietario. Si eres la última persona, el grupo se eliminará.':'¿Quitar a esta persona del grupo? Se recalcularán los matches entre los miembros restantes.',async()=>{if(this.demo()){this.notify('Acción disponible con una cuenta real.');return;}await this.api.post('remove_member',{group_id:this.groupId(),uid});this.groupId.set(null);this.deck.set([]);this.matches.set([]);await this.bootstrap();});}
  async loadCatalog(){
    if(!this.group())return;const region=this.view()==='settings'?this.draft.region:this.group()!.region;
    if(this.catalog()&&this.catalogRegion===region)return;
    if(this.demo()){this.catalog.set(structuredClone(DEMO_CATALOG));this.catalogRegion=region;return;}
    const id=this.groupId()!;const epoch=++this.catalogEpoch;this.catalogBusy.set(true);
    try{const c=await this.api.get<Catalog>('catalog',{group_id:id,region});if(id===this.groupId()&&epoch===this.catalogEpoch){this.catalog.set(c);this.catalogRegion=region;}}
    catch(e){if(epoch===this.catalogEpoch)this.setError(e);}finally{if(epoch===this.catalogEpoch)this.catalogBusy.set(false);}
  }
  async regionChanged(){this.catalog.set(null);this.draft.providers=[];await this.loadCatalog();}
  filteredProviders(){const q=this.providerSearch.trim().toLowerCase();return this.catalog()?.providers.filter(p=>p.provider_name.toLowerCase().includes(q)) ?? [];}
  filteredCountries(){const q=this.countrySearch.trim().toLowerCase();return this.catalog()?.countries.filter(c=>(this.countryName(c.iso_3166_1)+' '+c.english_name).toLowerCase().includes(q)) ?? [];}
  allGenres(){const c=this.catalog();const all=[...(c?.movie_genres ?? []),...(c?.tv_genres ?? [])];return all.filter((g,i)=>all.findIndex(x=>x.id===g.id)===i).sort((a,b)=>a.name.localeCompare(b.name,'es'));}
  filterGenreOptions(){const catalog=this.catalog();const genres=this.filterMedia()==='movie'?(catalog?.movie_genres ?? []):(catalog?.tv_genres ?? []);return genres.filter(genre=>this.filterMedia()!=='reality'||genre.id!==10764).slice().sort((a,b)=>a.name.localeCompare(b.name,'es'));}
  filterProviderName(){return this.selectedProviders().find(provider=>provider.provider_id===this.filterProviderId())?.provider_name ?? 'Plataforma';}
  filterCountrySummary(){return this.filterCountries().length?this.filterCountryOptions.filter(country=>this.filterCountries().includes(country.id)).map(country=>country.label).join(', '):'Todos los países';}
  filterGenreSummary(){return this.filterGenres().length?this.filterGenreOptions().filter(genre=>this.filterGenres().includes(genre.id)).map(genre=>genre.name).join(', '):'Todas las categorías';}
  filterSortName(){return this.filterSortOptions.find(option=>option.id===this.filterSort())?.label ?? 'Popularidad';}
  private ensureFilterProvider(){const providers=this.group()?.providers ?? [];if(!providers.includes(this.filterProviderId() ?? -1))this.filterProviderId.set(providers[0] ?? null);}
  setFilterMedia(media:FilterMedia){if(this.filterMedia()===media)return;this.filterMedia.set(media);this.filterGenres.set([]);if(media!=='movie'&&this.filterSort()==='revenue.desc')this.filterSort.set('popularity.desc');}
  toggleFilterCountry(code:string){this.filterCountries.update(values=>this.toggle(values,code));}
  toggleFilterGenre(id:number){this.filterGenres.update(values=>this.toggle(values,id));}
  filterStepBack(){this.filterStep.update(step=>Math.max(0,step-1));}
  async filterStepNext(){if(this.filterStep()===1&&!this.filterProviderId()){this.notify('Elige una plataforma para continuar.');return;}if(this.filterStep()<5)this.filterStep.update(step=>step+1);else await this.searchFilter();}
  filterDateBounds():{date_from?:string;date_to:string}{
    const dateKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;const today=dateKey(new Date());const range=this.filterDateRange();
    if(range==='all')return {date_to:today};
    if(range==='month'||range==='year'){
      const start=new Date();start.setDate(start.getDate()-(range==='month'?30:365));
      return {date_from:dateKey(start),date_to:today};
    }
    if(range==='before1960')return {date_to:'1959-12-31'};
    const start=Number(range.slice(0,4));const end=start===2020?today:`${start+9}-12-31`;
    return {date_from:`${start}-01-01`,date_to:end};
  }
  filterDateName(){return this.filterDateOptions.find(option=>option.id===this.filterDateRange())?.label ?? 'Cualquier fecha';}
  async searchFilter(){
    if(!this.filterProviderId()){this.notify('Elige una de las plataformas del grupo.');return;}
    this.filterHasSearched.set(true);this.filterEncounteredResults.set(false);this.filterBusy.set(false);this.filterStep.set(6);this.filterTitles.set([]);this.filterNext.set(1);this.filterEpoch++;await this.loadFilterMore();
  }
  changeFilterSetup(){this.filterHasSearched.set(false);this.filterEncounteredResults.set(false);this.filterBusy.set(false);this.filterStep.set(0);this.filterTitles.set([]);this.filterNext.set(1);this.filterEpoch++;}
  async loadFilterMore(){
    if(!this.group()||this.filterBusy()||this.filterNext()===null)return;
    const id=this.groupId()!;const epoch=this.filterEpoch;let page=this.filterNext();if(page===null)return;
    const titles=[...this.filterTitles()];const known=new Set(titles.map(titleKey));const target=titles.length+10;
    this.filterBusy.set(true);
    try{
      if(this.demo()){
        const dates=this.filterDateBounds();
        const matching=this.demoAvailable(this.filterMedia()).filter(title=>title.providers.some(provider=>provider.provider_id===this.filterProviderId())&&(!this.filterCountries().length||title.countries.some(country=>this.filterCountries().includes(country)))&&(!this.filterGenres().length||title.genres.some(genre=>this.filterGenres().includes(genre.id)))&&(!dates.date_from||title.date>=dates.date_from)&&title.date<=dates.date_to).map(title=>({...title,my_decision:this.demoVotes.get(titleKey(title)) ?? null}));
        const score=(title:Title)=>this.filterSort()==='vote_average.desc'?title.rating:this.filterSort()==='popularity.desc'?(title.popularity ?? title.rating):title.rating;
        matching.sort((a,b)=>score(b)-score(a));this.filterTitles.set(matching);this.filterNext.set(null);this.filterEncounteredResults.set(matching.length>0);return;
      }
      let rounds=0;
      while(page!==null&&titles.length<target&&rounds<5){
        const bounds=this.filterDateBounds();const query:Record<string,string|number>={group_id:id,filter:1,page,media_type:this.filterMedia(),provider_id:this.filterProviderId()!,sort_by:this.filterSort(),date_to:bounds.date_to};
        if(bounds.date_from)query['date_from']=bounds.date_from;
        if(this.filterCountries().length)query['countries']=this.filterCountries().join('|');
        if(this.filterGenres().length)query['genres']=this.filterGenres().join('|');
        const result=await this.api.get<Deck>('discover',query);
        if(epoch!==this.filterEpoch||id!==this.groupId())return;
        for(const title of result.titles)if(!known.has(titleKey(title))&&!this.localVoteKeys.has(id+':'+titleKey(title))){known.add(titleKey(title));titles.push(title);}
        page=result.next_page;rounds++;
      }
      if(epoch===this.filterEpoch&&id===this.groupId()){this.filterTitles.set(titles);this.filterNext.set(page);this.filterEncounteredResults.set(this.filterEncounteredResults()||titles.length>0);}
    }catch(error){if(epoch===this.filterEpoch)this.setError(error);}finally{if(epoch===this.filterEpoch)this.filterBusy.set(false);}
  }
  countryName(code:string){try{return new Intl.DisplayNames(['es'],{type:'region'}).of(code) || code;}catch{return code;}}
  toggleProvider(id:number){this.draft.providers=this.toggle(this.draft.providers,id);}
  toggleGenre(id:number){this.draft.excluded_genres=this.toggle(this.draft.excluded_genres,id);}
  toggleCountry(code:string){this.draft.excluded_countries=this.toggle(this.draft.excluded_countries,code);}
  private toggle<T>(values:T[],v:T){return values.includes(v)?values.filter(x=>x!==v):[...values,v];}
  async saveSettings(){await this.operation(async()=>{if(!this.draft.providers.length)throw new Error('Selecciona al menos una plataforma.');const g=this.group();if(!g)return;
    if(this.demo()){this.updateGroup({...g,...structuredClone(this.draft),filter_version:g.filter_version+1});this.notify('Preferencias de la demo actualizadas.');}
    else{const r=await this.api.post<{group:Group}>('settings',{group_id:g.id,...this.draft});this.updateGroup(r.group);this.notify('Preferencias guardadas para todo el grupo.');}
    this.discoverMedia.set(this.draft.media_type);this.view.set('discover');await this.reloadDeck();
  });}
  async reloadDeck(){this.epoch++;this.prioritySignature='';this.deck.set([]);this.nextPage=1;await this.loadMore();}
  async changeDiscoverMedia(media:MediaFilter){if(this.busy()||this.discoverMedia()===media)return;this.discoverMedia.set(media);this.showDetail.set(false);await this.reloadDeck();}
  mediaTabKeydown(event:KeyboardEvent,context:'discover'|'platforms'|'news'){
    if(this.busy()||(context==='platforms'&&this.platformBusy())||(context==='news'&&this.newsBusy()))return;
    const current=context==='discover'?this.discoverMedia():context==='platforms'?this.platformMedia():this.newsMedia();let index=this.mediaTabs.findIndex(t=>t.id===current);
    if(event.key==='ArrowRight')index=(index+1)%this.mediaTabs.length;
    else if(event.key==='ArrowLeft')index=(index+this.mediaTabs.length-1)%this.mediaTabs.length;
    else if(event.key==='Home')index=0;else if(event.key==='End')index=this.mediaTabs.length-1;else return;
    event.preventDefault();const media=this.mediaTabs[index]!.id;
    if(context==='discover')void this.changeDiscoverMedia(media);else if(context==='platforms')void this.changePlatformMedia(media);else void this.changeNewsMedia(media);
    document.getElementById((context==='discover'?'discover':context==='platforms'?'platform':'news')+'-tab-'+media)?.focus();
  }
  openDetail(title:Title){this.detailTitle.set(title);this.showDetail.set(true);}
  voteLabel(decision:Decision | null){return decision==='like'?'Quiere verla':decision==='dislike'?'No le apetece':decision==='seen'?'Ya la vio':'Sin votar';}
  likesCount(favorite:Favorite){return favorite.votes.filter(v=>v.decision==='like').length;}
  isReality(title:Pick<Title,'media_type'|'genres'>){return title.media_type==='tv'&&title.genres.some(g=>g.id===10764);}
  mediaLabel(title:Title){return title.media_type==='movie'?'PELÍCULA':this.isReality(title)?'REALITY':'SERIE';}
  groupProviders(title:Title){const selected=this.group()?.providers??[];return title.providers.filter(p=>selected.includes(p.provider_id));}
  private demoAvailable(media:MediaFilter){const g=this.group()!;return structuredClone(DEMO_TITLES).filter(t=>(media==='both'||(media==='reality'?this.isReality(t):t.media_type===media))&&this.demoVotes.get(titleKey(t))!=='seen'&&!t.genres.some(x=>g.excluded_genres.includes(x.id))&&!t.countries.some(c=>g.excluded_countries.includes(c))&&t.providers.some(p=>g.providers.includes(p.provider_id)));}
  private demoGenreAffinity(){const profile:Record<number,number>={};for(const [key,decision] of this.demoVotes){if(decision!=='like'&&decision!=='seen')continue;const title=DEMO_TITLES.find(t=>titleKey(t)===key);if(!title?.genres.length)continue;const share=(decision==='like'?2:.5)/title.genres.length;for(const genre of title.genres)profile[genre.id]=(profile[genre.id]??0)+share;}return profile;}
  private demoSortByTaste(titles:Title[]){const profile=this.demoGenreAffinity();if(!Object.keys(profile).length)return titles;return titles.map((title,index)=>({title,index,score:title.genres.reduce((sum,genre)=>sum+(profile[genre.id]??0),0)/Math.max(title.genres.length,1)})).sort((a,b)=>b.score-a.score||a.index-b.index).map(item=>item.title);}
  async changeFavoritesScope(scope:'mine'|'group'){this.favoritesScope.set(scope);this.favorites.set([]);await this.loadFavorites(1);}
  async loadFavorites(page=this.favoritesPage()){
    if(!this.group())return;const id=this.groupId()!;const epoch=++this.favoriteEpoch;this.favoritesPage.set(page);this.favoritesBusy.set(true);
    try{
      if(this.demo()){
        const keys=this.favoritesScope()==='mine'?[...this.demoLikes.keys()]:[...new Set([...this.demoLikes.keys(),...Object.keys(DEMO_PARTNER_VOTES).filter(key=>DEMO_PARTNER_VOTES[key]==='like')])];
        this.favorites.set(keys.map(key=>{const liked_at=this.demoLikes.get(key) ?? '2026-10-04T00:00:00Z';
          const title=structuredClone(DEMO_TITLES.find(t=>titleKey(t)===key)!);const seen=this.demoVotes.get(key)==='seen';
          return {title:{...title,my_decision:this.demoVotes.get(key) ?? null,seen_by_group:seen,can_vote:this.demoVotes.has(key)},liked_at,seen,matched:this.matches().some(m=>titleKey(m.title)===key),votes:(this.group()?.members ?? []).map(m=>({uid:m.uid,display_name:m.display_name,decision:m.uid==='demo'?this.demoVotes.get(key) ?? null:DEMO_PARTNER_VOTES[key] ?? null}))};
        }).reverse());this.favoritesNext.set(null);return;
      }
      const r=await this.api.get<FavoritesPage>('favorites',{group_id:id,page,scope:this.favoritesScope()});
      if(epoch===this.favoriteEpoch&&id===this.groupId()){this.favorites.set(r.items);this.favoritesNext.set(r.next_page);}
    }catch(e){if(epoch===this.favoriteEpoch)this.setError(e);}finally{if(epoch===this.favoriteEpoch)this.favoritesBusy.set(false);}
  }
  async changePlatform(provider:number){this.platformProvider.set(provider);await this.loadPlatformFeed();}
  async changePlatformMode(mode:'recent'|'popular'){this.platformMode.set(mode);await this.loadPlatformFeed();}
  async changePlatformMedia(media:MediaFilter){this.platformMedia.set(media);await this.loadPlatformFeed();}
  async loadPlatformFeed(append=false){
    if(!this.group())return;const id=this.groupId()!;const epoch=++this.platformEpoch;const page=append?this.platformNext():1;
    if(page===null)return;this.platformBusy.set(true);if(!append)this.platformTitles.set([]);
    try{
      await this.loadCatalog();if(epoch!==this.platformEpoch||id!==this.groupId())return;
      if(!this.group()?.providers.includes(this.platformProvider() ?? -1))this.platformProvider.set(this.group()?.providers[0] ?? null);
      const provider=this.platformProvider();if(!provider){this.platformNext.set(null);return;}
      if(this.demo()){
        const titles=this.demoAvailable(this.platformMedia()).filter(t=>t.providers.some(p=>p.provider_id===provider)).map(t=>({...t,my_decision:this.demoVotes.get(titleKey(t)) ?? null}));
        titles.sort((a,b)=>this.platformMode()==='recent'?b.date.localeCompare(a.date):b.rating-a.rating);
        this.platformTitles.set(titles);this.platformNext.set(null);return;
      }
      const r=await this.api.get<Deck>('platforms',{group_id:id,provider_id:provider,mode:this.platformMode(),media_type:this.platformMedia(),page});
      if(epoch!==this.platformEpoch||id!==this.groupId())return;
      this.platformTitles.update(all=>append?[...all,...r.titles.filter(t=>!all.some(x=>titleKey(x)===titleKey(t)))]:r.titles);this.platformNext.set(r.next_page);
    }catch(e){if(epoch===this.platformEpoch)this.setError(e);}finally{if(epoch===this.platformEpoch)this.platformBusy.set(false);}
  }
  async changeNewsMedia(media:MediaFilter){this.newsMedia.set(media);await this.loadNews();}
  private newsPageKey(groupId:number,media:MediaFilter,page:number){return `${groupId}:${media}:${page}`;}
  private prefetchNextNewsPage(){
    const groupId=this.groupId(),page=this.newsNext(),media=this.newsMedia();
    if(this.demo()||!this.online()||this.view()!=='news'||groupId===null||page===null)return;
    const key=this.newsPageKey(groupId,media,page);if(this.newsPrefetches.has(key))return;
    const pending=this.api.get<Deck>('news',{group_id:groupId,page,media_type:media,prefetch:1}).then(()=>undefined,()=>undefined).finally(()=>this.newsPrefetches.delete(key));
    this.newsPrefetches.set(key,pending);
  }
  async loadNews(append=false){
    if(!this.group())return;const id=this.groupId()!;const epoch=++this.newsEpoch;const page=append?this.newsNext():1;
    if(page===null)return;this.newsBusy.set(true);if(!append)this.newsTitles.set([]);
    try{
      if(this.demo()){
        const providers=new Set(this.group()?.providers ?? []);
        const titles=this.demoAvailable(this.newsMedia()).filter(t=>t.providers.some(p=>providers.has(p.provider_id))).map(t=>({...t,my_decision:this.demoVotes.get(titleKey(t)) ?? null})).sort((a,b)=>b.date.localeCompare(a.date));
        this.newsTitles.set(titles);this.newsNext.set(null);return;
      }
      const key=this.newsPageKey(id,this.newsMedia(),page);if(append){const pending=this.newsPrefetches.get(key);if(pending)await pending;}
      if(epoch!==this.newsEpoch||id!==this.groupId())return;
      const r=await this.api.get<Deck>('news',{group_id:id,page,media_type:this.newsMedia()});
      if(epoch!==this.newsEpoch||id!==this.groupId())return;
      this.newsTitles.update(all=>append?[...all,...r.titles.filter(t=>!all.some(x=>titleKey(x)===titleKey(t)))]:r.titles);this.newsNext.set(r.next_page);this.prefetchNextNewsPage();
    }catch(e){if(epoch===this.newsEpoch)this.setError(e);}finally{if(epoch===this.newsEpoch)this.newsBusy.set(false);}
  }
  private async refreshPriorities(keys:string[]){
    const signature=keys.join(',');if(signature===this.prioritySignature||this.loadingDeck()||this.busy())return;
    if(!keys.length){this.prioritySignature=signature;return;}
    const id=this.groupId()!;const epoch=this.epoch;
    const r=await this.api.get<{titles:Title[];filter_version:number}>('priorities',{group_id:id,media_type:this.discoverMedia()});
    if(epoch!==this.epoch||id!==this.groupId()||this.busy())return;
    if(r.filter_version!==this.group()?.filter_version){await this.reloadDeck();return;}
    this.deck.update(all=>mergePriorities(all,r.titles.filter(t=>!this.localVoteKeys.has(id+':'+titleKey(t)))));this.preloadNextPosters();this.prioritySignature=signature;
  }
  private discoveryPageKey(groupId:number,media:MediaFilter,page:number){return `${groupId}:${media}:${page}`;}
  private async discoverPage(groupId:number,media:MediaFilter,page:number){
    const key=this.discoveryPageKey(groupId,media,page);const pending=this.discoveryPrefetches.get(key);if(pending)await pending;
    return this.api.get<Deck>('discover',{group_id:groupId,page,media_type:media});
  }
  private prefetchNextDiscoverPage(){
    const groupId=this.groupId(),page=this.nextPage,media=this.discoverMedia();
    if(this.demo()||!this.online()||this.view()!=='discover'||groupId===null||page===null)return;
    const key=this.discoveryPageKey(groupId,media,page);if(this.discoveryPrefetches.has(key))return;
    const pending=this.api.get<Deck>('discover',{group_id:groupId,page,media_type:media,prefetch:1}).then(()=>undefined,()=>undefined).finally(()=>this.discoveryPrefetches.delete(key));
    this.discoveryPrefetches.set(key,pending);
  }
  async loadMore(){if(this.loadingDeck() || !this.group())return;if(this.demo()){
      const titles=this.demoAvailable(this.discoverMedia()).filter(t=>!this.demoVotes.has(titleKey(t)));
      const priority=titles.filter(t=>DEMO_PARTNER_VOTES[titleKey(t)]==='like').map(t=>({...t,group_likes:1}));const priorityKeys=new Set(priority.map(titleKey));
      this.deck.set(mergePriorities([], [...priority,...this.demoSortByTaste(titles.filter(t=>!priorityKeys.has(titleKey(t))))]));this.preloadNextPosters();this.nextPage=null;return;
    }
    if(this.nextPage===null || !this.tmdbConfigured())return;const epoch=this.epoch;const id=this.groupId()!;this.loadingDeck.set(true);this.error.set('');
    const media=this.discoverMedia();const fillingInitialDeck=this.deck().length===0;const maxRounds=fillingInitialDeck?6:1;
    let loaded=false;
    try{
      let rounds=0;
      do{
        const r=await this.discoverPage(id,media,this.nextPage ?? 1);
        if(epoch!==this.epoch)return;
        this.nextPage=r.next_page;
        this.deck.update(all=>{const known=new Set(all.map(titleKey));return [...all,...r.titles.filter(t=>!known.has(titleKey(t))&&!this.localVoteKeys.has(id+':'+titleKey(t)))];});
        this.preloadNextPosters();
        if(this.group()?.filter_version!==r.filter_version){this.groups.update(all=>all.map(g=>g.id===id?{...g,filter_version:r.filter_version}:g));}
        rounds++;
      }while(this.nextPage!==null && rounds<maxRounds && (fillingInitialDeck?needsInitialCoverage(this.deck(),media):!this.deck().length));
      loaded=true;
    }catch(e){this.setError(e);}finally{this.loadingDeck.set(false);if(loaded)this.prefetchNextDiscoverPage();if(epoch!==this.epoch && this.user() && this.group() && this.view()==='discover')void this.loadMore();}
  }
  private async refreshTasteOrder(){
    if(this.demo()||!this.group())return;
    const id=this.groupId()!,epoch=this.epoch,media=this.discoverMedia(),refresh=++this.tasteRefreshEpoch;
    try{
      const result=await this.api.get<Deck>('discover',{group_id:id,page:1,media_type:media});
      if(id!==this.groupId()||epoch!==this.epoch||refresh!==this.tasteRefreshEpoch||this.view()!=='discover'||media!==this.discoverMedia()||result.filter_version!==this.group()?.filter_version)return;
      const rank=new Map(result.titles.map((title,index)=>[titleKey(title),index]));
      this.deck.update(all=>{
        const current=all[0],remaining=all.slice(current?1:0),known=new Set(all.map(titleKey));
        for(const title of result.titles)if(!known.has(titleKey(title))&&!this.localVoteKeys.has(id+':'+titleKey(title)))remaining.push(title);
        return [...(current?[current]:[]),...remaining.map((title,index)=>({title,index,rank:rank.get(titleKey(title))??Number.MAX_SAFE_INTEGER})).sort((a,b)=>a.rank-b.rank||a.index-b.index).map(item=>item.title)];
      });
      this.preloadNextPosters();
    }catch{/* El mazo en memoria sigue disponible si falla el refresco de afinidad. */}
  }
  canLoadMore(){return this.nextPage!==null;}
  async vote(decision:Decision,title=this.current()){
    if(!title || (this.busy()&&this.pendingVotes()===0) || (!this.online()&&!this.demo()))return;
    const groupId=this.groupId();if(groupId===null)return;
    const key=titleKey(title),localKey=groupId+':'+key;
    if(this.pendingVoteKeys.has(localKey))return;
    const isDiscoverCard=this.view()==='discover'&&titleKey(this.current()??title)===key;
    const isFilterCard=this.view()==='filter'&&titleKey(this.filterCurrent()??title)===key;
    const isActiveQueueCard=isDiscoverCard||isFilterCard;
    this.pendingVoteKeys.add(localKey);this.pendingVotes.update(count=>count+1);
    this.busy.set(true);this.error.set('');this.swipeX.set(0);
    let voteRequest:Promise<{result:{saved:boolean;matches:Match[]}}|{error:unknown}>|null=null;
    try{
      if(!this.demo())voteRequest=this.api.post<{saved:boolean;matches:Match[]}>('vote',{group_id:groupId,media_type:title.media_type,tmdb_id:title.id,decision}).then(result=>({result}),error=>({error}));
      if(isActiveQueueCard){
        this.localVoteKeys.add(localKey);this.animateTitleKey.set(key);this.animateDecision.set(decision);
        const exitDuration=window.matchMedia('(prefers-reduced-motion: reduce)').matches?160:270;
        await new Promise<void>(resolve=>window.setTimeout(resolve,exitDuration));
        if(isDiscoverCard){this.deck.update(all=>all.filter(t=>titleKey(t)!==key));this.preloadNextPosters();if(this.deck().length<3&&this.nextPage!==null)void this.loadMore();}
        if(isFilterCard){this.filterTitles.update(all=>all.filter(t=>titleKey(t)!==key));if(this.filterTitles().length<3&&this.filterNext()!==null)void this.loadFilterMore();}
        this.animateDecision.set(null);this.animateTitleKey.set(null);
      }
      let matches:Match[]=[];
      if(this.demo()){
        this.demoVotes.set(key,decision);
        if(decision==='like')this.demoLikes.set(key,new Date().toISOString());
        if(decision==='dislike')this.demoLikes.delete(key);
        if(decision==='like'&&DEMO_PARTNER_VOTES[key]==='like'){
          const match={id:title.id,created_at:new Date().toISOString(),title};
          if(!this.matches().some(item=>titleKey(item.title)===key)){this.matches.update(all=>[match,...all]);matches=[match];}
        }else if(decision!=='like')this.matches.update(all=>all.filter(item=>titleKey(item.title)!==key));
        this.groups.update(all=>all.map(g=>({...g,match_count:this.matches().length})));
      }else{
        const result=await voteRequest!;if('error'in result)throw result.error;matches=result.result.matches;
      }
      this.localVoteKeys.add(localKey);
      this.deck.update(all=>all.filter(item=>titleKey(item)!==key));
      this.filterTitles.update(all=>all.filter(item=>titleKey(item)!==key));
      this.preloadNextPosters();
      this.showDetail.set(false);
      if(matches.length){
        this.showMatch.set(title);
        if(!this.demo())this.groups.update(all=>all.map(g=>g.id===groupId?{...g,match_count:g.match_count+matches.length}:g));
        void this.loadNotifications().catch(e=>this.setError(e));
      }else if(decision==='seen')this.notify('Marcada como vista. No volverá a salir a nadie del grupo.');
      this.platformTitles.update(all=>decision==='seen'?all.filter(item=>titleKey(item)!==key):all.map(item=>titleKey(item)===key?{...item,my_decision:decision}:item));
      this.newsTitles.update(all=>decision==='seen'?all.filter(item=>titleKey(item)!==key):all.map(item=>titleKey(item)===key?{...item,my_decision:decision}:item));
      if(this.view()==='matches')await this.loadMatches();
      if(this.view()==='favorites')await this.loadFavorites();
    }catch(e){
      if(e instanceof ApiError&&e.code==='ALREADY_SEEN'){
        this.localVoteKeys.add(localKey);this.deck.update(all=>all.filter(item=>titleKey(item)!==key));this.filterTitles.update(all=>all.filter(item=>titleKey(item)!==key));this.preloadNextPosters();this.platformTitles.update(all=>all.filter(item=>titleKey(item)!==key));this.newsTitles.update(all=>all.filter(item=>titleKey(item)!==key));this.showDetail.set(false);this.notify('Otra persona del grupo ya la ha marcado como vista.');
      }else if(e instanceof ApiError&&e.code==='DECK_STALE'){
        this.localVoteKeys.delete(localKey);if(isFilterCard&&groupId===this.groupId()&&this.view()==='filter')await this.searchFilter();else await this.reloadDeck();this.notify('Hemos actualizado las propuestas con los nuevos filtros.');
      }else{
        this.localVoteKeys.delete(localKey);
        if(isDiscoverCard&&groupId===this.groupId()&&this.view()==='discover'){
          this.deck.update(all=>all.some(item=>titleKey(item)===key)?all:[title,...all]);this.preloadNextPosters();
        }
        if(isFilterCard&&groupId===this.groupId()&&this.view()==='filter')this.filterTitles.update(all=>all.some(item=>titleKey(item)===key)?all:[title,...all]);
        this.setError(e);
      }
    }finally{this.pendingVoteKeys.delete(localKey);this.pendingVotes.update(count=>Math.max(0,count-1));this.busy.set(this.pendingVotes()>0);}
    if(this.view()==='discover'&&this.deck().length<3&&this.nextPage!==null)void this.loadMore();
    if(this.view()==='filter'&&this.filterTitles().length<3&&this.filterNext()!==null)void this.loadFilterMore();
    if(isDiscoverCard&&(decision==='like'||decision==='seen')){if(this.demo())void this.loadMore();else void this.refreshTasteOrder();}
  }
  pointerDown(e:PointerEvent){if((this.busy()&&this.pendingVotes()===0)||(e.target as HTMLElement).closest('button,a'))return;this.dragging={id:e.pointerId,x:e.clientX,y:e.clientY};(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);}
  pointerMove(e:PointerEvent){if(this.dragging?.id===e.pointerId)this.swipeX.set(e.clientX-this.dragging.x);}
  pointerUp(e:PointerEvent,title=this.current()){if(this.dragging?.id!==e.pointerId)return;const d=swipeDecision(e.clientX-this.dragging.x,e.clientY-this.dragging.y);this.dragging=null;this.swipeX.set(0);if(d)void this.vote(d,title);}
  pointerCancel(){this.dragging=null;this.swipeX.set(0);}
  isCardExiting(decision:Decision,title:Title){return this.animateDecision()===decision&&this.animateTitleKey()===titleKey(title);}
  cardTransform(){const x=this.swipeX();return `translateX(${x}px) rotate(${x/24}deg)`;}
  async loadMatches(){if(!this.group() || this.demo())return;const id=this.groupId()!;try{const r=await this.api.get<{matches:Match[]}>('matches',{group_id:id});if(id===this.groupId()){this.matches.set(r.matches);this.groups.update(all=>all.map(g=>g.id===id?{...g,match_count:r.matches.length}:g));}}catch(e){this.setError(e);}}
  async loadStatistics(){if(!this.group())return;const id=this.groupId()!;const epoch=++this.statisticsEpoch;this.statisticsBusy.set(true);try{const result=this.demo()?this.demoStatistics():await this.api.get<GroupStatistics>('statistics',{group_id:id});if(epoch===this.statisticsEpoch&&id===this.groupId())this.statistics.set(result);}catch(e){if(epoch===this.statisticsEpoch)this.setError(e);}finally{if(epoch===this.statisticsEpoch)this.statisticsBusy.set(false);}}
  private demoStatistics():GroupStatistics{
    const decisions:Record<StatisticsDecision,Map<string,Title>>={like:new Map(),dislike:new Map(),seen:new Map(),match:new Map()};
    const add=(decision:StatisticsDecision,key:string)=>{const title=DEMO_TITLES.find(item=>titleKey(item)===key);if(title)decisions[decision].set(key,title);};
    for(const [key,decision] of this.demoVotes)add(decision,key);
    for(const [key,decision] of Object.entries(DEMO_PARTNER_VOTES))add(decision,key);
    for(const match of this.matches())add('match',titleKey(match.title));
    const statuses=(['like','dislike','seen','match'] as StatisticsDecision[]).map(decision=>{
      const counts:{genres:Map<string,StatisticsItem>;countries:Map<string,StatisticsItem>;platforms:Map<string,StatisticsItem>}={genres:new Map(),countries:new Map(),platforms:new Map()};
      const addItem=(map:Map<string,StatisticsItem>,id:number|string,name:string)=>{const key=String(id),item=map.get(key);if(item)item.count++;else map.set(key,{id,name,count:1});};
      for(const title of decisions[decision].values()){
        for(const genre of title.genres)addItem(counts.genres,genre.id,genre.name);
        for(const country of title.countries)addItem(counts.countries,country,country);
        for(const provider of title.providers)addItem(counts.platforms,provider.provider_id,provider.provider_name);
      }
      const sorted=(items:Map<string,StatisticsItem>)=>[...items.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
      return {decision,title_count:decisions[decision].size,genres:sorted(counts.genres),countries:sorted(counts.countries),platforms:sorted(counts.platforms)};
    });
    return {statuses};
  }
  statisticsLabel(decision:StatisticsDecision){return decision==='like'?'Sí':decision==='dislike'?'No':decision==='seen'?'Visto':'Match';}
  statisticsIcon(decision:StatisticsDecision){return decision==='like'||decision==='match'?'heart':decision==='dislike'?'x':'eye';}
  statisticsItems(bucket:StatisticsBucket,dimension:'genres'|'countries'|'platforms'){return bucket[dimension].slice(0,6);}
  statisticsName(dimension:'genres'|'countries'|'platforms',item:StatisticsItem){return dimension==='countries'?this.countryName(String(item.id)):item.name;}
  statisticsPercent(count:number,items:StatisticsItem[]){const max=items.reduce((value,item)=>Math.max(value,item.count),0);return max?Math.max(5,Math.round(count*100/max)):0;}
  private async loadNotifications(){if(this.demo() || !this.user())return;const r=await this.api.get<{notifications:AppNotification[]}>('notifications');if(this.disposed)return;for(const n of r.notifications){const key=String(n.id);if(this.primedNotifications&&!this.notificationIds.has(key)&&!n.read_at&&Number(n.active)===1){this.notify(n.message);if(this.notificationPermission)void this.browserNotification(n);}this.notificationIds.add(key);}this.primedNotifications=true;this.notifications.set(r.notifications);}
  async openNotifications(){this.showNotifications.set(true);try{await this.loadNotifications();}catch(e){this.setError(e);}}
  async readNotifications(){await this.operation(async()=>{const ids=this.notifications().filter(n=>!n.read_at).map(n=>Number(n.id));if(!this.demo()&&ids.length)await this.api.post('read_notifications',{ids});this.notifications.update(all=>all.map(n=>({...n,read_at:n.read_at ?? new Date().toISOString()})));});}
  async notificationClick(n:AppNotification){this.showNotifications.set(false);const id=Number(n.group_id);if(this.groupId()!==id)await this.switchGroup(String(id));await this.navigate('matches');if(!n.read_at&&!this.demo()){try{await this.api.post('read_notifications',{ids:[Number(n.id)]});this.notifications.update(all=>all.map(x=>x.id===n.id?{...x,read_at:new Date().toISOString()}:x));}catch(e){this.setError(e);}}}
  private polling=false;
  private async poll(){if(this.polling||this.busy()||!this.user()||this.demo()||!this.online()||document.visibilityState!=='visible')return;this.polling=true;try{
    await this.loadNotifications();const id=this.groupId();if(id){const visible=this.view()==='platforms'?[...this.platformTitles(),...this.deck()]:this.view()==='news'?[...this.newsTitles(),...this.deck()]:this.view()==='filter'?[...this.filterTitles(),...this.deck()]:[...this.deck(),...this.platformTitles()];const keys=[...new Set(visible.map(titleKey))].slice(0,60).join(',');const r=await this.api.get<{group:Group;hidden:string[];seen:string[];priority_keys:string[]}>('state',{group_id:id,titles:keys,media_type:this.discoverMedia()});if(id!==this.groupId()||this.busy())return;const version=this.group()?.filter_version;this.groups.update(all=>all.map(g=>g.id===id?r.group:g));this.deck.update(all=>all.filter(t=>!r.hidden.includes(`${t.media_type}:${t.id}`)));this.preloadNextPosters();this.platformTitles.update(all=>all.filter(t=>!(r.seen ?? []).includes(titleKey(t))));this.newsTitles.update(all=>all.filter(t=>!r.hidden.includes(`${t.media_type}:${t.id}`)&&!(r.seen ?? []).includes(titleKey(t))));this.filterTitles.update(all=>all.filter(t=>!r.hidden.includes(titleKey(t))&&!(r.seen ?? []).includes(titleKey(t))));
      if(version!==r.group.filter_version){const prefix=id+':';for(const key of this.localVoteKeys)if(key.startsWith(prefix))this.localVoteKeys.delete(key);if(this.view()==='discover')await this.reloadDeck();if(this.view()==='platforms'){this.catalog.set(null);await this.loadPlatformFeed();}if(this.view()==='news')await this.loadNews();if(this.view()==='filter'&&this.filterHasSearched())await this.searchFilter();}
      if(this.view()==='discover')await this.refreshPriorities(r.priority_keys ?? []);
      if(this.view()==='matches')await this.loadMatches();if(this.view()==='favorites')await this.loadFavorites();if(this.view()==='statistics')await this.loadStatistics();}
    if(this.telegramLink){const b=await this.api.get<Bootstrap>('bootstrap');this.telegram.set(b.telegram);if(b.telegram.linked)this.telegramLink='';}
  }catch(e){if(e instanceof ApiError && e.status===403){this.groupId.set(null);await this.bootstrap();}/* Temporary poll failures leave the current screen usable. */}finally{this.polling=false;}}
  async linkTelegram(){await this.operation(async()=>{if(this.demo()){this.notify('Conecta Telegram cuando uses una cuenta real.');return;}const r=await this.api.post<{url:string}>('telegram_link',{});this.telegramLink=r.url;});}
  async unlinkTelegram(){await this.operation(async()=>{const r=await this.api.post<{telegram:TelegramStatus}>('telegram_unlink',{});this.telegram.set(r.telegram);this.telegramLink='';this.notify('Telegram desconectado de Pelis en pareja.');});}
  async toggleTelegram(){await this.operation(async()=>{const r=await this.api.post<{telegram:TelegramStatus}>('telegram_preferences',{enabled:!this.telegram().enabled});this.telegram.set(r.telegram);});}
  async verifyEmail(){await this.operation(async()=>{await this.api.verify();this.notify('Correo de verificación enviado.');});}
  async refreshEmail(){await this.operation(async()=>{await this.api.refreshUser();this.emailVerified.set(!!this.api.firebaseAuth.currentUser?.emailVerified);if(this.emailVerified())await this.bootstrap();else this.notify('El correo todavía no está verificado.');});}
  async updateApp(){try{await this.updates.activateUpdate();location.reload();}catch{this.notify('No se pudo actualizar. Cierra y vuelve a abrir la app.');}}
  async install(){const p=this.installPrompt();if(p){await p.prompt();await p.userChoice;this.installPrompt.set(null);}else this.notify('En iPhone: Compartir → Añadir a la pantalla de inicio. En otros navegadores: menú → Instalar aplicación.');}
  async enableNotifications(){if(!('Notification' in window)){this.notify('Este navegador no permite avisos. Puedes conectar Telegram.');return;}try{const permission=await Notification.requestPermission();this.notificationPermission=permission==='granted';this.notify(this.notificationPermission?'Avisos activados mientras la app está abierta. Para recibirlos con la app cerrada, conecta Telegram.':'Puedes seguir viendo tus avisos dentro de la app.');}catch{this.notify('Instala la PWA o conecta Telegram para recibir avisos.');}}
  private async browserNotification(n:AppNotification){try{const reg=await navigator.serviceWorker.getRegistration();if(reg)await reg.showNotification('¡Tenéis un match!',{body:n.message,icon:'icons/icon-192.png',tag:'pp-'+n.id});else new Notification('¡Tenéis un match!',{body:n.message,tag:'pp-'+n.id});}catch{/* In-app and Telegram notifications remain available. */}}
  image(path:string | null,size='w780'){return path ? `https://image.tmdb.org/t/p/${size}${path}` : 'icons/icon.svg';}
  safeWatch(url:string){try{const u=new URL(url);return u.protocol==='https:'&&['www.themoviedb.org','themoviedb.org'].includes(u.hostname)?u.href:'https://www.themoviedb.org';}catch{return 'https://www.themoviedb.org';}}
  private preloadNextPosters(titles=this.deck()){
    const sources=new Set(titles.slice(1,4).map(title=>title.poster_path?this.image(title.poster_path):'').filter(Boolean));
    for(const source of this.posterPreloads.keys())if(!sources.has(source))this.posterPreloads.delete(source);
    for(const source of sources)if(!this.posterPreloads.has(source)){const image=new Image();image.decoding='async';image.fetchPriority='high';image.src=source;this.posterPreloads.set(source,image);}
  }
  countryNames(codes:string[]){return codes.map(c=>this.countryName(c)).join(', ');}
  initial(name:string){return (name.trim()[0] || '?').toUpperCase();}
  greet(){return this.user()?.display_name.split(' ')[0] || 'cinéfilo';}
  closeOverlays(){this.closeMobileMenu();this.showDetail.set(false);this.showNotifications.set(false);this.showMatch.set(null);this.confirmation.set(null);if(this.group())this.showGroupForm.set(false);}
}
