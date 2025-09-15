// Real-time Communication Client for Avanti Booking System
// WebSocket-based real-time updates with intelligent reconnection and offline support

export enum MessageType {
  // Connection management
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  HEARTBEAT = 'heartbeat',
  ACKNOWLEDGE = 'acknowledge',

  // User management
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  USER_TYPING = 'user_typing',
  USER_STATUS = 'user_status',

  // Booking updates
  BOOKING_CREATED = 'booking_created',
  BOOKING_UPDATED = 'booking_updated',
  BOOKING_ASSIGNED = 'booking_assigned',
  BOOKING_STARTED = 'booking_started',
  BOOKING_COMPLETED = 'booking_completed',
  BOOKING_CANCELLED = 'booking_cancelled',

  // Driver updates
  DRIVER_LOCATION = 'driver_location',
  DRIVER_STATUS = 'driver_status',
  DRIVER_ARRIVED = 'driver_arrived',
  DRIVER_MESSAGE = 'driver_message',

  // Payment updates
  PAYMENT_PROCESSING = 'payment_processing',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',

  // System notifications
  SYSTEM_ALERT = 'system_alert',
  MAINTENANCE_MODE = 'maintenance_mode',
  RATE_LIMIT = 'rate_limit',

  // Chat messages
  CHAT_MESSAGE = 'chat_message',
  CHAT_TYPING = 'chat_typing',
  CHAT_READ = 'chat_read',

  // Admin broadcasts
  ADMIN_BROADCAST = 'admin_broadcast',
  EMERGENCY_ALERT = 'emergency_alert'
}

export interface RealtimeMessage {
  id: string;
  type: MessageType;
  timestamp: number;
  userId?: string;
  data: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  requiresAck?: boolean;
  expiresAt?: number;
  retryCount?: number;
}

export interface ConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  lastConnected: number | null;
  connectionAttempts: number;
  latency: number;
  quality: 'excellent' | 'good' | 'poor' | 'critical';
}

export interface RealtimeConfig {
  wsUrl: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  messageTimeout: number;
  enableCompression: boolean;
  enableOfflineQueue: boolean;
  maxOfflineMessages: number;
}

class RealtimeClient {
  private ws: WebSocket | null = null;
  private config: RealtimeConfig;
  private connectionState: ConnectionState = {
    isConnected: false,
    isReconnecting: false,
    lastConnected: null,
    connectionAttempts: 0,
    latency: 0,
    quality: 'critical'
  };

  private messageQueue: RealtimeMessage[] = [];
  private offlineQueue: RealtimeMessage[] = [];
  private pendingAcks = new Map<string, { message: RealtimeMessage; timeout: NodeJS.Timeout }>();
  private subscriptions = new Map<MessageType, Set<Function>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private userId: string | null = null;
  private authToken: string | null = null;

  // Event listeners
  private listeners = new Map<string, Function[]>();

  constructor(config: Partial<RealtimeConfig> = {}) {
    this.config = {
      wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'wss://api.avanti-app.se/ws',
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      messageTimeout: 10000,
      enableCompression: true,
      enableOfflineQueue: true,
      maxOfflineMessages: 100,
      ...config
    };

    this.setupNetworkListeners();
  }

