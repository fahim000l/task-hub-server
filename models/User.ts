import { Schema, model, models } from "mongoose";

export interface TUser {
  userName: string;
  email: string;
  password: string;
  profilePic: string;
}

const userSchema = new Schema<TUser>(
  {
    email: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
    },
    profilePic: {
      type: String,
    },
  },
  { timestamps: true }
);

const User = models.User || model<TUser>("User", userSchema);
export default User;
