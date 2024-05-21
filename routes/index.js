var express = require('express');
var router = express.Router();
var postModel = require('../models/post');
var userModel = require('../models/user');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var flash = require('connect-flash');
var { check, validationResult } = require('express-validator');
var signupValidationSchema = [
  check('name').notEmpty().withMessage('please enter name'),
  check('email').trim().isEmail().withMessage('Enter valid email'),
  check('password', 'the password must contain 6 characters, 1 lower case letter, 1 upper case letter, 1 number and 1 symbol').isStrongPassword({ minLength: 6 }),
  check('confirmPassword')
    .exists({ checkFalsy: true }).withMessage('You must type a confirmation password')
    .custom((value, { req }) => value === req.body.password).withMessage("The passwords do not match")
];
var loginValidationSchema = [
  check('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .custom(async (email, { req }) => {
      const user = await userModel.findOne({ email }).populate('posts');
      if (!user) {
        throw new Error('User not found');
      }
      req.user= user; // Attach user to request object
    }),
  check('password')
    .custom(async (password, { req }) => {
      if (!req.user) {
        return true;
      }
      const match = await bcrypt.compare(password, req.user.password);
      if (!match) {
        throw new Error('Incorrect password');
      }
      return true;
    })
];

// signup
router.get('/', function (req, res) {
  res.render('signup', { error: req.flash('errors') });
});

router.post('/signup', signupValidationSchema, function (req, res) {
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    let errorObj = errors.mapped();
    res.render('signup', { error: errorObj });
  } else {
    let { name, email, password } = req.body;
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(password, salt, async (err, hash) => {
        let user = await userModel.create({
          name,
          email,
          password: hash
        });
        let token = await jwt.sign({email}, 'secret');
        res.cookie('token',token);
        res.redirect('/read');
      });
    });
  }
});

router.get('/login', (req, res) => {
  res.render('login', { error: req.flash('error') });
});

router.post('/login', loginValidationSchema, async function (req, res) {
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.mapped());
    res.render('login', { error: errors.mapped() });
  } else {
    let token = jwt.sign({email:req.user.email}, 'secret');
    res.cookie('token',token);
    res.redirect('/read');
  }
}
);

router.get('/logout',(req,res)=>{
  res.cookie('token',"");
  res.redirect('/');  
});

router.get('/profile',isLoggedIn,async(req,res)=>{
  let user = await userModel.findOne({email:req.user.email}).populate('posts');
  res.render('profile' ,{user});
});

router.get('/create',isLoggedIn, function (req, res, next) {
  res.render('index');
});

router.post('/create',isLoggedIn, async function (req, res) {
  let { name, email, image } = req.body;
  let user = await userModel.findOne({email: req.user.email});
  let post = await postModel.create({
    name,
    email,
    image,
    user: req.user._id
  });
  await user.posts.push(post._id);
  await user.save();
  res.redirect('/read');
});

// read
router.get('/read', isLoggedIn , async function (req, res) {
  let allPosts = await postModel.find().populate('user');  
  res.render('read', { posts: allPosts,user:req.user});
});

//update
router.get('/update/:id', isLoggedIn,async function (req, res) {
  let user = await postModel.findOne({ _id: req.params.id }).populate('user');
  res.render('update', { post: user });
});

router.post('/update/:id', isLoggedIn,async function (req, res) {
  let { name, email, image } = req.body;
  let updatedUser = await postModel.findOneAndUpdate({ _id: req.params.id }, { name, email, image }, { new: true });
  await updatedUser.save();
  res.redirect('/read');
});

// delete
router.get('/delete/:id', isLoggedIn,async function (req, res) {
  let deletedPost= await postModel.findOneAndDelete({ _id: req.params.id });
  let user = await userModel.findOne({email:req.user.email});
  await user.posts.splice(1,user.posts.indexOf(deletedPost._id));
  await user.save();
  res.redirect('/read');
});

async function  isLoggedIn(req, res, next) {
  const token = req.cookies['token'];
  if (!token) {
      return res.redirect('/');
  }

  try {
      const verified = jwt.verify(token, "secret");
      let user = await userModel.findOne({email:verified.email});
      req.user = user; // Attach the verified user payload to the request object
      next(); // Continue to the next middleware or route handler
  } catch (err) {
      return res.redirect('/');
  }
}

module.exports = router;