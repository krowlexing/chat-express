import { is } from "typia";
import { Request, Response } from "express";
import { Db } from "../database/db";
import { Claim } from "./auth";
import { UserData } from "../database/table/user";
import { ChatData } from "../database/table/chat";

const db = Db.instance();

type NewChatBody = {
    title: string;
    description: string;
    users: string[];
};

export function handleNewChat(req: Request, res: Response) {
    const claim = req.claim!;
    const body = req.body;
    if (is<NewChatBody>(body)) {
        if (body.users.length > 0) {
            const chatId = insertNewChat(claim, body);
            if (chatId != undefined) {
                return res.status(200).send({ id: chatId });
            }
        }
    }

    console.log(`'/chat/new' invalid data presented`);
    res.sendStatus(418);
}

function insertNewChat(claim: Claim, body: NewChatBody): number | undefined {
    const db = Db.instance();
    console.log(
        `User '${claim.userId}' requested new chat with '${body.users}'`
    );

    let claimant = db.users.byId(claim.userId);
    if (claimant) {
        const users: UserData[] = [];
        for (let username of body.users) {
            const user = db.users.get(username);
            if (user == undefined) {
                console.log(`user '${username}' doesn't exist.`);
                return;
            }
            users.push(user);
        }

        return insertNewChatWithUsers(claimant, body, users);
    } else {
        console.log(`claimant doesn't exist. claimant id: ${claim.userId}`);
    }
}

const insertNewChatWithUsers = Db.instance().sqlite.transaction(
    (claimant: UserData, body: NewChatBody, users: UserData[]) => {
        const db = Db.instance();
        const { lastInsertRowid } = db.chat.insert(body);
        const chatId = lastInsertRowid as number;

        db.participants.insert({ chatId, participant: claimant.id });
        for (const user of users) {
            db.participants.insert({ chatId, participant: user.id });
        }
        return chatId;
    }
);

type PostMessageToChatBody = {
    message: string;
};

type PostMessageToChatParams = {
    id: string;
};

export function handleNewMessage(req: Request, res: Response) {
    const params = req.params;
    const claim = req.claim!;
    const body = req.body;

    if (
        is<PostMessageToChatBody>(body) &&
        is<PostMessageToChatParams>(params) &&
        is<Claim>(claim)
    ) {
        insertNewMessageTransaction(claim.userId, +params.id, body.message);
        return res.sendStatus(200);
    } else {
        console.log(`${req.url}' invalid data presented`);
        res.sendStatus(418);
    }
}

const insertNewMessageTransaction = db.sqlite.transaction(
    (userId: number, chatId: number, content: string) => {
        const db = Db.instance();
        const user = dbUser(userId);
        if (!user) return;
        const chat = dbChat(chatId);
        if (!chat) return;

        const isParticipant = db.participants.isParticipant(user.id, chat.id);
        if (isParticipant) {
            const unixDate = new Date().valueOf();
            const result = db.messages.insert({
                sender: user.id,
                chat_id: chat.id,
                content,
                date: unixDate,
            });

            if (result.changes > 0) {
                return result.lastInsertRowid;
            }
        }
    }
);

type Params = {
    id: string;
};

export function handleGetChat(req: Request, res: Response) {
    const claim = req.claim;
    const params = req.params;
    console.log(params);

    if (is<Claim>(claim) && is<Params>(params)) {
        const result = allMessagesTransaction(claim.userId, +params.id);

        if (result != undefined) {
            const [data, title] = result;
            return res.send({ chatId: +params.id, data, title });
        } else {
            console.log("transaction returned undefined");
        }
    } else {
        console.log(`${req.url} malformed request`);
    }
    return res.sendStatus(418);
}

const allMessagesTransaction = db.sqlite.transaction(
    (userId: number, chatId: number) => {
        const result = userInChat(userId, chatId);
        console.log(`userInChat: ${result}`);
        if (result) {
            const { user, chat } = result;
            return [
                db.messages.allFromChat(chat.id),
                db.autoChatTitle(userId, chatId) ?? "",
            ] as const;
        }
    }
);

function userInChat(
    userId: number,
    chatId: number
): { chat: ChatData; user: UserData } | undefined {
    const user = dbUser(userId);
    if (!user) return;
    const chat = dbChat(chatId);
    if (!chat) return;

    const isParticipant = db.participants.isParticipant(user.id, chat.id);
    console.log(`isParticipant: ${isParticipant}`);
    if (isParticipant) {
        return { chat, user };
    }
}

function dbUser(userId: number) {
    const user = db.users.byId(userId);
    if (user == undefined) {
        console.log(`user with userId '${userId}' does not exist.`);
    }
    return user;
}

function dbChat(chatId: number) {
    const chat = db.chat.byId(chatId);
    if (chat == undefined) {
        console.log(`chat with id '${chatId}' does not exist.`);
    }
    return chat;
}
