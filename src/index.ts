import express, { Express, Response, Router, IRouter } from "express";
import { Db } from "./database/db";
import { Claim, auth, authRouter, validate } from "./router/auth";
import { is } from "typia";
import { handleGetChat, handleNewChat, handleNewMessage } from "./router/chat";

let app = express();

function json(value: string | undefined): object | undefined {
    console.log(value);
    console.log(typeof value);
    if (typeof value === "string") {
        return JSON.parse(value);
    }
}

function timeout(time: number) {
    return (req: unknown, res: unknown, next: () => void) => {
        setTimeout(next, time);
    };
}

function randomFailure(percent: number) {
    return (req: unknown, res: Response, next: () => void) => {
        if (Math.random() < percent) {
            res.sendStatus(500).end();
        } else {
            next();
        }
    };
}

interface User {
    username: string;
    password: string;
}

let db = new Db("sqlite.db3");

function setup(app: Express) {
    let funnyRouter = Router()
        .use(auth)
        .get("/user/me/", (req, res) => {
            const claim = req.claim;
            if (is<Claim>(claim)) {
                return res.send(db.users.byId(claim.userId));
            }
            return res.sendStatus(418);
        })
        .post("/chat/new", handleNewChat)
        .post("/chat/:id/message", handleNewMessage)
        .get("/chat/:id", handleGetChat)
        .get("/chats", (req, res) => {
            const claim = req.claim!;
            if (is<Claim>(claim)) {
                const user = db.users.byId(claim.userId);

                if (user) {
                    const chatsUserInfo = db.chatWithUser(user.id);
                    return res.send(chatsUserInfo);
                }
            }
            return res.sendStatus(401);
        });

    app.use(express.json());
    app.use(timeout(500));

    app.use("/auth", authRouter(db))
        .get("/users", (req, res) => {
            res.send(db.users.all());
        })
        .post("/message", (req, res) => {
            let object = json(req.body) as any;
            db.messages.insert(object);
        });
    app.use("/", funnyRouter);
}

setup(app);

app.listen(10000);
