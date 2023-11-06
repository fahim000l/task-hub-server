import { Schema, model, models } from "mongoose";

export interface TAssigned {
  taskId: Schema.Types.ObjectId;
  user: string;
}

const assigningSchema = new Schema<TAssigned>(
  {
    taskId: {
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

const Assigning = models.Assigning || model("Assigning", assigningSchema);

export default Assigning;
