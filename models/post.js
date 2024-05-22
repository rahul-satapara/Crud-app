const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/UserCrudApp');

let postSchema = new mongoose.Schema({
    name:{
        type:String,
        require:true
    },
    email:{
        type:String,
        require:true
    },
    image:{
        type:String,
        require:true,
        default:"default.jpg"
    },
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'user'
    }
});
// making model and Exporting it
module.exports = mongoose.model("post",postSchema);