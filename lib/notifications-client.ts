import { auth } from './firebase';
import { AuthApiError, RateLimitError } from './auth-api-client';

// Types för notifikationer
export interface Notification {
  id: string;
  userId: string;
  type: 'booking' | 'system' | 'payment' | 'driver' | 'admin';
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read: boolean;
  createdAt: string;
  readAt?: string;
  sentBy?: string;
  source?: string;
}

export interface NotificationCounts {
  total: number;
  unread: number;
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  counts: NotificationCounts;
}

class NotificationsClient {
  private baseUrl = '';
  private eventListeners: Map<string, Function[]> = new Map();

  // Hämta auth token från Firebase
  private async getAuthToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
      throw new AuthApiError('User not authenticated', 401, 'NO_AUTH');
    }
    
    try {
      return await user.getIdToken(true);
    } catch (error) {
      throw new AuthApiError('Failed to get auth token', 401, 'TOKEN_ERROR');
    }
  }

  // Generic API request method
  private async apiRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${this.baseUrl}/api/notifications${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      // Handle rate limiting
      if (response.status === 429) {
        throw new RateLimitError(
          data.error || 'Too many requests',
          data.resetIn || 60
        );
      }

      // Handle other errors
      if (!response.ok) {
        throw new AuthApiError(
          data.error || 'API request failed',
          response.status,
          data.code,
          data.details
        );
      }

      return data;
    } catch (error) {
      if (error instanceof AuthApiError || error instanceof RateLimitError) {
        throw error;
      }
      
      // Network or other errors
      throw new AuthApiError(
        'Network error or server unavailable',
        500,
        'NETWORK_ERROR'
      );
    }
  }

  // Event system för real-time updates
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Hämta notifikationer
  async getNotifications(options: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
    type?: 'booking' | 'system' | 'payment' | 'driver' | 'admin';
  } = {}): Promise<NotificationResponse> {
    const params = new URLSearchParams();
    
    if (options.unreadOnly) params.set('unreadOnly', 'true');
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());
    if (options.type) params.set('type', options.type);

    const queryString = params.toString();
    const endpoint = queryString ? `?${queryString}` : '';
    
    const response = await this.apiRequest<NotificationResponse>(endpoint);
    
    // Emit event för UI updates
    this.emit('notificationsLoaded', response);
    
    return response;
  }

  // Markera notifikationer som lästa
  async markAsRead(notificationIds: string[]): Promise<{ updatedCount: number }> {
    const response = await this.apiRequest('', {
      method: 'PUT',
      body: JSON.stringify({
        notificationIds,
        action: 'read'
      }),
    });

    // Emit event för UI updates
    this.emit('notificationsRead', { notificationIds, count: response.updatedCount });
    
    return response;
  }

  // Markera notifikationer som olästa
  async markAsUnread(notificationIds: string[]): Promise<{ updatedCount: number }> {
    const response = await this.apiRequest('', {
      method: 'PUT',
      body: JSON.stringify({
        notificationIds,
        action: 'unread'
      }),
    });

    // Emit event för UI updates
    this.emit('notificationsUnread', { notificationIds, count: response.updatedCount });
    
    return response;
  }

  // Ta bort notifikationer
  async deleteNotifications(notificationIds: string[]): Promise<{ updatedCount: number }> {
    const response = await this.apiRequest('', {
      method: 'PUT',
      body: JSON.stringify({
        notificationIds,
        action: 'delete'
      }),
    });

    // Emit event för UI updates
    this.emit('notificationsDeleted', { notificationIds, count: response.updatedCount });
    
    return response;
  }

  // Ta bort alla notifikationer
  async deleteAllNotifications(readOnly: boolean = false): Promise<{ deletedCount: number }> {
    const params = readOnly ? '?readOnly=true' : '';
    const response = await this.apiRequest(params, {
      method: 'DELETE',
    });

    // Emit event för UI updates
    this.emit('allNotificationsDeleted', { count: response.deletedCount, readOnly });
    
    return response;
  }

  // Skicka notifikation (endast för admin)
  async sendNotification(notification: {
    userId: string;
    type: 'booking' | 'system' | 'payment' | 'driver' | 'admin';
    title: string;
    message: string;
    data?: Record<string, any>;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  }): Promise<{ notificationId: string }> {
    const response = await this.apiRequest('', {
      method: 'POST',
      body: JSON.stringify(notification),
    });

    // Emit event för UI updates
    this.emit('notificationSent', response);
    
    return response;
  }

  // Hämta endast antal notifikationer
  async getNotificationCounts(): Promise<NotificationCounts> {
    const response = await this.getNotifications({ limit: 1 });
    return response.counts;
  }

  // Utility methods
  formatNotificationTime(createdAt: string): string {
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'Nu';
    } else if (diffMins < 60) {
      return `${diffMins}min`;
    } else if (diffHours < 24) {
      return `${diffHours}tim`;
    } else if (diffDays < 7) {
      return `${diffDays}d`;
    } else {
      return date.toLocaleDateString('sv-SE', {
        day: 'numeric',
        month: 'short'
      });
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'booking': return '🚗';
      case 'system': return '⚙️';
      case 'payment': return '💳';
      case 'driver': return '👨‍💼';
      case 'admin': return '🔧';
      default: return '📢';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'normal': return 'text-blue-400';
      case 'low': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  }

  getPriorityBgColor(priority: string): string {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 border-red-500/20';
      case 'high': return 'bg-orange-500/10 border-orange-500/20';
      case 'normal': return 'bg-blue-500/10 border-blue-500/20';
      case 'low': return 'bg-gray-500/10 border-gray-500/20';
      default: return 'bg-gray-500/10 border-gray-500/20';
    }
  }

  // Polling för real-time updates
  startPolling(intervalMs: number = 30000): { stop: () => void } {
    let intervalId: NodeJS.Timeout | null = null;
    let isPolling = false;

    const poll = async () => {
      if (isPolling) return; // Förhindra concurrent polls
      
      try {
        isPolling = true;
        const counts = await this.getNotificationCounts();
        this.emit('countsUpdated', counts);
      } catch (error) {
        console.warn('Notification polling failed:', error);
        this.emit('pollingError', error);
      } finally {
        isPolling = false;
      }
    };

    // Initial poll
    poll();

    // Start interval
    intervalId = setInterval(poll, intervalMs);

    return {
      stop: () => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };
  }

  // Batch operations
  async batchMarkAsRead(notifications: Notification[]): Promise<void> {
    const unreadIds = notifications
      .filter(n => !n.read)
      .map(n => n.id);
    
    if (unreadIds.length > 0) {
      await this.markAsRead(unreadIds);
    }
  }

  async batchDelete(notifications: Notification[]): Promise<void> {
    const ids = notifications.map(n => n.id);
    if (ids.length > 0) {
      await this.deleteNotifications(ids);
    }
  }

  // Filter helpers
  filterByType(notifications: Notification[], type: string): Notification[] {
    return notifications.filter(n => n.type === type);
  }

  filterByPriority(notifications: Notification[], priority: string): Notification[] {
    return notifications.filter(n => n.priority === priority);
  }

  filterUnread(notifications: Notification[]): Notification[] {
    return notifications.filter(n => !n.read);
  }

  sortByDate(notifications: Notification[], ascending: boolean = false): Notification[] {
    return [...notifications].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  sortByPriority(notifications: Notification[]): Notification[] {
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
    return [...notifications].sort((a, b) => {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}

// Export singleton instance
export const notificationsClient = new NotificationsClient();

// Export types and error classes
export { AuthApiError, RateLimitError };
