import { Injectable, signal, type Signal } from '@angular/core';

export interface Toast {
  readonly id: number;
  readonly message: string;
}

/** How long a success message stays on screen. */
export const TOAST_DURATION_MS = 5000;

/** Short success messages («Cliente creado», «Simulación guardada», spec 05 §2), read by `app-toast-region`. */
@Injectable({ providedIn: 'root' })
export class ToastStore {
  private readonly items = signal<readonly Toast[]>([]);
  private nextId = 1;

  readonly toasts: Signal<readonly Toast[]> = this.items.asReadonly();

  success(message: string): void {
    const toast = { id: this.nextId++, message };
    this.items.update((items) => [...items, toast]);
    setTimeout(() => {
      this.dismiss(toast.id);
    }, TOAST_DURATION_MS);
  }

  dismiss(id: number): void {
    this.items.update((items) => items.filter((item) => item.id !== id));
  }
}
