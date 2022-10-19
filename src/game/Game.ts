import * as Questions from '../constant/question.json';

export enum Identity {
    THINKER = 'THINKER',
    REAL_UPPER = 'REAL_UPPER',
    NINE_UPPER = 'NINE_UPPER',
}

interface Question {
    id: number;
    title: string;
    type: string;
    answer: string;
    hints: string[];
    difficulty: string
}

export class Game {
    players: string[];
    identityMap: Map<string, Identity>;
    playedQuestion: Question[];
    question: Question | null;

    constructor(players: string[]) {
        console.info(Questions);
        this.players = players;
        this.identityMap = new Map<string, Identity>();
        this.playedQuestion = [];
        this.question = null;
    }

    distributeIdentity(): Map<string, Identity> {
        if (this.players.length <= 3) {
            // may not have real-upper
            const base = [Identity.THINKER];
            const nineUppersAndRealUpper = [Identity.REAL_UPPER, Identity.NINE_UPPER, Identity.NINE_UPPER];
            const shuffledNineUppersAndRealUpper = this.shuffle(nineUppersAndRealUpper);
            const identityArray = this.shuffle([...base, ...shuffledNineUppersAndRealUpper.slice(0, 2)]);

            Array.from(this.players).forEach((player, index) => {
                this.identityMap.set(player, identityArray[index]);
            });
        } else {
            const base: Identity[] = [
                Identity.THINKER,
                Identity.REAL_UPPER,
            ];
            const nineUppers: Identity[] = Array.from<Identity>({length: this.players.length - base.length}).fill(Identity.NINE_UPPER)
            const identityArray = this.shuffle([...base, ...nineUppers]);

            Array.from(this.players).forEach((player, index) => {
                this.identityMap.set(player, identityArray[index]);
            });
        }

        return this.identityMap;
    }

    getNextQuestion(): Question {
        const randomId = Math.floor(Math.random() * Questions.length)
        const question = Questions[randomId];

        if (this.playedQuestion.includes(question)) {
            return this.getNextQuestion();
        } else {
            this.question = question;
            this.playedQuestion.push(question);
        }

        return question;
    }

    guess(id: string) {
        return this.identityMap.get(id) === Identity.REAL_UPPER;
    }

    private shuffle<T>(array: readonly T[]): T[] {
        const copiedArray = [...array];
        let currentIndex = copiedArray.length;
        let randomIndex: number;

        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            [copiedArray[currentIndex], copiedArray[randomIndex]] = [copiedArray[randomIndex], copiedArray[currentIndex]]
        }

        return copiedArray;
    }
}