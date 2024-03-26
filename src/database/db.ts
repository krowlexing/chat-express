import sqlite from "better-sqlite3";
import { Messages } from "./table/message";
import { Database } from "better-sqlite3";
import { User } from "./table/user";
import { Chat, ChatData } from "./table/chat";
import { ChatParticipant } from "./table/chatParticipant";
import { prepare } from "./table";

export class Db {
    sqlite: Database;
    messages: Messages;
    users: User;
    chat: Chat;
    participants: ChatParticipant;

    static #instance: Db | undefined;

    constructor(file: string) {
        let db = sqlite(file);
        this.sqlite = db;
        this.messages = new Messages(this);
        this.users = new User(this);
        this.chat = new Chat(this);
        this.participants = new ChatParticipant(this);
    }

    chatWithUser(userId: number): ChatsWithUser[] {
        const result = this.prepare(
            `SELECT 
                chat.id, 
                title, 
                description,
                participant,
                username
            FROM (SELECT chatId as id FROM ${this.participants.name} WHERE participant = ?) chats
                JOIN ${this.chat.name} ON chat.id = chats.id
                JOIN ${this.participants.name} ON ${this.participants.name}.chatId = chat.id
                JOIN ${this.users.name} ON ${this.users.name}.id = ${this.participants.name}.participant;
            ;`
        ).all(userId);

        const groupedChats = transform(result as any[]);

        if (result.length > 0) {
            const item = result[0];
            console.log(Object.keys(item!));
        }

        return groupedChats.map((chat) =>
            chat.title === ""
                ? {
                      ...chat,
                      title: chat.participants.find(
                          (user) => user.id !== userId
                      )!.username,
                  }
                : chat
        );
    }

    autoChatTitle(userId: number, chatId: number): string {
        const sql = `
        SELECT 
            username
        FROM ${this.chat.name}
        JOIN ${this.participants.name} ON ${this.participants.name}.chatId = ?
        JOIN ${this.users.name} ON ${this.users.name}.id = ${this.participants.name}.participant
        WHERE participant != ?;
        ;`;

        const result = this.prepare(sql).get(chatId, userId);
        console.log(result);
        return (result as any).username as string;
    }

    static instance(): Db {
        if (!Db.#instance) {
            Db.#instance = new Db("sqlite.db3");
        }

        return Db.#instance;
    }

    prepare(query: string) {
        return prepare(this, query);
    }
}

type SelectChatsWithUserRaw = {
    id: number;
    title: string;
    description: string;
    participant: number;
    username: string;
};

type ChatsWithUser = {
    id: number;
    title: string;
    description: string;
    participants: {
        id: number;
        username: string;
    }[];
};

function transform(rows: SelectChatsWithUserRaw[]) {
    const ids = rows.map((row) => row.id);

    let uniqueChats = [...new Set(ids)];

    const groupedRows = uniqueChats.map((chatId) =>
        rows.filter((row) => chatId === row.id)
    );

    return groupedRows.map((rows) => {
        const participants = rows.map((row) => {
            return { id: row.participant, username: row.username };
        });

        const row = rows[0];
        return {
            id: row.id,
            title: row.title,
            description: row.description,
            participants,
        };
    });
}
