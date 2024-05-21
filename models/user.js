const mongoose = require('mongoose');

let userSchema = new mongoose.Schema({
    name:{
        type:String,
        require:true
    },
    email:{
        type:String,
        require:true
    },
    password:{
        type:String,
        require:true
    },
    posts:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:'post'
        }
    ],
    pfp:{
        type:String,
        default:"default.png"
    }
});
// making model and Exporting it
module.exports = mongoose.model("user",userSchema);