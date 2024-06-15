var express = require('express');
var router = express.Router();
var userModel = require('../models/user');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var flash = require('connect-flash');
var { check, validationResult } = require('express-validator');
var upload = require('../utils/multerConfigue')

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
      req.user = user; // Attach user to request object
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
        let token = await jwt.sign({ email }, 'secret');
        res.cookie('token', token);
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
    let token = jwt.sign({ email: req.user.email }, 'secret');
    res.cookie('token', token);
    res.redirect('/read');
  }
}
);

router.get('/edit/:id', signupValidationSchema, isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ _id: req.user._id });
  res.render('editUser', { user });
});
router.post('/edit/:id', isLoggedIn, upload.single('img'), async (req, res) => {
  try {
    let {name} = req.body;
    let updatedUser = await userModel.findOneAndUpdate({ _id: req.user._id},{name,pfp:req.file.filename}, { new: true });
    await updatedUser.save();
    res.redirect('/read');
  } catch (error) {
    console.log(error);

  }
});

router.get('/logout', (req, res) => {
  res.cookie('token', "");
  res.redirect('/');
});
async function isLoggedIn(req, res, next) {
  const token = req.cookies['token'];
  if (!token) {
    return res.redirect('/');
  }

  try {
    const verified = jwt.verify(token, "secret");
    let user = await userModel.findOne({ email: verified.email });
    req.user = user; // Attach the verified user payload to the request object
    next(); // Continue to the next middleware or route handler
  } catch (err) {
    return res.redirect('/');
  }
}

module.exports = router;