var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var fs = require('fs');
var csv = require('fast-csv');
var schedule = require('node-schedule');
var http = require('http');
var https = require('https');

var app = express();

// Database connection
const { Pool, Client } = require('pg')
const connectionString = 'postgres://uyuapysi:pYlez3muTAJvLGLdigo_rxHv0r1n0a_5@manny.db.elephantsql.com:5432/uyuapysi'

// Creating a connection pool
const pool = new Pool({
  connectionString: connectionString,
})
// Cehck that DB connection was established
if (!pool){
  console.log("Error while connecting to the DB");
}

// Cron job that runs every minute
var temp;
var j = schedule.scheduleJob('*/30 * * * *', function(){
  http.get('http://api.openweathermap.org/data/2.5/weather?q=Dornoch&APPID=f7eb12f351a6cc84894f63865583ae7e', (resp) => {
  let data = '';
    // A chunk of data has been recieved.
    resp.on('data', (chunk) => {
      data += chunk;
    });
    // The whole response has been received.
    resp.on('end', () => {
      temp = Math.round((JSON.parse(data).main.temp - 273.15)*100)/100;
      var d = new Date();
      var month = (d.getMonth()+1 < 10) ? '0'+(d.getMonth()+1) : (d.getMonth()+1);
      var day = (d.getDate() < 10) ? '0'+(d.getDate()+1) : (d.getDate()+1);
      var hour = (d.getHours() < 10) ? '0'+(d.getHours()) : (d.getHours());
      var minutes = (d.getMinutes() < 10) ? '0'+(d.getMinutes()) : (d.getMinutes());
      var seconds = (d.getSeconds() < 10) ? '0'+(d.getSeconds()) : (d.getSeconds());
      var date = '' + d.getFullYear() + '-' + month + '-' + day + ' ' + hour + ':' + minutes + ':' + seconds;
      // Constructing SQL query
      var insert = 'INSERT INTO temp (date, temp) VALUES (\''+date+'\', \''+temp+'\');';

      pool.query(insert, (err, res) => {
        if (err){
          console.log("Error while inserting into the DB");
        } else {
          console.log("Data inserted");
        }
      })

    });
  }).on("error", (err) => {
    console.log("Error: " + err.message);
  });

  https.get('https://environment.data.gov.uk/flood-monitoring/id/stations/E70739/measures', (resp) => {
  let data = '';
    // A chunk of data has been recieved.
    resp.on('data', (chunk) => {
      data += chunk;
    });
    // The whole response has been received.
    resp.on('end', () => {
      tidal = JSON.parse(data).items[0].latestReading.value;
      var d = new Date();
      var month = (d.getMonth()+1 < 10) ? '0'+(d.getMonth()+1) : (d.getMonth()+1);
      var day = (d.getDate() < 10) ? '0'+(d.getDate()+1) : (d.getDate()+1);
      var hour = (d.getHours() < 10) ? '0'+(d.getHours()) : (d.getHours());
      var minutes = (d.getMinutes() < 10) ? '0'+(d.getMinutes()) : (d.getMinutes());
      var seconds = (d.getSeconds() < 10) ? '0'+(d.getSeconds()) : (d.getSeconds());
      var date = '' + d.getFullYear() + '-' + month + '-' + day + ' ' + hour + ':' + minutes + ':' + seconds;
      // Constructing SQL query

      var insert = 'INSERT INTO tidal (date, height) VALUES (\''+date+'\', \''+tidal+'\');';

      pool.query(insert, (err, res) => {
        if (err){
          console.log("Error while inserting into the DB");
        } else {
          console.log("Data inserted");
        }
      })
    });
  }).on("error", (err) => {
    console.log("Error: " + err.message);
  });

  console.log('Cron job run successfully!');
});

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// Set Static Path
app.use(express.static(path.join(__dirname, 'views')));

// Passing empty values to the page when loaded
app.get('/', function(req, res){
   res.render('home',{
     res_cor_data: [],
     res_raw_data: [],
     temp_data: [],
     time_labels: [],
     day_labels: [],
     temp1: [],
     temp2: [],
     temp3: [],
     temp4: [],
     realtemp: [],
     realdate: [],
     tidaldate: [],
     tidalheight: [],
     t1: true,
     t2: false,
     t3: false,
     t4: false,
     yLn: [],
     xKt1: [],
     xKt2: [],
     xKt3: [],
     xKt4: [],
     s1: 0,
     s2: 0,
     s3: 0,
     s4: 0,
     specNumDefault: 'Specimen number',
     depthDefault: 'Depth in mm',
     thNumDefault: 'Thermistor number',
     aaDefault: 'Activation Energy in KJ/Mole',
     ttDefault: 'Target Temprature in degC'
   });
});

// About page setup
app.get('/about', function(req, res){
   res.render('about');
});

