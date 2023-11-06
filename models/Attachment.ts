import { Schema, model, models } from "mongoose";

export interface TAt {
  parentId: Schema.Types.ObjectId;
  file: string;
}

const attachmentSchema = new Schema<TAt>(
  {
    file: {
      type: String,
      required: true,
    },
    parentId: {
      type: Schema.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

const Attachment = models.Attachment || model("Attachment", attachmentSchema);
export default Attachment;
