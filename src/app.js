import express, { urlencoded } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";

const app = express();

// Middleware :
app.use(
  morgan("dev", {
    skip: function (req, res) {
      return req.path == "/getUserBalance";
    },
  })
);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(
  urlencoded({
    extended: true,
    limit: "16kb",
  })
);
app.use(express.json());
app.use(express.static("public"));
app.use(cookieParser());

// ROUTES ----- IMPORT

import userRouter from "./routes/user.routes.js";
import locationRouter from "./routes/location.routes.js";
import adminRouter from "./routes/admin.routes.js";

// routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/location", locationRouter);

export { app };
