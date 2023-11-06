import { Schema, model, models } from "mongoose";

export interface Ttask {
  taskName: string;
  work: string;
  assign: "all" | "specific";
  priority: number;
  deadline: {
    day: Date | string;
    time: string;
    meridiem: "AM" | "PM";
  };
  details?: string;
}

const taskSchema = new Schema<Ttask>(
  {
    taskName: {
      type: String,
      required: true,
    },
    assign: {
      type: String,
      required: true,
    },
    deadline: {
      type: Object,
      required: true,
    },
    details: {
      type: String,
    },
    priority: {
      type: Number,
    },
    work: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Task = models.Task || model("Task", taskSchema);
export default Task;
