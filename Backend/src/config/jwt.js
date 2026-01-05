import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
        issuer: "Takiefy",
        audience: "chatUser",
    });
};

export const generateAccessToken = generateToken;

export const generateRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
        issuer: "Talkiefy",
        audience: "chatUser",
    });
};

export default generateToken;