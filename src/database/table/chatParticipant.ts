import { Db } from "../db";
import { RowData, SimpleTable } from "../table";

const columns = {
    id: {
        type: "integer",
        pk: true,
    },
    chatId: {
        type: "integer",
    },
    participant: {
        type: "integer",
    },
} as const;

type Cols = typeof columns;

export class ChatParticipant extends SimpleTable<Cols> {
    constructor(db: Db) {
        super(db, "ChatParticipant", columns);
    }

    isParticipant(userId: number, chatId: number): boolean {
        const stmt = this.prepare(
            `SELECT 1 FROM ${this.name} WHERE chatId=? AND participant = ? LIMIT 1;`
        );
        const result = stmt.get(chatId, userId) as number | undefined;
        console.log(`isParticipant: ${result}`);
        console.log(result);
        return result != undefined;
    }
}