  // Connect to WebSocket server
  async connect(userId: string, authToken: string): Promise<boolean> {
    this.userId = userId;
    this.authToken = authToken;

    return new Promise((resolve) => {
      try {
        const wsUrl = `${this.config.wsUrl}?userId=${userId}&token=${authToken}`;
        this.ws = new WebSocket(wsUrl);

        // Connection opened
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.connectionState.isConnected = true;
          this.connectionState.isReconnecting = false;
          this.connectionState.lastConnected = Date.now();
          this.connectionState.connectionAttempts = 0;
          
          this.startHeartbeat();
          this.processOfflineQueue();
          this.emit('connected', this.connectionState);
          
          resolve(true);
        };

        // Message received
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        // Connection closed
        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.connectionState.isConnected = false;
          this.stopHeartbeat();
          this.emit('disconnected', { code: event.code, reason: event.reason });
          
          if (!event.wasClean && this.connectionState.connectionAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        // Connection error
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
          resolve(false);
        };

      } catch (error) {
        console.error('Failed to connect:', error);
        this.emit('error', error);
        resolve(false);
      }
    });
  }

  // Disconnect from WebSocket server
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'User disconnect');
      this.ws = null;
    }

    this.connectionState.isConnected = false;
    this.connectionState.isReconnecting = false;
    this.emit('disconnected', { code: 1000, reason: 'User disconnect' });
  }

  // Send message
  async sendMessage(
    type: MessageType,
    data: any,
    options: {
      priority?: 'low' | 'normal' | 'high' | 'critical';
      requiresAck?: boolean;
      expiresIn?: number;
      targetUser?: string;
    } = {}
  ): Promise<boolean> {
    const message: RealtimeMessage = {
      id: this.generateMessageId(),
      type,
      timestamp: Date.now(),
      userId: this.userId || undefined,
      data,
      priority: options.priority || 'normal',
      requiresAck: options.requiresAck || false,
      expiresAt: options.expiresIn ? Date.now() + options.expiresIn : undefined,
      retryCount: 0
    };

    // Add target user if specified
    if (options.targetUser) {
      message.data = { ...message.data, targetUser: options.targetUser };
    }

    return this.queueMessage(message);
  }

  // Subscribe to message type
  subscribe(type: MessageType, callback: (message: RealtimeMessage) => void): () => void {
    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(type, new Set());
    }

    this.subscriptions.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscriptions.get(type);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscriptions.delete(type);
        }
      }
    };
  }

  // Subscribe to multiple message types
  subscribeToMultiple(
    types: MessageType[],
    callback: (message: RealtimeMessage) => void
  ): () => void {
    const unsubscribeFunctions = types.map(type => this.subscribe(type, callback));

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  }

  // Join room (for group communications)
  async joinRoom(roomId: string): Promise<boolean> {
    return this.sendMessage(MessageType.USER_JOINED, { roomId }, { requiresAck: true });
  }

  // Leave room
  async leaveRoom(roomId: string): Promise<boolean> {
    return this.sendMessage(MessageType.USER_LEFT, { roomId }, { requiresAck: true });
  }

  // Send chat message
  async sendChatMessage(
    roomId: string,
    message: string,
    targetUser?: string
  ): Promise<boolean> {
    return this.sendMessage(
      MessageType.CHAT_MESSAGE,
      { roomId, message, targetUser },
      { priority: 'normal', requiresAck: true }
    );
  }

  // Send typing indicator
  sendTypingIndicator(roomId: string, isTyping: boolean): void {
    this.sendMessage(MessageType.CHAT_TYPING, { roomId, isTyping }, { priority: 'low' });
  }

  // Update user status
  updateUserStatus(status: 'online' | 'away' | 'busy' | 'offline'): void {
    this.sendMessage(MessageType.USER_STATUS, { status }, { priority: 'low' });
  }

  // Send location update (for drivers)
  sendLocationUpdate(location: { lat: number; lng: number; heading?: number; speed?: number }): void {
    this.sendMessage(
      MessageType.DRIVER_LOCATION,
      location,
      { priority: 'high' }
    );
  }

  // Get connection state
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  // Get message queue status
  getQueueStatus(): {
    messageQueue: number;
    offlineQueue: number;
    pendingAcks: number;
  } {
    return {
      messageQueue: this.messageQueue.length,
      offlineQueue: this.offlineQueue.length,
      pendingAcks: this.pendingAcks.size
    };
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  protected emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Private methods
  private async queueMessage(message: RealtimeMessage): Promise<boolean> {
    // Check if message has expired
    if (message.expiresAt && Date.now() > message.expiresAt) {
      console.warn('Message expired before sending:', message.id);
      return false;
    }

    if (this.connectionState.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      return this.transmitMessage(message);
    } else {
      // Queue for offline sending
      if (this.config.enableOfflineQueue) {
        this.offlineQueue.push(message);
        
        // Limit offline queue size
        if (this.offlineQueue.length > this.config.maxOfflineMessages) {
          this.offlineQueue = this.offlineQueue.slice(-this.config.maxOfflineMessages);
        }
        
        console.log('Message queued for offline sending:', message.id);
        return true;
      }
      
      return false;
    }
  }

  private async transmitMessage(message: RealtimeMessage): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const payload = JSON.stringify(message);
      this.ws.send(payload);

      // Handle acknowledgment if required
      if (message.requiresAck) {
        this.setupAckTimeout(message);
      }

      this.emit('messageSent', message);
      return true;

    } catch (error) {
      console.error('Failed to transmit message:', error);
      this.emit('messageError', { message, error });
      return false;
    }
  }

  private handleMessage(data: string): void {
    try {
      const message: RealtimeMessage = JSON.parse(data);
      
      // Update latency if this is a heartbeat response
      if (message.type === MessageType.HEARTBEAT) {
        this.updateLatency(message.timestamp);
        return;
      }

      // Handle acknowledgment
      if (message.type === MessageType.ACKNOWLEDGE) {
        this.handleAcknowledgment(message);
        return;
      }

      // Send acknowledgment if required
      if (message.requiresAck) {
        this.sendAcknowledgment(message.id);
      }

      // Notify subscribers
      const subscribers = this.subscriptions.get(message.type);
      if (subscribers) {
        subscribers.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Error in message callback:', error);
          }
        });
      }

      this.emit('messageReceived', message);

    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private setupAckTimeout(message: RealtimeMessage): void {
    const timeout = setTimeout(() => {
      console.warn('Message acknowledgment timeout:', message.id);
      this.pendingAcks.delete(message.id);
      
      // Retry if not exceeded max attempts
      if ((message.retryCount || 0) < 3) {
        message.retryCount = (message.retryCount || 0) + 1;
        this.queueMessage(message);
      } else {
        this.emit('messageTimeout', message);
      }
    }, this.config.messageTimeout);

    this.pendingAcks.set(message.id, { message, timeout });
  }

  private handleAcknowledgment(ackMessage: RealtimeMessage): void {
    const messageId = ackMessage.data.messageId;
    const pending = this.pendingAcks.get(messageId);
    
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingAcks.delete(messageId);
      this.emit('messageAcknowledged', pending.message);
    }
  }

  private sendAcknowledgment(messageId: string): void {
    this.sendMessage(MessageType.ACKNOWLEDGE, { messageId }, { priority: 'high' });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.connectionState.isConnected) {
        this.sendMessage(MessageType.HEARTBEAT, { timestamp: Date.now() });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private updateLatency(serverTimestamp: number): void {
    const now = Date.now();
    this.connectionState.latency = now - serverTimestamp;
    
    // Update connection quality
    if (this.connectionState.latency < 100) {
      this.connectionState.quality = 'excellent';
    } else if (this.connectionState.latency < 300) {
      this.connectionState.quality = 'good';
    } else if (this.connectionState.latency < 1000) {
      this.connectionState.quality = 'poor';
    } else {
      this.connectionState.quality = 'critical';
    }

    this.emit('latencyUpdate', this.connectionState.latency);
  }

  private scheduleReconnect(): void {
    if (this.connectionState.isReconnecting) return;

    this.connectionState.isReconnecting = true;
    this.connectionState.connectionAttempts++;

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.connectionState.connectionAttempts - 1),
      30000 // Max 30 seconds
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.connectionState.connectionAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      if (this.userId && this.authToken) {
        this.connect(this.userId, this.authToken);
      }
    }, delay);
  }

  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    console.log(`Processing ${this.offlineQueue.length} offline messages`);

    const messagesToSend = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const message of messagesToSend) {
      // Check if message has expired
      if (message.expiresAt && Date.now() > message.expiresAt) {
        console.warn('Offline message expired:', message.id);
        continue;
      }

      await this.transmitMessage(message);
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('Network back online');
        if (!this.connectionState.isConnected && this.userId && this.authToken) {
          this.connect(this.userId, this.authToken);
        }
      });

      window.addEventListener('offline', () => {
        console.log('Network offline');
        if (this.ws) {
          this.ws.close();
        }
      });
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
}

