import { ObjectId } from "mongodb";
import { Schema, model, models } from "mongoose";

export interface TteamMembers {
  teamId: Schema.Types.ObjectId;
  user: string;
}

const teamMembersSchema = new Schema<TteamMembers>(
  {
    teamId: {
      type: Schema.ObjectId,
      required: true,
    },
    user: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const TeamMembers =
  models.TeamMembers || model("TeamMembers", teamMembersSchema);
export default TeamMembers;
