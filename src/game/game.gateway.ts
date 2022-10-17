import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    OnGatewayDisconnect
} from '@nestjs/websockets';
import {Server, Socket} from 'socket.io';
import {Game} from './Game';
import {PromiseUtil} from '@iamyth/util';

interface Player {
    id: string;
    name: string;
}

@WebSocketGateway({
    cors: {
        origin: "*",
    },
})
export class GameGateway implements OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
    host: Player | null;
    playerNames: Set<string>;
    playerSocketMap: Map<string, string>;
    gameInfo: Game | null;

    constructor() {
        this.playerNames = new Set<string>();
        this.playerSocketMap = new Map<string, string>();
        this.gameInfo = null;
        this.host = null;
    }

    handleDisconnect(client: Socket) {
        if ('nickname' in client) {
            this.server.emit('server-log', `${client['nickname']} 已離開`)
            this.playerNames.delete(client['nickname']);
            this.playerSocketMap.delete(client.id);
        }

        if(this.playerNames.size === 0) {
            this.gameInfo = null;
            this.host = null;
            this.playerNames.clear();
            this.playerSocketMap.clear();
            this.server.emit('server-log', "遊戲已重置");
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

        if (this.gameInfo !== null) {
            socket.emit('on-set-nickname-error', "不能加入已開始的遊戲");
            return;
        }

        if ('nickname' in socket && socket['nickname'] !== nickname) {
            this.playerNames.delete(socket['nickname']);
            this.playerSocketMap.delete(socket.id)
        }

        // Assign the nickname to the socket
        Object.assign(socket, {nickname});
        this.playerNames.add(nickname);
        this.playerSocketMap.set(socket.id, nickname);

        // Callback event to the frontend to proceed
        const playerNamesArray = Array.from(this.playerNames);

        if (this.playerNames.size === 1) {
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
    async startGame(@ConnectedSocket() socket: Socket) {
        if (this.gameInfo !== null) {
            socket.emit('on-start-game-error', "每次只能開始一場遊戲");
            return;
        }

        if (this.playerNames.size < 3) {
            socket.emit('on-start-game-error', "遊戲最少需要 3 人");
            return;
        }

        this.gameInfo = new Game(Object.keys(this.playerSocketMap));

        this.server.emit('on-game-start');

        this.distributeIdentity();

        await PromiseUtil.sleep(3000);

        this.drawNextQuestion();
    }

    private distributeIdentity() {
        if (!this.gameInfo) {
            return;
        }

        const identityMap = this.gameInfo.distributeIdentity();

        this.playerSocketMap.forEach((value, key) => {
            const identity = identityMap.get(value);
            this.server.to(key).emit('on-identity-received', identity)
        });
    }

    private drawNextQuestion() {
        if (!this.gameInfo) {
            return;
        }

        const question = this.gameInfo.getNextQuestion();
        this.server.emit('on-question-received', question)
    }
}