// Main graph page setup
// CSV Data Transfer
app.post('/', function(req, res){
  console.log("Specimen: " + req.body.specimen);
  console.log("Depth: " + req.body.depth);
  console.log("Thermistor: " + req.body.thermistor);
  console.log("Activation Energy: " + req.body.ae);
  console.log("Target Temp: " + req.body.tt);

  var res_cor_data = [];
  var res_raw_data = [];
  var temp_data = [];
  var temp1 = [];
  var temp2 = [];
  var temp3 = [];
  var temp4 = [];
  var time_labels = [];
  var day_labels = [];
  var t1 = parseInt(req.body.thermistor) == 1;
  var t2 = parseInt(req.body.thermistor) == 2;
  var t3 = parseInt(req.body.thermistor) == 3;
  var t4 = parseInt(req.body.thermistor) == 4;
  var yLn = [];
  var xKt1 = [];
  var xKt2 = [];
  var xKt3 = [];
  var xKt4 = [];
  console.log(t1);
  console.log(t2);
  console.log(t3);
  console.log(t4);

  fs.createReadStream('./csv/write.csv')
    .pipe(csv())
    .on('data', function(data){
      // Temperature
      var tmp = data[1 + 11*(parseInt(req.body.specimen) - 1) + 7 + parseInt(req.body.thermistor)];
      var cor_tmp = 1.287600011/1000+Math.log(tmp)*2.357183092/10000+Math.pow(Math.log(tmp), 3)*9.509464377/100000000;
      cor_tmp = 1/cor_tmp - 273.15;
      temp_data.push(Math.round(cor_tmp*100)/100);
      var tmp1 = data[1 + 11*(parseInt(req.body.specimen) - 1) + 7 + 1];
      var tmp2 = data[1 + 11*(parseInt(req.body.specimen) - 1) + 7 + 2];
      var tmp3 = data[1 + 11*(parseInt(req.body.specimen) - 1) + 7 + 3];
      var tmp4 = data[1 + 11*(parseInt(req.body.specimen) - 1) + 7 + 4];
      var cor_tmp1 = 1.287600011/1000+Math.log(tmp1)*2.357183092/10000+Math.pow(Math.log(tmp1), 3)*9.509464377/100000000;
      var cor_tmp2 = 1.287600011/1000+Math.log(tmp2)*2.357183092/10000+Math.pow(Math.log(tmp2), 3)*9.509464377/100000000;
      var cor_tmp3 = 1.287600011/1000+Math.log(tmp3)*2.357183092/10000+Math.pow(Math.log(tmp3), 3)*9.509464377/100000000;
      var cor_tmp4 = 1.287600011/1000+Math.log(tmp4)*2.357183092/10000+Math.pow(Math.log(tmp4), 3)*9.509464377/100000000;
      cor_tmp1 = 1/cor_tmp1 - 273.15;
      cor_tmp2 = 1/cor_tmp2 - 273.15;
      cor_tmp3 = 1/cor_tmp3 - 273.15;
      cor_tmp4 = 1/cor_tmp4 - 273.15;
      temp1.push(Math.round(cor_tmp1*100)/100);
      temp2.push(Math.round(cor_tmp2*100)/100);
      temp3.push(Math.round(cor_tmp3*100)/100);
      temp4.push(Math.round(cor_tmp4*100)/100);
      // Raw Data
      // Change the index
      var rd = data[1 + 11*(parseInt(req.body.specimen) - 1) + parseInt(req.body.depth)];
      // Corrected Data
      var ae = parseFloat(req.body.ae);
      var tt = parseFloat(req.body.tt);
      var exp = (1/(tt+273.15) - 1/(cor_tmp+273.15))*ae*1000/8.3141;
      var cd = Math.round(rd*Math.pow(Math.E, exp));
      res_raw_data.push(rd*0.0125);
      res_cor_data.push(cd*0.0125);
      // Time on X axis
      time_labels.push(data[1]);
      var day = data[0].substring(0,2);
      var month = data[0].substring(3,5);
      var year = data[0].substring(6,10);
      day_labels.push(year + "-" + month + "-" + day);
      // 3rd graph
      yLn.push((Math.log(0.0125*rd)*100)/100);
      xKt1.push(((1000/(cor_tmp1+273.15))*100)/100);
      xKt2.push(((1000/(cor_tmp2+273.15))*100)/100);
      xKt3.push(((1000/(cor_tmp3+273.15))*100)/100);
      xKt4.push(((1000/(cor_tmp4+273.15))*100)/100);
    })
    .on('end', function(data){
      // Both _labels and _data are String Arrays
      console.log('Read Finished, calculating slope...');
      var s1;
      var s2;
      var s3;
      var s4;
      var sum = 0;
      for (i = 0; i < yLn.length; i++) {
        sum += yLn[i];
      }
      var yMean = sum/yLn.length;
      // AE 1
      sum = 0;
      for (i = 0; i < xKt1.length; i++) {
        sum += xKt1[i];
      }
      var xMean = sum/xKt1.length;
      var top = 0;
      var bX = 0;
      var bY = 0;
      for (i = 0; i < xKt1.length; i++) {
        top += (xKt1[i]-xMean)*(yLn[i]-yMean);
        bX += (xKt1[i]-xMean)*(xKt1[i]-xMean);
        bY += (yLn[i]-yMean)*(yLn[i]-yMean);
      }
      var r = top/Math.sqrt(bX*bY);
      var sy = Math.sqrt(bY/(xKt1.length-1));
      var sx = Math.sqrt(bX/(xKt1.length-1));
      s1 = r*sy/sx*8.3141;
      // AE 2
      sum = 0;
      for (i = 0; i < xKt2.length; i++) {
        sum += xKt2[i];
      }
      xMean = sum/xKt1.length;
      top = 0;
      bX = 0;
      bY = 0;
      for (i = 0; i < xKt1.length; i++) {
        top += (xKt2[i]-xMean)*(yLn[i]-yMean);
        bX += (xKt2[i]-xMean)*(xKt2[i]-xMean);
        bY += (yLn[i]-yMean)*(yLn[i]-yMean);
      }
      r = top/Math.sqrt(bX*bY);
      sy = Math.sqrt(bY/(xKt2.length-1));
      sx = Math.sqrt(bX/(xKt2.length-1));
      s2 = r*sy/sx*8.3141;
      // AE 3
      sum = 0;
      for (i = 0; i < xKt3.length; i++) {
        sum += xKt3[i];
      }
      xMean = sum/xKt1.length;
      top = 0;
      bX = 0;
      bY = 0;
      for (i = 0; i < xKt1.length; i++) {
        top += (xKt3[i]-xMean)*(yLn[i]-yMean);
        bX += (xKt3[i]-xMean)*(xKt3[i]-xMean);
        bY += (yLn[i]-yMean)*(yLn[i]-yMean);
      }
      r = top/Math.sqrt(bX*bY);
      sy = Math.sqrt(bY/(xKt3.length-1));
      sx = Math.sqrt(bX/(xKt3.length-1));
      s3 = r*sy/sx*8.3141;
      // AE 4
      sum = 0;
      for (i = 0; i < xKt4.length; i++) {
        sum += xKt4[i];
      }
      xMean = sum/xKt4.length;
      top = 0;
      bX = 0;
      bY = 0;
      for (i = 0; i < xKt4.length; i++) {
        top += (xKt4[i]-xMean)*(yLn[i]-yMean);
        bX += (xKt4[i]-xMean)*(xKt4[i]-xMean);
        bY += (yLn[i]-yMean)*(yLn[i]-yMean);
      }
      r = top/Math.sqrt(bX*bY);
      sy = Math.sqrt(bY/(xKt4.length-1));
      sx = Math.sqrt(bX/(xKt4.length-1));
      s4 = r*sy/sx*8.3141;
      // END
      var realtemp = [];
      var realdate = [];
      var tidaldate = [];
      var tidalheight = [];
      select = 'SELECT date, temp FROM temp ORDER BY date;';
      pool.query(select, (errDB, resDB) => {
        if (errDB){
          console.log("Error while selecting Temp Data");
        } else {
          select = 'SELECT date, height FROM tidal ORDER BY date;';
          pool.query(select, (errTi, resTi) => {
            if (errTi){
              console.log("Error while selecting Tidal Data");
            } else {
              for (var row in resDB.rows) {
                realtemp.push(parseFloat(resDB.rows[row].temp));
                realdate.push(resDB.rows[row].date);
              }
              for (var row in resTi.rows) {
                tidalheight.push(parseFloat(resTi.rows[row].height));
                tidaldate.push(resTi.rows[row].date);
              }
              console.log("Rendering...");
              var depthArray = [0, 5, 10, 15, 20, 30, 40, 50]
              res.render('home',{
                res_cor_data: res_cor_data,
                res_raw_data: res_raw_data,
                temp_data: temp_data,
                time_labels: time_labels,
                day_labels: day_labels,
                temp1: temp1,
                temp2: temp2,
                temp3: temp3,
                temp4: temp4,
                realtemp: realtemp,
                realdate: realdate,
                tidaldate: tidaldate,
                tidalheight: tidalheight,
                t1: t1,
                t2: t2,
                t3: t3,
                t4: t4,
                yLn: yLn,
                xKt1: xKt1,
                xKt2: xKt2,
                xKt3: xKt3,
                xKt4: xKt4,
                s1: s1,
                s2: s2,
                s3: s3,
                s4: s4,
                specNumDefault: req.body.specimen,
                depthDefault: depthArray[req.body.depth],
                thNumDefault: req.body.thermistor,
                aaDefault: req.body.ae,
                ttDefault: req.body.tt,
              });
            }
          })
        }
      })
    });
});

// Setting application to run
app.listen(process.env.PORT || 8080);
