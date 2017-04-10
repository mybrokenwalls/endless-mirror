'use strict';

var express = require('express');
var firebase = require('firebase');
var jsonFile = require('jsonfile');
var aws = require('aws-sdk');
var fs = require('fs');
var zlib = require('zlib');
var config = require('./config');
//
// var app = module.exports = express.createServer();
var app = express();
app.set('port', (process.env.PORT || 9080));

var serviceAccount = 'yourCreds.json';
var firebaseAppName = 'yourAppName';
// Mirror
//TODO: upgrade this to the new firebase version
//TODO: set EM up to a firebase db to test
const firebaseApp = firebase.initializeApp({
    apiKey: config.FIREBASE_SECRET_KEY,
    serviceAccount: serviceAccount,
    authDomain: firebaseAppName + '.firebaseapp.com',
    databaseURL: 'https://' + firebaseAppName + '.firebaseio.com'
});

AWS.config.update({
    accessKeyId: config.AWS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_KEY,
    region: 'us-east-1'
});

var dbRef = firebaseApp.database().ref();
console.log('Good Day');
dbRef.once('value').then(function(snapshot) {

    var file = 'fp-prod-backup-' + Date.now() + '.json';
    var zipedFile = file + '.gz';
    console.log(file);
    jsonFile.writeFileSync(file, snapshot.val());

    var gzip = zlib.createGzip();
    var rstream = fs.createReadStream(file);
    var wstream = fs.createWriteStream(file + '.gz');

    rstream // reads from file
        .pipe(gzip) // compresses file
        .pipe(wstream) // writes to file.gz
        .on('finish', function() { // finished
            console.log('done compressing');

            var body = fs.createReadStream(zipedFile);

            var s3 = new AWS.S3({
                params: {
                    Bucket: config.S3_BUCKET,
                    Key: zipedFile
                }
            });

            s3.upload({
                Body: body
            }).on('httpUploadProgress', function(e) {
                console.log(e);
            }).send(function(err, data) {
                console.log(err, data);
            });

            firebaseApp.database().goOffline();

        });

});

// module.exports = {};

app.listen(app.get('port'), function () {
  console.log('Endless Mirror running on port', app.get('port'));
}); //end listen
