var express = require('express');
var router = express.Router();
var postModel = require('../models/post');
var userModel = require('../models/user');
var jwt = require('jsonwebtoken');
const path = require('path');
const fs = require("fs");
var multer = require('multer');
var upload = require('../utils/multerConfigue')
router.get('/profile',isLoggedIn,async(req,res)=>{
  let user = await userModel.findOne({email:req.user.email}).populate('posts');
  res.render('profile' ,{user});
});

router.get('/create',isLoggedIn, function (req, res, next) {
  res.render('index');
});

router.post('/create',isLoggedIn, upload.single('img'),async function (req, res) {
  let { name, email} = req.body;
  let user = await userModel.findOne({email: req.user.email});
  let post = await postModel.create({
    name,
    email,
    image:req.file.filename,
    user: req.user._id
  });
  user.posts.push(post._id);
  await user.save();
  return res.redirect('/read');
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

router.post('/update/:id', isLoggedIn, upload.single("img") ,async function (req, res) {
  let { name, email} = req.body;
  let updatedPost = await postModel.findOneAndUpdate({ _id: req.params.id }, { name, email, image:req.file.filename }, { new: true });
  await updatedPost.save();
  res.redirect('/read');
});

// delete
router.get('/delete/:id', isLoggedIn,async function (req, res) {
  let deletedPost= await postModel.findOneAndDelete({ _id: req.params.id });
  // console.log(deletedPost);
  // to delete multer files - uploded by users
  let filePath = path.join(__dirname, `../public/images/upload/${deletedPost.image}`);
  fs.unlink(filePath , (err)=>{
    if(err){
        console.log(err);
        return
    }
  });
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