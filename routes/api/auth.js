const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const config = require("config");
const bcrypt = require("bcryptjs");

//@route  GET api/auth
//@desc   Test route
//@access Public
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); //req.user was set in auth middleware function
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

//@route  POST api/auth
//@desc   Authenticate user & get token
//@access Public
router.post(
  "/",
  [
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password is required").exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    //This is async so we do try/catch. Could also do .then().catch().
    try {
      //See if user exists
      let user = await User.findOne({ email }); //Put await in front of anything that returns promise since we have async function

      if (!user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "Invalid credentials" }] }); //formatting error to be simialr to above to keep consisteny (array of objects)
      }

      const isMatch = await bcrypt.compare(password, user.password);  //compares plain text password to encrypted one

      if (!isMatch) { //if incorrect password
        return res
          .status(400)
          .json({ errors: [{ msg: "Invalid credentials" }] });
      }

      //Return jsonwebtoken (automatically login when registered)
      const payload = {
        user: {
          id: user.id, //from above user which was saved to MongoDB (id is auto generated in mongodb)(mongoose allows us to use .id even though in MongoDB it is ._id)
        },
      };

      jwt.sign(
        payload,
        config.get("jwtSecret"),
        { expiresIn: 360000 }, //change this back to 3600(one hour), keep it longer while developing
        (err, token) => {
          if (err) throw err;
          res.json({ token }); //token is a string so we send as object
        }
      );
    } catch (err) {
      console.error(err.mesage);
      res.status(500).send("Server Error"); // we know if there is any error here it will be server error
    }
  }
);

module.exports = router;
