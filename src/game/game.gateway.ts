import {ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayDisconnect} from '@nestjs/websockets';
import {Server, Socket} from 'socket.io';
import { Game } from './Game';

interface Host {
    name: string;
    id: string;
}

@WebSocketGateway({
    cors: {
        origin: "*",
    },
})
export class GameGateway implements OnGatewayDisconnect{
    @WebSocketServer()
    server: Server;
    host: Host | null;
    playerNames: Set<string>;
    gameInfo: Game | null;

    constructor() {
        this.playerNames = new Set<string>();
        this.gameInfo = null;
        this.host = null;
    }

    handleDisconnect(client: Socket) {
        if('nickname' in client) {
            this.playerNames.delete(client['nickname']);
        }
    }

    @SubscribeMessage("set-nickname")
    setNickname(@ConnectedSocket() socket: Socket, @MessageBody() nickname: string) {
        console.info("set-nickname", nickname);
        if (this.playerNames.has((nickname))) {
            // 409 means conflict
            socket.emit("on-set-nickname-error", "名稱已重覆");
            return;
        }

        if(this.gameInfo !== null) {
            socket.emit('on-set-nickname-error', "不能加入已開始的遊戲");
            return;
        }

        if('nickname' in socket && socket['nickname'] !== nickname) {
            this.playerNames.delete(socket['nickname']);
        }

        // Assign the nickname to the socket
        Object.assign(socket, { nickname });
        this.playerNames.add(nickname);

        // Callback event to the frontend to proceed
        const playerNamesArray = Array.from(this.playerNames);

        if(this.playerNames.size === 1) {
            this.host = {
                name: nickname,
                id: socket.id,
            };
        }

        socket.emit('on-my-name-set', this.host);

        const response = {
            newPlayer: nickname,
            allPlayers: playerNamesArray,
            host: this.host.name
        }
        this.server.emit("on-player-name-set", response);
    }

    @SubscribeMessage('start-game')
    startGame() {
        if(this.gameInfo !== null) {
            // boardcast game has started error
            return;
        }

        this.gameInfo = new Game();

        this.server.emit('on-game-start');
    }
}