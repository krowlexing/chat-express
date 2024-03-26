import { Db } from "../db";
import { RowData, SimpleTable } from "../table";

const columns = {
    id: {
        type: "integer",
        pk: true,
    },
    username: {
        type: "text",
    },
    password: {
        type: "text",
    },
} as const;

type Cols = typeof columns;

export type UserData = RowData<Cols>;

export class User extends SimpleTable<Cols> {
    constructor(db: Db) {
        super(db, "User", columns);
    }

    get(username: string): UserData | undefined {
        return this.prepare(
            `SELECT * FROM ${this.name} WHERE username = ? LIMIT 1;`
        ).get(username) as any;
    }
}
