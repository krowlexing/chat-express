export declare global {
    namespace Express {
        export interface Request {
            claim?: Claim;
        }
    }
}
