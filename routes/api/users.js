const express = require("express");
const router = express.Router();
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const config = require("config");
const User = require("../../models/User");

//@route  POST api/users
//@desc   Register User
//@access Public
router.post(
  "/",
  [
    check("name", "Name is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    //This is async so we do try/catch. Could also do .then().catch().
    try {
      //See if user exists
      let user = await User.findOne({ email }); //Put await in front of anything that returns promise since we have async function

      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "User already exists" }] }); //formatting error to be simialr to above to keep consisteny (array of objects)
      }

      //Get users gravatar
      const avatar = normalize(
        gravatar.url(email, {
        s: "200", //size
        r: "pg", //no innapropriate images
        d: "mm", //default image
      }),
      { forceHttps: true }
      );

      user = new User({
        //this does not save the User
        name,
        email,
        avatar,
        password,
      });

      //encrypt password
      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);

      await user.save();

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
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.mesage);
      res.status(500).send("Server Error"); // we know if there is any error here it will be server error
    }
  }
);

module.exports = router;
