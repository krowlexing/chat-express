import express, { Request, Response, Router } from "express";
import { Db } from "../database/db";
import jwt from "jsonwebtoken";
import { User, UserData } from "../database/table/user";
import { is } from "typia";

export function auth(
    req: Request & { claim?: Claim },
    res: Response,
    next: () => void
) {
    let claim = validate(req);
    if (claim) {
        req.claim = claim;
        next();
    } else {
        res.sendStatus(401);
    }
}

export function validate(req: Request): Claim | undefined {
    let auth = req.headers["authorization"];
    if (auth) {
        try {
            let res = jwt.verify(auth, SECRET);
            if (is<Claim>(res)) {
                return res;
            } else {
                console.log("claim contains invalid data");
            }
        } catch (e) {
            console.log(e);
        }
    }
}

const SECRET = "krowlexing";

export interface Claim {
    userId: number;
}

export function authRouter(db: Db) {
    return Router()
        .post("/login", (req, res) => {
            let claimUser = req.body; // username, password
            let user = db.users.get(claimUser.username);
            if (user) {
                if (
                    claimUser.password != null &&
                    claimUser.password === user.password
                ) {
                    const claim: Claim = { userId: user.id };
                    let token = jwt.sign(claim, SECRET);
                    res.send(token);
                } else {
                    res.sendStatus(401);
                }
            } else {
                res.sendStatus(401);
            }
        })
        .post("/register", (req, res) => {
            let object = req.body as UserData;
            const insertResult = db.users.insert(object);
            if (insertResult.changes > 0) {
                const claim: Claim = {
                    userId: insertResult.lastInsertRowid as number,
                };
                res.send(jwt.sign(claim, SECRET));
            } else {
                res.sendStatus(500);
            }
        })
        .post("/check", (req, res) => {
            if (validate(req)) res.sendStatus(200);
            else res.sendStatus(401);
        });
}
