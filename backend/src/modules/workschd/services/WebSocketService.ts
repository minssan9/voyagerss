import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private connectedClients: Map<number, string[]> = new Map(); // accountId -> socket IDs

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer: HttpServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:8080',
        credentials: true
      },
      path: '/socket.io'
    });

    this.io.on('connection', (socket: Socket) => {
      console.log('[WebSocket] Client connected:', socket.id);

      // Handle authentication
      socket.on('authenticate', (accountId: number) => {
        this.registerClient(accountId, socket.id);
        console.log(`[WebSocket] User ${accountId} authenticated with socket ${socket.id}`);
        socket.emit('authenticated', { success: true, accountId });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.unregisterClient(socket.id);
        console.log('[WebSocket] Client disconnected:', socket.id);
      });
    });

    console.log('[WebSocket] Server initialized');
  }

  /**
   * Register a client connection
   */
  private registerClient(accountId: number, socketId: string): void {
    if (!this.connectedClients.has(accountId)) {
      this.connectedClients.set(accountId, []);
    }
    this.connectedClients.get(accountId)!.push(socketId);
  }

  /**
   * Unregister a client connection
   */
  private unregisterClient(socketId: string): void {
    for (const [accountId, socketIds] of this.connectedClients.entries()) {
      const index = socketIds.indexOf(socketId);
      if (index > -1) {
        socketIds.splice(index, 1);
        if (socketIds.length === 0) {
          this.connectedClients.delete(accountId);
        }
        break;
      }
    }
  }

  /**
   * Send notification to a specific user
   */
  sendNotificationToUser(accountId: number, notification: any): void {
    if (!this.io) {
      console.warn('[WebSocket] Server not initialized');
      return;
    }

    const socketIds = this.connectedClients.get(accountId);
    if (!socketIds || socketIds.length === 0) {
      console.log(`[WebSocket] User ${accountId} not connected`);
      return;
    }

    socketIds.forEach(socketId => {
      this.io!.to(socketId).emit('notification', notification);
      console.log(`[WebSocket] Sent notification to user ${accountId} on socket ${socketId}`);
    });
  }

  /**
   * Send notification to multiple users
   */
  sendNotificationToUsers(accountIds: number[], notification: any): void {
    accountIds.forEach(accountId => {
      this.sendNotificationToUser(accountId, notification);
    });
  }

  /**
   * Broadcast notification to all connected users
   */
  broadcast(notification: any): void {
    if (!this.io) {
      console.warn('[WebSocket] Server not initialized');
      return;
    }

    this.io.emit('notification', notification);
    console.log('[WebSocket] Broadcasted notification to all users');
  }

  /**
   * Get connected user count
   */
  getConnectedUserCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(accountId: number): boolean {
    const socketIds = this.connectedClients.get(accountId);
    return socketIds !== undefined && socketIds.length > 0;
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();
