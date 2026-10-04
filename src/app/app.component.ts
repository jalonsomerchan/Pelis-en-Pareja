import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiError, ApiService } from './api.service';
import { AppNotification, AppUser, Bootstrap, Catalog, Decision, Deck, Group, InstallPrompt, Invitation, Match, TelegramStatus, Title, View } from './models';
import { DEMO_CATALOG, DEMO_GROUP, DEMO_TITLES } from './demo';
import { duration, swipeDecision } from './swipe';
import { ModalFocusDirective } from './modal-focus.directive';
import { SwUpdate } from '@angular/service-worker';

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
  readonly loadingDeck = signal(false);
  readonly deck = signal<Title[]>([]);
  readonly current = computed(() => this.deck()[0] ?? null);
  readonly matches = signal<Match[]>([]);
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
  readonly showMatch = signal<Title | null>(null);
  readonly confirmation = signal<{message:string;action:()=>Promise<void>} | null>(null);
  readonly online = signal(navigator.onLine);
  readonly installPrompt = signal<InstallPrompt | null>(null);
  readonly installed = signal(window.matchMedia('(display-mode: standalone)').matches);
  readonly swipeX = signal(0);
  readonly animateDecision = signal<Decision | null>(null);
  readonly catalogBusy = signal(false);
  readonly settingsTab = signal<'platforms'|'filters'>('platforms');
  readonly emailVerified = signal(false);
  readonly duration = duration;
  readonly tabs: {id:View;label:string;icon:string}[] = [{id:'discover',label:'Descubrir',icon:'spark'},{id:'matches',label:'Matches',icon:'heart'},{id:'group',label:'Mi grupo',icon:'people'},{id:'settings',label:'Ajustes',icon:'sliders'}];
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
  private updateSubscription = this.updates.versionUpdates.subscribe(event=>{if(event.type==='VERSION_READY')this.updateAvailable.set(true);});
  private notificationPermission = false;
  private disposed = false;
  private authUnsubscribe: (()=>void) | null = null;
  private networkListener = () => {this.online.set(navigator.onLine); if(navigator.onLine) void this.poll();};
  private installListener = (event:Event) => {event.preventDefault();this.installPrompt.set(event as InstallPrompt);};
  private installedListener = () => {this.installed.set(true);this.installPrompt.set(null);};
  private keyboardListener = (event:KeyboardEvent) => {
    if(event.key==='Escape'){this.closeOverlays();return;}
    if(!this.user() || this.view()!=='discover' || this.showDetail() || this.showNotifications() || this.showMatch() || this.showGroupForm() || this.confirmation()) return;
    if((event.target as HTMLElement)?.closest('input,textarea,select,button,a')) return;
    if(event.key==='ArrowRight'){event.preventDefault();void this.vote('like');}
    if(event.key==='ArrowLeft'){event.preventDefault();void this.vote('dislike');}
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
    if(chosen){this.groupId.set(chosen.id);this.setDraft(chosen);await this.refreshView();}else this.showGroupForm.set(true);
    const token=new URL(location.href).searchParams.get('invitation');
    if(token && this.emailVerified()){await this.acceptInvitation(undefined,token);const url=new URL(location.href);url.searchParams.delete('invitation');history.replaceState(null,'',url);}
    await this.loadNotifications();
  }
  enterDemo(){this.demoVotes.clear();this.demo.set(true);this.error.set('');this.initializing.set(false);this.user.set({uid:'demo',display_name:'Tú',email:'demo@ejemplo.es',photo_url:''});this.groups.set([structuredClone(DEMO_GROUP)]);this.groupId.set(1);this.catalog.set(structuredClone(DEMO_CATALOG));this.matches.set([]);this.notifications.set([]);this.invitations.set([]);this.tmdbConfigured.set(true);this.telegram.set({configured:false,linked:false,enabled:true,username:null});this.view.set('discover');this.setDraft(this.group()!);this.deck.set(structuredClone(DEMO_TITLES));this.nextPage=null;this.notify('Modo demo: los votos y matches son una simulación.');}
  private clearSession(){this.epoch++;this.user.set(null);this.groups.set([]);this.groupId.set(null);this.deck.set([]);this.matches.set([]);this.notifications.set([]);this.invitations.set([]);this.catalog.set(null);this.showGroupForm.set(false);this.closeOverlays();this.primedNotifications=false;this.notificationIds.clear();}
  async logout(){await this.operation(async()=>{if(!this.demo())await this.api.logout();this.demo.set(false);this.clearSession();this.view.set('discover');});}
  async switchGroup(value:string){if(this.busy())return;const id=Number(value);if(!this.groups().some(g=>g.id===id))return;this.epoch++;this.groupId.set(id);if(!this.demo())localStorage.setItem('pelis.activeGroup',String(id));this.catalog.set(null);this.setDraft(this.group()!);this.showDetail.set(false);this.showMatch.set(null);this.error.set('');await this.refreshView();}
  async navigate(view:View){this.view.set(view);this.error.set('');this.showNotifications.set(false);await this.refreshView();}
  private async refreshView(){if(this.view()==='discover')await this.reloadDeck();if(this.view()==='matches')await this.loadMatches();if(this.view()==='settings')await this.loadCatalog();}
  setDraft(g:Group){this.draft={name:g.name,region:g.region,media_type:g.media_type,providers:[...g.providers],excluded_genres:[...g.excluded_genres],excluded_countries:[...g.excluded_countries]};}
  private updateGroup(group:Group){this.groups.update(all=>all.some(g=>g.id===group.id)?all.map(g=>g.id===group.id?group:g):[...all,group]);this.setDraft(group);}
  async createGroup(){await this.operation(async()=>{if(this.demo()){this.notify('Crea una cuenta para guardar un grupo real.');return;}const result=await this.api.post<{group:Group}>('create_group',{name:this.groupName.trim()});this.updateGroup(result.group);this.groupId.set(result.group.id);localStorage.setItem('pelis.activeGroup',String(result.group.id));this.showGroupForm.set(false);this.groupName='';this.view.set('settings');this.catalog.set(null);await this.loadCatalog();this.notify('Grupo creado. Elige vuestras plataformas e invita a tu pareja.');});}
  async joinGroup(){await this.operation(async()=>{if(this.demo()){this.notify('Crea una cuenta para unirte a un grupo real.');return;}const r=await this.api.post<{group:Group}>('join_group',{code:this.joinCode.trim()});this.updateGroup(r.group);this.groupId.set(r.group.id);this.showGroupForm.set(false);this.joinCode='';this.catalog.set(null);this.view.set('discover');await this.reloadDeck();this.notify('Ya estás en el grupo.');});}
  async acceptInvitation(id?:number,token?:string){if(this.demo())return;try{const r=await this.api.post<{group:Group}>('accept_invite',token ? {token} : {invitation_id:id});this.updateGroup(r.group);this.groupId.set(r.group.id);this.invitations.update(all=>all.filter(i=>i.id!==id && i.group_id!==r.group.id));this.showGroupForm.set(false);this.catalog.set(null);await this.refreshView();this.notify('Invitación aceptada. ¡A elegir juntos!');}catch(e){this.setError(e);}}
  async invite(){await this.operation(async()=>{if(this.demo()){this.notify('Las invitaciones se enviarán cuando uses una cuenta real.');return;}const r=await this.api.post<{group:Group;email_sent:boolean;invite_url:string;message:string}>('invite_email',{group_id:this.groupId(),email:this.inviteEmail.trim()});this.updateGroup(r.group);this.inviteLink=r.invite_url;this.inviteEmail='';this.notify(r.message);});}
  async cancelInvite(id:number){await this.operation(async()=>{const r=await this.api.post<{group:Group}>('cancel_invite',{group_id:this.groupId(),invitation_id:id});this.updateGroup(r.group);this.notify('Invitación cancelada.');});}
  async copy(text:string){try{await navigator.clipboard.writeText(text);this.notify('Copiado al portapapeles.');}catch{this.notify('No se pudo copiar. Selecciona y copia el texto.');}}
  async shareGroup(){const g=this.group();if(!g)return;const text=`Únete a «${g.name}» en Pelis en pareja con el código ${g.invite_code}. ${location.origin}${location.pathname}`;try{if(navigator.share)await navigator.share({title:'Pelis en pareja',text});else await this.copy(text);}catch{/* Closing a share sheet needs no message. */}}
  confirm(message:string,action:()=>Promise<void>){this.confirmation.set({message,action});}
  async confirmAction(){const c=this.confirmation();if(!c)return;this.confirmation.set(null);await this.operation(c.action);}
  requestRotate(){this.confirm('¿Generar un código nuevo? El código actual dejará de funcionar.',async()=>{if(this.demo())return;const r=await this.api.post<{group:Group}>('rotate_code',{group_id:this.groupId()});this.updateGroup(r.group);this.notify('Código renovado.');});}
  requestRemove(uid:string){const self=uid===this.user()?.uid;this.confirm(self?'¿Salir del grupo? Si lo creaste, otro miembro se convertirá en propietario. Si eres la última persona, el grupo se eliminará.':'¿Quitar a esta persona del grupo? Se recalcularán los matches entre los miembros restantes.',async()=>{if(this.demo()){this.notify('Acción disponible con una cuenta real.');return;}await this.api.post('remove_member',{group_id:this.groupId(),uid});this.groupId.set(null);this.deck.set([]);this.matches.set([]);await this.bootstrap();});}
  async loadCatalog(){if(this.catalog() || !this.group())return;if(this.demo()){this.catalog.set(structuredClone(DEMO_CATALOG));return;}this.catalogBusy.set(true);const id=this.groupId()!;try{const c=await this.api.get<Catalog>('catalog',{group_id:id,region:this.draft.region});if(id===this.groupId())this.catalog.set(c);}catch(e){this.setError(e);}finally{this.catalogBusy.set(false);}}
  async regionChanged(){this.catalog.set(null);this.draft.providers=[];await this.loadCatalog();}
  filteredProviders(){const q=this.providerSearch.trim().toLowerCase();return this.catalog()?.providers.filter(p=>p.provider_name.toLowerCase().includes(q)) ?? [];}
  filteredCountries(){const q=this.countrySearch.trim().toLowerCase();return this.catalog()?.countries.filter(c=>(this.countryName(c.iso_3166_1)+' '+c.english_name).toLowerCase().includes(q)) ?? [];}
  allGenres(){const c=this.catalog();const all=[...(c?.movie_genres ?? []),...(c?.tv_genres ?? [])];return all.filter((g,i)=>all.findIndex(x=>x.id===g.id)===i).sort((a,b)=>a.name.localeCompare(b.name,'es'));}
  countryName(code:string){try{return new Intl.DisplayNames(['es'],{type:'region'}).of(code) || code;}catch{return code;}}
  toggleProvider(id:number){this.draft.providers=this.toggle(this.draft.providers,id);}
  toggleGenre(id:number){this.draft.excluded_genres=this.toggle(this.draft.excluded_genres,id);}
  toggleCountry(code:string){this.draft.excluded_countries=this.toggle(this.draft.excluded_countries,code);}
  private toggle<T>(values:T[],v:T){return values.includes(v)?values.filter(x=>x!==v):[...values,v];}
  async saveSettings(){await this.operation(async()=>{if(!this.draft.providers.length)throw new Error('Selecciona al menos una plataforma.');const g=this.group();if(!g)return;
    if(this.demo()){this.updateGroup({...g,...structuredClone(this.draft),filter_version:g.filter_version+1});this.notify('Preferencias de la demo actualizadas.');}
    else{const r=await this.api.post<{group:Group}>('settings',{group_id:g.id,...this.draft});this.updateGroup(r.group);this.notify('Preferencias guardadas para todo el grupo.');}
    this.view.set('discover');await this.reloadDeck();
  });}
  async reloadDeck(){this.epoch++;this.deck.set([]);this.nextPage=1;await this.loadMore();}
  async loadMore(){if(this.loadingDeck() || !this.group())return;if(this.demo()){const g=this.group()!;this.deck.set(structuredClone(DEMO_TITLES).filter(t=>!this.demoVotes.has(t.media_type+':'+t.id)&&(g.media_type==='both'||g.media_type===t.media_type)&&!t.genres.some(x=>g.excluded_genres.includes(x.id))&&!t.countries.some(c=>g.excluded_countries.includes(c))&&t.providers.some(p=>g.providers.includes(p.provider_id))));this.nextPage=null;return;}
    if(this.nextPage===null || !this.tmdbConfigured())return;const epoch=this.epoch;const id=this.groupId()!;this.loadingDeck.set(true);this.error.set('');
    try{let rounds=0;do{const r: Deck=await this.api.get<Deck>('discover',{group_id:id,page:this.nextPage ?? 1});if(epoch!==this.epoch)return;this.nextPage=r.next_page;this.deck.update(all=>{const known=new Set(all.map(t=>t.media_type+':'+t.id));return [...all,...r.titles.filter(t=>!known.has(t.media_type+':'+t.id))];});if(this.group()?.filter_version!==r.filter_version){this.groups.update(all=>all.map(g=>g.id===id?{...g,filter_version:r.filter_version}:g));}rounds++;}while(!this.deck().length && this.nextPage!==null && rounds<3);}catch(e){this.setError(e);}finally{this.loadingDeck.set(false);if(epoch!==this.epoch && this.user() && this.group() && this.view()==='discover')void this.loadMore();}
  }
  canLoadMore(){return this.nextPage!==null;}
  async vote(decision:Decision,title=this.current()){if(!title || this.busy() || (!this.online()&&!this.demo()))return;this.busy.set(true);this.error.set('');this.swipeX.set(0);
    try{let matches:Match[]=[];if(this.demo()){this.demoVotes.set(title.media_type+':'+title.id,decision);if(decision==='like'){const m={id:title.id,created_at:new Date().toISOString(),title};this.matches.update(all=>all.some(x=>x.title.id===title.id && x.title.media_type===title.media_type)?all:[m,...all]);matches=[m];this.groups.update(all=>all.map(g=>({...g,match_count:this.matches().length})));}else if(decision==='seen')this.matches.update(all=>all.filter(m=>!(m.title.id===title.id && m.title.media_type===title.media_type)));this.groups.update(all=>all.map(g=>({...g,match_count:this.matches().length})));}
      else{const r=await this.api.post<{saved:boolean;matches:Match[]}>('vote',{group_id:this.groupId(),media_type:title.media_type,tmdb_id:title.id,decision});matches=r.matches;}
      this.animateDecision.set(decision);await new Promise(resolve=>setTimeout(resolve,window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:220));
      this.deck.update(all=>all.filter(t=>!(t.id===title.id && t.media_type===title.media_type)));this.showDetail.set(false);if(matches.length){this.showMatch.set(title);this.groups.update(all=>all.map(g=>g.id===this.groupId()?{...g,match_count:g.match_count+(this.demo()?0:matches.length)}:g));await this.loadNotifications();}else if(decision==='seen')this.notify('Marcada como vista. No volverá a salir a nadie del grupo.');
      if(this.view()==='matches')await this.loadMatches();
    }catch(e){if(e instanceof ApiError && e.code==='ALREADY_SEEN'){this.deck.update(all=>all.filter(t=>t.id!==title.id||t.media_type!==title.media_type));this.notify('Otra persona del grupo ya la ha marcado como vista.');}else if(e instanceof ApiError && e.code==='DECK_STALE'){await this.reloadDeck();this.notify('Hemos actualizado las propuestas con los nuevos filtros.');}else this.setError(e);}finally{this.busy.set(false);this.animateDecision.set(null);}
    if(this.deck().length<3 && this.nextPage!==null)void this.loadMore();
  }
  pointerDown(e:PointerEvent){if(this.busy()||(e.target as HTMLElement).closest('button,a'))return;this.dragging={id:e.pointerId,x:e.clientX,y:e.clientY};(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);}
  pointerMove(e:PointerEvent){if(this.dragging?.id===e.pointerId)this.swipeX.set(e.clientX-this.dragging.x);}
  pointerUp(e:PointerEvent){if(this.dragging?.id!==e.pointerId)return;const d=swipeDecision(e.clientX-this.dragging.x,e.clientY-this.dragging.y);this.dragging=null;this.swipeX.set(0);if(d)void this.vote(d);}
  pointerCancel(){this.dragging=null;this.swipeX.set(0);}
  cardTransform(){const x=this.swipeX();return `translateX(${x}px) rotate(${x/24}deg)`;}
  async loadMatches(){if(!this.group() || this.demo())return;const id=this.groupId()!;try{const r=await this.api.get<{matches:Match[]}>('matches',{group_id:id});if(id===this.groupId()){this.matches.set(r.matches);this.groups.update(all=>all.map(g=>g.id===id?{...g,match_count:r.matches.length}:g));}}catch(e){this.setError(e);}}
  private async loadNotifications(){if(this.demo() || !this.user())return;const r=await this.api.get<{notifications:AppNotification[]}>('notifications');if(this.disposed)return;for(const n of r.notifications){const key=String(n.id);if(this.primedNotifications&&!this.notificationIds.has(key)&&!n.read_at&&Number(n.active)===1){this.notify(n.message);if(this.notificationPermission)void this.browserNotification(n);}this.notificationIds.add(key);}this.primedNotifications=true;this.notifications.set(r.notifications);}
  async openNotifications(){this.showNotifications.set(true);try{await this.loadNotifications();}catch(e){this.setError(e);}}
  async readNotifications(){await this.operation(async()=>{const ids=this.notifications().filter(n=>!n.read_at).map(n=>Number(n.id));if(!this.demo()&&ids.length)await this.api.post('read_notifications',{ids});this.notifications.update(all=>all.map(n=>({...n,read_at:n.read_at ?? new Date().toISOString()})));});}
  async notificationClick(n:AppNotification){this.showNotifications.set(false);const id=Number(n.group_id);if(this.groupId()!==id)await this.switchGroup(String(id));await this.navigate('matches');if(!n.read_at&&!this.demo()){try{await this.api.post('read_notifications',{ids:[Number(n.id)]});this.notifications.update(all=>all.map(x=>x.id===n.id?{...x,read_at:new Date().toISOString()}:x));}catch(e){this.setError(e);}}}
  private polling=false;
  private async poll(){if(this.polling||this.busy()||!this.user()||this.demo()||!this.online()||document.visibilityState!=='visible')return;this.polling=true;try{
    await this.loadNotifications();const id=this.groupId();if(id){const keys=this.deck().slice(0,60).map(t=>`${t.media_type}:${t.id}`).join(',');const r=await this.api.get<{group:Group;hidden:string[]}>('state',{group_id:id,titles:keys});if(id!==this.groupId())return;const version=this.group()?.filter_version;this.groups.update(all=>all.map(g=>g.id===id?r.group:g));this.deck.update(all=>all.filter(t=>!r.hidden.includes(`${t.media_type}:${t.id}`)));if(version!==r.group.filter_version&&this.view()==='discover')await this.reloadDeck();if(this.view()==='matches')await this.loadMatches();}
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
  countryNames(codes:string[]){return codes.map(c=>this.countryName(c)).join(', ');}
  initial(name:string){return (name.trim()[0] || '?').toUpperCase();}
  greet(){return this.user()?.display_name.split(' ')[0] || 'cinéfilo';}
  closeOverlays(){this.showDetail.set(false);this.showNotifications.set(false);this.showMatch.set(null);this.confirmation.set(null);if(this.group())this.showGroupForm.set(false);}
}
