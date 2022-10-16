import * as Questions from '../constant/question.json';

export enum Identity {
    THINKER = 'THINKER',
    REAL_UPPER = 'REAL_UPPER',
    NINE_UPPER = 'NINE_UPPER',
}

interface Question {
    id: number;
    title: string;
    answer: string;
    hints: string[];
}

export class Game {
    identityMap: Record<string, Identity>;
    playedQuestion: Question[];
    constructor() {
        console.info(Questions);
        this.identityMap = {};
        this.playedQuestion = [];
    }

    distributeIdentity() {}

    getNextQuestion() {}

    guess(id: string) {}
}