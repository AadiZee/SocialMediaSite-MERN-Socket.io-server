import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { readdirSync } from "fs";

const morgan = require("morgan");
require("dotenv").config();

const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  path: "/socket.io",
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-type"],
  },
});

//db connection
mongoose
  .connect(process.env.DATABASE, {
    useNewURLParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("DB connection Successful"))
  .catch((err) => console.log("DB connection error: ", err));

//middleware
app.use(
  express.json({
    limit: "5mb",
  })
);

app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: ["http://localhost:3000"],
  })
);

//autoload routes
readdirSync("./routes").map((routeFile) =>
  app.use("/api", require(`./routes/${routeFile}`))
);

//socket.io
// io.on("connect", (socket) => {
//   // console.log("SOCKET.IO", socket.id);
//   socket.on("send-message", (message) => {
//     // console.log("new message received => ", message);
//     // socket.emit("receive-message", message); //get message yourself
//     socket.broadcast.emit("receive-message", message); //all connected users get message
//   });
// });

io.on("connect", (socket) => {
  // console.log("SOCKET.IO", socket.id);
  socket.on("new-post", (newPost) => {
    // console.log("new post received => ", newPost);
    socket.broadcast.emit("new-post", newPost);
  });
});

const port = 3001;

http.listen(port, () => console.log(`Server running on ${port} !`));
