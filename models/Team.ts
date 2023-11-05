import { Schema, model, models } from "mongoose";

export interface Tteam {
  teamName?: string;
  subject?: string;
  details?: string;
  leader?: string;
}

const teamSchema = new Schema<Tteam>(
  {
    details: {
      type: String,
    },
    leader: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    teamName: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Team = models.Team || model("Team", teamSchema);
export default Team;
