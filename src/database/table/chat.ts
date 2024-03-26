import { Db } from "../db";
import { RowData, SimpleTable } from "../table";

const columns = {
    id: {
        type: "integer",
        pk: true,
    },
    title: {
        type: "text",
    },
    description: {
        type: "text",
    },
} as const;

export type ChatData = RowData<typeof columns>;

export class Chat extends SimpleTable<typeof columns> {
    constructor(db: Db) {
        super(db, "Chat", columns);
    }
}
