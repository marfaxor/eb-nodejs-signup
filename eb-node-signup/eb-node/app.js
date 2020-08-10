// Include the cluster module
var cluster = require('cluster');

// Code to run if we're in the master process
if (cluster.isMaster) {

    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }

    // Listen for terminating workers
    cluster.on('exit', function (worker) {

        // Replace the terminated workers
        console.log('Worker ' + worker.id + ' died :(');
        cluster.fork();

    });

// Code to run if we're in a worker process
} else {
    var AWS = require('aws-sdk');
    var express = require('express');
    var bodyParser = require('body-parser');

    AWS.config.region = process.env.REGION

    var sns = new AWS.SNS();
    var ddb = new AWS.DynamoDB();
    var sms_sns = new AWS.SNS(); 


    var ddbTable =  process.env.STARTUP_SIGNUP_TABLE;
    var snsTopic =  process.env.NEW_SIGNUP_TOPIC;
    var app = express();

    app.set('view engine', 'ejs');
    app.set('views', __dirname + '/views');
    app.use(bodyParser.urlencoded({extended:false}));
    
    
    //home page routing
    app.get('/', function(req, res) {
        res.render('index', {
            static_path: 'static',
            theme: process.env.THEME || 'flatly',
            flask_debug: process.env.FLASK_DEBUG || 'false'
        });
    });

    app.get('/about', function(req, res) {
       res.render('about', {
            static_path: 'static',
            theme: process.env.THEME || 'flatly',
            flask_debug: process.env.FLASK_DEBUG || 'false'
       }); 
    });

    app.get('/message', function(req, res) {
        res.render('send', {
            static_path: 'static',
            theme: process.env.THEME || 'flatly',
            flask_debug: process.env.FLASK_DEBUG || 'false'
        });
    });

    //dev only DELETE BEFORE PRODUCTION
    app.get('/list', function(req, res){

        //db params
        var params = {
            TableName: ddbTable,
            ExpressionAttributeNames: {
                "#PN": "phone_number",
                "#FL": "name"
            },
            ProjectionExpression: "#FL, #PN"
        };


        //grab from db
        ddb.scan(params, function(err, data){
            if (err) res.send(err, err.stack);
            else{
                res.send(
                    data
                    //data['Items'][0]["phone_number"]["N"]
                );
            }
        });

    });

    
    app.post('/send_message', function(req, res){
        console.log('From the frontend:');
        console.log(req);
        
        // Create publish parameters
        var params = {
            Message: ' ' + req.body.name + ' reply STOP to unsubscribe',
            TopicArn: 'arn:aws:sns:us-east-1:301451468608:validated-numbers-list'
        };
        
        sms_sns.publish(params, function(err, data){
            if(err) console.log(err);
            else console.log(data);
        });
    });


    app.post('/signup', function(req, res) {
        var item = {
            'phone_number': {'N': req.body.phone_number},
            'name': {'S': req.body.name},
            'preview': {'S': req.body.previewAccess},
            'theme': {'S': req.body.theme}
        };

        var phone = "+1" + req.body.phone_number;

        //send em a message and register to sns
        var params = {
            Protocol : 'SMS',
            TopicArn : 'arn:aws:sns:us-east-1:301451468608:validated-numbers-list',
            Endpoint : phone
        };

        sms_sns.subscribe(params, (err, data) =>{
            if(err) console.log(err);
            else console.log(data);
        });
        
        //enter in db
        ddb.putItem({
            'TableName': ddbTable,
            'Item': item,
            'Expected': { phone_number: { Exists: false } }        
        }, function(err, data) {
            if (err) {
                var returnStatus = 500;
                if (err.code === 'ConditionalCheckFailedException') {
                    returnStatus = 409;
                }
                res.status(returnStatus).end();
                console.log('DDB Error: ' + err);
            } else {
                sns.publish({
                    'Message': 'Name: ' + req.body.name + "\r\nPhone: " + req.body.phone_number 
                                        + "\r\nPreviewAccess: " + req.body.previewAccess 
                                        + "\r\nTheme: " + req.body.theme,
                    'Subject': 'New user sign up!!!',
                    'TopicArn': snsTopic
                }, function(err, data) {
                    if (err) {
                        res.status(500).end();
                        console.log('SNS Error: ' + err);
                    } else {
                        res.status(201).end();
                    }
                });            
            }
        });
    });

    var port = process.env.PORT || 3000;

    var server = app.listen(port, function () {
        console.log('Server running at http://127.0.0.1:' + port + '/');
    });
}