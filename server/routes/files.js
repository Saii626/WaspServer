const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

var basePath;
if(process.env.NODE_ENV === "production") {
  basePath = '/media/pi';
}else {
  basePath = '/home/saii';
}

router.get('/video', function(req, res) {
  let filePath = req.session.videoPath;

  const stat = fs.statSync(filePath)
  const fileSize = stat.size
  const range = req.headers.range

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : fileSize-1
    const chunksize = (end-start)+1
    const file = fs.createReadStream(filePath, {start, end})
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    }

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    }
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

router.get('/get/*', function(req, res) {
  let filePath = basePath + req.url.substring(4);
  const pathStat = fs.statSync(filePath);

  if(pathStat.isFile()) {
    fs.access(filePath, fs.constants.R_OK, (err) => {
      if (err) {
        res.send('Insufficient Read permission');
      } else {
        if (path.extname(filePath) === '.mp4') {
          req.session.videoPath = filePath;
          res.redirect('/video.html');
        } else {
          res.sendFile(path, (err) => {
            if (err) {
              res.send(err);
            }
          });
        }
        return;
      }
    });
  } else {
    fs.readdir(filePath, function(err, files) {
      if (err) {
        console.log(err.path);
        delete err.path;
        res.send(err);
      } else {
        var obj = [];

        for (var file of files) {
          const stat = fs.statSync(filePath+'/'+file);
          obj.push({
            'name': file,
            'isFile': stat.isFile(),
            'size' : stat.size,
            'times' : {
              'birth' : stat.birthtime,
              'access' : stat.atime,
              'modify' : stat.mtime,
              'change' : stat.ctime
            },
            'userId' : stat.uid
          });
        };
        res.send(obj);
      }
    });
  }
});

router.get('/explore', function(req, res) {
  res.sendFile(path.join(__dirname, '../../public/files/explore.html'));
});

module.exports = router;
