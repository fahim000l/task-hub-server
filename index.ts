import express, { Request, Response } from "express";
import dotRnv from "dotenv";
const dotenv = dotRnv.config();
import cors from "cors";
import mongoose from "mongoose";
import User, { TUser } from "./models/User";
import { hash, compare } from "bcrypt";
import { serialize } from "cookie";
import cookieParcer from "cookie-parser";
import { sign, verify } from "jsonwebtoken";
import Todo from "./models/Todo";
import { jwtSign } from "./lib/jwtSign";
import passport from "passport";
import stretegy from "passport-google-oauth20";
const GoogleStrategy = stretegy.Strategy;
import session from "express-session";
import { ObjectId } from "mongodb";
import Team from "./models/Team";
import TeamMembers from "./models/TeamMembers";
import Task from "./models/Task";
import Assigning, { TAssigned } from "./models/Assigning";
import Attachment, { TAt } from "./models/Attachment";
import Submission from "./models/Submission";
const uri: string | undefined = process.env.DB_URL;
const port = process.env.PORT;

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "Infinity" }));
app.use(cookieParcer());
app.use(
  session({
    secret: process.env.GOOGLE_API_KEY as string,
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: `${process.env.SERVER_DOMAIN}/auth/google/callback`,
    },
    async (assessToen, refreshToken, profile, done) => {
      const isExist = await User.findOne({ email: profile._json.email });
      if (!isExist) {
        const userInfo: TUser = {
          email: profile._json.email as string,
          password: "",
          profilePic: profile._json.picture as string,
          userName: profile.displayName,
        };

        await User.create(userInfo);
      }

      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  if (user) done(null, user);
});

app.get("/", (req: Request, res: Response) => {
  res.send("Hellow from task-hub server");
});

async function connectMongo() {
  try {
    if (uri) {
      await mongoose.connect(uri);
      console.log(
        "Pinged your deployment. You successfully connected to MongoDB!"
      );

      app.post("/sign-up", async (req: Request, res: Response) => {
        const { body } = req;

        const isExist = await User.findOne({ email: body.email });

        if (isExist) {
          return res
            .status(403)
            .json({ success: false, message: "User already exist" });
        } else {
          const userInfo = {
            email: body.email,
            profilePic: body.profilePic,
            userName: body.userName,
            password: await hash(body.password, 12),
          };
          const result = await User.create(userInfo);
          const authToken = jwtSign(userInfo.email);

          res.setHeader(
            "Set-Cookie",
            serialize("authToken", authToken, {
              path: "/",
              httpOnly: true,
              secure: false,
              maxAge: 24 * 60 * 60,
            })
          );

          return res.status(200).json({ success: true, result });
        }
      });

      app.post("/sign-in", async (req: Request, res: Response) => {
        const { email, password } = req.body;

        const findUser = await User.findOne({ email });

        if (!findUser) {
          return res
            .status(403)
            .json({ success: false, error: true, message: "User not found" });
        } else {
          const isValid = await compare(password, findUser?.password);

          if (!isValid) {
            return res.status(403).json({
              success: false,
              error: true,
              message: "Incorect Credential",
            });
          } else {
            const authToken = jwtSign(findUser.email);

            res.setHeader(
              "Set-Cookie",
              serialize("authToken", authToken, {
                path: "/",
                httpOnly: true,
                secure: false,
                maxAge: 24 * 60 * 60,
              })
            );

            return res.status(200).json({ success: true });
          }
        }
      });

      app.post("/store-todo", async (req: Request, res: Response) => {
        const { body } = req;
        const result = await Todo.create(body);
        return res.status(200).json({ success: true, result, error: false });
      });

      app.get("/get-session-user", async (req: Request, res: Response) => {
        const { cookies } = req;

        const isExist = cookies?.authToken;

        if (!isExist) {
          return res.status(200).json({ message: "unauthenticated" });
        } else {
          verify(
            isExist,
            process.env.JWT_SECRET as string,
            async (err: any, decoded: any) => {
              if (err) {
                return res.status(403).send({ message: "Session Expired" });
              } else {
                const sessionUser = await User.aggregate([
                  {
                    $match: { email: decoded.email },
                  },
                  {
                    $lookup: {
                      from: "todos",
                      localField: "email",
                      foreignField: "user",
                      as: "todos",
                    },
                  },
                  {
                    $lookup: {
                      from: "teammembers",
                      localField: "email",
                      foreignField: "user",
                      as: "memberships",
                      pipeline: [
                        {
                          $lookup: {
                            from: "teams",
                            localField: "teamId",
                            foreignField: "_id",
                            as: "teamInfo",
                            pipeline: [
                              {
                                $lookup: {
                                  from: "users",
                                  localField: "leader",
                                  foreignField: "email",
                                  as: "leaderInfo",
                                },
                              },
                              {
                                $lookup: {
                                  from: "tasks",
                                  localField: "_id",
                                  foreignField: "teamId",
                                  as: "tasks",
                                  pipeline: [
                                    {
                                      $lookup: {
                                        from: "assignings",
                                        localField: "_id",
                                        foreignField: "taskId",
                                        as: "assignings",
                                        pipeline: [
                                          {
                                            $lookup: {
                                              from: "users",
                                              localField: "user",
                                              foreignField: "email",
                                              as: "assignedTo",
                                            },
                                          },
                                        ],
                                      },
                                    },
                                    {
                                      $lookup: {
                                        from: "attachments",
                                        localField: "_id",
                                        foreignField: "parentId",
                                        as: "attachments",
                                      },
                                    },
                                  ],
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  {
                    $lookup: {
                      from: "assignings",
                      localField: "email",
                      foreignField: "user",
                      as: "assignings",
                      pipeline: [
                        {
                          $lookup: {
                            from: "tasks",
                            localField: "taskId",
                            foreignField: "_id",
                            as: "taskInfo",
                            pipeline: [
                              {
                                $lookup: {
                                  from: "assignings",
                                  localField: "_id",
                                  foreignField: "taskId",
                                  as: "assignings",
                                  pipeline: [
                                    {
                                      $lookup: {
                                        from: "users",
                                        localField: "user",
                                        foreignField: "email",
                                        as: "assignedTo",
                                      },
                                    },
                                  ],
                                },
                              },
                              {
                                $lookup: {
                                  from: "attachments",
                                  localField: "_id",
                                  foreignField: "parentId",
                                  as: "attachments",
                                },
                              },
                              {
                                $lookup: {
                                  from: "teams",
                                  localField: "teamId",
                                  foreignField: "_id",
                                  as: "teamInfo",
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ]);

                return res.status(200).json(sessionUser);
              }
            }
          );
        }
      });

      app.get("/get-all-todos", async (req: Request, res: Response) => {
        const allTodos = await Todo?.aggregate([
          {
            $match: { user: req.query.email },
          },
        ]);

        return res.status(200).json(allTodos);
      });

      app.get("/log-out", (req: Request, res: Response) => {
        res.setHeader(
          "Set-Cookie",
          serialize("authToken", "Something", {
            path: "/",
            httpOnly: true,
            maxAge: 0,
          })
        );

        return res.status(200).json({ success: true });
      });

      app.get(
        "/auth-google",
        passport.authenticate("google", {
          scope: ["profile", "email"],
        })
      );
      app.get(
        "/auth/google/callback",
        passport.authenticate("google", {
          // successRedirect: process.env.CLIENT_URL,
          failureRedirect: `${process.env.CLIENT_URL}/signin`,
        }),
        (req: any, res: Response) => {
          const authToken = jwtSign(req.user?._json.email);
          res.setHeader(
            "Set-Cookie",
            serialize("authToken", authToken, {
              path: "/",
              httpOnly: true,
              secure: false,
              maxAge: 24 * 60 * 60,
            })
          );

          res.redirect(process.env.CLIENT_URL as string);
        }
      );

      app.put("/edit-todo", async (req: Request, res: Response) => {
        const { body, query } = req;

        const findTodo = { _id: new ObjectId(query._id as string) };
        const updatingDoc = {
          $set: body,
        };

        const result = await Todo.updateOne(findTodo, updatingDoc);

        return res.status(200).json({ success: true, error: false, result });
      });

      app.delete("/delete-todos", async (req: Request, res: Response) => {
        const { body } = req;

        const result = await Todo.deleteMany({
          _id: { $in: body?.map((id: string) => new ObjectId(id)) },
        });

        return res.status(200).json({ success: true, error: false, result });
      });

      app.put("/todos-status-change", async (req: Request, res: Response) => {
        const { body, query } = req;

        const findTodos = {
          _id: { $in: body?.map((id: string) => new ObjectId(id)) },
        };

        const updatingDoc = {
          $set: {
            status: query.status,
          },
        };

        const result = await Todo.updateMany(findTodos, updatingDoc);
        return res.status(200).json({ success: true, error: false, result });
      });

      app.post("/store-team", async (req: Request, res: Response) => {
        const { body } = req;

        const result1 = await Team.create(body);
        const result2 = await TeamMembers.create({
          teamId: result1._id,
          user: body.leader,
        });

        return res
          .status(200)
          .json({ success: true, error: false, result1, result2 });
      });

      app.get("/get-all-teams", async (req: Request, res: Response) => {
        const allTeams = await TeamMembers.aggregate([
          {
            $match: { user: req.query.email },
          },
          {
            $lookup: {
              from: "teams",
              localField: "teamId",
              foreignField: "_id",
              as: "teamInfo",
              pipeline: [
                {
                  $lookup: {
                    from: "users",
                    localField: "leader",
                    foreignField: "email",
                    as: "leaderInfo",
                  },
                },
              ],
            },
          },
        ]);

        return res.status(200).json(allTeams);
      });

      app.get("/get-all-user", async (req: Request, res: Response) => {
        const allUser = await User.aggregate([
          {
            $match: {},
          },
        ]);

        return res.status(200).json(allUser);
      });

      app.get("/get-team-by-id", async (req: Request, res: Response) => {
        const { query } = req;

        const team = await Team.aggregate([
          {
            $match: { _id: new ObjectId(query.teamId as string) },
          },
          {
            $lookup: {
              from: "users",
              localField: "leader",
              foreignField: "email",
              as: "leaderInfo",
            },
          },
          {
            $lookup: {
              from: "teammembers",
              localField: "_id",
              foreignField: "teamId",
              as: "members",
              pipeline: [
                {
                  $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "email",
                    as: "memberInfo",
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "tasks",
              localField: "_id",
              foreignField: "teamId",
              as: "tasks",
              pipeline: [
                {
                  $lookup: {
                    from: "assignings",
                    localField: "_id",
                    foreignField: "taskId",
                    as: "assignings",
                    pipeline: [
                      {
                        $lookup: {
                          from: "users",
                          localField: "user",
                          foreignField: "email",
                          as: "assignedTo",
                        },
                      },
                    ],
                  },
                },
                {
                  $lookup: {
                    from: "attachments",
                    localField: "_id",
                    foreignField: "parentId",
                    as: "attachments",
                  },
                },
              ],
            },
          },
        ]);

        return res.status(200).json(team);
      });

      app.post("/add-team-member", async (req: Request, res: Response) => {
        const { body } = req;

        const result = await TeamMembers.create(body);
        return res.status(200).json({ success: true, error: false, result });
      });

      app.post("/store-task", async (req: Request, res: Response) => {
        const { body } = req;
        const result1 = await Task.create(body.task);
        let result2: any;
        let result3: any;
        if (result1._id) {
          if (body?.assignings?.length > 0) {
            body?.assignings?.forEach((element: TAssigned) => {
              element.taskId = result1._id;
            });
            result2 = await Assigning.insertMany(body.assignings);
          }
          if (body?.attachments?.length > 0) {
            body.attachments?.forEach((element: TAt) => {
              element.parentId = result1._id;
            });
            result3 = await Attachment.insertMany(body.attachments);
          }
        }

        return res
          .status(200)
          .json({ success: true, error: false, result1, result2, result3 });
      });

      app.get("/get-task-by-id", async (req: Request, res: Response) => {
        const { query } = req;

        const task = await Task.aggregate([
          {
            $match: { _id: new ObjectId(query.taskId as string) },
          },
          {
            $lookup: {
              from: "assignings",
              localField: "_id",
              foreignField: "taskId",
              as: "assignings",
              pipeline: [
                {
                  $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "email",
                    as: "assignedTo",
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "attachments",
              localField: "_id",
              foreignField: "parentId",
              as: "attachments",
            },
          },
          {
            $lookup: {
              from: "submissions",
              localField: "_id",
              foreignField: "taskId",
              as: "submissions",
              pipeline: [
                {
                  $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "email",
                    as: "submittedBy",
                  },
                },
                {
                  $lookup: {
                    from: "attachments",
                    localField: "_id",
                    foreignField: "parentId",
                    as: "attachments",
                  },
                },
              ],
            },
          },
        ]);

        return res.status(200).json(task);
      });

      app.post("/store-submission", async (req: Request, res: Response) => {
        const { body } = req;

        const result1 = await Submission.create(body.submission);
        let result2: any;
        if (result1?._id) {
          if (body?.attachments?.length > 0) {
            body.attachments?.forEach((element: TAt) => {
              element.parentId = result1._id;
            });
            result2 = await Attachment.insertMany(body.attachments);
          }
        }

        return res
          .status(200)
          .json({ success: true, error: false, result1, result2 });
      });
    }
  } finally {
  }
}

connectMongo().catch((err) => console.error(err));

app.listen(port, () => {
  console.log(`Server is running on port : ${port}`);
});
