import { Db } from "./db";

export type Column = {
    type: AllowedType;
    pk?: boolean;
};

export type Columns = {
    [name: string]: Column;
};

export type Table = {
    name: string;
    columns: Columns;
};

type Satisfies<U, T extends U> = T;

type MapAllowedType<Type extends AllowedType> = Type extends "integer"
    ? number
    : Type extends "text"
      ? string
      : Type extends "date"
        ? number
        : [];

export type RowData<T extends Columns> = {
    [K in keyof T]: T[K] extends { type: AllowedType }
        ? MapAllowedType<T[K]["type"]>
        : [];
};

export class SimpleTable<T extends Columns> {
    private table: Table;
    private db: Db;
    private definition: T;

    get name(): string {
        return this.table.name;
    }

    constructor(db: Db, name: string, columns: T) {
        this.definition = columns;
        this.table = { name, columns };
        this.db = db;

        this.create();
    }

    create() {
        return execute(this.db, create(this.table));
    }

    insert(value: Omit<RowData<T>, "id">) {
        let [query, args] = insert(this.table, value);
        return prepare(this.db, query).run(...args);
    }

    all(): RowData<T>[] {
        return prepare(this.db, select_all(this.table)).all() as any[];
    }

    byId(id: number): RowData<T> | undefined {
        const query = `SELECT * FROM ${this.table.name} WHERE rowid=? LIMIT 1;`;
        return prepare(this.db, query).get(id) as any;
    }

    delete(id: number) {
        const query = `DELETE FROM ${this.table.name} WHERE rowid=?;`;
        return this.prepare(query).run(id);
    }

    prepare(query: string) {
        console.log(`query: ${query}`);
        return this.db.sqlite.prepare(query);
    }
}

export type AllowedType = "integer" | "text" | "date";

export function create(table: Table) {
    let types = Object.entries(table.columns)
        .map(([name, col]) => type_string(name, col))
        .join(", ");

    return `CREATE TABLE IF NOT EXISTS ${table.name} (${types});`;
}

export function execute(db: Db, query: string) {
    let result = prepare(db, query).run();
    console.log(`result: ${JSON.stringify(result)}`);
}

export function prepare(db: Db, query: string) {
    console.log(`query: ${query}`);
    return db.sqlite.prepare(query);
}

export function run(db: Db, param: [string, unknown[]]) {
    let [query, args] = param;
    let statement = prepare(db, query);
    console.log(`args: ${args}.. length: ${args.length}`);
    return statement;
}

export function insert(table: Table, value: unknown): [string, unknown[]] {
    let properties = Object.keys(table.columns).filter((k) => k !== "id");
    const anything = value as any;
    let values = properties.map((p) => anything[p]);
    let placeholders = properties.map((_) => "?");
    return [
        `INSERT INTO ${table.name}(${properties.join(",")}) VALUES (${placeholders.join()});`,
        values,
    ];
}

export function select_all(table: Table) {
    return `SELECT * FROM ${table.name};`;
}

function type_string(name: string, column: Column) {
    return `${name} ${transform_type(column.type)} ${column.pk ? "PRIMARY KEY" : ""}`;
}

function transform_type(type: AllowedType): string {
    switch (type) {
        case "integer":
            return "INTEGER";
        case "text":
            return "TEXT";
        case "date":
            return "INTEGER";
    }
}
