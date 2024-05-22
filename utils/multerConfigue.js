var multer = require('multer');
var path = require('path');

const storage = multer.diskStorage({
  // place where our uploads will be
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '../public/images/upload'))
    },
    // unique name for our file - so that they don't overwrite
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.fieldname + '-' + uniqueSuffix+ path.extname(file.originalname))
    }
  })
  
const upload = multer({ storage: storage })

module.exports = upload
