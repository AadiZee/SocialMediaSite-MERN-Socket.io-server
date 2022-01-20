import User from "../models/user";
import { HashPassword, ComparePassword } from "../helpers/auth";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";

export const register = async (req, res) => {
  const { name, email, password, secret } = req.body;

  //validation
  if (!name) {
    return res.json({ error: "Name is required" });
  }

  if (!password || password.length < 6)
    return res.json({
      error: "Password is required and should be at least 6 characters",
    });

  if (!secret) {
    return res.json({ error: "Answer is required" });
  }

  const exist = await User.findOne({ email: email });

  if (exist) {
    return res.json({ error: "Email already in use" });
  }

  //hash password
  const hashedPassword = await HashPassword(password);

  const user = new User({
    name,
    email,
    password: hashedPassword,
    secret,
    username: nanoid(6),
  });

  try {
    await user.save();
    return res.json({
      ok: true,
    });
  } catch (err) {
    console.log("Error while Registering User, Reason => ", err);
    return res.status(400).send("Error. Try Again");
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    //check user in DB
    if (!user) {
      return res.json({ error: "No user found" });
    }
    //compare entered pass to hashed pass
    const match = await ComparePassword(password, user.password);

    if (!match) {
      return res.json({ error: "Invalid Password" });
    }
    //create singed token
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    user.password = undefined;
    user.secret = undefined;
    res.json({
      token: token,
      user: user,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).send("Error, Try Again");
  }
};

export const currentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ ok: true });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
};

export const forgotPassword = async (req, res) => {
  const { email, newPassword, secret } = req.body;

  if (!newPassword || newPassword < 6) {
    return res.json({
      error: "New Password is required and should be minimum 6 characters",
    });
  }
  if (!secret) {
    return res.json({ error: "Secret is required" });
  }
  const user = await User.findOne({ email, secret });
  if (!user) {
    return res.json({ error: "We can't verify you with those details!!!" });
  }

  try {
    const hashed = await HashPassword(newPassword);
    await User.findByIdAndUpdate(user._id, { password: hashed });
    return res.json({
      success: "Congrats, Now you can login with your new password",
    });
  } catch (error) {
    console.log(error);
    return res.json({ error: "Something went wrong. Try Again!" });
  }
};

export const profileUpdate = async (req, res) => {
  try {
    // console.log("Profile Update => ", req.body);
    const data = {};

    if (req.body.username) {
      data.username = req.body.username;
    }
    if (req.body.about) {
      data.about = req.body.about;
    }
    if (req.body.name) {
      data.name = req.body.name;
    }
    if (req.body.password) {
      if (req.body.password.length < 6) {
        return res.json({
          error: "Password needs to be at least 6 characters",
        });
      } else {
        data.password = await HashPassword(req.body.password);
      }
    }
    if (req.body.secret) {
      data.secret = req.body.secret;
    }
    if (req.body.image) {
      data.image = req.body.image;
    }

    let user = await User.findByIdAndUpdate(req.user._id, data, { new: true });
    // console.log("Updated user => ", user);
    user.password = undefined;
    user.secret = undefined;
    res.json(user);
  } catch (error) {
    if (error.code == 11000) {
      return res.json({ error: "Username already taken!!!" });
    }
    console.log(error);
  }
};

export const findPeople = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    //user.following
    let following = user.following;
    following.push(user._id);
    const people = await User.find({ _id: { $nin: following } })
      .select("-password -secret")
      .limit(10);
    res.json(people);
  } catch (error) {
    console.log(error);
  }
};

export const addFollower = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.body._id, {
      $addToSet: { followers: req.body._id },
    });

    next();
  } catch (error) {
    console.log(error);
  }
};

export const userFollow = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $addToSet: { following: req.body._id },
      },
      { new: true }
    ).select("-password -secret");

    res.json(user);
  } catch (error) {
    console.log(error);
  }
};

export const userFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const following = await User.find({ _id: user.following }).limit(100);
    res.json(following);
  } catch (error) {
    console.log(error);
  }
};

export const removeFollower = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.body._id, {
      $pull: { followers: req.user._id },
    });
    next();
  } catch (error) {
    console.log(error);
  }
};

export const userUnfollow = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $pull: { following: req.body._id },
      },
      { new: true }
    );
    res.json(user);
  } catch (error) {
    console.log(error);
  }
};

export const searchUser = async (req, res) => {
  const { query } = req.params;

  if (!query) return;
  try {
    const user = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { username: { $regex: query, $options: "i" } },
      ],
    }).select("-password -secret");
    res.json(user);
  } catch (error) {
    console.log(error);
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select(
      "-password -secret"
    );
    res.json(user);
  } catch (error) {
    console.log(error);
  }
};
