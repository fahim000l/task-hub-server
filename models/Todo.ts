import { Schema, model, models } from "mongoose";

export interface TtoDo {
  deadline: {
    day?: Date | undefined;
    time?: string | undefined;
    meridiem?: "AM" | "PM";
  };
  subject: string;
  user: string;
  work: string;
  details: string;
  status: "assigned" | "done" | "pending";
}

const toDoSchema = new Schema<TtoDo>(
  {
    deadline: {
      type: Object,
      required: true,
    },
    details: {
      type: String,
    },
    status: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    user: {
      type: String,
      required: true,
    },
    work: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Todo = models.Todo || model("Todo", toDoSchema);
export default Todo;
