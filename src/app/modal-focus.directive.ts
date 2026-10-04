import { AfterViewInit, Directive, ElementRef, inject, OnDestroy } from '@angular/core';
@Directive({selector:'[modalFocus]',standalone:true})
export class ModalFocusDirective implements AfterViewInit,OnDestroy {
  private host: HTMLElement=inject(ElementRef).nativeElement;
  private previous=document.activeElement as HTMLElement | null;
  private previousOverflow=document.body.style.overflow;
  private frame=0;
  private key=(event:KeyboardEvent)=>{
    if(event.key!=='Tab')return;
    const elements=this.focusable();const first=elements[0],last=elements[elements.length-1];
    if(!first){event.preventDefault();this.host.focus();return;}
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===this.host)){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||!this.host.contains(document.activeElement))){event.preventDefault();first.focus();}
  };
  private focusable(){return [...this.host.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length>0);}
  ngAfterViewInit(){document.body.style.overflow='hidden';this.host.tabIndex=-1;document.addEventListener('keydown',this.key,true);this.frame=requestAnimationFrame(()=>{(this.host.querySelector<HTMLElement>('[autofocus]')||this.focusable()[0]||this.host).focus();});}
  ngOnDestroy(){cancelAnimationFrame(this.frame);document.removeEventListener('keydown',this.key,true);document.body.style.overflow=this.previousOverflow;requestAnimationFrame(()=>{if(this.previous?.isConnected&&!this.previous.closest('[inert]'))this.previous.focus();else document.querySelector<HTMLElement>('.movie-card')?.focus();});}
}
