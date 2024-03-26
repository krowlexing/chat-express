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

    chatWithUser(
        userId: number
    ): Pick<ChatData, "id" | "title" | "description">[] {
        const result = this.prepare(
            `SELECT 
                chat.id, 
                title, 
                description 
            FROM (SELECT chatId as id FROM ${this.participants.name} WHERE participant = ?) chats
                JOIN ${this.chat.name} ON chat.id = chats.id
            ;`
        ).all(userId);

        if (result.length > 0) {
            const item = result[0];
            console.log(Object.keys(item!));
        }

        return result as any[];
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
