import { Db } from "../db";
import { Columns, RowData, SimpleTable, Table, create } from "../table";

const columns = {
    id: {
        type: "integer",
        pk: true,
    },
    sender: {
        type: "integer",
    },
    chat_id: {
        type: "integer",
    },
    content: {
        type: "text",
    },
    date: {
        type: "date",
    },
} as const;

export type MessageData = RowData<typeof columns>;
export class Messages extends SimpleTable<typeof columns> {
    constructor(db: Db) {
        super(db, "Messages", columns);
    }

    allFromChat(chatId: number): MessageData[] {
        const stmt = this.prepare(
            `SELECT * FROM ${this.name} WHERE chat_id = ?;`
        );
        return stmt.all(chatId) as any;
    }
}
