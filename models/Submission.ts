import { Schema, model, models } from "mongoose";

export interface Tsubmission {
  taskId: Schema.Types.ObjectId;
  user: string;
  details: string;
}

const submissionSchema = new Schema<Tsubmission>(
  {
    taskId: {
      type: Schema.ObjectId,
      required: true,
    },
    user: {
      type: String,
      required: true,
    },
    details: {
      type: String,
    },
  },
  { timestamps: true }
);

const Submission = models.Submission || model("Submission", submissionSchema);
export default Submission;
