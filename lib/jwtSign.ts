import dotenv from "dotenv";
import { sign } from "jsonwebtoken";
import { TUser } from "../models/User";
dotenv.config();
export const jwtSign = (info: string) => {
  const authToken = sign({ email: info }, process.env.JWT_SECRET as string, {
    expiresIn: "1d",
  });

  return authToken;
};
