import http, { IncomingMessage } from 'node:http';
import { EventEmitter } from 'node:events';
import { WebSocket, WebSocketServer } from 'ws';
import { WsRouter } from './routing/ws-router';
import { ChainFunc, Context, Handler } from '../types/shared';
import {
  Config,
  HandleParams,
  IWsServer,
  OnErrorHandler,
  OnEventFinishedHandler,
  OnEventHandler,
  WsServerEvent,
} from '../types/ws-server.interface';
import { messageSchema } from '@/lib/web-sockets/schemas/message.schema';

export class WsServer implements IWsServer {
  private readonly wss: WebSocketServer;
  private readonly eventEmitter: EventEmitter = new EventEmitter();
  private readonly wsRouter: WsRouter = new WsRouter();
  private readonly httpServer: http.Server;
  private readonly config: Config;

  constructor(config: Config) {
    this.config = config;
    this.httpServer = http.createServer();
    this.wss = new WebSocketServer({
      server: this.httpServer,
    });
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.handleConnection();
        this.httpServer.listen(this.config.port, () => resolve());
      } catch (e) {
        reject(e);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.wss.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public handle(event: string, handler: Handler, params: HandleParams = {}): void {
    const eventHandler = params.chain ? this.buildHandlerFromChain(handler, params.chain) : handler;
    this.wsRouter.add(event, eventHandler);
  }

  public onError(clb: OnErrorHandler): void {
    this.eventEmitter.on(WsServerEvent.ERROR, clb);
  }

  public onEvent(clb: OnEventHandler): void {
    this.eventEmitter.on(WsServerEvent.EVENT, clb);
  }

  public onEventFinished(clb: OnEventFinishedHandler): void {
    this.eventEmitter.on(WsServerEvent.EVENT_FINISHED, clb);
  }

  private handleConnection() {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      ws.on('message', async (buffer) => {
        const ctx = this.getBaseContext(ws, req);
        this.eventEmitter.emit(WsServerEvent.EVENT, ctx);
        const message = JSON.parse(buffer.toString());

        if (!this.checkIsCorrectMessage(message)) {
          const error = new Error(`Bad message ${message}`);
          this.eventEmitter.emit(WsServerEvent.ERROR, error, ws);
          return;
        }
        ctx.data = message.data;

        const eventHandlerData = this.wsRouter.resolve(message.event);
        if (!eventHandlerData) {
          const error = new Error(`Unknown event ${message.event}`);
          this.eventEmitter.emit(WsServerEvent.ERROR, error, ws);
          return;
        }

        const wsHandler = eventHandlerData.handler as Handler;
        wsHandler(ctx)
          .catch((err: unknown) => this.eventEmitter.emit(WsServerEvent.ERROR, err, ws))
          .finally(() => this.eventEmitter.emit(WsServerEvent.EVENT_FINISHED, ctx));
      });
    });
  }

  private checkIsCorrectMessage(message: unknown): boolean {
    return messageSchema.safeParse(message).success;
  }

  private getBaseContext(ws: WebSocket, req: IncomingMessage): Context {
    return {
      ws,
      req,
      data: {},
      meta: {
        timestamp: Date.now(),
      },
    };
  }

  private buildHandlerFromChain(handler: Handler, chain: ChainFunc[]): Handler {
    let lastFunc = handler;
    for (const chainFunc of chain.reverse()) {
      lastFunc = (ctx: Context) => chainFunc(ctx, lastFunc);
    }
    return lastFunc;
  }
}
