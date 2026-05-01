import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';

// ── Types ────────────────────────────────────────────────────────────────────
export interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface ChatApiResponse {
  reply: string;
  sessionId: string;
  contextUsed: string[];
}

// ── Component ────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-ai-assistant',
  standalone: false,
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.scss'],
})
export class AiAssistantComponent implements OnInit, OnDestroy, AfterViewChecked {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  @ViewChild('messageList') private messageListRef!: ElementRef<HTMLDivElement>;

  // ── UI State ──────────────────────────────────────────────────────────────
  isOpen = false;
  isTyping = false;
  inputText = '';
  messages: Message[] = [];
  sessionId = '';
  quickActions: string[] = [];

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.sessionId = this.generateGuid();
    this.pushWelcomeMessage();
    this.initQuickActions();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Public API ────────────────────────────────────────────────────────────
  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.shouldScrollToBottom = true;
    }
  }

  closeChat(): void {
    this.isOpen = false;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage(overrideText?: string): void {
    const text = overrideText ? overrideText.trim() : this.inputText.trim();
    if (!text || this.isTyping) return;

    // 1. Append user message to the UI
    this.messages.push({ sender: 'user', text, timestamp: new Date() });
    if (!overrideText) {
      this.inputText = '';
    }
    this.shouldScrollToBottom = true;

    // 2. Show typing indicator
    this.isTyping = true;

    // 3. Resolve the user's role from the JWT
    const role = this.authService.getUserRole() ?? 'user';

    // 4. POST to the AI service through the Ocelot gateway
    const token = this.authService.getAccessToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    this.http
      .post<ChatApiResponse>(API_ENDPOINTS.ai.chat(), {
        message: text,
        role: role,
        sessionId: this.sessionId,
      }, { headers })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isTyping = false;
          this.shouldScrollToBottom = true;
        })
      )
      .subscribe({
        next: (response) => {
          // 5. Remove typing indicator (done by finalize) and append AI reply
          this.messages.push({
            sender: 'ai',
            text: response.reply,
            timestamp: new Date(),
          });
        },
        error: (err) => {
          console.error('AI chat error:', err);
          this.messages.push({
            sender: 'ai',
            text: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.',
            timestamp: new Date(),
          });
        },
      });
  }

  clearChat(): void {
    this.messages = [];
    this.sessionId = this.generateGuid(); // new session on clear
    this.pushWelcomeMessage();
  }

  trackByIndex(index: number): number {
    return index;
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  private pushWelcomeMessage(): void {
    this.messages.push({
      sender: 'ai',
      text: 'Hi! I am your HUL Assistant. How can I help you today?',
      timestamp: new Date(),
    });
  }

  private initQuickActions(): void {
    const role = this.authService.getUserRole();
    switch (role) {
      case 'Dealer':
        this.quickActions = ['Track Order', 'Check Purchase Limit', 'Return Policy'];
        break;
      case 'DeliveryAgent':
        this.quickActions = ['My Active Deliveries', 'Update Status', 'SLA Policy'];
        break;
      case 'Admin':
      case 'SuperAdmin':
        this.quickActions = ['Pending Approvals', 'Dealer Limits', 'System Status'];
        break;
      default:
        this.quickActions = ['How to Register?', 'Contact Support'];
        break;
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.messageListRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { /* ignore */ }
  }

  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
