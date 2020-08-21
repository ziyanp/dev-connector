const express = require("express");
const auth = require("../../middleware/auth");
const Profile = require("../../models/Profile");
const User = require("../../models/User");
const { check, validationResult } = require("express-validator");
const { profile } = require("console");
const axios = require('axios');
const config = require('config');
const router = express.Router();

//@route  GET api/profile/me
//@desc   Get current users profile
//@access Private
router.get("/me", auth, async (req, res) => {
  try {
    // finds a profile who's user matches the id provided in the request
    //.populate() allows us to extract properties from the given object reference, we called this ref:'user' in Profile model to target the user schema object
    //Wiithout .populate() the 'user' property will hold just the id
    const profile = await Profile.findOne({
      user: req.user.id,
    }).populate("user", ["name", "avatar"]);

    if (!profile) {
      return res.status(400).json({ msg: "There is no profile for this user" });
    }

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

//@route POST api/profile
//@desc   Create or update user profile
//@access Private
router.post(
  "/",
  [
    auth,
    [
      check("status", "Status is required").not().isEmpty(),
      check("skills", "Skills are required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      company,
      website,
      location,
      bio,
      status,
      githubusername,
      skills,
      youtube,
      facebook,
      twitter,
      instagram,
      linkedin,
    } = req.body;

    //Build profile object
    const profileFields = {};

    profileFields.user = req.user.id;

    if (company) profileFields.company = company;
    if (website) profileFields.website = website;
    if (location) profileFields.location = location;
    if (bio) profileFields.bio = bio;
    if (status) profileFields.status = status;
    if (githubusername) profileFields.githubusername = githubusername;
    if (skills) {
      profileFields.skills = skills.split(",").map((skill) => skill.trim()); //skills will be comma separated string. This converts to array and accounts for any number of spaces in the string
    }

    //Build object for socials
    profileFields.social = {};
    if (youtube) profileFields.social.youtube = youtube;
    if (facebook) profileFields.social.facebook = facebook;
    if (twitter) profileFields.social.twitter = twitter;
    if (instagram) profileFields.social.instagram = instagram;
    if (linkedin) profileFields.social.linkedin = linkedin;

    try {
      let profile = await Profile.findOne({ user: req.user.id });

      if (profile) {
        //Update
        profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: profileFields },
          { new: true }
        ); //findOneandUpdate returns document before the update, setting new: true will return document AFTER update

        return res.json(profile); //stop this function from continuing once it is updated
      }

      //Create if the profile does not exist
      profile = new Profile(profileFields);
      await profile.save();
      res.json(profile);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
    }
  }
);

//@route  GET api/profile
//@desc   Get  all profiles
//@access Public
router.get("/", async (req, res) => {
  try {
    const profiles = await Profile.find().populate("user", ["name", "avatar"]);
    return res.json(profiles);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send("Server error");
  }
});

//@route  GET api/profile/user/:user_id
//@desc   Get  profile by user ID
//@access Public
router.get("/user/:user_id", async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id,
    }).populate("user", ["name", "avatar"]);

    if (!profile) {
      return res.status(400).json({ msg: "Profile not found" }); //This returns if the id is formatted properly(like a typical MongoDB id) but does not exist in our collection
    }

    return res.json(profile);
  } catch (err) {
    console.error(err.message);

    if (err.kind == "ObjectId") {
      //if the route parameter is an invalid key (too many characters). The above try will fail since we cant call Profile.findOne and pass in user with incorrectly formatted id
      return res.status(400).json({ msg: "Profile not found" });
    }
    return res.status(500).send("Server error");
  }
});

//@route  DELETE api/profile
//@desc   Delete profile, user, and posts
//@access Private
router.delete("/", auth, async (req, res) => {
  try {
    //todo - remove user posts

    //Remove profile
    await Profile.findOneAndRemove({ user: req.user.id });
    //Remove User
    await User.findOneAndRemove({ _id: req.user.id });

    return res.json({ msg: "User removed" });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send("Server error");
  }
});

//@route  PUT api/profile/experience  Could also do a post here
//@desc   Add profile experience
//@access Private
router.put(
  "/experience",
  [
    auth,
    [
      check("title", "Title is required").notEmpty(),
      check("company", "Company is required").notEmpty(),
      check("from", "From date is required").notEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      company,
      location,
      from,
      to,
      current,
      description,
    } = req.body;

    const newExp = {
      title, //recall, same as title: title
      company,
      location,
      from,
      to,
      current,
      description,
    };

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      profile.experience.unshift(newExp); //could do push as well but we want newest experiences at the start of the array (can list experiences from latest to oldest in frontend)
      await profile.save();
      return res.json(profile);
    } catch (err) {
      console.error(error);
      return res.status(500).send("Server error");
    }
  }
);

//@route  DELETE api/profile/experience/:exp_id  Could also do a put here
//@desc   Delete profile experience
//@access Private
router.delete("/experience/:exp_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });

    //Get index of experience to remove
    const removeIndex = profile.experience //array of objects
      .map((item) => item._id) //is now array of id's
      .indexOf(req.params.exp_id); //index of target id

    profile.experience.splice(removeIndex, 1);

    await profile.save();
    return res.json(profile);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
});


//@route  PUT api/profile/education  Could also do a post here
//@desc   Add profile education
//@access Private
router.put(
  "/education",
  [
    auth,
    [
      check("school", "School name is required").notEmpty(),
      check("degree", "Degree type is required").notEmpty(),
      check("fieldofstudy", "Field of study is required").notEmpty(),
      check("from", "From date is required").notEmpty()
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description,
    } = req.body;

    const newEdu = {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description,
    };

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      profile.education.unshift(newEdu); 
      await profile.save();
      return res.json(profile);
    } catch (err) {
      console.error(error);
      return res.status(500).send("Server error");
    }
  }
);

//@route  DELETE api/profile/education/:edu_id  
//@desc   Delete profile education
//@access Private
router.delete("/education/:edu_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });

    //Get index of experience to remove
    const removeIndex = profile.education //array of objects
      .map((item) => item._id) //is now array of id's
      .indexOf(req.params.exp_id); //index of target id

    profile.education.splice(removeIndex, 1);

    await profile.save();
    return res.json(profile);

  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
});

//@route  GET api/profile/github/:username 
//@desc   GET user repos from Github
//@access Public
router.get('/github/:username', async (req,res) => {
  try {
    const uri = encodeURI(
      `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc`
    );
    const headers = {
      'user-agent': 'node.js',  //doesn't work without this
      Authorization: `token ${config.get('githubToken')}`
    };

    const githubResponse = await axios.get(uri, {headers})

    return res.json(githubResponse.data)
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
    
  }
})

module.exports = router;