// Specialized real-time clients
export class BookingRealtimeClient extends RealtimeClient {
  constructor(config?: Partial<RealtimeConfig>) {
    super(config);
    
    // Auto-subscribe to booking-related events
    this.subscribe(MessageType.BOOKING_CREATED, this.handleBookingUpdate.bind(this));
    this.subscribe(MessageType.BOOKING_UPDATED, this.handleBookingUpdate.bind(this));
    this.subscribe(MessageType.BOOKING_ASSIGNED, this.handleBookingUpdate.bind(this));
    this.subscribe(MessageType.BOOKING_STARTED, this.handleBookingUpdate.bind(this));
    this.subscribe(MessageType.BOOKING_COMPLETED, this.handleBookingUpdate.bind(this));
    this.subscribe(MessageType.BOOKING_CANCELLED, this.handleBookingUpdate.bind(this));
  }

  private handleBookingUpdate(message: RealtimeMessage): void {
    this.emit('bookingUpdate', {
      type: message.type,
      booking: message.data,
      timestamp: message.timestamp
    });
  }

  async subscribeToBooking(bookingId: string): Promise<boolean> {
    return this.joinRoom(`booking_${bookingId}`);
  }

  async unsubscribeFromBooking(bookingId: string): Promise<boolean> {
    return this.leaveRoom(`booking_${bookingId}`);
  }
}

export class DriverRealtimeClient extends RealtimeClient {
  private locationUpdateInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<RealtimeConfig>) {
    super(config);
    
    // Auto-subscribe to driver-related events
    this.subscribe(MessageType.DRIVER_STATUS, this.handleDriverUpdate.bind(this));
    this.subscribe(MessageType.DRIVER_MESSAGE, this.handleDriverUpdate.bind(this));
  }

  private handleDriverUpdate(message: RealtimeMessage): void {
    this.emit('driverUpdate', {
      type: message.type,
      data: message.data,
      timestamp: message.timestamp
    });
  }

  startLocationTracking(intervalMs: number = 10000): void {
    this.stopLocationTracking();

    this.locationUpdateInterval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.sendLocationUpdate({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              heading: position.coords.heading || undefined,
              speed: position.coords.speed ? position.coords.speed * 3.6 : undefined // Convert m/s to km/h
            });
          },
          (error) => {
            console.error('Location tracking error:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 30000
          }
        );
      }
    }, intervalMs);
  }

  stopLocationTracking(): void {
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
    }
  }

  async updateDriverStatus(status: 'available' | 'busy' | 'offline' | 'on_break'): Promise<boolean> {
    return this.sendMessage(MessageType.DRIVER_STATUS, { status }, { priority: 'high', requiresAck: true });
  }
}

// Export singleton instances
export const realtimeClient = new RealtimeClient();
export const bookingRealtimeClient = new BookingRealtimeClient();
export const driverRealtimeClient = new DriverRealtimeClient();

export default realtimeClient;
